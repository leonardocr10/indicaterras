import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

type GroupRecord = { id: string; name: string; slug: string };
export type CategoryRecord = { id: string; name: string; slug: string; group: GroupRecord | null; services: Array<{ id: string; categoryId: string; name: string; slug: string; aliases: Array<{ alias: string }> }> };
export type GroupedCategory = { id: string; name: string; slug: string };

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async groups() {
    return this.prisma.categoryGroup.findMany({
      where: { active: true },
      include: { categories: { where: { active: true }, include: { services: { where: { active: true }, orderBy: { displayOrder: 'asc' } } }, orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Categorias ativas com serviços e aliases — usada tanto pelo matcher local quanto para montar os candidatos enviados à IA. */
  async activeCategories(): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { active: true },
      include: { group: true, services: { where: { active: true }, include: { aliases: true }, orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    }) as Promise<CategoryRecord[]>;
  }

  /** Profissionais compatíveis com uma categoria (e, se informados, com prioridade para os serviços exatos). Reaproveitada pelo matcher local e pela camada de IA. */
  async professionalsForCategory(category: GroupedCategory, serviceIds: string[]) {
    const professionals = await this.prisma.professional.findMany({
      where: { active: true, professionalCategories: { some: { categoryId: category.id } } },
      include: { professionalCategories: { include: { category: true } }, professionalServices: { include: { categoryService: true } }, recommendations: true, reviews: true },
    });
    return professionals
      .map((professional) => ({
        professional,
        exactService: professional.professionalServices.some((item) => serviceIds.includes(item.categoryServiceId)),
        rating: professional.reviews.length ? professional.reviews.reduce((total, review) => total + review.rating, 0) / professional.reviews.length : 0,
      }))
      .sort((left, right) => Number(right.exactService) - Number(left.exactService) || right.professional.recommendations.length - left.professional.recommendations.length || right.rating - left.rating || right.professional.reviews.length - left.professional.reviews.length)
      .slice(0, 6)
      .map(({ professional, rating }) => ({
        id: professional.id,
        name: professional.name,
        companyName: professional.companyName ?? '',
        categoryId: category.id,
        category: category.name,
        categoryIds: professional.professionalCategories.map((item) => item.categoryId),
        categories: professional.professionalCategories.map((item) => ({ id: item.category.id, name: item.category.name, slug: item.category.slug })),
        serviceIds: professional.professionalServices.map((item) => item.categoryServiceId),
        serviceDetails: professional.professionalServices.map((item) => ({ id: item.categoryService.id, categoryId: item.categoryService.categoryId, name: item.categoryService.name, slug: item.categoryService.slug, aliases: [] })),
        services: professional.professionalServices.map((item) => item.categoryService.name),
        rating: Number(rating.toFixed(1)), reviewCount: professional.reviews.length, recommendationCount: professional.recommendations.length,
        city: professional.city, neighborhood: professional.neighborhood, condominiumId: '', bio: professional.bio ?? '', whatsapp: professional.whatsapp ?? '', phone: professional.phone, instagram: professional.instagram ?? '', avatar: professional.avatar ?? '', coverImage: professional.coverImage ?? '', featured: professional.featured,
      }));
  }

  async match(query: string) {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return this.empty(normalizedQuery);
    const categories = await this.activeCategories();
    const tokens = this.tokens(normalizedQuery);
    const matches = categories.flatMap((category) => category.services.map((service) => ({ category, service, score: this.score(normalizedQuery, tokens, category, service) })))
      .filter((item) => item.score >= 40)
      .sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name, 'pt-BR'));
    const best = matches[0];
    if (!best) return this.empty(normalizedQuery, tokens, categories);
    const sameCategory = matches.filter((item) => item.category.id === best.category.id);
    const services = sameCategory.slice(0, 3).map(({ service, score }) => ({ id: service.id, categoryId: best.category.id, name: service.name, slug: service.slug, score }));
    const alternativeServices = matches.filter((item) => item.service.id !== best.service.id).slice(0, 4)
      .map(({ service, score }) => ({ id: service.id, categoryId: service.categoryId, name: service.name, slug: service.slug, score }));
    const serviceIds = services.map((service) => service.id);
    const compatibleProfessionals = await this.professionalsForCategory(best.category, serviceIds);
    return { query, normalizedQuery, keywords: tokens, confidence: Number(Math.min(1, best.score / 100).toFixed(2)), group: best.category.group, category: { id: best.category.id, name: best.category.name, slug: best.category.slug }, services, alternativeServices, professionals: compatibleProfessionals };
  }

  private empty(normalizedQuery: string, keywords = this.tokens(normalizedQuery), categories: CategoryRecord[] = []) {
    return { query: normalizedQuery, normalizedQuery, keywords, confidence: 0, group: null, category: null, services: [], alternativeServices: categories.slice(0, 4).flatMap((category) => category.services.slice(0, 1).map((service) => ({ id: service.id, categoryId: category.id, name: service.name, slug: service.slug, score: 0 }))), professionals: [] };
  }

  private score(query: string, tokens: string[], category: CategoryRecord, service: CategoryRecord['services'][number]) {
    const phrases = [service.name, service.slug.replace(/-/g, ' '), ...service.aliases.map((item) => item.alias)].map((value) => this.normalize(value));
    let score = 0;
    for (const phrase of phrases) {
      if (!phrase) continue;
      if (phrase === query) score = Math.max(score, 100);
      else if (query.includes(phrase) && phrase.length > 2) score = Math.max(score, phrase.includes(' ') ? 90 : 75);
      else if (phrase.split(' ').filter((word) => word.length > 2 && tokens.includes(word)).length >= 2) score = Math.max(score, 60);
    }
    const categoryName = this.normalize(category.name);
    if (!score && (query.includes(categoryName) || tokens.some((token) => token.length > 3 && categoryName.includes(token)))) score = 40;
    return score + Math.min(12, tokens.filter((token) => phrases.some((phrase) => phrase.includes(token))).length * 4);
  }

  private tokens(value: string) { return [...new Set(value.split(' ').filter((token) => token.length > 2 && !['meu', 'minha', 'para', 'com', 'que', 'esta', 'preciso'].includes(token)))]; }
  private normalize(value: string) { return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
}
