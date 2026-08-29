/**
 * Preenche latitude/longitude dos profissionais que ainda nao tem, usando a
 * Geocoding API do Google. Roda com:
 *
 *   npm run geocode:profissionais
 *
 * Precisa de GOOGLE_GEOCODING_API_KEY no .env. Atencao: NAO pode ser a mesma
 * chave do mapa se ela estiver restrita por referenciador HTTP. O Google recusa
 * chaves com restricao de referenciador nas APIs de servidor (REQUEST_DENIED:
 * "API keys with referer restrictions cannot be used with this API"). Crie uma
 * segunda chave restrita por IP do servidor, com a Geocoding API habilitada.
 * Sem a variavel propria, o script cai em GOOGLE_MAPS_API_KEY.
 *
 * Precisao: o cadastro do profissional so tem cidade e bairro, entao o que se
 * obtem e o CENTRO DO BAIRRO, nao o endereco dele. Por isso a interface sempre
 * apresenta a distancia como aproximada, e todos do mesmo bairro compartilham
 * o mesmo ponto. Nunca prometa precisao de rua com esse dado.
 *
 * E idempotente: so consulta quem esta sem coordenada, e guarda um cache por
 * bairro para nao pagar a mesma consulta varias vezes.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHAVE = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

const normalizar = (valor: string) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Erro de configuracao da chave: nao adianta continuar tentando os outros. */
class ChaveRecusada extends Error {}

async function geocodificar(endereco: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&region=br&key=${encodeURIComponent(CHAVE)}`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    console.warn(`  ! HTTP ${resposta.status} ao consultar "${endereco}"`);
    return null;
  }
  const dados = (await resposta.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
  };
  // REQUEST_DENIED e OVER_QUERY_LIMIT sao problema de chave ou faturamento e
  // valem para todos os enderecos: repetir a consulta 72 vezes so enche a tela
  // de erro igual, entao o script para e explica o que fazer.
  if (dados.status === 'REQUEST_DENIED' || dados.status === 'OVER_QUERY_LIMIT') {
    throw new ChaveRecusada(`${dados.status}${dados.error_message ? `: ${dados.error_message}` : ''}`);
  }
  if (dados.status !== 'OK') {
    // ZERO_RESULTS e comum em bairro escrito de forma livre.
    console.warn(`  ! ${dados.status}${dados.error_message ? `: ${dados.error_message}` : ''} para "${endereco}"`);
    return null;
  }
  const local = dados.results?.[0]?.geometry?.location;
  return local ? { lat: local.lat, lng: local.lng } : null;
}

function explicarChaveRecusada(mensagem: string) {
  console.error('');
  console.error(`Geocodificacao interrompida: ${mensagem}`);
  console.error('');
  if (mensagem.includes('referer restrictions')) {
    console.error('A chave usada esta restrita por referenciador HTTP (restricao de site).');
    console.error('O Google nao aceita esse tipo de chave nas APIs de servidor.');
    console.error('');
    console.error('O que fazer no Google Cloud Console:');
    console.error('  1. Crie uma SEGUNDA chave para uso no servidor.');
    console.error('  2. Em "Restricoes de aplicativo", escolha "Enderecos IP" e informe o IP do servidor.');
    console.error('  3. Em "Restricoes de API", habilite a Geocoding API.');
    console.error('  4. Coloque essa chave no .env como GOOGLE_GEOCODING_API_KEY e rode de novo.');
    console.error('');
    console.error('A chave do mapa continua a mesma, restrita por referenciador - as duas convivem.');
  } else {
    console.error('Confira o faturamento do projeto e se a Geocoding API esta habilitada para esta chave.');
  }
}

async function main() {
  if (!CHAVE) {
    console.error('Defina GOOGLE_GEOCODING_API_KEY (ou GOOGLE_MAPS_API_KEY) no .env antes de rodar o geocode.');
    process.exitCode = 1;
    return;
  }

  const pendentes = await prisma.professional.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, name: true, city: true, neighborhood: true },
    orderBy: { name: 'asc' },
  });

  if (!pendentes.length) {
    console.log('Todos os profissionais ja tem coordenada.');
    return;
  }

  console.log(`Profissionais sem coordenada: ${pendentes.length}\n`);
  const cache = new Map<string, { lat: number; lng: number } | null>();
  let preenchidos = 0;
  let semLocal = 0;

  for (const profissional of pendentes) {
    const bairro = (profissional.neighborhood ?? '').trim();
    const cidade = (profissional.city ?? '').trim();
    if (!cidade) {
      console.log(`  - ${profissional.name}: sem cidade cadastrada, ignorado`);
      semLocal++;
      continue;
    }

    const chaveCache = `${normalizar(bairro)}|${normalizar(cidade)}`;
    if (!cache.has(chaveCache)) {
      const endereco = [bairro, cidade, 'Brasil'].filter(Boolean).join(', ');
      cache.set(chaveCache, await geocodificar(endereco));
    }

    const ponto = cache.get(chaveCache) ?? null;
    if (!ponto) {
      console.log(`  - ${profissional.name}: nao localizado (${bairro || 'sem bairro'}, ${cidade})`);
      semLocal++;
      continue;
    }

    await prisma.professional.update({
      where: { id: profissional.id },
      data: { latitude: ponto.lat, longitude: ponto.lng },
    });
    preenchidos++;
    console.log(`  + ${profissional.name}: ${bairro || cidade} -> ${ponto.lat.toFixed(5)}, ${ponto.lng.toFixed(5)}`);
  }

  console.log(`\nCoordenadas preenchidas: ${preenchidos}`);
  console.log(`Sem localizacao: ${semLocal}`);
  console.log(`Consultas ao Google: ${cache.size} (uma por bairro)`);
}

main()
  .catch((erro) => {
    if (erro instanceof ChaveRecusada) {
      explicarChaveRecusada(erro.message);
    } else {
      console.error('Falha no geocode:', erro);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
