/**
 * Cria um profissional de exemplo para cada categoria que ainda nao tem nenhum,
 * para o app nao mostrar categoria vazia. Roda com:
 *
 *   npx ts-node prisma/seed-categorias-vazias.ts
 *
 * E idempotente: nao duplica se ja tiver rodado e nao toca em categoria que ja
 * tenha profissional de verdade.
 *
 * Os telefones usam a faixa 99999-xxxx justamente por serem ficticios: nenhum
 * cliente deve ligar para um numero de terceiro achando que fala com o
 * profissional. As fotos ficam vazias de proposito - o app ja exibe a arte da
 * categoria nesse caso (ver frontend/src/app/category-art.util.ts).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Exemplo = {
  categoriaSlug: string;
  name: string;
  companyName: string;
  phone: string;
  neighborhood: string;
  bio: string;
};

const EXEMPLOS: Exemplo[] = [
  {
    categoriaSlug: 'gas',
    name: 'Rogerio Prado',
    companyName: 'Prado Instalacoes de Gas',
    phone: '(34) 99999-0101',
    neighborhood: 'Santa Monica',
    bio: 'Instalacao e manutencao de fogao, cooktop e aquecedor a gas. Faz teste de estanqueidade e troca de mangueira e registro. Atende com hora marcada e emite relatorio do servico.',
  },
  {
    categoriaSlug: 'portoes-automacao',
    name: 'Anderson Vieira',
    companyName: 'AV Portoes e Automacao',
    phone: '(34) 99999-0102',
    neighborhood: 'Jardim Karaiba',
    bio: 'Instalacao e conserto de portao automatico, troca de motor, placa e controle remoto. Faz manutencao preventiva de trilho e roldana em portao basculante e deslizante.',
  },
  {
    categoriaSlug: 'montador',
    name: 'Fabio Nunes',
    companyName: 'Nunes Montagens',
    phone: '(34) 99999-0103',
    neighborhood: 'Tibery',
    bio: 'Montagem e desmontagem de guarda-roupa, cama, escrivaninha e estante. Instala painel de TV e prateleira com fixacao adequada para cada tipo de parede.',
  },
  {
    categoriaSlug: 'mecanico',
    name: 'Sergio Batista',
    companyName: 'Batista Mecanica Movel',
    phone: '(34) 99999-0104',
    neighborhood: 'Umuarama',
    bio: 'Mecanica leve no local: troca de bateria, correia, filtro e velas. Faz revisao preventiva e diagnostico de ruido e superaquecimento. Atende em domicilio.',
  },
  {
    categoriaSlug: 'churrasqueiro',
    name: 'Marcelo Ferraz',
    companyName: 'Ferraz Churrasco',
    phone: '(34) 99999-0105',
    neighborhood: 'Morada da Colina',
    bio: 'Churrasqueiro para eventos e confraternizacoes. Cuida do preparo, do ponto da carne e do acompanhamento, incluindo montagem e limpeza da area do churrasco.',
  },
];

async function main() {
  const criados: string[] = [];
  const ignorados: string[] = [];

  for (const exemplo of EXEMPLOS) {
    const categoria = await prisma.category.findUnique({
      where: { slug: exemplo.categoriaSlug },
      include: { services: { where: { active: true }, orderBy: { displayOrder: 'asc' } } },
    });
    if (!categoria) {
      ignorados.push(`${exemplo.categoriaSlug} (categoria nao existe)`);
      continue;
    }

    const jaTem = await prisma.professionalCategory.count({ where: { categoryId: categoria.id } });
    if (jaTem > 0) {
      ignorados.push(`${categoria.name} (ja tem ${jaTem} profissional(is))`);
      continue;
    }

    const existente = await prisma.professional.findFirst({ where: { name: exemplo.name } });
    const profissional =
      existente ??
      (await prisma.professional.create({
        data: {
          name: exemplo.name,
          companyName: exemplo.companyName,
          phone: exemplo.phone,
          whatsapp: exemplo.phone,
          city: 'Uberlandia',
          neighborhood: exemplo.neighborhood,
          bio: exemplo.bio,
          active: true,
        },
      }));

    await prisma.professionalCategory.upsert({
      where: { professionalId_categoryId: { professionalId: profissional.id, categoryId: categoria.id } },
      update: {},
      create: { professionalId: profissional.id, categoryId: categoria.id },
    });

    // Sem servicos vinculados o profissional nao aparece na busca por servico
    // nem no resultado da analise de problema.
    if (categoria.services.length) {
      await prisma.professionalService.createMany({
        data: categoria.services.slice(0, 6).map((service) => ({ professionalId: profissional.id, categoryServiceId: service.id })),
        skipDuplicates: true,
      });
    }

    criados.push(`${categoria.name}: ${exemplo.name} (${categoria.services.slice(0, 6).length} servicos)`);
  }

  console.log(`\nCriados (${criados.length}):`);
  criados.forEach((item) => console.log('  +', item));
  if (ignorados.length) {
    console.log(`\nIgnorados (${ignorados.length}):`);
    ignorados.forEach((item) => console.log('  -', item));
  }
}

main()
  .catch((erro) => {
    console.error('Falha ao criar os exemplos:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
