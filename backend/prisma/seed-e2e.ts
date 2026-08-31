/**
 * Seed dedicado a suite E2E (Playwright).
 *
 * Nada aqui e dado real de producao: todos os e-mails usam o dominio reservado
 * `.test` e as coordenadas sao offsets calculados a partir de um ponto fixo em
 * Brasilia, para que os testes de raio (1 / 5 / 10 km) tenham resultado exato e
 * nao dependam de geocoding.
 *
 * Roda sempre contra um banco zerado (`prisma migrate reset`), entao usa
 * `create` direto em vez de `upsert` - a suite precisa ser repetivel.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Trava final: mesmo com o reset-db.mjs na frente, um seed apontado para o
// banco errado apagaria dados reais. Barato demais para nao checar de novo.
function exigirBancoDeTeste() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('mysql://')) throw new Error('seed-e2e: DATABASE_URL precisa ser um MySQL local.');
  const destino = new URL(url);
  if (!['localhost', '127.0.0.1', '::1'].includes(destino.hostname)) {
    throw new Error(`seed-e2e: recusando rodar contra "${destino.hostname}".`);
  }
  if (!/e2e|test/i.test(destino.pathname)) {
    throw new Error(`seed-e2e: o banco "${destino.pathname}" nao parece ser de teste.`);
  }
}

/** Ponto de referencia usado pelo Playwright em `geolocation`. */
const ORIGEM = { latitude: -15.8267, longitude: -47.9218 };

/** 1 grau de latitude ~ 111.19 km. Deslocar so a latitude evita erro de cosseno. */
function aKm(distanciaKm: number) {
  return { latitude: ORIGEM.latitude + distanciaKm / 111.19, longitude: ORIGEM.longitude };
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

async function main() {
  exigirBancoDeTeste();
  const senha = await bcrypt.hash('Senha@123', 10);

  const condominio = await prisma.condominium.create({
    data: {
      name: 'Condominio E2E',
      slug: 'condominio-e2e',
      city: 'Brasilia',
      state: 'DF',
      address: 'Quadra E2E, 1',
      phone: '(61) 90000-0000',
      email: 'contato.e2e@example.test',
      primaryColor: '#006538',
      secondaryColor: '#ffad00',
      settings: {
        create: {
          systemName: 'IndicaFacil E2E',
          condominiumName: 'Condominio E2E',
          welcomeMessage: 'Ambiente automatizado de testes.',
          // Auto-aprovacao ligada: o cadastro de cliente do teste de jornada
          // precisa entrar direto. O fluxo de aprovacao tem seu proprio teste,
          // que usa um profissional PENDING criado aqui embaixo.
          requireUserApproval: false,
          requireEmailVerification: false,
          selfRegistration: true,
          professionalSelfRegistration: true,
        },
      },
    },
  });

  const usuarioBase = {
    condominiumId: condominio.id,
    passwordHash: senha,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    approvalStatus: 'APPROVED' as const,
    approvedAt: new Date(),
    city: 'Brasilia',
    state: 'DF',
  };

  const cliente = await prisma.user.create({
    data: {
      ...usuarioBase,
      name: 'Cliente E2E',
      email: 'cliente.e2e@example.test',
      phone: '(61) 90000-0001',
      role: 'RESIDENT',
      zipCode: '70000-000',
      street: 'Rua dos Testes',
      number: '100',
      neighborhood: 'Asa Sul',
    },
  });

  // Segundo cliente: usado onde o teste precisa de dois donos distintos
  // (ex.: a solicitacao de um nao pode ser aberta pelo outro).
  const clienteSecundario = await prisma.user.create({
    data: {
      ...usuarioBase,
      name: 'Cliente Secundario E2E',
      email: 'cliente2.e2e@example.test',
      phone: '(61) 90000-0002',
      role: 'RESIDENT',
      neighborhood: 'Asa Norte',
    },
  });

  // Cliente sem endereco: exercita o aviso "Complete seu endereco" na Home.
  await prisma.user.create({
    data: {
      condominiumId: condominio.id,
      passwordHash: senha,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      name: 'Cliente Sem Endereco E2E',
      email: 'cliente.sem-endereco.e2e@example.test',
      phone: '(61) 90000-0003',
      role: 'RESIDENT',
    },
  });

  await prisma.user.create({
    data: {
      ...usuarioBase,
      name: 'Admin E2E',
      email: 'admin.e2e@example.test',
      phone: '(61) 90000-0010',
      role: 'CONDO_ADMIN',
    },
  });

  await prisma.user.create({
    data: {
      ...usuarioBase,
      name: 'Super Admin E2E',
      email: 'superadmin.e2e@example.test',
      phone: '(61) 90000-0011',
      role: 'SUPER_ADMIN',
    },
  });

  // ---------------------------------------------------------------------
  // Catalogo: grupo -> categoria -> servico -> aliases.
  // Os aliases sao o que faz a busca por problema ("meu chuveiro queimou")
  // cair na categoria certa mesmo com a IA desligada.
  // ---------------------------------------------------------------------
  const catalogo = [
    {
      grupo: { nome: 'Casa e manutencao', slug: 'casa-e-manutencao', icone: 'house' },
      categorias: [
        {
          nome: 'Eletricista',
          slug: 'eletricista',
          icone: 'zap',
          servicos: [
            { nome: 'Chuveiro eletrico', slug: 'chuveiro-eletrico', aliases: ['chuveiro queimou', 'chuveiro nao esquenta', 'chuveiro'] },
            { nome: 'Instalacao eletrica', slug: 'instalacao-eletrica', aliases: ['tomada', 'instalacao eletrica', 'fiacao'] },
            { nome: 'Troca de disjuntor', slug: 'troca-de-disjuntor', aliases: ['disjuntor desarma', 'disjuntor'] },
          ],
        },
        {
          nome: 'Encanador',
          slug: 'encanador',
          icone: 'droplet',
          servicos: [
            { nome: 'Vazamento', slug: 'vazamento', aliases: ['pia esta vazando', 'vazamento', 'cano estourado'] },
            { nome: 'Desentupimento', slug: 'desentupimento', aliases: ['entupido', 'ralo entupido'] },
          ],
        },
        {
          nome: 'Gas',
          slug: 'gas',
          icone: 'flame',
          servicos: [{ nome: 'Vazamento de gas', slug: 'vazamento-de-gas', aliases: ['cheiro de gas', 'vazamento de gas'] }],
        },
        {
          nome: 'Ar-condicionado',
          slug: 'ar-condicionado',
          icone: 'wind',
          servicos: [{ nome: 'Limpeza e recarga', slug: 'limpeza-e-recarga', aliases: ['ar nao gela', 'ar condicionado nao gela', 'ar gelando pouco'] }],
        },
        // Categoria proposital SEM profissional: o item 7 da especificacao pede
        // testar categoria vazia, e sem isso nao havia como cobrir esse estado.
        {
          nome: 'Marceneiro',
          slug: 'marceneiro',
          icone: 'hammer',
          servicos: [{ nome: 'Movel sob medida', slug: 'movel-sob-medida', aliases: ['movel planejado'] }],
        },
      ],
    },
    {
      grupo: { nome: 'Saude e bem-estar', slug: 'saude-e-bem-estar', icone: 'heart' },
      categorias: [
        {
          nome: 'Psicologia',
          slug: 'psicologia',
          icone: 'brain',
          servicos: [{ nome: 'Terapia individual', slug: 'terapia-individual', aliases: ['preciso de psicologa', 'psicologo', 'terapia'] }],
        },
      ],
    },
    {
      grupo: { nome: 'Tecnologia', slug: 'tecnologia', icone: 'laptop' },
      categorias: [
        {
          nome: 'Informatica',
          slug: 'informatica',
          icone: 'laptop',
          servicos: [
            { nome: 'Manutencao de notebook', slug: 'manutencao-de-notebook', aliases: ['notebook esta lento', 'notebook lento', 'computador lento'] },
            // Servico proposital SEM profissional vinculado.
            { nome: 'Recuperacao de dados', slug: 'recuperacao-de-dados', aliases: ['perdi meus arquivos'] },
          ],
        },
      ],
    },
  ];

  const servicosPorSlug = new Map<string, string>();
  const categoriasPorSlug = new Map<string, string>();

  for (const [ordemGrupo, entrada] of catalogo.entries()) {
    const grupo = await prisma.categoryGroup.create({
      data: { name: entrada.grupo.nome, slug: entrada.grupo.slug, icon: entrada.grupo.icone, displayOrder: ordemGrupo + 1, active: true },
    });
    for (const [ordemCategoria, categoriaSeed] of entrada.categorias.entries()) {
      const categoria = await prisma.category.create({
        data: {
          name: categoriaSeed.nome,
          slug: categoriaSeed.slug,
          icon: categoriaSeed.icone,
          groupId: grupo.id,
          displayOrder: ordemCategoria + 1,
          active: true,
        },
      });
      categoriasPorSlug.set(categoriaSeed.slug, categoria.id);
      for (const [ordemServico, servicoSeed] of categoriaSeed.servicos.entries()) {
        const servico = await prisma.categoryService.create({
          data: {
            categoryId: categoria.id,
            name: servicoSeed.nome,
            slug: servicoSeed.slug,
            icon: categoriaSeed.icone,
            displayOrder: ordemServico + 1,
            active: true,
          },
        });
        servicosPorSlug.set(servicoSeed.slug, servico.id);
        for (const alias of servicoSeed.aliases) {
          await prisma.categoryServiceAlias.create({
            data: { categoryServiceId: servico.id, alias, normalizedAlias: normalizar(alias) },
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Profissionais. As distancias sao o eixo dos testes de raio:
  //   0.4 km -> entra em 1, 5 e 10 km
  //   3.0 km -> entra em 5 e 10 km, fica fora de 1 km
  //   7.5 km -> entra so em 10 km
  //   25 km  -> fora de todos os raios testados
  //   sem coordenada -> nao aparece na busca por raio e conta no aviso da tela
  // ---------------------------------------------------------------------
  const profissionaisSeed: Array<{
    nome: string;
    empresa: string;
    categoria: string;
    servicos: string[];
    km: number | null;
    bairro: string;
    nota: number;
  }> = [
    { nome: 'Eletricista Perto E2E', empresa: 'Perto Eletrica', categoria: 'eletricista', servicos: ['chuveiro-eletrico', 'instalacao-eletrica', 'troca-de-disjuntor'], km: 0.4, bairro: 'Asa Sul', nota: 5 },
    { nome: 'Eletricista Medio E2E', empresa: 'Medio Eletrica', categoria: 'eletricista', servicos: ['chuveiro-eletrico', 'instalacao-eletrica'], km: 3, bairro: 'Asa Norte', nota: 4 },
    { nome: 'Eletricista Longe E2E', empresa: 'Longe Eletrica', categoria: 'eletricista', servicos: ['instalacao-eletrica'], km: 7.5, bairro: 'Taguatinga', nota: 3 },
    { nome: 'Eletricista Fora E2E', empresa: 'Fora Eletrica', categoria: 'eletricista', servicos: ['instalacao-eletrica'], km: 25, bairro: 'Planaltina', nota: 4 },
    { nome: 'Encanador Perto E2E', empresa: 'Aguas E2E', categoria: 'encanador', servicos: ['vazamento', 'desentupimento'], km: 1.2, bairro: 'Asa Sul', nota: 5 },
    { nome: 'Gasista Perto E2E', empresa: 'Gas Seguro E2E', categoria: 'gas', servicos: ['vazamento-de-gas'], km: 2, bairro: 'Asa Sul', nota: 4 },
    { nome: 'Refrigeracao E2E', empresa: 'Clima E2E', categoria: 'ar-condicionado', servicos: ['limpeza-e-recarga'], km: 4, bairro: 'Sudoeste', nota: 5 },
    { nome: 'Psicologa E2E', empresa: 'Cuidar E2E', categoria: 'psicologia', servicos: ['terapia-individual'], km: 2.5, bairro: 'Asa Norte', nota: 5 },
    { nome: 'Tecnico Informatica E2E', empresa: 'TI E2E', categoria: 'informatica', servicos: ['manutencao-de-notebook'], km: 6, bairro: 'Aguas Claras', nota: 4 },
    // Sem coordenada: alimenta o aviso "N profissionais ainda nao tem localizacao cadastrada".
    { nome: 'Eletricista Sem Local E2E', empresa: 'Sem Local E2E', categoria: 'eletricista', servicos: ['instalacao-eletrica'], km: null, bairro: 'Ceilandia', nota: 4 },
  ];

  const profissionaisCriados: Array<{ id: string; nome: string }> = [];

  for (const seed of profissionaisSeed) {
    const coordenadas = seed.km === null ? {} : aKm(seed.km);
    const profissional = await prisma.professional.create({
      data: {
        name: seed.nome,
        companyName: seed.empresa,
        bio: `${seed.nome} atende a regiao com pontualidade. Perfil criado para testes automatizados.`,
        phone: '(61) 90000-1000',
        whatsapp: '5561900001000',
        instagram: '@e2e',
        city: 'Brasilia',
        neighborhood: seed.bairro,
        approvalStatus: 'APPROVED',
        active: true,
        workingHours: [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }],
        ...coordenadas,
      },
    });
    profissionaisCriados.push({ id: profissional.id, nome: seed.nome });

    await prisma.professionalCategory.create({
      data: { professionalId: profissional.id, categoryId: categoriasPorSlug.get(seed.categoria)! },
    });
    for (const slugServico of seed.servicos) {
      await prisma.professionalService.create({
        data: { professionalId: profissional.id, categoryServiceId: servicosPorSlug.get(slugServico)! },
      });
    }
    await prisma.review.create({
      data: {
        condominiumId: condominio.id,
        userId: cliente.id,
        professionalId: profissional.id,
        rating: seed.nota,
        comment: `Avaliacao de referencia criada pelo seed E2E para ${seed.nome}.`,
      },
    });
    await prisma.recommendation.create({
      data: {
        condominiumId: condominio.id,
        userId: cliente.id,
        professionalId: profissional.id,
        comment: 'Indicado pelo seed E2E.',
        recommended: true,
      },
    });
  }

  // Profissional com login proprio: e o unico que abre /profissional/perfil.
  const usuarioProfissional = await prisma.user.create({
    data: {
      ...usuarioBase,
      name: 'Profissional E2E',
      email: 'profissional.e2e@example.test',
      phone: '(61) 90000-2000',
      role: 'PROFESSIONAL',
      neighborhood: 'Asa Sul',
    },
  });
  const perfilProfissional = await prisma.professional.create({
    data: {
      userId: usuarioProfissional.id,
      name: 'Profissional E2E',
      companyName: 'Servicos E2E',
      bio: 'Perfil do profissional autenticado usado nos testes de painel e edicao.',
      phone: '(61) 90000-2000',
      whatsapp: '5561900002000',
      city: 'Brasilia',
      neighborhood: 'Asa Sul',
      approvalStatus: 'APPROVED',
      active: true,
      workingHours: [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }],
      // Raio explicito (o padrao do servico e 15 km): com 10 km as
      // solicitacoes do seed caem de um lado ou do outro sem ambiguidade.
      serviceRadiusKm: 10,
      ...aKm(1.8),
    },
  });
  await prisma.professionalCategory.create({
    data: { professionalId: perfilProfissional.id, categoryId: categoriasPorSlug.get('eletricista')! },
  });
  await prisma.professionalService.create({
    data: { professionalId: perfilProfissional.id, categoryServiceId: servicosPorSlug.get('chuveiro-eletrico')! },
  });
  await prisma.review.create({
    data: {
      condominiumId: condominio.id,
      userId: cliente.id,
      professionalId: perfilProfissional.id,
      rating: 5,
      comment: 'Avaliacao inicial do profissional autenticado (seed E2E).',
    },
  });
  await prisma.favorite.create({ data: { condominiumId: condominio.id, userId: cliente.id, professionalId: perfilProfissional.id } });

  // Profissional PENDENTE: alvo do fluxo de aprovacao pelo admin (item 24).
  const usuarioPendente = await prisma.user.create({
    data: {
      condominiumId: condominio.id,
      passwordHash: senha,
      name: 'Profissional Pendente E2E',
      email: 'profissional.pendente.e2e@example.test',
      phone: '(61) 90000-3000',
      role: 'PROFESSIONAL',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      approvalStatus: 'PENDING',
    },
  });
  const perfilPendente = await prisma.professional.create({
    data: {
      userId: usuarioPendente.id,
      name: 'Profissional Pendente E2E',
      companyName: 'Pendente E2E',
      phone: '(61) 90000-3000',
      city: 'Brasilia',
      neighborhood: 'Guara',
      approvalStatus: 'PENDING',
      active: false,
      ...aKm(2.2),
    },
  });
  await prisma.professionalCategory.create({
    data: { professionalId: perfilPendente.id, categoryId: categoriasPorSlug.get('encanador')! },
  });

  // Favorito e solicitacao pre-existentes do cliente principal, para que as
  // telas de listagem nunca comecem vazias por acidente.
  await prisma.favorite.create({ data: { condominiumId: condominio.id, userId: cliente.id, professionalId: profissionaisCriados[0].id } });

  await prisma.serviceRequest.create({
    data: {
      clientId: cliente.id,
      categoryId: categoriasPorSlug.get('encanador')!,
      title: 'Vazamento embaixo da pia',
      description: 'Solicitacao criada pelo seed E2E para a tela de listagem comecar com conteudo.',
      urgency: 'NEXT_DAYS',
      preferredPeriod: 'MORNING',
      budgetType: 'OPEN',
      city: 'Brasilia',
      state: 'DF',
      neighborhood: 'Asa Sul',
      status: 'OPEN',
      ...ORIGEM,
      services: { create: [{ categoryServiceId: servicosPorSlug.get('vazamento')! }] },
    },
  });

  // ---------------------------------------------------------------------
  // Oportunidades do profissional autenticado (eletricista, raio de 10 km,
  // posicionado a 1,8 km da origem). As tres solicitacoes abaixo existem para
  // que o casamento tenha um resultado exato:
  //   PERTO  - mesma categoria, a 1,8 km dele  -> aparece
  //   LONGE  - mesma categoria, a 38 km dele   -> fora do raio
  //   FECHADA- mesma categoria e perto, mas CLOSED -> so OPEN vira oportunidade
  // A de encanador acima ja cobre o caso "categoria diferente".
  // ---------------------------------------------------------------------
  await prisma.serviceRequest.create({
    data: {
      clientId: clienteSecundario.id,
      categoryId: categoriasPorSlug.get('eletricista')!,
      title: 'Chuveiro queimado E2E PERTO',
      description: 'Solicitacao aberta de eletricista, dentro do raio do profissional autenticado.',
      urgency: 'TODAY',
      preferredPeriod: 'MORNING',
      budgetType: 'OPEN',
      city: 'Brasilia',
      state: 'DF',
      neighborhood: 'Asa Sul',
      status: 'OPEN',
      ...ORIGEM,
      services: { create: [{ categoryServiceId: servicosPorSlug.get('chuveiro-eletrico')! }] },
    },
  });

  await prisma.serviceRequest.create({
    data: {
      clientId: clienteSecundario.id,
      categoryId: categoriasPorSlug.get('eletricista')!,
      title: 'Chuveiro queimado E2E LONGE',
      description: 'Solicitacao aberta de eletricista, fora do raio de 10 km do profissional.',
      urgency: 'NO_RUSH',
      budgetType: 'OPEN',
      city: 'Planaltina',
      state: 'DF',
      neighborhood: 'Centro',
      status: 'OPEN',
      ...aKm(40),
      services: { create: [{ categoryServiceId: servicosPorSlug.get('chuveiro-eletrico')! }] },
    },
  });

  await prisma.serviceRequest.create({
    data: {
      clientId: clienteSecundario.id,
      categoryId: categoriasPorSlug.get('eletricista')!,
      title: 'Chuveiro queimado E2E FECHADA',
      description: 'Solicitacao ja encerrada: nao pode aparecer como oportunidade.',
      urgency: 'TODAY',
      budgetType: 'OPEN',
      city: 'Brasilia',
      state: 'DF',
      neighborhood: 'Asa Sul',
      status: 'CLOSED',
      ...ORIGEM,
      services: { create: [{ categoryServiceId: servicosPorSlug.get('chuveiro-eletrico')! }] },
    },
  });

  // Denuncia pre-existente para o painel do admin (item 26) ter o que listar.
  await prisma.report.create({
    data: {
      condominiumId: condominio.id,
      userId: clienteSecundario.id,
      professionalId: profissionaisCriados[3].id,
      reason: 'Nao compareceu no horario combinado',
      details: 'Denuncia criada pelo seed E2E.',
      status: 'PENDENTE',
    },
  });

  // IA desligada por padrao: os testes de "IA ativada" ligam explicitamente
  // pelo painel do admin, o que tambem valida que a chave muda a Home.
  await prisma.aiSettings.create({
    data: {
      enabled: false,
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      apiKey: 'chave-fake-e2e',
      homeTitle: 'Conte o que voce precisa',
      homeSubtitle: 'A gente identifica o profissional certo.',
      homePlaceholder: 'Ex.: meu chuveiro queimou',
      homeHelperText: 'Descreva com suas palavras.',
      successMessage: 'Encontramos o servico ideal para voce.',
      lowConfidenceMessage: 'Nao tenho certeza. Pode dar mais detalhes?',
      fallbackMessage: 'Nao consegui analisar agora, mas achei por palavras-chave.',
    },
  });

  console.log('[seed-e2e] Pronto.');
  console.log('[seed-e2e] cliente.e2e / profissional.e2e / admin.e2e @example.test - senha: Senha@123');
  console.log(`[seed-e2e] ${profissionaisCriados.length + 2} profissionais, ${servicosPorSlug.size} servicos.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
