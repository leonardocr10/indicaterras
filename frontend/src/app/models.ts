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
  type: 'NEW_RESIDENT' | 'REPORT';
  title: string;
  subtitle: string;
  link: string;
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
