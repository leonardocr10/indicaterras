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

export interface ApiResponse<T> {
  data: T;
}
