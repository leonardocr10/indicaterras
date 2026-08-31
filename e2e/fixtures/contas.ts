/**
 * Contas criadas pelo `backend/prisma/seed-e2e.ts`.
 *
 * Todas usam o dominio `.test`, reservado pela RFC 2606 justamente para isso:
 * nenhum e-mail daqui pode existir de verdade nem sair para producao.
 */
export const SENHA_PADRAO = 'Senha@123';

export const CONTAS = {
  cliente: {
    email: 'cliente.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Cliente E2E',
    papel: 'RESIDENT' as const,
    rotaInicial: '/app/home',
  },
  clienteSecundario: {
    email: 'cliente2.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Cliente Secundario E2E',
    papel: 'RESIDENT' as const,
    rotaInicial: '/app/home',
  },
  clienteSemEndereco: {
    email: 'cliente.sem-endereco.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Cliente Sem Endereco E2E',
    papel: 'RESIDENT' as const,
    rotaInicial: '/app/home',
  },
  profissional: {
    email: 'profissional.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Profissional E2E',
    papel: 'PROFESSIONAL' as const,
    rotaInicial: '/profissional/perfil',
  },
  profissionalPendente: {
    email: 'profissional.pendente.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Profissional Pendente E2E',
    papel: 'PROFESSIONAL' as const,
    rotaInicial: '/profissional/perfil',
  },
  admin: {
    email: 'admin.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Admin E2E',
    papel: 'CONDO_ADMIN' as const,
    rotaInicial: '/admin/dashboard',
  },
  superAdmin: {
    email: 'superadmin.e2e@example.test',
    senha: SENHA_PADRAO,
    nome: 'Super Admin E2E',
    papel: 'SUPER_ADMIN' as const,
    rotaInicial: '/admin/dashboard',
  },
} as const;

export type NomeDeConta = keyof typeof CONTAS;

/** Nomes dos profissionais do seed, com a distancia planejada ate a origem. */
export const PROFISSIONAIS_SEED = {
  eletricistaPerto: { nome: 'Eletricista Perto E2E', km: 0.4, bairro: 'Asa Sul' },
  eletricistaMedio: { nome: 'Eletricista Medio E2E', km: 3, bairro: 'Asa Norte' },
  eletricistaLonge: { nome: 'Eletricista Longe E2E', km: 7.5, bairro: 'Taguatinga' },
  eletricistaFora: { nome: 'Eletricista Fora E2E', km: 25, bairro: 'Planaltina' },
  encanadorPerto: { nome: 'Encanador Perto E2E', km: 1.2, bairro: 'Asa Sul' },
  gasistaPerto: { nome: 'Gasista Perto E2E', km: 2, bairro: 'Asa Sul' },
  refrigeracao: { nome: 'Refrigeracao E2E', km: 4, bairro: 'Sudoeste' },
  psicologa: { nome: 'Psicologa E2E', km: 2.5, bairro: 'Asa Norte' },
  informatica: { nome: 'Tecnico Informatica E2E', km: 6, bairro: 'Aguas Claras' },
  semLocalizacao: { nome: 'Eletricista Sem Local E2E', km: null, bairro: 'Ceilandia' },
  autenticado: { nome: 'Profissional E2E', km: 1.8, bairro: 'Asa Sul' },
  pendente: { nome: 'Profissional Pendente E2E', km: 2.2, bairro: 'Guara' },
} as const;

/** Categorias e servicos do seed, por slug. */
export const CATALOGO_SEED = {
  categoriaSemProfissional: { nome: 'Marceneiro', slug: 'marceneiro' },
  servicoSemProfissional: { nome: 'Recuperacao de dados', slug: 'recuperacao-de-dados' },
  eletricista: { nome: 'Eletricista', slug: 'eletricista' },
  encanador: { nome: 'Encanador', slug: 'encanador' },
} as const;

/** Ponto de origem usado no seed e na config do Playwright. */
export const ORIGEM = { latitude: -15.8267, longitude: -47.9218 };
