export type AppRole = 'SUPER_ADMIN' | 'CONDO_ADMIN' | 'RESIDENT' | 'PROFESSIONAL';

export interface DemoCondominium {
  id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  city: string;
  state: string;
  neighborhood: string;
  phone: string;
  email: string;
  active: boolean;
}

export interface DemoUser {
  id: string;
  condominiumId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: AppRole;
  emailVerified: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  active: boolean;
  block?: string;
  unit?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  services?: DemoCategoryService[];
}

export interface DemoCategoryService {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  active: boolean;
  aliases: string[];
}

export interface DemoProfessional {
  id: string;
  name: string;
  companyName?: string;
  categoryId: string;
  category: string;
  categoryIds: string[];
  categories: DemoCategory[];
  serviceIds: string[];
  serviceDetails: DemoCategoryService[];
  rating: number;
  reviewCount: number;
  recommendationCount: number;
  services: string[];
  city: string;
  neighborhood: string;
  condominiumId: string;
  bio: string;
  whatsapp: string;
  phone: string;
  instagram: string;
  avatar: string;
  coverImage: string;
  featured: boolean;
  /** Falso quando o cadastro foi desativado; o admin continua enxergando. */
  active?: boolean;
  /** Verdadeiro enquanto houver punição vigente de ocultar, suspender ou bloquear. */
  moderationHidden?: boolean;
  /** PENDING enquanto a administração não liberou o cadastro. */
  approvalStatus?: string;
  /** Blocos de atendimento: dias da semana (0 = domingo) e faixa de horário. */
  workingHours?: Array<{ days: number[]; start: string; end: string }>;
  /** Resumo da jornada para os cards. Sem jornada, pede para consultar. */
  availability?: { today: boolean; text: string };
  /** Centroide do bairro: permite calcular a distância quando há localização. */
  latitude?: number | null;
  longitude?: number | null;
  /** Falta algo para o cadastro entrar na fila de aprovação. */
  profileComplete?: boolean;
}

export interface DemoReview {
  id: string;
  userId?: string;
  professionalId: string;
  condominiumId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceDate: string;
}

export interface DemoRecommendation {
  id: string;
  professionalId: string;
  userId: string;
  condominiumId: string;
  recommended: boolean;
  comment: string;
  rating?: number;
  createdAt: string;
  status: 'ACTIVE' | 'REMOVED';
}

export const demoCondominiums: DemoCondominium[] = [
  {
    id: 'condo-1',
    name: 'Terras Alphas',
    slug: 'terras-alphas',
    logo: '/uploads/branding/terras-alphas-logo.svg',
    coverImage: '/uploads/branding/terras-alphas-cover.jpg',
    primaryColor: '#0F5A3C',
    secondaryColor: '#F4C542',
    address: 'Av. das Palmeiras, 1000',
    city: 'Uberlandia',
    state: 'MG',
    neighborhood: '',
    phone: '(34) 99999-0000',
    email: 'contato@terrasalphas.com.br',
    active: true,
  },
];

export const demoUsers: DemoUser[] = [
  {
    id: 'user-admin',
    condominiumId: 'condo-1',
    name: 'Administrador',
    email: 'admin@terrasalphas.com.br',
    phone: '(34) 99999-1111',
    password: '123456',
    role: 'CONDO_ADMIN',
    emailVerified: true,
    approvalStatus: 'APPROVED',
    active: true,
  },
  {
    id: 'user-leonardo',
    condominiumId: 'condo-1',
    name: 'Leonardo',
    email: 'leonardo@terrasalphas.com.br',
    phone: '(34) 99999-2222',
    password: '123456',
    role: 'RESIDENT',
    emailVerified: true,
    approvalStatus: 'APPROVED',
    active: true,
  },
];

export const demoCategories: DemoCategory[] = [
  ['cat-1', 'Eletricista', 'eletricista', 'bolt'],
  ['cat-2', 'Encanador(a)', 'encanador', 'droplets'],
  ['cat-3', 'Pedreiro(a)', 'pedreiro', 'hammer'],
  ['cat-4', 'Pintor(a)', 'pintor', 'paintbrush'],
  ['cat-5', 'Diarista', 'diarista', 'sparkles'],
  ['cat-6', 'Ar-condicionado', 'ar-condicionado', 'fan'],
  ['cat-7', 'Jardineiro(a)', 'jardineiro', 'leaf'],
  ['cat-8', 'Montador(a)', 'montador', 'package'],
  ['cat-9', 'Mais categorias', 'mais', 'grid'],
].map(([id, name, slug, icon], index) => ({ id, name, slug, icon, displayOrder: index + 1, active: true }));

const serviceGroups: Array<[string, string, string[]][]> = [
  [['Tomada', 'plug', ['tomadas', 'plug', 'ponto eletrico', 'ponto de tomada']], ['Chuveiro', 'shower-head', ['chuveiros', 'ducha', 'ducha eletrica']], ['Lampada', 'lightbulb', ['lampada', 'lampadas', 'luz', 'luminaria']], ['Iluminacao', 'lamp', ['luz', 'iluminacao interna', 'iluminacao externa']], ['Disjuntor', 'panel-top', ['disjuntores', 'quadro', 'quadro eletrico']], ['Fiacao', 'cable', ['fios', 'cabeamento', 'instalacao eletrica']], ['Quadro eletrico', 'panels-top-left', ['painel eletrico', 'quadro de energia']], ['Ventilador de teto', 'fan', ['ventilador', 'instalar ventilador']], ['Instalacao eletrica', 'bolt', ['instalacoes eletricas', 'eletrica residencial']], ['Manutencao eletrica', 'wrench', ['manutencao', 'reparo eletrico']]],
  [['Vazamento', 'droplets', ['vazamentos', 'cano vazando']], ['Torneira', 'faucet', ['torneiras']], ['Sifao', 'pipette', ['sifoes']], ['Vaso sanitario', 'bath', ['vaso', 'privada']], ["Caixa d'agua", 'container', ['caixa de agua']], ['Registro', 'circle-dot', ['registro de agua']], ['Chuveiro', 'shower-head', ['ducha']], ['Tubulacao', 'waypoints', ['cano', 'canos']], ['Desentupimento', 'unplug', ['desentupir', 'entupimento']], ['Manutencao hidraulica', 'wrench', ['hidraulica', 'reparo hidraulico']]],
  [['Alvenaria', 'brick-wall', ['tijolo']], ['Reboco', 'square-stack', ['rebocar']], ['Contrapiso', 'layers', ['contra piso']], ['Piso', 'grid-2x2', ['pisos']], ['Revestimento', 'panels-top-left', ['revestimentos']], ['Muro', 'brick-wall', ['muros']], ['Reforma', 'hammer', ['reformas']], ['Demolicao', 'construction', ['demolir']]],
  [['Pintura interna', 'paint-roller', ['pintar interior']], ['Pintura externa', 'paint-roller', ['pintar fachada']], ['Massa corrida', 'paintbrush', ['massa']], ['Textura', 'palette', ['texturizacao']], ['Pintura de muro', 'paint-bucket', ['pintar muro']], ['Pintura de portao', 'paintbrush', ['pintar portao']]],
  [['Limpeza residencial', 'sparkles', ['limpeza de casa']], ['Limpeza pesada', 'brush-cleaning', ['faxina pesada']], ['Limpeza pos-obra', 'hard-hat', ['pos obra']], ['Organizacao', 'boxes', ['organizar']], ['Faxina', 'sparkles', ['diaria', 'diarista']], ['Limpeza de vidros', 'panels-top-left', ['limpar vidro']]],
  [['Instalacao', 'fan', ['instalar ar condicionado']], ['Manutencao', 'wrench', ['conserto de ar']], ['Higienizacao', 'sparkles', ['higienizar ar']], ['Limpeza', 'brush-cleaning', ['limpar ar']], ['Carga de gas', 'gauge', ['gas do ar']], ['Desinstalacao', 'unplug', ['retirar ar condicionado']]],
  [['Poda', 'scissors', ['podar']], ['Corte de grama', 'leaf', ['cortar grama']], ['Plantio', 'sprout', ['plantar']], ['Adubacao', 'flower-2', ['adubo']], ['Paisagismo', 'trees', ['paisagista']], ['Manutencao de jardim', 'leaf', ['cuidar jardim']]],
  [['Montagem de moveis', 'package', ['montar movel', 'montador de moveis']], ['Desmontagem de moveis', 'package-open', ['desmontar movel']], ['Instalacao de painel', 'panel-top', ['painel de tv']], ['Instalacao de prateleira', 'rows-3', ['prateleira']], ['Instalacao de suporte', 'monitor-up', ['suporte de tv']]],
];

export const demoCategoryServices: DemoCategoryService[] = serviceGroups.flatMap((services, categoryIndex) =>
  services.map(([name, icon, aliases], serviceIndex) => ({
    id: `service-${categoryIndex + 1}-${serviceIndex + 1}`,
    categoryId: `cat-${categoryIndex + 1}`,
    name,
    slug: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    icon,
    displayOrder: serviceIndex + 1,
    active: true,
    aliases,
  })),
);

for (const category of demoCategories) {
  category.services = demoCategoryServices.filter((service) => service.categoryId === category.id);
}

function professionalTaxonomy(categoryIds: string[], serviceNames: string[]) {
  const serviceDetails = demoCategoryServices.filter((service) => categoryIds.includes(service.categoryId) && serviceNames.some((name) => service.slug === name));
  return { categoryIds, categories: demoCategories.filter((category) => categoryIds.includes(category.id)), serviceIds: serviceDetails.map((service) => service.id), serviceDetails };
}

export const demoProfessionals: DemoProfessional[] = [
  {
    id: 'pro-1',
    name: 'Joao Carlos',
    categoryId: 'cat-1',
    category: 'Eletricista',
    ...professionalTaxonomy(['cat-1'], ['instalacao-eletrica', 'manutencao-eletrica', 'chuveiro', 'tomada']),
    rating: 4.9,
    reviewCount: 23,
    recommendationCount: 23,
    services: ['Instalacoes eletricas', 'Manutencao', 'Chuveiros'],
    city: 'Uberlandia',
    neighborhood: 'Terras Alphas',
    condominiumId: 'condo-1',
    bio: 'Eletricista profissional com mais de 10 anos de experiencia em instalacoes residenciais e prediais.',
    whatsapp: '5534999991001',
    phone: '34999991001',
    instagram: '@joaocarlos.eletrica',
    avatar: '/uploads/professionals/joao-carlos-avatar.jpg',
    coverImage: '/uploads/professionals/joao-carlos-cover.jpg',
    featured: true,
  },
  {
    id: 'pro-2',
    name: 'Carlos Henrique',
    categoryId: 'cat-1',
    category: 'Eletricista',
    ...professionalTaxonomy(['cat-1'], ['fiacao', 'quadro-eletrico', 'chuveiro']),
    rating: 4.7,
    reviewCount: 11,
    recommendationCount: 11,
    services: ['Fiacao', 'Padrao Cemig', 'Chuveiros'],
    city: 'Uberlandia',
    neighborhood: 'Terras Alphas',
    condominiumId: 'condo-1',
    bio: 'Especialista em instalacoes e manutencao eletrica residencial.',
    whatsapp: '5534999991002',
    phone: '34999991002',
    instagram: '@carlosh.eletrica',
    avatar: '/uploads/professionals/carlos-avatar.jpg',
    coverImage: '/uploads/professionals/carlos-cover.jpg',
    featured: true,
  },
  {
    id: 'pro-3',
    name: 'Marcos Eletricista',
    categoryId: 'cat-1',
    category: 'Eletricista',
    ...professionalTaxonomy(['cat-1'], ['tomada', 'iluminacao', 'disjuntor']),
    rating: 4.6,
    reviewCount: 9,
    recommendationCount: 9,
    services: ['Tomadas', 'Iluminacao', 'Automacao'],
    city: 'Uberlandia',
    neighborhood: 'Terras Alphas',
    condominiumId: 'condo-1',
    bio: 'Atendimento rapido para pequenas e medias demandas eletricas.',
    whatsapp: '5534999991003',
    phone: '34999991003',
    instagram: '@marcoseletricista',
    avatar: '/uploads/professionals/marcos-avatar.jpg',
    coverImage: '/uploads/professionals/marcos-cover.jpg',
    featured: false,
  },
  {
    id: 'pro-4',
    name: 'Luciana Diarista',
    categoryId: 'cat-5',
    category: 'Diarista',
    ...professionalTaxonomy(['cat-5'], ['limpeza-pesada', 'faxina', 'limpeza-pos-obra']),
    rating: 4.8,
    reviewCount: 15,
    recommendationCount: 8,
    services: ['Limpeza pesada', 'Faxina semanal', 'Pos-obra'],
    city: 'Uberlandia',
    neighborhood: 'Gavea',
    condominiumId: 'condo-1',
    bio: 'Organizacao, cuidado e confianca para a rotina da sua casa.',
    whatsapp: '5534999991004',
    phone: '34999991004',
    instagram: '@luciana.diarista',
    avatar: '/uploads/professionals/luciana-avatar.jpg',
    coverImage: '/uploads/professionals/luciana-cover.jpg',
    featured: true,
  },
  {
    id: 'pro-5',
    name: 'Jardins & Cia',
    categoryId: 'cat-7',
    category: 'Jardineiro(a)',
    ...professionalTaxonomy(['cat-7'], ['poda', 'paisagismo', 'manutencao-de-jardim']),
    rating: 4.8,
    reviewCount: 8,
    recommendationCount: 12,
    services: ['Poda', 'Paisagismo', 'Manutencao'],
    city: 'Uberlandia',
    neighborhood: 'Gavea',
    condominiumId: 'condo-1',
    bio: 'Cuidado especializado para jardins e areas verdes.',
    whatsapp: '5534999991005',
    phone: '34999991005',
    instagram: '@jardinsecia',
    avatar: '/uploads/professionals/jardins-avatar.jpg',
    coverImage: '/uploads/professionals/jardins-cover.jpg',
    featured: false,
  },
  {
    id: 'pro-6',
    name: 'Marido de Aluguel Max',
    categoryId: 'cat-8',
    category: 'Montador(a)',
    ...professionalTaxonomy(['cat-1', 'cat-2', 'cat-8'], ['tomada', 'torneira', 'montagem-de-moveis', 'instalacao-de-prateleira']),
    rating: 4.5,
    reviewCount: 6,
    recommendationCount: 10,
    services: ['Montagem de moveis', 'Pequenos reparos', 'Instalacoes'],
    city: 'Uberlandia',
    neighborhood: 'Centro',
    condominiumId: 'condo-1',
    bio: 'Resolvo pequenos reparos e montagens com praticidade.',
    whatsapp: '5534999991006',
    phone: '34999991006',
    instagram: '@max.maridoaluguel',
    avatar: '/uploads/professionals/max-avatar.jpg',
    coverImage: '/uploads/professionals/max-cover.jpg',
    featured: true,
  },
];

export const demoReviews: DemoReview[] = [
  {
    id: 'rev-1',
    professionalId: 'pro-1',
    condominiumId: 'condo-1',
    userName: 'Leonardo A.',
    rating: 5,
    comment: 'Excelente profissional, chegou no horario e resolveu rapidamente. Super recomendo!',
    createdAt: '2024-05-10T12:00:00.000Z',
    serviceDate: '2026-05-09T12:00:00.000Z',
  },
  {
    id: 'rev-2',
    professionalId: 'pro-1',
    condominiumId: 'condo-1',
    userName: 'Mariana F.',
    rating: 5,
    comment: 'Muito atencioso e bem profissional. Serviço limpo e de qualidade.',
    createdAt: '2024-05-02T12:00:00.000Z',
    serviceDate: '2026-05-11T12:00:00.000Z',
  },
];

export const demoRecommendations: DemoRecommendation[] = [
  {
    id: 'rec-1',
    professionalId: 'pro-1',
    userId: 'user-leonardo',
    condominiumId: 'condo-1',
    recommended: true,
    comment: 'Resolveu a instalacao do chuveiro com rapidez.',
    createdAt: '2026-05-10T12:00:00.000Z',
    status: 'ACTIVE',
  },
  {
    id: 'rec-2',
    professionalId: 'pro-4',
    userId: 'user-leonardo',
    condominiumId: 'condo-1',
    recommended: true,
    comment: 'Muito caprichosa e organizada.',
    createdAt: '2024-05-08T12:00:00.000Z',
    status: 'ACTIVE',
  },
  {
    id: 'rec-3',
    professionalId: 'pro-6',
    userId: 'user-leonardo',
    condominiumId: 'condo-1',
    recommended: true,
    comment: 'Profissional de confiança para pequenos reparos.',
    createdAt: '2024-05-05T12:00:00.000Z',
    status: 'ACTIVE',
  },
];
