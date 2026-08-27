/**
 * Baixa para o disco local as imagens que hoje ficam no Storage do Supabase
 * e ajusta o banco (Professional, ProfessionalImage, Condominium) para
 * apontar para o arquivo local em vez do link remoto.
 *
 * Depois disso o sistema fica 100% independente do Supabase.
 *
 *   node prisma/baixar-imagens-supabase.mjs             (executa)
 *   node prisma/baixar-imagens-supabase.mjs --simular   (só lista o que baixaria)
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const SIMULAR = process.argv.includes('--simular');
const RAIZ_UPLOADS = join(process.cwd(), 'uploads');
const prisma = new PrismaClient();

const ehLinkRemoto = (url) => typeof url === 'string' && /^https?:\/\//.test(url);

const baixar = async (url, pasta) => {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const buffer = Buffer.from(await resposta.arrayBuffer());
  const extensao = (extname(new URL(url).pathname) || '.jpg').toLowerCase();
  const nome = `${pasta.replace(/s$/, '')}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extensao}`;
  const destino = join(RAIZ_UPLOADS, pasta);
  if (!existsSync(destino)) mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, nome), buffer);
  return `/uploads/${pasta}/${nome}`;
};

let baixadas = 0;
let falhas = 0;

const processar = async (url, pasta) => {
  if (!ehLinkRemoto(url)) return null;
  if (SIMULAR) {
    console.log(`  baixaria: ${url}`);
    return null;
  }
  try {
    const caminho = await baixar(url, pasta);
    baixadas++;
    return caminho;
  } catch (erro) {
    falhas++;
    console.warn(`  ! falhou (${pasta}): ${url} -> ${String(erro).slice(0, 120)}`);
    return null;
  }
};

console.log(SIMULAR ? 'SIMULAÇÃO — nada será baixado nem alterado\n' : 'Baixando imagens do Supabase Storage\n');

const profissionais = await prisma.professional.findMany({
  where: { OR: [{ avatar: { startsWith: 'http' } }, { coverImage: { startsWith: 'http' } }] },
});
console.log(`Profissionais com foto remota: ${profissionais.length}`);
for (const item of profissionais) {
  const dados = {};
  const novoAvatar = await processar(item.avatar, 'professionals');
  if (novoAvatar) dados.avatar = novoAvatar;
  const novaCapa = await processar(item.coverImage, 'professionals');
  if (novaCapa) dados.coverImage = novaCapa;
  if (!SIMULAR && Object.keys(dados).length) {
    await prisma.professional.update({ where: { id: item.id }, data: dados });
  }
}

const imagens = await prisma.professionalImage.findMany({ where: { url: { startsWith: 'http' } } });
console.log(`Fotos de trabalhos remotas: ${imagens.length}`);
for (const item of imagens) {
  const novaUrl = await processar(item.url, 'professionals');
  if (!SIMULAR && novaUrl) {
    await prisma.professionalImage.update({ where: { id: item.id }, data: { url: novaUrl } });
  }
}

const condominios = await prisma.condominium.findMany({
  where: { OR: [{ logo: { startsWith: 'http' } }, { coverImage: { startsWith: 'http' } }] },
});
console.log(`Condomínios com imagem remota: ${condominios.length}`);
for (const item of condominios) {
  const dados = {};
  const novoLogo = await processar(item.logo, 'condominiums');
  if (novoLogo) dados.logo = novoLogo;
  const novaCapa = await processar(item.coverImage, 'condominiums');
  if (novaCapa) dados.coverImage = novaCapa;
  if (!SIMULAR && Object.keys(dados).length) {
    await prisma.condominium.update({ where: { id: item.id }, data: dados });
  }
}

await prisma.$disconnect();
console.log(SIMULAR ? '\nSimulação concluída.' : `\nPronto. ${baixadas} imagens baixadas, ${falhas} falharam.`);
