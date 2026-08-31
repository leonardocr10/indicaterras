import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Raio usado quando o profissional ainda não informou até onde atende. */
const RAIO_PADRAO_KM = 15;

interface LinhaDeDistancia {
  id: string;
  distanceKm: number | null;
}

/**
 * Oportunidades: as solicitações abertas que fazem sentido para um profissional.
 *
 * "Fazem sentido" é filtro, não ranking: mesma categoria (ou um serviço que ele
 * declara) e dentro do raio que ele mesmo informou. Ordena da mais urgente para
 * a mais antiga, porque é assim que o profissional decide o que atender.
 *
 * Privacidade: a solicitação carrega endereço completo do cliente, mas daqui só
 * saem bairro, cidade e distância aproximada. Nome, telefone, rua e número ficam
 * no banco — o profissional só recebe isso quando o serviço for combinado.
 */
@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(userId: string, page = 1, limit = 10) {
    if (!userId) throw new NotFoundException('Informe o usuário.');

    const profissional = await this.prisma.professional.findFirst({
      where: { userId },
      select: {
        id: true,
        active: true,
        approvalStatus: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        professionalCategories: { select: { categoryId: true } },
        professionalServices: { select: { categoryServiceId: true } },
      },
    });
    if (!profissional) throw new NotFoundException('Não encontramos um perfil profissional para esta conta.');

    const paginaAtual = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const porPagina = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 10, 1), 50);
    const raioKm = profissional.serviceRadiusKm ?? RAIO_PADRAO_KM;

    // Perfil suspenso ou ainda em análise não recebe oportunidade: apareceria
    // para o profissional algo que ele não pode atender.
    const habilitado = profissional.active && profissional.approvalStatus === 'APPROVED';
    const categoriaIds = profissional.professionalCategories.map((item) => item.categoryId);
    const servicoIds = profissional.professionalServices.map((item) => item.categoryServiceId);

    if (!habilitado || (!categoriaIds.length && !servicoIds.length)) {
      return {
        total: 0,
        page: paginaAtual,
        limit: porPagina,
        radiusKm: raioKm,
        usingDefaultRadius: profissional.serviceRadiusKm === null,
        blocked: !habilitado,
        items: [],
      };
    }

    // O raio entra na consulta, nao depois dela: filtrar em memoria daria um
    // total maior do que a lista e faria o "ver mais" pular registros.
    const distancias = await this.distancias(profissional.latitude, profissional.longitude);
    const dentroDoRaio = [...distancias.entries()].filter(([, km]) => km !== null && km <= raioKm).map(([id]) => id);

    const compativel = {
      OR: [
        ...(categoriaIds.length ? [{ categoryId: { in: categoriaIds } }] : []),
        ...(servicoIds.length ? [{ services: { some: { categoryServiceId: { in: servicoIds } } } }] : []),
      ],
    };

    // Solicitacao sem coordenada entra mesmo assim: nao da para afirmar que
    // esta perto, mas esconder seria pior - o bairro se explica na tela.
    const alcance = distancias.size
      ? { OR: [{ id: { in: dentroDoRaio } }, { latitude: null }] }
      : {};

    const filtro = { status: 'OPEN' as const, AND: [compativel, alcance] };

    const [total, solicitacoes] = await Promise.all([
      this.prisma.serviceRequest.count({ where: filtro }),
      this.prisma.serviceRequest.findMany({
        where: filtro,
        // EMERGENCY vem primeiro porque o enum esta declarado nessa ordem.
        orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
        skip: (paginaAtual - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          title: true,
          description: true,
          urgency: true,
          preferredDate: true,
          preferredPeriod: true,
          neighborhood: true,
          city: true,
          state: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
          services: { select: { categoryService: { select: { id: true, name: true } } } },
          _count: { select: { media: true } },
        },
      }),
    ]);

    const itens = solicitacoes.map((solicitacao) => ({
      id: solicitacao.id,
      title: solicitacao.title,
      // Resumo: o profissional decide pelo problema, nao pelo texto inteiro.
      summary: solicitacao.description.length > 220 ? `${solicitacao.description.slice(0, 217)}...` : solicitacao.description,
      urgency: solicitacao.urgency,
      preferredDate: solicitacao.preferredDate,
      preferredPeriod: solicitacao.preferredPeriod,
      category: solicitacao.category,
      services: solicitacao.services.map((item) => item.categoryService),
      mediaCount: solicitacao._count.media,
      neighborhood: solicitacao.neighborhood ?? '',
      city: solicitacao.city ?? '',
      state: solicitacao.state ?? '',
      createdAt: solicitacao.createdAt,
      distanceKm: distancias.get(solicitacao.id) ?? null,
    }));

    return {
      total,
      page: paginaAtual,
      limit: porPagina,
      radiusKm: raioKm,
      usingDefaultRadius: profissional.serviceRadiusKm === null,
      blocked: false,
      items: itens,
    };
  }

  /**
   * Distância entre o profissional e cada solicitação aberta, calculada pelo
   * MySQL com ST_Distance_Sphere — o mesmo caminho da busca por proximidade.
   */
  private async distancias(latitude: unknown, longitude: unknown) {
    const lat = latitude === null || latitude === undefined ? null : Number(latitude);
    const lng = longitude === null || longitude === undefined ? null : Number(longitude);
    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return new Map<string, number | null>();

    const linhas = await this.prisma.$queryRaw<LinhaDeDistancia[]>`
      SELECT id,
             ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat})) / 1000 AS distanceKm
      FROM service_requests
      WHERE status = 'OPEN' AND latitude IS NOT NULL AND longitude IS NOT NULL
    `;
    return new Map(linhas.map((linha) => [linha.id, linha.distanceKm === null ? null : Number(Number(linha.distanceKm).toFixed(1))]));
  }
}
