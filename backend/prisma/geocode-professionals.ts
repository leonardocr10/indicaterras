/**
 * Preenche latitude/longitude dos profissionais que ainda nao tem, usando a
 * Geocoding API do Google. Roda com:
 *
 *   npm run geocode:profissionais
 *
 * Precisa de GOOGLE_MAPS_API_KEY no .env (a mesma chave do mapa).
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
const CHAVE = process.env.GOOGLE_MAPS_API_KEY ?? '';

const normalizar = (valor: string) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

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
  if (dados.status !== 'OK') {
    // ZERO_RESULTS e comum em bairro escrito de forma livre; REQUEST_DENIED e
    // OVER_QUERY_LIMIT indicam problema de chave ou faturamento.
    console.warn(`  ! ${dados.status}${dados.error_message ? `: ${dados.error_message}` : ''} para "${endereco}"`);
    return null;
  }
  const local = dados.results?.[0]?.geometry?.location;
  return local ? { lat: local.lat, lng: local.lng } : null;
}

async function main() {
  if (!CHAVE) {
    console.error('Defina GOOGLE_MAPS_API_KEY no .env antes de rodar o geocode.');
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
    console.error('Falha no geocode:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
