import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type NearbySort = 'distance' | 'recommended' | 'rating' | 'reviews' | 'az';

export interface NearbyQuery {
  lat?: number | null;
  lng?: number | null;
  /** Raio em km. Só é aplicado quando há coordenada do cliente. */
  radius?: number | null;
  categorySlug?: string;
  serviceSlug?: string;
  minRating?: number;
  recommended?: boolean;
  sort?: NearbySort;
  search?: string;
  page?: number;
  limit?: number;
}

type LinhaDistancia = { id: string; distanceKm: number | null };

@Injectable()
export class NearbyProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Profissionais visíveis no app, opcionalmente ordenados por proximidade.
   *
   * A distância vem do centroide do bairro do profissional, então é aproximada:
   * quem está no mesmo bairro divide o mesmo ponto. Quem não tem coordenada não
   * recebe distância estimada — fica com `distanceKm` nulo e, quando há raio,
   * sai do resultado (contabilizado em `withoutLocation`).
   */
  async search(query: NearbyQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const temLocalizacao = this.coordenadaValida(query.lat) && this.coordenadaValida(query.lng);

    const candidatos = await this.prisma.professional.findMany({
      where: this.filtroVisibilidade(query),
      include: {
        professionalCategories: { include: { category: true } },
        professionalServices: { include: { categoryService: true } },
        recommendations: true,
        reviews: { select: { rating: true } },
      },
      orderBy: { name: 'asc' },
    });

    const distancias = temLocalizacao ? await this.distancias(query.lat!, query.lng!) : new Map<string, number | null>();

    let itens = candidatos.map((profissional) => {
      const notas = profissional.reviews.map((review) => review.rating);
      const rating = notas.length ? notas.reduce((total, nota) => total + nota, 0) / notas.length : 0;
      return {
        id: profissional.id,
        name: profissional.name,
        companyName: profissional.companyName ?? '',
        category: profissional.professionalCategories[0]?.category.name ?? '',
        categories: profissional.professionalCategories.map((item) => ({ id: item.category.id, name: item.category.name, slug: item.category.slug })),
        categoryIds: profissional.professionalCategories.map((item) => item.categoryId),
        serviceIds: profissional.professionalServices.map((item) => item.categoryServiceId),
        services: profissional.professionalServices.map((item) => item.categoryService.name),
        serviceDetails: profissional.professionalServices.map((item) => ({ id: item.categoryService.id, categoryId: item.categoryService.categoryId, name: item.categoryService.name, slug: item.categoryService.slug, aliases: [] })),
        rating: Number(rating.toFixed(1)),
        reviewCount: notas.length,
        recommendationCount: profissional.recommendations.length,
        city: profissional.city,
        neighborhood: profissional.neighborhood,
        bio: profissional.bio ?? '',
        phone: profissional.phone,
        whatsapp: profissional.whatsapp ?? '',
        instagram: profissional.instagram ?? '',
        avatar: profissional.avatar ?? '',
        coverImage: profissional.coverImage ?? '',
        featured: profissional.featured,
        condominiumId: '',
        // Aproximada pelo bairro: a interface precisa exibir com "~".
        distanceKm: distancias.get(profissional.id) ?? null,
        approximateDistance: true,
      };
    });

    if (query.minRating) itens = itens.filter((item) => item.rating >= query.minRating!);
    if (query.recommended) itens = itens.filter((item) => item.recommendationCount > 0);

    const semLocalizacao = itens.filter((item) => item.distanceKm === null);
    const foraDoRaio: typeof itens = [];
    if (temLocalizacao && query.radius) {
      itens = itens.filter((item) => {
        if (item.distanceKm === null) return false;
        const dentro = item.distanceKm <= query.radius!;
        if (!dentro) foraDoRaio.push(item);
        return dentro;
      });
    }

    itens.sort(this.comparador(query.sort ?? (temLocalizacao ? 'distance' : 'recommended')));

    const total = itens.length;
    const inicio = (page - 1) * limit;
    return {
      items: itens.slice(inicio, inicio + limit),
      total,
      page,
      limit,
      hasLocation: temLocalizacao,
      radius: query.radius ?? null,
      /** Quantos ficaram de fora por não ter coordenada, para a tela poder avisar. */
      withoutLocation: temLocalizacao && query.radius ? semLocalizacao.length : 0,
      outsideRadius: foraDoRaio.length,
    };
  }

  /** Só entra na listagem quem está ativo e sem punição vigente de moderação. */
  private filtroVisibilidade(query: NearbyQuery): Prisma.ProfessionalWhereInput {
    const agora = new Date();
    const filtro: Prisma.ProfessionalWhereInput = {
      active: true,
      actions: {
        none: {
          active: true,
          action: { in: ['HIDE', 'SUSPEND_7', 'SUSPEND_30', 'BLOCK'] },
          OR: [{ endsAt: null }, { endsAt: { gt: agora } }],
        },
      },
    };
    if (query.categorySlug) filtro.professionalCategories = { some: { category: { slug: query.categorySlug } } };
    if (query.serviceSlug) filtro.professionalServices = { some: { categoryService: { slug: query.serviceSlug } } };
    if (query.search?.trim()) {
      const termo = query.search.trim();
      filtro.OR = [
        { name: { contains: termo } },
        { companyName: { contains: termo } },
        { bio: { contains: termo } },
        { neighborhood: { contains: termo } },
        { professionalCategories: { some: { category: { name: { contains: termo } } } } },
        { professionalServices: { some: { categoryService: { name: { contains: termo } } } } },
      ];
    }
    return filtro;
  }

  /** Distância em km calculada pelo MySQL, conforme o padrão do projeto. */
  private async distancias(lat: number, lng: number) {
    const linhas = await this.prisma.$queryRaw<LinhaDistancia[]>`
      SELECT id,
             ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat})) / 1000 AS distanceKm
      FROM Professional
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `;
    return new Map(linhas.map((linha) => [linha.id, linha.distanceKm === null ? null : Number(Number(linha.distanceKm).toFixed(1))]));
  }

  private comparador(sort: NearbySort) {
    const porReputacao = (esquerda: { recommendationCount: number; rating: number; reviewCount: number }, direita: typeof esquerda) =>
      direita.recommendationCount - esquerda.recommendationCount || direita.rating - esquerda.rating || direita.reviewCount - esquerda.reviewCount;

    return (esquerda: { name: string; rating: number; reviewCount: number; recommendationCount: number; distanceKm: number | null }, direita: typeof esquerda) => {
      switch (sort) {
        case 'distance': {
          // Sem coordenada vai para o fim, nunca para o topo com distância zero.
          if (esquerda.distanceKm === null && direita.distanceKm === null) return porReputacao(esquerda, direita);
          if (esquerda.distanceKm === null) return 1;
          if (direita.distanceKm === null) return -1;
          // Mesmo bairro empata: a reputação decide, senão a ordem seria arbitrária.
          return esquerda.distanceKm - direita.distanceKm || porReputacao(esquerda, direita);
        }
        case 'rating':
          return direita.rating - esquerda.rating || direita.reviewCount - esquerda.reviewCount;
        case 'reviews':
          return direita.reviewCount - esquerda.reviewCount || direita.rating - esquerda.rating;
        case 'az':
          return esquerda.name.localeCompare(direita.name, 'pt-BR');
        default:
          return porReputacao(esquerda, direita);
      }
    };
  }

  private coordenadaValida(valor: number | null | undefined): valor is number {
    return typeof valor === 'number' && Number.isFinite(valor) && Math.abs(valor) <= 180;
  }
}
