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
  gas: 'gas',
  'portoes-automacao': 'portoes-automacao',
  montador: 'montador',
  churrasqueiro: 'churrasqueiro',
  'corretor-seguros': 'corretor-seguros',
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

/**
 * Ícone da categoria a partir do valor gravado no cadastro. Aceita URL, data
 * URI ou o nome de um arquivo de taxonomy-icons. Devolve vazio quando não há
 * ícone, para quem chama decidir o que mostrar no lugar.
 */
export function categoryIconUrl(icon: string | null | undefined): string {
  const valor = String(icon ?? '').trim();
  if (!valor) return '';
  if (valor.startsWith('data:image/') || valor.startsWith('http') || valor.startsWith('/')) return valor;
  // Alguns cadastros gravaram o nome do componente Lucide ("SmilePlus") em vez
  // do nome do arquivo ("smile-plus"), e a imagem dava 404. Normalizamos aqui
  // para que o app nao dependa de como o valor foi digitado.
  const arquivo = valor
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
  // 'sparkles' veio de cadastros antigos e não tem arquivo próprio.
  return `/assets/taxonomy-icons/${arquivo === 'sparkles' ? 'broom' : arquivo}.svg`;
}

export function categoryAvatar(professional: Pick<Professional, 'categories' | 'category'>): string {
  return `/assets/avatars/${slugDaCategoria(professional)}.png`;
}

export function categoryCover(professional: Pick<Professional, 'categories' | 'category'>): string {
  return `/assets/covers/${slugDaCategoria(professional)}.png`;
}
