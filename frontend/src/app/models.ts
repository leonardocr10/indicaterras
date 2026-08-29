export interface Condominium {
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

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  services: CategoryService[];
}

export interface CategoryService {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  active: boolean;
  aliases: string[];
}

export interface Professional {
  id: string;
  name: string;
  companyName?: string;
  categoryId: string;
  category: string;
  categoryIds: string[];
  categories: Category[];
  serviceIds: string[];
  serviceDetails: CategoryService[];
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
  matchesLocation?: boolean;
  /** PENDING enquanto a administração não liberou o cadastro. */
  approvalStatus?: string;
  /** Falso quando ainda faltam serviços ou jornada para entrar na fila. */
  profileComplete?: boolean;
  /** Falso quando a administração suspendeu ou bloqueou o cadastro. */
  active?: boolean;
  /** Resumo da jornada. Sem jornada cadastrada, pede para consultar. */
  availability?: { today: boolean; text: string };
  /** Centroide do bairro; permite calcular a distância quando há localização. */
  latitude?: number | null;
  longitude?: number | null;
  workingHours?: Array<{ days: number[]; start: string; end: string }>;
}

export interface Review {
  id: string;
  professionalId: string;
  condominiumId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceDate: string;
}

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export interface ProfessionalComment extends Review {
  userAvatar: string;
  images: string[];
  likes: number;
  liked: boolean;
  replies: CommentReply[];
}

export interface ComplaintRow {
  id: string;
  resident: string;
  residentInitials: string;
  residentPlace: string;
  professionalId: string;
  professional: string;
  professionalCategory: string;
  reason: string;
  description: string;
  date: string;
  time: string;
  status: string;
  channel: string;
}

export interface ComplaintEvent {
  id: string;
  at: string;
  label: string;
  detail?: string;
  kind: 'received' | 'status' | 'view' | 'action' | 'note';
}

export interface ComplaintDetails extends ComplaintRow {
  createdAt: string;
  images: string[];
  history: ComplaintEvent[];
  adminNote: string;
  notifyParties: boolean;
  professionalSummary: {
    id: string;
    name: string;
    category: string;
    avatar: string;
    rating: number;
    reviewCount: number;
    complaintCount: number;
    phone: string;
    whatsapp: string;
    status: string;
    actions: Array<{ id: string; label: string; createdAt: string; until: string | null }>;
  };
}

export interface ProfessionalWork {
  id: string;
  image: string;
  title: string;
  createdAt: string;
}

export interface HomePayload {
  condominium: Condominium;
  categories: Category[];
  featuredProfessionals: Professional[];
  user: {
    id: string;
    condominiumId: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
}

export interface DashboardPayload {
  stats: {
    residents: number;
    professionals: number;
    recommendations: number;
    reviews: number;
    categories: number;
  };
  indicationsByDay: number[];
  topProfessionals: Array<{ name: string; category: string; total: number }>;
  pending: {
    newResidents: number;
    reports: number;
  };
}

export interface PendingItem {
  id: string;
  type: 'NEW_RESIDENT' | 'NEW_PROFESSIONAL' | 'REPORT';
  title: string;
  subtitle: string;
  link: string;
  /** Id do usuário, para aprovar ou recusar direto da lista de pendências. */
  targetId?: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPayload {
  unreadCount: number;
  items: AppNotification[];
}

export interface Conversation {
  id: string;
  professional: Pick<Professional, 'id' | 'name'>;
  messages: Array<{ id: string; content: string; createdAt: string; readAt: string | null; sender: { id: string; name: string } }>;
}

export interface ProblemMatchResult {
  query?: string;
  normalizedQuery: string;
  keywords: string[];
  confidence: number;
  group: { id: string; name: string; slug: string } | null;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  services: Array<Pick<CategoryService, 'id' | 'categoryId' | 'name' | 'slug'> & { score?: number }>;
  alternativeServices?: Array<Pick<CategoryService, 'id' | 'categoryId' | 'name' | 'slug'> & { score?: number }>;
  professionals: Professional[];
}

export interface NearbyProfessional extends Professional {
  /** Distância aproximada em km, ou null quando o profissional não tem coordenada. */
  distanceKm: number | null;
  /** Sempre true: a coordenada vem do centroide do bairro, não do endereço. */
  approximateDistance: boolean;
  /** Coordenada do bairro, usada para o pino no mapa. Nula quando não há. */
  latitude: number | null;
  longitude: number | null;
  /** Resumo da jornada. `today` falso e o texto de consulta quando não há jornada. */
  availability: { today: boolean; text: string };
}

export interface NearbyResult {
  items: NearbyProfessional[];
  total: number;
  page: number;
  limit: number;
  hasLocation: boolean;
  radius: number | null;
  /** Quantos ficaram de fora por não ter coordenada cadastrada. */
  withoutLocation: number;
  outsideRadius: number;
}

export interface AiProblemAnalysisResult {
  usedAi: boolean;
  usedFallback: boolean;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  message: string | null;
  group: { id: string; name: string; slug: string } | null;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  services: Array<Pick<CategoryService, 'id' | 'categoryId' | 'name' | 'slug'> & { score?: number }>;
  alternativeServices: Array<Pick<CategoryService, 'id' | 'categoryId' | 'name' | 'slug'> & { score?: number }>;
  normalizedProblem: string;
  professionals: Professional[];
  suggestedActions: string[];
}

export interface AiPublicConfig {
  enabled: boolean;
  homeTitle: string | null;
  homeSubtitle: string | null;
  homePlaceholder: string | null;
  homeHelperText: string | null;
}

export interface AiSettings {
  id: string;
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string | null;
  apiKeySource: 'env' | 'database' | 'none';
  endpointUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  problemAnalysisEnabled: boolean;
  categorySuggestionEnabled: boolean;
  serviceSuggestionEnabled: boolean;
  summaryEnabled: boolean;
  clarificationEnabled: boolean;
  fallbackKeywordsEnabled: boolean;
  keywordFirstEnabled: boolean;
  keywordFirstConfidence: number;
  minimumConfidence: number;
  autoApplyConfidence: number;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  maxInputLength: number;
  homeTitle: string | null;
  homeSubtitle: string | null;
  homePlaceholder: string | null;
  homeHelperText: string | null;
  successMessage: string | null;
  lowConfidenceMessage: string | null;
  fallbackMessage: string | null;
}

export interface AiAnalysisLogRow {
  id: string;
  userId: string | null;
  provider: string | null;
  model: string | null;
  inputText: string;
  normalizedText: string | null;
  matchedCategoryId: string | null;
  confidence: number | null;
  usedAi: boolean;
  usedFallback: boolean;
  needsClarification: boolean;
  responseJson: unknown;
  status: string;
  errorMessage: string | null;
  latencyMs: number | null;
  adminFeedback: string | null;
  createdAt: string;
}

export interface AiUsageSummary {
  today: { total: number; aiCalls: number; fallbackCalls: number; errors: number; keywordHits?: number };
  month: { total: number; aiCalls: number; fallbackCalls: number; errors: number; keywordHits?: number };
  averageConfidence: number | null;
  averageLatencyMs: number | null;
}

export interface ServiceRequestMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  url: string;
  storagePath: string;
  displayOrder: number;
  createdAt: string;
}

export interface ServiceRequestRecord {
  id: string;
  clientId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  serviceIds: string[];
  services: Array<Pick<CategoryService, 'id' | 'categoryId' | 'name' | 'slug' | 'icon'>>;
  urgency: 'EMERGENCY' | 'TODAY' | 'NEXT_DAYS' | 'NO_RUSH';
  preferredDate: string;
  preferredPeriod: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY' | '';
  budgetType: 'FIXED' | 'RANGE' | 'OPEN' | '';
  budgetMin: number | null;
  budgetMax: number | null;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  status: 'OPEN' | 'MATCHED' | 'CLOSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  closedAt: string;
  media: ServiceRequestMedia[];
}

/** Painel do profissional: tudo vem de `GET /me/professional/dashboard`. */
export interface ProfessionalDashboard {
  profile: {
    id: string;
    name: string;
    companyName: string;
    avatar: string;
    coverImage: string;
    specialty: string;
    city: string;
    neighborhood: string;
    whatsapp: string;
    approvalStatus: string;
    active: boolean;
  };
  metrics: { rating: number; reviews: number; recommendations: number; favorites: number; views: number };
  overview: {
    unreadMessages: number;
    pendingRequests: number;
    profileCompletion: number;
    missingProfileItems: string[];
    availableToday: boolean;
    availabilityText: string;
  };
  portfolio: Array<{ id: string; image: string; title: string }>;
  /** Só quantidade e iniciais: nenhum dado pessoal do cliente aparece aqui. */
  favoriteClients: { total: number; preview: Array<{ id: string; initial: string }> };
  recentReviews: Array<{ id: string; rating: number; comment: string; createdAt: string; author: string }>;
}
