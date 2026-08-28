/**
 * Cadastra a categoria "Corretor de Seguros" com seus servicos e palavras-chave.
 * Roda com:
 *
 *   npm run seed:corretor-seguros
 *
 * Usa a estrutura que ja existe - grupo > categoria > servico > alias - em vez
 * de criar categorias soltas por tipo de seguro. Assim "quero seguro do meu
 * carro" cai em Corretor de Seguros / Seguro Auto, e o corretor aparece uma vez
 * so, com as especialidades que atende.
 *
 * E idempotente: pode rodar varias vezes sem duplicar categoria, servico ou
 * palavra-chave.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GRUPO = { nome: 'Serviços profissionais', slug: 'servicos-profissionais', icone: 'Briefcase' };

const CATEGORIA = {
  nome: 'Corretor de Seguros',
  slug: 'corretor-seguros',
  icone: 'Shield',
  descricao:
    'Profissionais que auxiliam na cotação, contratação e renovação de seguros para pessoas, empresas, veículos, imóveis, máquinas e atividades do agronegócio.',
};

/**
 * Os subtipos entram como palavra-chave, nao como servico proprio: eles sao
 * intencao de busca ("colheitadeira" leva a Maquinas e Equipamentos), e criar
 * um servico para cada um poluiria o cadastro do corretor.
 */
const SERVICOS: Array<{ nome: string; slug: string; palavras: string[] }> = [
  {
    nome: 'Seguro Auto',
    slug: 'seguro-auto',
    palavras: [
      'carro', 'moto', 'caminhão', 'utilitário', 'frota', 'veículo empresarial',
      'seguro de carro', 'seguro do carro', 'seguro para carro', 'segurar meu carro',
      'cotação seguro carro', 'seguro automóvel', 'seguro automotivo', 'seguro de moto',
      'seguro de caminhão', 'seguro para caminhão', 'seguro de frota', 'seguro para frota',
      'renovar seguro carro', 'renovação seguro', 'cotação de seguro auto',
    ],
  },
  {
    nome: 'Seguro Residencial',
    slug: 'seguro-residencial',
    palavras: [
      'casa', 'apartamento', 'imóvel', 'condomínio',
      'seguro de casa', 'seguro da casa', 'seguro residencial', 'seguro para casa',
      'segurar minha casa', 'seguro de apartamento', 'seguro para apartamento',
      'seguro imóvel', 'seguro do imóvel', 'proteção residencial', 'seguro condomínio',
    ],
  },
  {
    nome: 'Seguro Empresarial',
    slug: 'seguro-empresarial',
    palavras: [
      'comércio', 'loja', 'escritório', 'galpão', 'indústria', 'empresa',
      'equipamentos da empresa', 'responsabilidade civil empresarial',
      'seguro da empresa', 'seguro para empresa', 'seguro empresarial', 'seguro comércio',
      'seguro de loja', 'seguro para loja', 'seguro escritório', 'seguro galpão',
      'seguro indústria', 'seguro para indústria', 'seguro negócio',
      'seguro patrimônio empresa', 'seguro equipamentos empresa',
      'seguro responsabilidade civil empresa',
    ],
  },
  {
    nome: 'Seguro Saúde',
    slug: 'seguro-saude',
    palavras: [
      'individual', 'familiar', 'empresarial', 'PME', 'coletivo',
      'seguro saúde', 'plano de saúde', 'plano saúde', 'seguro saúde individual',
      'seguro saúde familiar', 'plano familiar', 'plano empresarial',
      'plano de saúde empresa', 'seguro saúde empresarial', 'plano PME',
      'cotação plano de saúde', 'plano para funcionários', 'plano para empresa',
    ],
  },
  {
    nome: 'Seguro de Máquinas e Equipamentos',
    slug: 'seguro-maquinas-equipamentos',
    palavras: [
      'máquinas agrícolas', 'máquinas industriais', 'máquinas pesadas', 'equipamentos',
      'implementos', 'tratores', 'colheitadeiras', 'retroescavadeiras', 'escavadeiras',
      'seguro de máquina', 'seguro para máquina', 'seguro de equipamento',
      'seguro para equipamento', 'seguro máquinas', 'seguro máquinas pesadas',
      'seguro trator', 'seguro de trator', 'seguro para trator', 'seguro colheitadeira',
      'seguro de colheitadeira', 'seguro retroescavadeira', 'seguro escavadeira',
      'seguro implemento', 'seguro implemento agrícola', 'seguro máquinas industriais',
    ],
  },
  {
    nome: 'Seguro Agro',
    slug: 'seguro-agro',
    palavras: [
      'propriedade rural', 'fazenda', 'lavoura', 'produção agrícola', 'benfeitorias',
      'animais', 'patrimônio rural',
      'seguro agro', 'seguro agrícola', 'seguro rural', 'seguro para fazenda',
      'seguro da fazenda', 'seguro propriedade rural', 'seguro lavoura', 'seguro plantação',
      'seguro safra', 'seguro produção agrícola', 'seguro produtor rural',
      'seguro agronegócio', 'seguro para agro', 'seguro gado', 'seguro animais',
      'seguro benfeitorias rurais',
    ],
  },
  {
    nome: 'Seguro de Vida',
    slug: 'seguro-de-vida',
    palavras: [
      'sócios', 'funcionários',
      'seguro de vida', 'seguro vida', 'seguro para família', 'seguro para funcionários',
      'seguro vida empresarial', 'seguro para sócios',
    ],
  },
  {
    nome: 'Seguro Viagem',
    slug: 'seguro-viagem',
    palavras: [
      'nacional', 'internacional', 'viagem a trabalho',
      'seguro viagem', 'seguro para viagem', 'seguro viagem internacional',
      'seguro viagem exterior', 'seguro viagem família',
    ],
  },
  {
    nome: 'Seguro de Condomínio',
    slug: 'seguro-de-condominio',
    palavras: [
      'condomínio residencial', 'condomínio comercial', 'áreas comuns',
      'seguro condomínio', 'seguro para condomínio', 'seguro predial', 'seguro prédio',
      'seguro área comum',
    ],
  },
  {
    nome: 'Seguro de Responsabilidade Civil',
    slug: 'seguro-responsabilidade-civil',
    palavras: [
      'profissional', 'prestador de serviço', 'obras',
      'responsabilidade civil', 'seguro responsabilidade civil', 'seguro profissional',
      'seguro para prestador', 'seguro RC',
    ],
  },
];

/** Mesma normalizacao do matcher, para comparar palavra-chave sem acento nem pontuacao. */
const normalizar = (valor: string) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function main() {
  const grupo =
    (await prisma.categoryGroup.findUnique({ where: { slug: GRUPO.slug } })) ??
    (await prisma.categoryGroup.create({
      data: {
        name: GRUPO.nome,
        slug: GRUPO.slug,
        icon: GRUPO.icone,
        displayOrder: (await prisma.categoryGroup.count()) + 1,
        active: true,
      },
    }));
  console.log(`Grupo: ${grupo.name}`);

  const existente = await prisma.category.findUnique({ where: { slug: CATEGORIA.slug } });
  const categoria = existente
    ? await prisma.category.update({
        where: { id: existente.id },
        data: { groupId: grupo.id, icon: CATEGORIA.icone, description: CATEGORIA.descricao, active: true },
      })
    : await prisma.category.create({
        data: {
          groupId: grupo.id,
          name: CATEGORIA.nome,
          slug: CATEGORIA.slug,
          icon: CATEGORIA.icone,
          description: CATEGORIA.descricao,
          displayOrder: (await prisma.category.count()) + 1,
          active: true,
        },
      });
  console.log(`Categoria: ${categoria.name} (${existente ? 'atualizada' : 'criada'})\n`);

  let novosServicos = 0;
  let novasPalavras = 0;

  for (const [indice, item] of SERVICOS.entries()) {
    const servico = await prisma.categoryService.upsert({
      where: { categoryId_slug: { categoryId: categoria.id, slug: item.slug } },
      update: { name: item.nome, active: true, displayOrder: indice + 1 },
      create: {
        categoryId: categoria.id,
        name: item.nome,
        slug: item.slug,
        icon: CATEGORIA.icone,
        displayOrder: indice + 1,
        active: true,
      },
    });
    if (!(await prisma.categoryServiceAlias.count({ where: { categoryServiceId: servico.id } }))) novosServicos++;

    // Compara pelo texto normalizado para nao repetir palavra-chave que ja existe
    // com outra grafia (acento, maiuscula, hifen).
    const jaCadastradas = new Set(
      (await prisma.categoryServiceAlias.findMany({ where: { categoryServiceId: servico.id }, select: { alias: true } })).map((registro) =>
        normalizar(registro.alias),
      ),
    );

    const pendentes = new Map<string, string>();
    for (const palavra of item.palavras) {
      const chave = normalizar(palavra);
      if (!chave || jaCadastradas.has(chave) || pendentes.has(chave)) continue;
      pendentes.set(chave, palavra);
    }

    if (pendentes.size) {
      await prisma.categoryServiceAlias.createMany({
        data: [...pendentes.entries()].map(([chave, palavra]) => ({
          categoryServiceId: servico.id,
          alias: palavra,
          normalizedAlias: chave,
        })),
        skipDuplicates: true,
      });
      novasPalavras += pendentes.size;
    }

    console.log(`  ${item.nome}: ${pendentes.size} palavra(s)-chave nova(s), ${jaCadastradas.size} ja existiam`);
  }

  console.log(`\nServicos sem palavra-chave antes: ${novosServicos}`);
  console.log(`Palavras-chave adicionadas: ${novasPalavras}`);
  console.log('\nO corretor cadastrado nesta categoria escolhe em quais seguros atua, pelo painel admin.');
}

main()
  .catch((erro) => {
    console.error('Falha ao cadastrar a categoria:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
