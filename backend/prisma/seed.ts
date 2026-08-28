import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { demoCategoryServices } from '../src/data/demo-data';
import { CATEGORY_CATALOG, catalogSlug } from '../src/data/category-catalog';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const condominium = await prisma.condominium.upsert({
    where: { slug: 'terras-alphas' },
    update: {},
    create: {
      name: 'Terras Alphas',
      slug: 'terras-alphas',
      city: 'Uberlandia',
      state: 'MG',
      address: 'Av. das Palmeiras, 1000',
      phone: '(34) 99999-0000',
      email: 'contato@terrasalphas.com.br',
      logo: '/uploads/condominiums/terras-alphas-logo.svg',
      coverImage: '/uploads/condominiums/terras-alphas-cover.jpg',
      primaryColor: '#0F5A3C',
      secondaryColor: '#F4C542',
      settings: {
        create: {
          welcomeMessage: 'Uma plataforma exclusiva do seu condominio.',
          supportWhatsapp: '5534999990000',
          requireUserApproval: true,
        },
      },
    },
  });

  const resident = await prisma.user.upsert({
    where: { email: 'leonardo@terrasalphas.com.br' },
    update: {},
    create: {
      condominiumId: condominium.id,
      name: 'Leonardo',
      email: 'leonardo@terrasalphas.com.br',
      passwordHash,
      role: 'RESIDENT',
      phone: '(34) 99999-2222',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@terrasalphas.com.br' },
    update: {},
    create: {
      condominiumId: condominium.id,
      name: 'Administrador',
      email: 'admin@terrasalphas.com.br',
      passwordHash,
      role: 'CONDO_ADMIN',
      phone: '(34) 99999-1111',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  const categories = await Promise.all(
    [
      'Eletricista',
      'Encanador',
      'Pedreiro',
      'Pintor',
      'Diarista',
      'Ar-condicionado',
      'Jardineiro',
      'Montador',
    ].map((name, index) =>
      prisma.category.upsert({
        where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
        update: { displayOrder: index + 1, active: true },
        create: {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          icon: 'tool',
          displayOrder: index + 1,
        },
      }),
    ),
  );

  const servicesByCategory = new Map<string, Array<{ id: string; name: string }>>();
  for (const service of demoCategoryServices) {
    const category = categories.find((item) => item.name === ({
      'cat-1': 'Eletricista', 'cat-2': 'Encanador', 'cat-3': 'Pedreiro', 'cat-4': 'Pintor',
      'cat-5': 'Diarista', 'cat-6': 'Ar-condicionado', 'cat-7': 'Jardineiro', 'cat-8': 'Montador',
    } as Record<string, string>)[service.categoryId]);
    if (!category) continue;
    const saved = await prisma.categoryService.upsert({
      where: { categoryId_slug: { categoryId: category.id, slug: service.slug } },
      update: { name: service.name, icon: service.icon, displayOrder: service.displayOrder, active: true },
      create: { categoryId: category.id, name: service.name, slug: service.slug, icon: service.icon, displayOrder: service.displayOrder },
    });
    await prisma.categoryServiceAlias.deleteMany({ where: { categoryServiceId: saved.id } });
    if (service.aliases.length) {
      await prisma.categoryServiceAlias.createMany({
        data: service.aliases.map((alias) => ({
          categoryServiceId: saved.id,
          alias,
          normalizedAlias: alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
        })),
        skipDuplicates: true,
      });
    }
    const group = servicesByCategory.get(category.name) ?? [];
    group.push({ id: saved.id, name: saved.name });
    servicesByCategory.set(category.name, group);
  }

  // Complementa o catálogo existente sem apagar categorias, serviços ou aliases cadastrados.
  for (const [groupOrder, groupSeed] of CATEGORY_CATALOG.entries()) {
    const group = await prisma.categoryGroup.upsert({
      where: { slug: groupSeed.slug },
      update: { name: groupSeed.name, icon: groupSeed.icon, displayOrder: groupOrder + 1, active: true },
      create: { name: groupSeed.name, slug: groupSeed.slug, icon: groupSeed.icon, displayOrder: groupOrder + 1, active: true },
    });
    for (const [categoryOrder, categorySeed] of groupSeed.categories.entries()) {
      const category = await prisma.category.upsert({
        where: { slug: categorySeed.slug },
        update: { name: categorySeed.name, icon: categorySeed.icon, groupId: group.id, active: true },
        create: { name: categorySeed.name, slug: categorySeed.slug, icon: categorySeed.icon, groupId: group.id, displayOrder: categoryOrder + 1, active: true },
      });
      for (const [serviceOrder, serviceSeed] of categorySeed.services.entries()) {
        const service = await prisma.categoryService.upsert({
          where: { categoryId_slug: { categoryId: category.id, slug: catalogSlug(serviceSeed.name) } },
          update: { name: serviceSeed.name, icon: categorySeed.icon, displayOrder: serviceOrder + 1, active: true },
          create: { categoryId: category.id, name: serviceSeed.name, slug: catalogSlug(serviceSeed.name), icon: categorySeed.icon, displayOrder: serviceOrder + 1, active: true },
        });
        for (const alias of serviceSeed.aliases ?? []) {
          await prisma.categoryServiceAlias.upsert({
            where: { categoryServiceId_normalizedAlias: { categoryServiceId: service.id, normalizedAlias: alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() } },
            update: { alias },
            create: { categoryServiceId: service.id, alias, normalizedAlias: alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() },
          });
        }
      }
    }
  }

  const professionalSeeds = [
    ['Joao Carlos', 'Eletricista'],
    ['Carlos Henrique', 'Eletricista'],
    ['Marcos Eletricista', 'Eletricista'],
    ['Luciana', 'Diarista'],
    ['Jardins & Cia', 'Jardineiro'],
    ['Marido de Aluguel Max', 'Montador'],
  ] as const;

  for (const [name, categoryName] of professionalSeeds) {
    const category = categories.find((item) => item.name === categoryName);
    if (!category) continue;

    const professional = await prisma.professional.findFirst({ where: { name }, orderBy: { createdAt: 'asc' } })
      ?? await prisma.professional.create({
        data: {
          name,
          phone: '(34) 99999-3333',
          whatsapp: '5534999993333',
          city: 'Uberlandia',
          neighborhood: 'Gavea',
          bio: `${name} atende com qualidade, seguranca e pontualidade.`,
          companyName: name,
        },
      });

    await prisma.professionalCategory.upsert({
      where: { professionalId_categoryId: { professionalId: professional.id, categoryId: category.id } },
      update: {},
      create: { professionalId: professional.id, categoryId: category.id },
    });

    const linkedServices = servicesByCategory.get(categoryName)?.slice(0, 4) ?? [];
    if (linkedServices.length) {
      await prisma.professionalService.createMany({
        data: linkedServices.map((service) => ({ professionalId: professional.id, categoryServiceId: service.id })),
        skipDuplicates: true,
      });
    }

    const recommendation = await prisma.recommendation.findFirst({ where: { condominiumId: condominium.id, userId: resident.id, professionalId: professional.id } });
    if (!recommendation) await prisma.recommendation.create({
      data: { condominiumId: condominium.id, userId: resident.id, professionalId: professional.id, comment: 'Profissional muito recomendado pelos moradores.', recommended: true },
    });
    const review = await prisma.review.findFirst({ where: { condominiumId: condominium.id, userId: resident.id, professionalId: professional.id } });
    if (!review) await prisma.review.create({
      data: { condominiumId: condominium.id, userId: resident.id, professionalId: professional.id, rating: 5, comment: 'Excelente atendimento e execucao do servico.' },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
