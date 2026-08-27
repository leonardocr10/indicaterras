import { Professional } from './models';

/**
 * Arte genérica por categoria, usada enquanto o profissional não envia foto e capa.
 * Evita que o app fique com todos os cards iguais e sem imagem.
 */
const SLUG_POR_NOME: Record<string, string> = {
  eletricista: 'eletricista',
  encanador: 'encanador',
  pedreiro: 'pedreiro',
  pintor: 'pintor',
  diarista: 'diarista',
  'ar-condicionado': 'ar-condicionado',
  jardineiro: 'jardineiro',
  'montador-de-moveis': 'montador-de-moveis',
  chaveiro: 'chaveiro',
  informatica: 'informatica',
  mecanico: 'mecanico',
  'marido-de-aluguel': 'marido-de-aluguel',
  piscineiro: 'piscineiro',
  dedetizacao: 'dedetizacao',
  'energia-solar': 'energia-solar',
  'cameras-seguranca': 'cameras-seguranca',
  outros: 'outros',
};

function slugDaCategoria(professional: Pick<Professional, 'categories' | 'category'>): string {
  const slug = professional.categories?.[0]?.slug;
  if (slug && SLUG_POR_NOME[slug]) return slug;
  const pelaEtiqueta = String(professional.category ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return SLUG_POR_NOME[pelaEtiqueta] ?? 'outros';
}

export function categoryAvatar(professional: Pick<Professional, 'categories' | 'category'>): string {
  return `/assets/avatars/${slugDaCategoria(professional)}.png`;
}

export function categoryCover(professional: Pick<Professional, 'categories' | 'category'>): string {
  return `/assets/covers/${slugDaCategoria(professional)}.png`;
}
