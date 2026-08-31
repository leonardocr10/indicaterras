import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { blocosDeJornada, jornadaDeHoje, textoDeDisponibilidade, type BlocoDeJornada } from './working-hours.util';

/**
 * Painel do profissional: uma única leitura agregada para a tela inicial da
 * área do prestador. Tudo aqui é dado real do banco — quando não existe, vem
 * zero, nunca um número inventado.
 */
@Injectable()
export class ProfessionalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    if (!userId) throw new NotFoundException('Informe o usuário.');

    const profissional = await this.prisma.professional.findFirst({
      where: { userId },
      include: {
        professionalCategories: { include: { category: { select: { id: true, name: true } } } },
        professionalServices: { select: { categoryServiceId: true } },
        images: { where: { isCover: false }, orderBy: { displayOrder: 'asc' }, select: { id: true, url: true, title: true } },
      },
    });
    if (!profissional) throw new NotFoundException('Não encontramos um perfil profissional para esta conta.');

    const [avaliacoes, indicacoes, favoritos, visualizacoes, naoLidas, avaliacoesRecentes, favoritosRecentes] = await Promise.all([
      this.prisma.review.findMany({ where: { professionalId: profissional.id, hidden: false }, select: { rating: true } }),
      this.prisma.recommendation.count({ where: { professionalId: profissional.id } }),
      this.prisma.favorite.count({ where: { professionalId: profissional.id } }),
      this.prisma.professionalView.count({ where: { professionalId: profissional.id } }),
      this.prisma.directMessage.count({
        where: { conversation: { professionalId: profissional.id }, senderId: { not: userId }, readAt: null },
      }),
      this.prisma.review.findMany({
        where: { professionalId: profissional.id, hidden: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
      }),
      // Só o primeiro nome vira inicial: a seção mostra quantidade, não pessoas.
      this.prisma.favorite.findMany({
        where: { professionalId: profissional.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, user: { select: { name: true } } },
      }),
    ]);

    const notas = avaliacoes.map((item) => item.rating);
    const media = notas.length ? notas.reduce((total, nota) => total + nota, 0) / notas.length : 0;

    const categoriaIds = profissional.professionalCategories.map((item) => item.categoryId);
    // "Solicitações pendentes" são pedidos abertos nas categorias do profissional.
    // O sistema ainda não registra proposta enviada, então isto é o que existe de real.
    const solicitacoesPendentes = categoriaIds.length
      ? await this.prisma.serviceRequest.count({ where: { status: 'OPEN', categoryId: { in: categoriaIds } } })
      : 0;

    const completude = this.completude(profissional);
    const jornada = blocosDeJornada(profissional.workingHours);
    const hoje = jornadaDeHoje(jornada);

    return {
      profile: {
        id: profissional.id,
        name: profissional.name,
        companyName: profissional.companyName ?? '',
        avatar: profissional.avatar ?? '',
        coverImage: profissional.coverImage ?? '',
        specialty: profissional.professionalCategories[0]?.category.name ?? '',
        city: profissional.city,
        neighborhood: profissional.neighborhood,
        whatsapp: profissional.whatsapp ?? '',
        approvalStatus: profissional.approvalStatus,
        active: profissional.active,
      },
      metrics: {
        rating: Number(media.toFixed(1)),
        reviews: notas.length,
        recommendations: indicacoes,
        favorites: favoritos,
        views: visualizacoes,
      },
      overview: {
        unreadMessages: naoLidas,
        pendingRequests: solicitacoesPendentes,
        profileCompletion: completude.percent,
        missingProfileItems: completude.missing,
        availableToday: Boolean(hoje),
        availabilityText: textoDeDisponibilidade(jornada, hoje),
      },
      portfolio: profissional.images.map((imagem) => ({ id: imagem.id, image: imagem.url, title: imagem.title ?? '' })),
      favoriteClients: {
        total: favoritos,
        // Nunca nome completo, telefone ou e-mail: só a inicial para o avatar.
        preview: favoritosRecentes.map((item) => ({ id: item.id, initial: (item.user.name.trim()[0] ?? '?').toUpperCase() })),
      },
      recentReviews: avaliacoesRecentes.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        author: review.user.name.split(/\s+/)[0] ?? 'Cliente',
      })),
    };
  }

  /**
   * Lista paginada de quem favoritou o profissional, do mais recente para o
   * mais antigo. Mesma tabela e mesmo filtro do contador do painel, para os
   * dois numeros nunca discordarem.
   *
   * Privacidade: sai o nome publico, o bairro/cidade e a data. Telefone,
   * e-mail, rua e numero do cliente nao passam por aqui.
   */
  async getFavoriteClients(userId: string, page = 1, limit = 10) {
    if (!userId) throw new NotFoundException('Informe o usuário.');
    const profissional = await this.prisma.professional.findFirst({ where: { userId }, select: { id: true } });
    if (!profissional) throw new NotFoundException('Não encontramos um perfil profissional para esta conta.');

    const paginaAtual = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const porPagina = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 10, 1), 50);

    const [total, favoritos] = await Promise.all([
      this.prisma.favorite.count({ where: { professionalId: profissional.id } }),
      this.prisma.favorite.findMany({
        where: { professionalId: profissional.id },
        orderBy: { createdAt: 'desc' },
        skip: (paginaAtual - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          createdAt: true,
          user: { select: { id: true, name: true, neighborhood: true, city: true, state: true } },
        },
      }),
    ]);

    return {
      total,
      page: paginaAtual,
      limit: porPagina,
      items: favoritos.map((favorito) => ({
        id: favorito.id,
        favoritedAt: favorito.createdAt,
        client: {
          id: favorito.user.id,
          name: favorito.user.name.trim(),
          initial: (favorito.user.name.trim()[0] ?? '?').toUpperCase(),
          neighborhood: favorito.user.neighborhood ?? '',
          city: favorito.user.city ?? '',
          state: favorito.user.state ?? '',
        },
      })),
    };
  }

  /**
   * Avaliacoes recebidas, da mais recente para a mais antiga. Só o que o
   * publico ja ve: avaliacao escondida pela moderacao (hidden) fica de fora,
   * igual ao painel e ao perfil publico.
   *
   * A media vem das mesmas linhas do contador, entao a tela e o painel nunca
   * mostram numeros diferentes.
   */
  async getProfessionalReviews(userId: string, page = 1, limit = 10) {
    if (!userId) throw new NotFoundException('Informe o usuário.');
    const profissional = await this.prisma.professional.findFirst({ where: { userId }, select: { id: true } });
    if (!profissional) throw new NotFoundException('Não encontramos um perfil profissional para esta conta.');

    const paginaAtual = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const porPagina = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 10, 1), 50);
    const visiveis = { professionalId: profissional.id, hidden: false };

    const [notas, avaliacoes] = await Promise.all([
      this.prisma.review.findMany({ where: visiveis, select: { rating: true } }),
      this.prisma.review.findMany({
        where: visiveis,
        orderBy: { createdAt: 'desc' },
        skip: (paginaAtual - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    const soma = notas.reduce((total, item) => total + item.rating, 0);
    const media = notas.length ? Number((soma / notas.length).toFixed(1)) : 0;

    return {
      summary: { total: notas.length, averageRating: media },
      page: paginaAtual,
      limit: porPagina,
      items: avaliacoes.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        client: {
          id: review.user.id,
          name: review.user.name.trim(),
          initial: (review.user.name.trim()[0] ?? '?').toUpperCase(),
        },
      })),
    };
  }

  /**
   * Registra a visita ao perfil público. Uma linha por visitante e por dia:
   * recarregar a página não conta de novo, e o dono do perfil nunca é contado.
   */
  async registerView(professionalId: string, options: { userId?: string; ip?: string; userAgent?: string }) {
    const profissional = await this.prisma.professional.findUnique({ where: { id: professionalId }, select: { userId: true } });
    if (!profissional) return;
    if (options.userId && profissional.userId === options.userId) return;

    const viewerKey = options.userId
      ? `u:${options.userId}`
      : `a:${createHash('sha256').update(`${options.ip ?? ''}|${options.userAgent ?? ''}`).digest('hex').slice(0, 40)}`;
    const viewedOn = new Date().toISOString().slice(0, 10);

    try {
      await this.prisma.professionalView.create({ data: { professionalId, viewerKey, viewedOn } });
    } catch {
      // Visita repetida no mesmo dia: o índice único rejeita e está tudo certo.
    }
  }

  /** Percentual de perfil completo, com peso igual para cada item pendente. */
  private completude(profissional: {
    avatar: string | null;
    coverImage: string | null;
    name: string;
    bio: string | null;
    phone: string;
    whatsapp: string | null;
    city: string;
    neighborhood: string;
    workingHours: unknown;
    professionalCategories: unknown[];
    professionalServices: unknown[];
    images: unknown[];
  }) {
    const itens: Array<[string, boolean]> = [
      ['seu nome', Boolean(profissional.name?.trim())],
      ['foto de perfil', Boolean(profissional.avatar)],
      ['foto de capa', Boolean(profissional.coverImage)],
      ['descrição do seu trabalho', Boolean(profissional.bio?.trim())],
      ['telefone', Boolean(profissional.phone?.trim())],
      ['WhatsApp', Boolean(profissional.whatsapp?.trim())],
      ['cidade', Boolean(profissional.city?.trim())],
      ['bairro', Boolean(profissional.neighborhood?.trim())],
      ['categoria', profissional.professionalCategories.length > 0],
      ['serviços que você faz', profissional.professionalServices.length > 0],
      ['fotos de trabalhos', profissional.images.length > 0],
      ['jornada de atendimento', blocosDeJornada(profissional.workingHours).length > 0],
    ];
    return {
      percent: Math.round((itens.filter(([, ok]) => ok).length / itens.length) * 100),
      missing: itens.filter(([, ok]) => !ok).map(([rotulo]) => rotulo),
    };
  }
}
