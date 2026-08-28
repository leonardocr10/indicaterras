import { Injectable } from '@nestjs/common';
import { SERVICE_ALIASES } from './service-aliases';

type MatchableCategory = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  services: MatchableService[];
};

type MatchableService = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  active: boolean;
  aliases: string[];
};

type MatchableProfessional = {
  id: string;
  name: string;
  category: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  serviceDetails: MatchableService[];
  rating: number;
  reviewCount: number;
  recommendationCount: number;
};

@Injectable()
export class ProblemMatcherService {
  matchProblem(
    query: string,
    categories: MatchableCategory[],
    professionals: MatchableProfessional[],
  ) {
    const normalizedQuery = this.normalize(query);
    const keywords = this.keywords(normalizedQuery);
    if (!normalizedQuery) {
      return {
        normalizedQuery,
        keywords,
        confidence: 0,
        category: null,
        services: [],
        professionals: [],
      };
    }

    const serviceMatches = categories
      .filter((category) => category.active)
      .flatMap((category) =>
        category.services
          .filter((service) => service.active)
          .map((service) => {
            const score = this.serviceScore(normalizedQuery, keywords, category, service);
            return { category, service, score };
          }),
      )
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.service.name.localeCompare(right.service.name, 'pt-BR'));

    const bestCategory =
      serviceMatches.reduce<{ category: MatchableCategory; score: number } | null>((best, entry) => {
        const nextScore = entry.score + (best?.category.id === entry.category.id ? 0 : 0);
        if (!best || nextScore > best.score) return { category: entry.category, score: nextScore };
        return best;
      }, null)?.category ?? null;

    const services = serviceMatches
      .filter((entry) => !bestCategory || entry.category.id === bestCategory.id)
      .slice(0, 3)
      .map((entry) => entry.service);

    const professionalIds = new Set(services.map((service) => service.id));
    const matchedProfessionals = professionals
      .filter(
        (professional) =>
          (!bestCategory || professional.categories.some((category) => category.id === bestCategory.id)) &&
          professional.serviceDetails.some((service) => professionalIds.has(service.id)),
      )
      .sort(
        (left, right) =>
          right.recommendationCount - left.recommendationCount ||
          right.rating - left.rating ||
          right.reviewCount - left.reviewCount ||
          left.name.localeCompare(right.name, 'pt-BR'),
      )
      .slice(0, 6);

    const confidence = Math.min(1, (serviceMatches[0]?.score ?? 0) / 12);

    return {
      normalizedQuery,
      keywords,
      confidence: Number(confidence.toFixed(2)),
      category: bestCategory
        ? {
            id: bestCategory.id,
            name: bestCategory.name,
            slug: bestCategory.slug,
          }
        : null,
      services: services.map((service) => ({
        id: service.id,
        categoryId: service.categoryId,
        name: service.name,
        slug: service.slug,
      })),
      professionals: matchedProfessionals,
    };
  }

  private serviceScore(
    normalizedQuery: string,
    keywords: string[],
    category: MatchableCategory,
    service: MatchableService,
  ) {
    const haystacks = [
      category.name,
      category.slug.replace(/-/g, ' '),
      service.name,
      service.slug.replace(/-/g, ' '),
      ...service.aliases,
      ...(SERVICE_ALIASES[service.slug] ?? []),
    ].map((value) => this.normalize(value));

    const matchedTerms = new Set<string>();
    let score = 0;

    for (const haystack of haystacks) {
      if (!haystack) continue;
      if (haystack === normalizedQuery) score += 8;
      else if (haystack.includes(normalizedQuery)) score += 6;

      for (const keyword of keywords) {
        if (haystack.includes(keyword)) matchedTerms.add(keyword);
      }
    }

    score += matchedTerms.size * 2;

    if (this.hasHint(normalizedQuery, ['chuveiro', 'ducha']) && this.hasHint(normalizedQuery, ['esquenta', 'resistencia', 'desarma', 'disjuntor'])) {
      if (category.slug === 'eletricista') score += 6;
      if (['chuveiro-eletrico', 'instalacao-de-chuveiro-e-torneira-eletrica', 'troca-de-resistencia-e-chuveiro', 'disjuntores-e-quadro-eletrico'].includes(service.slug)) {
        score += 8;
      }
    }

    return score;
  }

  private keywords(normalizedQuery: string) {
    const stopWords = new Set(['a', 'o', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'na', 'no', 'meu', 'minha', 'um', 'uma']);
    return [...new Set(normalizedQuery.split(' ').filter((term) => term.length > 1 && !stopWords.has(term)))];
  }

  private hasHint(query: string, terms: string[]) {
    return terms.some((term) => query.includes(term));
  }

  private normalize(value: string) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
