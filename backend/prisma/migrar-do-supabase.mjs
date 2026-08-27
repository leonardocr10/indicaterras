/**
 * Copia os dados que hoje estão no Supabase para o banco MySQL.
 *
 *   node prisma/migrar-do-supabase.mjs            (executa)
 *   node prisma/migrar-do-supabase.mjs --simular  (só mostra o que faria)
 *
 * Precisa das variáveis SUPABASE_URL e SUPABASE_SECRET_KEY (origem) e
 * DATABASE_URL apontando para o MySQL (destino).
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const SIMULAR = process.argv.includes('--simular');
const supabaseUrl = String(process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const supabaseChave = String(process.env.SUPABASE_SECRET_KEY ?? '');

if (!supabaseUrl || !supabaseChave) {
  console.error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY para ler os dados de origem.');
  process.exit(1);
}

const prisma = new PrismaClient();

const buscar = async (tabela, consulta = 'select=*') => {
  const resposta = await fetch(`${supabaseUrl}/rest/v1/${tabela}?${consulta}`, {
    headers: { apikey: supabaseChave, Authorization: `Bearer ${supabaseChave}` },
  });
  if (!resposta.ok) {
    console.warn(`  ! ${tabela}: ${resposta.status} — pulando`);
    return [];
  }
  return resposta.json();
};

const contar = (nome, lista) => console.log(`  ${String(lista.length).padStart(4)} ${nome}`);

console.log(SIMULAR ? 'SIMULAÇÃO — nada será gravado\n' : 'Migrando Supabase → MySQL\n');

// ---------- leitura ----------
console.log('Lendo do Supabase:');
const condominios = await buscar('condominiums');
const categorias = await buscar('categories');
const servicos = await buscar('category_services');
const profissionais = await buscar('professionals');
const vinculosCategoria = await buscar('professional_categories');
const vinculosServico = await buscar('professional_services');
const imagens = await buscar('professional_images');
contar('condomínios', condominios);
contar('categorias', categorias);
contar('serviços', servicos);
contar('profissionais', profissionais);
contar('vínculos de categoria', vinculosCategoria);
contar('vínculos de serviço', vinculosServico);
contar('imagens', imagens);

if (SIMULAR) {
  await prisma.$disconnect();
  process.exit(0);
}

// ---------- gravação ----------
console.log('\nGravando no MySQL:');

for (const item of condominios) {
  await prisma.condominium.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      name: item.name,
      slug: item.slug,
      logo: item.logo_url ?? null,
      coverImage: item.cover_url ?? null,
      primaryColor: item.primary_color ?? '#0F5A3C',
      secondaryColor: item.secondary_color ?? '#F4C542',
      address: item.address ?? '',
      city: item.city ?? '',
      state: item.state ?? 'MG',
      phone: item.phone ?? '',
      email: item.email ?? '',
      active: item.active !== false,
    },
  });
}
console.log(`  ${condominios.length} condomínios`);

for (const item of categorias) {
  await prisma.category.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      name: item.name,
      slug: item.slug,
      icon: item.icon ?? null,
      displayOrder: item.display_order ?? 0,
      active: item.active !== false,
    },
  });
}
console.log(`  ${categorias.length} categorias`);

for (const item of servicos) {
  await prisma.categoryService.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      slug: item.slug,
      icon: item.icon ?? null,
      displayOrder: item.display_order ?? 0,
      active: item.active !== false,
    },
  });
}
console.log(`  ${servicos.length} serviços`);

for (const item of profissionais) {
  await prisma.professional.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      name: item.name,
      companyName: item.company_name ?? null,
      bio: item.description ?? null,
      phone: item.phone ?? '',
      whatsapp: (item.whatsapp ?? item.phone ?? '').replace(/\D/g, '') || null,
      instagram: item.instagram ?? null,
      city: item.city ?? '',
      neighborhood: item.neighborhood ?? '',
      avatar: item.photo_url ?? null,
      active: item.active !== false,
    },
  });
}
console.log(`  ${profissionais.length} profissionais`);

let categoriasLigadas = 0;
for (const item of vinculosCategoria) {
  await prisma.professionalCategory
    .upsert({
      where: { professionalId_categoryId: { professionalId: item.professional_id, categoryId: item.category_id } },
      update: {},
      create: { professionalId: item.professional_id, categoryId: item.category_id },
    })
    .then(() => categoriasLigadas++)
    .catch(() => undefined);
}
console.log(`  ${categoriasLigadas} vínculos de categoria`);

let servicosLigados = 0;
for (const item of vinculosServico) {
  if (!item.category_service_id) continue;
  await prisma.professionalService
    .upsert({
      where: {
        professionalId_categoryServiceId: {
          professionalId: item.professional_id,
          categoryServiceId: item.category_service_id,
        },
      },
      update: {},
      create: {
        id: item.id ?? randomUUID(),
        professionalId: item.professional_id,
        categoryServiceId: item.category_service_id,
      },
    })
    .then(() => servicosLigados++)
    .catch(() => undefined);
}
console.log(`  ${servicosLigados} vínculos de serviço`);

for (const item of imagens) {
  await prisma.professionalImage
    .upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        professionalId: item.professional_id,
        url: item.image_url,
        isCover: Boolean(item.is_cover),
        displayOrder: item.display_order ?? 0,
      },
    })
    .catch(() => undefined);
}
console.log(`  ${imagens.length} imagens`);

// configurações iniciais do condomínio principal
const principal = condominios[0];
if (principal) {
  await prisma.condominiumSettings.upsert({
    where: { condominiumId: principal.id },
    update: {},
    create: { condominiumId: principal.id, condominiumName: principal.name },
  });
  console.log('  configurações do condomínio');
}

await prisma.$disconnect();
console.log('\nPronto. Confira no app antes de desligar o Supabase.');
