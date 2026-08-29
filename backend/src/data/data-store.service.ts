import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  demoCategories,
  demoCategoryServices,
  demoCondominiums,
  demoProfessionals,
  demoRecommendations,
  demoReviews,
  demoUsers,
  type DemoCategory,
  type DemoCategoryService,
  type DemoCondominium,
  type DemoProfessional,
  type DemoRecommendation,
  type DemoReview,
  type DemoUser,
} from './demo-data';
import { PrismaService } from './prisma.service';
import { SERVICE_ALIASES } from './service-aliases';
import { ACTION_LABELS, ACTION_TYPE_MAP, COMPLAINT_LABEL_TO_STATUS, COMPLAINT_STATUS_TO_LABEL, ComplaintAction, ComplaintEvent, ComplaintStatus } from './complaints';
import { ProblemMatcherService } from './problem-matcher.service';
import { CATEGORY_CATALOG, catalogSlug } from './category-catalog';

@Injectable()
export class DataStoreService implements OnModuleInit {
  private readonly logger = new Logger(DataStoreService.name);
  private readonly condominiums = [...demoCondominiums];
  private readonly categories = [...demoCategories];
  private readonly categoryServices = [...demoCategoryServices];
  private readonly professionals = demoProfessionals.map((professional) => ({ ...professional, services: professional.serviceDetails.map((service) => service.name) }));
  private readonly reviews = [...demoReviews];
  private readonly recommendations = [...demoRecommendations];
  private readonly moderationStatuses = new Map<string, string>();
  private readonly reviewAdminResponses = new Map<string, { response: string; updatedAt: string }>();
  private readonly reviewModerationHistory = new Map<string, Array<{ action: string; status: string; note: string; createdAt: string }>>();
  private readonly reviewImages = new Map<string, string[]>();
  private readonly professionalByUserId = new Map<string, string>();
  private readonly professionalWorks = new Map<string, Array<{ id: string; image: string; title: string; createdAt: string }>>();
  private readonly reviewLikes = new Map<string, Set<string>>();
  private readonly reviewReplies = new Map<string, Array<{ id: string; userId: string; userName: string; comment: string; createdAt: string }>>();
  private readonly reports = [
    { id: 'rep-1', resident: 'Marcos Lima', professional: 'Marcos Eletricista', reason: 'Atraso', description: 'Não compareceu no horário.', date: '12/05/2024', status: 'Pendente' },
    { id: 'rep-2', resident: 'Ana Paula', professional: 'Jardins & Cia', reason: 'Orçamento', description: 'Valor diferente do combinado.', date: '09/05/2024', status: 'Pendente' },
  ];
  private settings: Record<string, unknown> = {
    systemName: 'Terras Alphas Indica', condominiumName: 'Terras Alphas', phone: '(34) 99999-0000', email: 'contato@terrasalphas.com.br',
    primaryColor: '#006538', secondaryColor: '#ffad00', selfRegistration: true, residentApproval: true, requireUserApproval: true, showBlock: true,
    allowRecommendations: true, recommendationApproval: true, allowReviews: true, requireComment: true,
    professionalSelfRegistration: false, restrictedModules: [] as string[],
  };
  private readonly users: Array<DemoUser & { passwordHash: string }> = [];
  private readonly favoriteProfessionalIds = new Map<string, Set<string>>([
    ['user-leonardo', new Set(['pro-1', 'pro-2', 'pro-4', 'pro-3'])],
  ]);
  private readonly usersReady: Promise<void>;
  private databaseAvailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly problemMatcher: ProblemMatcherService,
  ) {
    this.usersReady = this.initializeUsers();
  }

  async onModuleInit() {
    await this.usersReady;
    try {
      await this.syncHealthCatalog();
      await this.loadDatabaseData();
      this.databaseAvailable = true;
      this.logger.log('Dados administrativos carregados do banco de dados.');
    } catch (error) {
      this.databaseAvailable = false;
      this.logger.warn(`Banco de dados indisponível; usando dados locais temporários. ${error instanceof Error ? error.message : ''}`);
    }
  }

  private async initializeUsers(): Promise<void> {
    const hashedUsers = await Promise.all(
      demoUsers.map(async (user) => ({
        ...user,
        passwordHash: await bcrypt.hash(user.password, 10),
      })),
    );

    this.users.splice(0, this.users.length, ...hashedUsers);
  }

  private async loadDatabaseData(): Promise<void> {
    const [condominiums, categories, professionals, users, reviews, recommendations, favorites, reports, reviewImages, reviewLikes, reviewReplies, professionalWorks] = await Promise.all([
      this.prisma.condominium.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.category.findMany({ include: { services: { include: { aliases: true }, orderBy: { displayOrder: 'asc' } } }, orderBy: { displayOrder: 'asc' } }),
      this.prisma.professional.findMany({
        include: {
          professionalCategories: { include: { category: true } },
          professionalServices: { include: { categoryService: { include: { aliases: true } } } },
          recommendations: true,
          reviews: true,
          // Necessário para tirar do app quem está oculto, suspenso ou bloqueado.
          actions: { where: { active: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.review.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.recommendation.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.favorite.findMany(),
      this.prisma.report.findMany({ include: { user: true, professional: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.reviewImage.findMany(),
      this.prisma.reviewLike.findMany(),
      this.prisma.reviewReply.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.professionalImage.findMany({ where: { isCover: false }, orderBy: { displayOrder: 'asc' } }),
    ]);

    const defaultCondominiumId = condominiums[0]?.id ?? '';
    const condominiumSettings = defaultCondominiumId
      ? await this.prisma.condominiumSettings.findUnique({ where: { condominiumId: defaultCondominiumId } })
      : null;
    if (condominiumSettings) {
      this.settings = {
        ...this.settings,
        systemName: condominiumSettings.systemName,
        condominiumName: condominiumSettings.condominiumName,
        phone: condominiumSettings.phone ?? '',
        email: condominiumSettings.email ?? '',
        primaryColor: condominiumSettings.primaryColor,
        secondaryColor: condominiumSettings.secondaryColor,
        selfRegistration: condominiumSettings.selfRegistration,
        requireUserApproval: condominiumSettings.requireUserApproval,
        residentApproval: condominiumSettings.requireUserApproval,
        professionalSelfRegistration: condominiumSettings.professionalSelfRegistration,
        showBlock: condominiumSettings.showBlock,
        allowRecommendations: condominiumSettings.allowRecommendations,
        recommendationApproval: condominiumSettings.recommendationApproval,
        allowReviews: condominiumSettings.allowReviews,
        requireComment: condominiumSettings.requireComment,
        restrictedModules: Array.isArray(condominiumSettings.restrictedModules) ? condominiumSettings.restrictedModules : [],
      };
    }

    this.condominiums.splice(
      0,
      this.condominiums.length,
      ...condominiums.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        logo: item.logo ?? '',
        coverImage: item.coverImage ?? '',
        primaryColor: item.primaryColor,
        secondaryColor: item.secondaryColor,
        address: item.address,
        city: item.city,
        state: item.state,
        neighborhood: item.neighborhood ?? '',
        phone: item.phone,
        email: item.email,
        active: item.active,
      })),
    );
    this.categories.splice(
      0,
      this.categories.length,
      ...categories.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        icon: item.icon ?? 'grid',
        description: item.description ?? '',
        displayOrder: item.displayOrder,
        active: item.active,
        services: item.services.map((service) => this.mapDatabaseService(service)),
      })),
    );
    this.categoryServices.splice(0, this.categoryServices.length, ...this.categories.flatMap((category) => category.services ?? []));

    // Sem este vínculo, "Meu perfil" do profissional respondia que não havia
    // perfil ligado à conta: o mapa era lido em vários pontos, mas nunca
    // preenchido, então vivia vazio.
    this.professionalByUserId.clear();
    for (const item of professionals) {
      if (item.userId) this.professionalByUserId.set(item.userId, item.id);
    }

    this.professionals.splice(
      0,
      this.professionals.length,
      ...professionals.map((item) => {
        const category = item.professionalCategories[0]?.category;
        const categoryIds = item.professionalCategories.map((relation) => relation.category.id);
        const professionalCategories = this.categories.filter((entry) => categoryIds.includes(entry.id));
        const serviceDetails = item.professionalServices.map((relation) => this.mapDatabaseService(relation.categoryService));
        const rating = item.reviews.length
          ? item.reviews.reduce((total, review) => total + review.rating, 0) / item.reviews.length
          : 0;
        return {
          id: item.id,
          name: item.name,
          companyName: item.companyName ?? '',
          categoryId: category?.id ?? '',
          category: category?.name ?? 'Sem categoria',
          categoryIds,
          categories: professionalCategories,
          serviceIds: serviceDetails.map((service) => service.id),
          serviceDetails,
          rating: Number(rating.toFixed(1)),
          reviewCount: item.reviews.length,
          recommendationCount: item.recommendations.filter((recommendation) => recommendation.recommended).length,
          services: serviceDetails.map((service) => service.name),
          city: item.city,
          neighborhood: item.neighborhood,
          condominiumId: item.recommendations[0]?.condominiumId ?? defaultCondominiumId,
          bio: item.bio ?? '',
          whatsapp: item.whatsapp ?? item.phone.replace(/\D/g, ''),
          phone: item.phone,
          instagram: item.instagram ?? '',
          avatar: item.avatar ?? '',
          coverImage: item.coverImage ?? '',
          featured: item.recommendations.length > 0,
          active: item.active,
          moderationHidden: item.actions.some(
            (acao) =>
              ['HIDE', 'SUSPEND_7', 'SUSPEND_30', 'BLOCK'].includes(acao.action) &&
              (acao.endsAt === null || acao.endsAt.getTime() > Date.now()),
          ),
          approvalStatus: item.approvalStatus,
          workingHours: this.parseWorkingHours(item.workingHours),
          // Sem serviço escolhido ele não aparece em busca por serviço, e sem
          // jornada o cliente não sabe quando procurar: os dois definem "completo".
          profileComplete: serviceDetails.length > 0 && this.parseWorkingHours(item.workingHours).length > 0,
        } satisfies DemoProfessional;
      }),
    );

    this.users.splice(
      0,
      this.users.length,
      ...users.map((item) => ({
        id: item.id,
        condominiumId: item.condominiumId ?? defaultCondominiumId,
        name: item.name,
        email: item.email,
        phone: item.phone ?? '',
        password: '',
        passwordHash: item.passwordHash,
        role: item.role,
        emailVerified: item.emailVerified,
        approvalStatus: item.approvalStatus,
        active: item.active,
        block: item.block ?? undefined,
        unit: item.unit ?? undefined,
        zipCode: item.zipCode ?? undefined,
        street: item.street ?? undefined,
        number: item.number ?? undefined,
        complement: item.complement ?? undefined,
        neighborhood: item.neighborhood ?? undefined,
        city: item.city ?? undefined,
        state: item.state ?? undefined,
      })),
    );
    this.reviews.splice(
      0,
      this.reviews.length,
      ...reviews.map((item) => ({
        id: item.id,
        userId: item.userId,
        professionalId: item.professionalId,
        condominiumId: item.condominiumId,
        userName: item.user.name,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt.toISOString(),
        serviceDate: item.serviceDate?.toISOString() ?? '',
      })),
    );
    this.recommendations.splice(
      0,
      this.recommendations.length,
      ...recommendations.map((item) => ({
        id: item.id,
        professionalId: item.professionalId,
        userId: item.userId,
        condominiumId: item.condominiumId,
        recommended: item.recommended,
        comment: item.comment ?? '',
        createdAt: item.createdAt.toISOString(),
        status: item.status,
      })),
    );

    this.favoriteProfessionalIds.clear();
    for (const favorite of favorites) {
      const ids = this.favoriteProfessionalIds.get(favorite.userId) ?? new Set<string>();
      ids.add(favorite.professionalId);
      this.favoriteProfessionalIds.set(favorite.userId, ids);
    }

    this.reviewImages.clear();
    for (const image of reviewImages) {
      const urls = this.reviewImages.get(image.reviewId) ?? [];
      urls.push(image.url);
      this.reviewImages.set(image.reviewId, urls);
    }

    this.reviewLikes.clear();
    for (const like of reviewLikes) {
      const userIds = this.reviewLikes.get(like.reviewId) ?? new Set<string>();
      userIds.add(like.userId);
      this.reviewLikes.set(like.reviewId, userIds);
    }

    this.reviewReplies.clear();
    for (const reply of reviewReplies) {
      const list = this.reviewReplies.get(reply.reviewId) ?? [];
      list.push({
        id: reply.id,
        userId: reply.userId,
        userName: reply.user.name,
        comment: reply.comment,
        createdAt: reply.createdAt.toISOString(),
      });
      this.reviewReplies.set(reply.reviewId, list);
    }

    this.professionalWorks.clear();
    for (const work of professionalWorks) {
      const list = this.professionalWorks.get(work.professionalId) ?? [];
      list.push({
        id: work.id,
        image: work.url,
        title: work.title ?? '',
        createdAt: work.createdAt.toISOString(),
      });
      this.professionalWorks.set(work.professionalId, list);
    }

    this.reports.splice(
      0,
      this.reports.length,
      ...reports.map((item) => ({
        id: item.id,
        resident: item.user.name,
        professional: item.professional.name,
        reason: item.reason,
        description: item.details ?? '',
        date: item.createdAt.toLocaleDateString('pt-BR'),
        status: COMPLAINT_STATUS_TO_LABEL[item.status as keyof typeof COMPLAINT_STATUS_TO_LABEL] ?? 'Pendente',
      })),
    );
  }

  async validateUser(email: string, password: string): Promise<Omit<DemoUser, 'password'>> {
    await this.usersReady;
    const user = this.users.find((entry) => entry.email === email);
    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    this.assertUserAccess(user);

    const { password: _password, passwordHash, ...safeUser } = user;
    return safeUser;
  }

  findUserById(id: string): Omit<DemoUser, 'password'> | undefined {
    const user = this.users.find((entry) => entry.id === id);
    if (!user) return undefined;
    const { password, passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async createResident(payload: {
    condominiumId?: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  }): Promise<Omit<DemoUser, 'password'>> {
    await this.usersReady;
    this.ensureDatabase('criar a conta do morador');
    this.assertEmailAvailable(payload.email);
    const requireApproval = this.requiresUserApproval();
    const record = await this.prisma.user.create({
        data: {
          condominiumId: payload.condominiumId || null,
          name: payload.name,
          email: payload.email.toLowerCase().trim(),
          phone: payload.phone || null,
          passwordHash: await bcrypt.hash(payload.password, 10),
          role: 'RESIDENT',
          zipCode: payload.zipCode || null,
          street: payload.street || null,
          number: payload.number || null,
          complement: payload.complement || null,
          neighborhood: payload.neighborhood || null,
          city: payload.city || null,
          state: payload.state || null,
          emailVerified: true,
          approvalStatus: requireApproval ? 'PENDING' : 'APPROVED',
          approvedAt: requireApproval ? null : new Date(),
          active: true,
        },
    });
    await this.loadDatabaseData();
    const user = this.findUserById(record.id);
    if (!user) throw new NotFoundException('Usuário recém-criado não encontrado');
    return user;
  }

  requiresUserApproval() {
    return Boolean(this.settings['requireUserApproval'] ?? this.settings['residentApproval']);
  }

  allowsProfessionalSignup() {
    return Boolean(this.settings['professionalSelfRegistration']);
  }

  getPublicSettings() {
    return {
      systemName: String(this.settings['systemName'] ?? 'Terras Alphas Indica'),
      selfRegistration: this.settings['selfRegistration'] !== false,
      professionalSelfRegistration: this.allowsProfessionalSignup(),
      showBlock: this.settings['showBlock'] !== false,
    };
  }

  getProfessionalIdByUser(userId: string) {
    return this.professionalByUserId.get(userId) ?? '';
  }

  async createProfessionalAccount(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    companyName?: string;
    categoryId: string;
    city: string;
    neighborhood?: string;
    bio?: string;
    condominiumId?: string;
    serviceIds?: string[];
    workingHours?: Array<{ days: number[]; start: string; end: string }>;
  }) {
    await this.usersReady;
    this.ensureDatabase('criar a conta do profissional');
    if (!this.allowsProfessionalSignup()) throw new ForbiddenException('O cadastro de profissionais está desativado pelo condomínio.');
    this.assertEmailAvailable(payload.email);
    const category = this.categories.find((item) => item.id === payload.categoryId || item.slug === payload.categoryId);
    if (!category) throw new ConflictException('Selecione uma categoria válida');

    const professional = await this.createAdminRecord('professionals', {
      name: payload.name,
      companyName: payload.companyName ?? '',
      phone: payload.phone,
      whatsapp: payload.phone,
      city: payload.city,
      neighborhood: payload.neighborhood ?? '',
      bio: payload.bio ?? '',
      categoryIds: [category.id],
      serviceIds: payload.serviceIds ?? [],
      condominiumId: payload.condominiumId || this.condominiums[0]?.id || '',
      active: true,
    });
    const professionalId = String((professional as { id?: string })?.id ?? '');
    if (!professionalId) throw new ConflictException('Não foi possível criar o perfil do profissional');

    // Nasce pendente: so aparece no app depois que a administracao aprovar.
    // A conta de acesso continua liberada, senao ele nao conseguiria entrar
    // para completar o proprio cadastro.
    await this.prisma.professional.update({
      where: { id: professionalId },
      data: {
        approvalStatus: 'PENDING',
        workingHours: (payload.workingHours ?? []) as never,
      },
    });

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            condominiumId: payload.condominiumId || this.condominiums[0]?.id || null,
            name: payload.name,
            email: payload.email.toLowerCase().trim(),
            phone: payload.phone || null,
            passwordHash: await bcrypt.hash(payload.password, 10),
            role: 'PROFESSIONAL',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            active: true,
          },
        });
        await transaction.professional.update({ where: { id: professionalId }, data: { userId: created.id } });
        return created;
      });
      await this.loadDatabaseData();
      const savedUser = this.findUserById(user.id);
      if (!savedUser) throw new NotFoundException('Conta profissional recém-criada não encontrada');
      return { user: savedUser, professionalId };
    } catch (error) {
      await this.prisma.professional.delete({ where: { id: professionalId } }).catch(() => undefined);
      await this.loadDatabaseData().catch(() => undefined);
      throw error;
    }
  }

  async removeProfessionalAccount(userId: string) {
    this.ensureDatabase('excluir a conta do profissional');
    const professionalId = this.professionalByUserId.get(userId);
    await this.prisma.$transaction(async (transaction) => {
      if (professionalId) await transaction.professional.delete({ where: { id: professionalId } });
      await transaction.user.delete({ where: { id: userId } });
    });
    await this.loadDatabaseData();
  }

  getOwnProfessional(userId: string) {
    const professionalId = this.professionalByUserId.get(userId);
    if (!professionalId) throw new NotFoundException('Nenhum perfil profissional vinculado a esta conta');
    const professional = this.getProfessionalById(professionalId);
    if (!professional) throw new NotFoundException('Perfil profissional em análise ou indisponível');
    return professional;
  }

  async updateOwnProfessional(userId: string, payload: Record<string, unknown>) {
    const professionalId = this.professionalByUserId.get(userId);
    if (!professionalId) throw new NotFoundException('Nenhum perfil profissional vinculado a esta conta');
    const editable = ['name', 'companyName', 'phone', 'whatsapp', 'instagram', 'city', 'neighborhood', 'bio', 'avatar', 'coverImage', 'categoryIds', 'serviceIds'];
    const allowed = Object.fromEntries(Object.entries(payload).filter(([key]) => editable.includes(key)));
    const updated = await this.updateAdminRecord('professionals', professionalId, allowed);
    const refreshed = this.getProfessionalById(professionalId);
    return refreshed ?? updated;
  }

  getProfessionalWorks(professionalId: string) {
    return this.professionalWorks.get(professionalId) ?? [];
  }

  async addOwnProfessionalWorks(userId: string, images: string[], title = '') {
    this.ensureDatabase('adicionar as fotos do profissional');
    const professionalId = this.professionalByUserId.get(userId);
    if (!professionalId) throw new NotFoundException('Nenhum perfil profissional vinculado a esta conta');
    const clean = images.map((image) => String(image).trim()).filter(Boolean);
    if (!clean.length) throw new ConflictException('Envie ao menos uma foto do trabalho');
    const works = this.professionalWorks.get(professionalId) ?? [];
    const trimmedTitle = String(title ?? '').trim();
    const toCreate = clean.slice(0, 20);

    let created: Array<{ id: string; image: string; title: string; createdAt: string }>;
    if (this.databaseAvailable) {
      created = await Promise.all(
        toCreate.map(async (image, index) => {
          const record = await this.prisma.professionalImage.create({
            data: {
              professionalId,
              url: image,
              title: trimmedTitle || null,
              isCover: false,
              displayOrder: works.length + index + 1,
            },
          });
          return {
            id: record.id,
            image: record.url,
            title: record.title ?? '',
            createdAt: record.createdAt.toISOString(),
          };
        }),
      );
    } else {
      created = toCreate.map((image, index) => ({
        id: `work-${Date.now()}-${works.length + index + 1}`,
        image,
        title: trimmedTitle,
        createdAt: new Date().toISOString(),
      }));
    }

    this.professionalWorks.set(professionalId, [...created, ...works].slice(0, 60));
    return this.getProfessionalWorks(professionalId);
  }

  async removeOwnProfessionalWork(userId: string, workId: string) {
    this.ensureDatabase('excluir a foto do profissional');
    const professionalId = this.professionalByUserId.get(userId);
    if (!professionalId) throw new NotFoundException('Nenhum perfil profissional vinculado a esta conta');
    const works = this.professionalWorks.get(professionalId) ?? [];
    if (!works.some((work) => work.id === workId)) throw new NotFoundException('Trabalho não encontrado');
    if (this.databaseAvailable) {
      await this.prisma.professionalImage.delete({ where: { id: workId } }).catch(() => undefined);
    }
    this.professionalWorks.set(professionalId, works.filter((work) => work.id !== workId));
    return this.getProfessionalWorks(professionalId);
  }

  findUserByEmail(email: string) {
    const user = this.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase().trim());
    return user ? this.safeUser(user) : undefined;
  }

  /** Guarda o token de redefinicao (valido por 1 hora) e invalida os anteriores. */
  async createPasswordReset(userId: string, token: string) {
    this.ensureDatabase('gerar o link de redefinição de senha');
    await this.prisma.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.passwordReset.create({
      data: { userId, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
  }

  /** Troca a senha se o token existir, nao tiver sido usado e nao estiver vencido. */
  async consumePasswordReset(token: string, novaSenha: string) {
    this.ensureDatabase('redefinir a senha');
    const registro = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!registro || registro.usedAt || registro.expiresAt.getTime() < Date.now()) {
      throw new ConflictException('Este link de redefinição expirou ou já foi usado. Peça um novo.');
    }
    await this.prisma.user.update({
      where: { id: registro.userId },
      data: { passwordHash: await bcrypt.hash(novaSenha, 10) },
    });
    await this.prisma.passwordReset.update({ where: { id: registro.id }, data: { usedAt: new Date() } });
    await this.loadDatabaseData();
  }

  /** Mantém o catálogo de saúde disponível mesmo em bancos sem o seed inicial. */
  private async syncHealthCatalog() {
    const groupIndex = CATEGORY_CATALOG.findIndex((group) => group.slug === 'saude-bem-estar');
    const groupSeed = CATEGORY_CATALOG[groupIndex];
    if (!groupSeed) return;

    const group = await this.prisma.categoryGroup.upsert({
      where: { slug: groupSeed.slug },
      update: { name: groupSeed.name, icon: groupSeed.icon, displayOrder: groupIndex + 1, active: true },
      create: { name: groupSeed.name, slug: groupSeed.slug, icon: groupSeed.icon, displayOrder: groupIndex + 1, active: true },
    });

    const requestedCategories = groupSeed.categories
      .map((category, index) => ({ category, index }))
      .filter(({ category }) => category.slug === 'psicologo' || category.slug === 'dentista');
    for (const { category: categorySeed, index: categoryIndex } of requestedCategories) {
      const category = await this.prisma.category.upsert({
        where: { slug: categorySeed.slug },
        update: { name: categorySeed.name, icon: categorySeed.icon, groupId: group.id, active: true },
        create: { name: categorySeed.name, slug: categorySeed.slug, icon: categorySeed.icon, groupId: group.id, displayOrder: categoryIndex + 1, active: true },
      });
      for (const [serviceIndex, serviceSeed] of categorySeed.services.entries()) {
        const service = await this.prisma.categoryService.upsert({
          where: { categoryId_slug: { categoryId: category.id, slug: catalogSlug(serviceSeed.name) } },
          update: { name: serviceSeed.name, icon: categorySeed.icon, displayOrder: serviceIndex + 1, active: true },
          create: { categoryId: category.id, name: serviceSeed.name, slug: catalogSlug(serviceSeed.name), icon: categorySeed.icon, displayOrder: serviceIndex + 1, active: true },
        });
        for (const alias of serviceSeed.aliases ?? []) {
          const normalizedAlias = this.normalize(alias);
          await this.prisma.categoryServiceAlias.upsert({
            where: { categoryServiceId_normalizedAlias: { categoryServiceId: service.id, normalizedAlias } },
            update: { alias },
            create: { categoryServiceId: service.id, alias, normalizedAlias },
          });
        }
      }
    }
  }

  ensureUserCanAccess(user: Omit<DemoUser, 'password'>) {
    this.assertUserAccess(user);
    return user;
  }

  private assertUserAccess(user: Pick<DemoUser, 'active' | 'emailVerified' | 'approvalStatus'>) {
    if (!user.active) throw new ForbiddenException('Esta conta está inativa. Procure a administração.');
    if (this.requiresUserApproval() && user.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException(user.approvalStatus === 'REJECTED' ? 'O acesso desta conta foi recusado pela administração.' : 'Cadastro confirmado e aguardando aprovação da administração.');
    }
  }

  getCondominiums(): DemoCondominium[] {
    return this.condominiums;
  }

  getCondominiumBySlug(slug: string): DemoCondominium | undefined {
    return this.condominiums.find((item) => item.slug === slug);
  }

  getUsers() {
    return this.users.map(({ password, passwordHash, ...user }) => user);
  }

  getCategories(): DemoCategory[] {
    return this.categories;
  }

  getAdminRecords(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories') {
    if (resource === 'condominiums') return this.condominiums;
    if (resource === 'residents' || resource === 'users') return this.getUsers();
    if (resource === 'professionals') return this.professionals;
    return this.categories;
  }

  getAdminSection(section: 'reviews' | 'recommendations' | 'reports') {
    if (section === 'reviews') {
      // reviews whose professional no longer exists would render as empty rows in the admin table
      return this.reviews
        .filter((review) => this.professionals.some((item) => item.id === review.professionalId))
        .map((review) => ({
        id: review.id,
        resident: review.userName,
        residentInitials: this.initials(review.userName),
        professional: this.professionals.find((item) => item.id === review.professionalId)?.name ?? 'Profissional indisponível',
        professionalAvatar: this.professionals.find((item) => item.id === review.professionalId)?.avatar ?? '',
        category: this.professionals.find((item) => item.id === review.professionalId)?.category ?? 'Sem categoria',
        services: this.professionals.find((item) => item.id === review.professionalId)?.services.join(', ') ?? '',
        rating: review.rating.toFixed(1).replace('.', ','),
        comment: review.comment,
        date: new Date(review.createdAt).toLocaleDateString('pt-BR'),
        status: this.moderationStatuses.get(review.id) ?? 'Publicado',
        recommends: review.rating >= 4 ? 'Sim' : 'Não',
      }));
    }
    if (section === 'recommendations') {
      return this.recommendations
        .filter((recommendation) => this.professionals.some((item) => item.id === recommendation.professionalId))
        .map((recommendation) => ({
        id: recommendation.id,
        resident: this.findUserById(recommendation.userId)?.name ?? '-',
        professional: this.professionals.find((item) => item.id === recommendation.professionalId)?.name ?? '-',
        category: this.professionals.find((item) => item.id === recommendation.professionalId)?.category ?? '-',
        rating: recommendation.rating ? recommendation.rating.toFixed(1).replace('.', ',') : '-',
        date: new Date(recommendation.createdAt).toLocaleDateString('pt-BR'),
        status: this.moderationStatuses.get(recommendation.id) ?? (recommendation.status === 'ACTIVE' ? 'Aprovada' : 'Removida'),
      }));
    }
    return this.reports.map((report) => ({ ...report, status: this.moderationStatuses.get(report.id) ?? report.status }));
  }

  updateAdminSectionStatus(section: 'reviews' | 'recommendations' | 'reports', id: string, status: string) {
    const exists = this.getAdminSection(section).some((item) => item.id === id);
    if (!exists) throw new NotFoundException('Registro de moderação não encontrado');
    this.moderationStatuses.set(id, status);
    if (section === 'reviews') {
      const history = this.reviewHistory(id);
      history.unshift({
        action: status === 'Oculto' ? 'Ocultada' : 'Republicada',
        status,
        note: status === 'Oculto' ? 'Avaliação ocultada pela administração.' : 'Avaliação publicada pela administração.',
        createdAt: new Date().toISOString(),
      });
      this.reviewModerationHistory.set(id, history);
    }
    return { id, status };
  }

  getAdminReviewDetails(id: string) {
    const review = this.reviews.find((item) => item.id === id);
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    const professional = this.professionals.find((item) => item.id === review.professionalId);
    const resident = review.userId ? this.findUserById(review.userId) : undefined;
    const condominium = this.condominiums.find((item) => item.id === review.condominiumId);
    const response = this.reviewAdminResponses.get(id);
    return {
      id: review.id,
      displayId: `#AV-${new Date(review.createdAt).getFullYear()}-${review.id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase().padStart(8, '0')}`,
      resident: { name: resident?.name ?? review.userName, initials: this.initials(resident?.name ?? review.userName), verified: resident?.emailVerified ?? true },
      professional: {
        id: professional?.id ?? review.professionalId,
        name: professional?.name ?? 'Profissional indisponível',
        avatar: professional?.avatar ?? '',
        category: professional?.category ?? 'Sem categoria',
        services: professional?.services ?? [],
      },
      condominium: condominium?.name ?? 'Condomínio indisponível',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      serviceDate: review.serviceDate,
      status: this.moderationStatuses.get(review.id) ?? 'Publicado',
      recommends: review.rating >= 4,
      origin: 'App do morador',
      reports: 0,
      images: [] as string[],
      adminResponse: response?.response ?? '',
      lastModerationAt: this.reviewHistory(id)[0]?.createdAt ?? review.createdAt,
      history: this.reviewHistory(id),
    };
  }

  saveAdminReviewResponse(id: string, response: string) {
    const review = this.reviews.find((item) => item.id === id);
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    const updatedAt = new Date().toISOString();
    this.reviewAdminResponses.set(id, { response: response.trim(), updatedAt });
    const history = this.reviewHistory(id);
    history.unshift({ action: 'Respondida', status: this.moderationStatuses.get(id) ?? 'Publicado', note: 'Resposta pública da administração atualizada.', createdAt: updatedAt });
    this.reviewModerationHistory.set(id, history);
    return { id, response: response.trim(), updatedAt };
  }

  private reviewHistory(id: string) {
    const existing = this.reviewModerationHistory.get(id);
    if (existing) return [...existing];
    const review = this.reviews.find((item) => item.id === id);
    if (!review) return [];
    return [
      { action: 'Publicado', status: 'Publicado', note: 'Avaliação publicada automaticamente pelo sistema.', createdAt: review.createdAt },
      { action: 'Recebida', status: 'Recebida', note: 'Avaliação recebida do morador.', createdAt: new Date(new Date(review.createdAt).getTime() - 120000).toISOString() },
    ];
  }

  private initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'MR';
  }

  getAdminSettings() {
    return this.settings;
  }

  async updateAdminSettings(payload: Record<string, unknown>) {
    this.ensureDatabase('salvar as configurações');
    const nextSettings = { ...this.settings, ...payload };
    const requireUserApproval = Boolean(payload['requireUserApproval'] ?? payload['residentApproval'] ?? this.requiresUserApproval());
    nextSettings['requireUserApproval'] = requireUserApproval;
    nextSettings['residentApproval'] = requireUserApproval;
    const condominiumId = this.condominiums[0]?.id;
    if (!condominiumId) throw new ServiceUnavailableException('Não foi possível salvar as configurações: condomínio não encontrado no banco de dados.');

    const data = {
      systemName: String(nextSettings['systemName'] ?? 'Terras Alphas Indica'),
      condominiumName: String(nextSettings['condominiumName'] ?? 'Terras Alphas'),
      phone: nextSettings['phone'] === undefined || nextSettings['phone'] === null ? null : String(nextSettings['phone']) || null,
      email: nextSettings['email'] === undefined || nextSettings['email'] === null ? null : String(nextSettings['email']) || null,
      primaryColor: String(nextSettings['primaryColor'] ?? '#006538'),
      secondaryColor: String(nextSettings['secondaryColor'] ?? '#ffad00'),
      selfRegistration: Boolean(nextSettings['selfRegistration']),
      requireUserApproval,
      professionalSelfRegistration: Boolean(nextSettings['professionalSelfRegistration']),
      showBlock: Boolean(nextSettings['showBlock']),
      allowRecommendations: Boolean(nextSettings['allowRecommendations']),
      recommendationApproval: Boolean(nextSettings['recommendationApproval']),
      allowReviews: Boolean(nextSettings['allowReviews']),
      requireComment: Boolean(nextSettings['requireComment']),
      restrictedModules: Array.isArray(nextSettings['restrictedModules']) ? nextSettings['restrictedModules'] : [],
    };
    await this.prisma.condominiumSettings.upsert({
      where: { condominiumId },
      update: data,
      create: { condominiumId, ...data },
    });
    this.settings = nextSettings;
    return this.settings;
  }

  async createAdminRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', payload: Record<string, unknown>) {
    this.ensureDatabase('criar o cadastro');
    return this.createDatabaseRecord(resource, payload);
  }

  async updateAdminRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', id: string, payload: Record<string, unknown>) {
    this.ensureDatabase('atualizar o cadastro');
    return this.updateDatabaseRecord(resource, id, payload);
  }

  async deleteAdminRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', id: string) {
    this.ensureDatabase('excluir o cadastro');
    return this.deleteDatabaseRecord(resource, id);
  }

  private async createDatabaseRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', payload: Record<string, unknown>) {
    let id: string;
    if (resource === 'categories') {
      const name = String(payload.name ?? 'Nova categoria');
      const record = await this.prisma.category.create({
        data: {
          name,
          slug: this.toSlug(String(payload.slug || name)),
          icon: String(payload.icon || 'grid'),
          description: String(payload.description ?? '') || null,
          displayOrder: Number(payload.displayOrder ?? this.categories.length + 1),
          active: payload.active !== false,
        },
      });
      id = record.id;
    } else if (resource === 'condominiums') {
      const name = String(payload.name ?? 'Novo condomínio');
      const record = await this.prisma.condominium.create({
        data: {
          name,
          slug: this.toSlug(String(payload.slug || name)),
          address: String(payload.address ?? ''),
          city: String(payload.city ?? ''),
          state: String(payload.state || 'MG'),
          neighborhood: String(payload.neighborhood ?? ''),
          phone: String(payload.phone ?? ''),
          email: String(payload.email ?? ''),
          logo: String(payload.logo ?? '') || null,
          coverImage: String(payload.coverImage ?? '') || null,
          primaryColor: String(payload.primaryColor || '#0F5A3C'),
          secondaryColor: String(payload.secondaryColor || '#F4C542'),
        },
      });
      id = record.id;
    } else if (resource === 'professionals') {
      const categoryIds = this.stringArray(payload.categoryIds, payload.categoryId);
      const serviceIds = await this.validServiceIds(categoryIds, this.stringArray(payload.serviceIds));
      const portfolioImages = this.stringArray(payload.portfolioImages).slice(0, 10);
      if (!categoryIds.length) throw new NotFoundException('Selecione pelo menos uma categoria');
      const record = await this.prisma.professional.create({
        data: {
          name: String(payload.name ?? 'Novo profissional'),
          companyName: String(payload.companyName ?? '') || null,
          bio: String(payload.bio ?? '') || null,
          phone: String(payload.phone ?? ''),
          whatsapp: String(payload.whatsapp ?? payload.phone ?? '').replace(/\D/g, ''),
          instagram: String(payload.instagram ?? '') || null,
          city: String(payload.city ?? ''),
          neighborhood: String(payload.neighborhood ?? ''),
          avatar: String(payload.avatar ?? '') || null,
          coverImage: String(payload.coverImage ?? '') || null,
          professionalCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
          professionalServices: { create: serviceIds.map((categoryServiceId) => ({ categoryServiceId })) },
        },
      });
      if (portfolioImages.length) {
        await this.prisma.professionalImage.createMany({
          data: portfolioImages.map((url, displayOrder) => ({ professionalId: record.id, url, displayOrder: displayOrder + 1 })),
        });
      }
      id = record.id;
    } else {
      const password = String(payload.password || '123456');
      const condominiumId = String(payload.condominiumId || this.condominiums[0]?.id || '');
      this.assertEmailAvailable(String(payload.email ?? ''));
      const record = await this.prisma.user.create({
        data: {
          condominiumId: condominiumId || null,
          name: String(payload.name ?? 'Novo morador'),
          email: String(payload.email ?? ''),
          phone: String(payload.phone ?? '') || null,
          passwordHash: await bcrypt.hash(password, 10),
          role: this.userRole(payload.role),
          zipCode: String(payload.zipCode ?? '') || null,
          street: String(payload.street ?? '') || null,
          number: String(payload.number ?? '') || null,
          complement: String(payload.complement ?? '') || null,
          neighborhood: String(payload.neighborhood ?? '') || null,
          city: String(payload.city ?? '') || null,
          state: String(payload.state ?? '') || null,
          block: String(payload.block ?? '') || null,
          unit: String(payload.unit ?? '') || null,
          emailVerified: payload.emailVerified !== false,
          emailVerifiedAt: payload.emailVerified === false ? null : new Date(),
          approvalStatus: this.approvalStatus(payload.approvalStatus ?? 'APPROVED'),
          approvedAt: this.approvalStatus(payload.approvalStatus ?? 'APPROVED') === 'APPROVED' ? new Date() : null,
          active: payload.active !== false,
        },
      });
      id = record.id;
    }
    await this.loadDatabaseData();
    return this.getAdminRecords(resource).find((record) => record.id === id);
  }

  private async updateDatabaseRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', id: string, payload: Record<string, unknown>) {
    if (resource === 'categories') {
      const name = String(payload.name ?? '');
      await this.prisma.category.update({
        where: { id },
        data: {
          name: name || undefined,
          slug: String(payload.slug || (name ? this.toSlug(name) : '')) || undefined,
          icon: String(payload.icon ?? '') || undefined,
          description: payload.description === undefined ? undefined : String(payload.description) || null,
          displayOrder: payload.displayOrder === undefined ? undefined : Number(payload.displayOrder),
          active: payload.active === undefined ? undefined : Boolean(payload.active),
        },
      });
    } else if (resource === 'condominiums') {
      await this.prisma.condominium.update({
        where: { id },
        data: {
          name: String(payload.name ?? '') || undefined,
          slug: String(payload.slug ?? '') || undefined,
          address: String(payload.address ?? '') || undefined,
          city: String(payload.city ?? '') || undefined,
          state: String(payload.state ?? '') || undefined,
          neighborhood: payload.neighborhood === undefined ? undefined : String(payload.neighborhood),
          phone: String(payload.phone ?? '') || undefined,
          email: String(payload.email ?? '') || undefined,
          logo: payload.logo === undefined ? undefined : String(payload.logo) || null,
          coverImage: payload.coverImage === undefined ? undefined : String(payload.coverImage) || null,
        },
      });
    } else if (resource === 'professionals') {
      const categoryIds = this.stringArray(payload.categoryIds, payload.categoryId);
      const serviceIds = await this.validServiceIds(categoryIds, this.stringArray(payload.serviceIds));
      const portfolioImages = this.stringArray(payload.portfolioImages).slice(0, 10);
      await this.prisma.$transaction(async (transaction) => {
        await transaction.professional.update({
          where: { id },
          data: {
            name: String(payload.name ?? '') || undefined,
            companyName: String(payload.companyName ?? '') || null,
            bio: String(payload.bio ?? '') || null,
            phone: String(payload.phone ?? '') || undefined,
            whatsapp: String(payload.whatsapp ?? payload.phone ?? '').replace(/\D/g, '') || undefined,
            instagram: String(payload.instagram ?? '') || null,
            city: String(payload.city ?? '') || undefined,
            neighborhood: String(payload.neighborhood ?? '') || undefined,
            avatar: String(payload.avatar ?? '') || null,
            coverImage: payload.coverImage === undefined ? undefined : String(payload.coverImage) || null,
            // Sem isto, ocultar/suspender/bloquear pela moderação não tinha efeito:
            // o valor era descartado aqui e o profissional continuava no app.
            active: payload.active === undefined ? undefined : Boolean(payload.active),
            approvalStatus: payload.approvalStatus === undefined ? undefined : String(payload.approvalStatus),
            workingHours: payload.workingHours === undefined ? undefined : (this.parseWorkingHours(payload.workingHours) as never),
          },
        });
        if (categoryIds.length) {
          await transaction.professionalCategory.deleteMany({ where: { professionalId: id } });
          await transaction.professionalCategory.createMany({ data: categoryIds.map((categoryId) => ({ professionalId: id, categoryId })) });
          await transaction.professionalService.deleteMany({ where: { professionalId: id } });
          if (serviceIds.length) await transaction.professionalService.createMany({ data: serviceIds.map((categoryServiceId) => ({ professionalId: id, categoryServiceId })) });
        }
        if (portfolioImages.length) {
          const count = await transaction.professionalImage.count({ where: { professionalId: id, isCover: false } });
          await transaction.professionalImage.createMany({
            data: portfolioImages.map((url, index) => ({ professionalId: id, url, displayOrder: count + index + 1 })),
          });
        }
      });
    } else {
      const password = String(payload.password ?? '');
      if (payload.email !== undefined) this.assertEmailAvailable(String(payload.email), id);
      await this.prisma.user.update({
        where: { id },
        data: {
          condominiumId: String(payload.condominiumId ?? '') || undefined,
          name: String(payload.name ?? '') || undefined,
          email: String(payload.email ?? '') || undefined,
          phone: String(payload.phone ?? '') || null,
          zipCode: payload.zipCode === undefined ? undefined : String(payload.zipCode) || null,
          street: payload.street === undefined ? undefined : String(payload.street) || null,
          number: payload.number === undefined ? undefined : String(payload.number) || null,
          complement: payload.complement === undefined ? undefined : String(payload.complement) || null,
          neighborhood: payload.neighborhood === undefined ? undefined : String(payload.neighborhood) || null,
          city: payload.city === undefined ? undefined : String(payload.city) || null,
          state: payload.state === undefined ? undefined : String(payload.state) || null,
          passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
          role: payload.role === undefined ? undefined : this.userRole(payload.role),
          block: payload.block === undefined ? undefined : String(payload.block) || null,
          unit: payload.unit === undefined ? undefined : String(payload.unit) || null,
          emailVerified: payload.emailVerified === undefined ? undefined : Boolean(payload.emailVerified),
          emailVerifiedAt: payload.emailVerified === undefined ? undefined : Boolean(payload.emailVerified) ? new Date() : null,
          approvalStatus: payload.approvalStatus === undefined ? undefined : this.approvalStatus(payload.approvalStatus),
          approvedAt: payload.approvalStatus === undefined ? undefined : this.approvalStatus(payload.approvalStatus) === 'APPROVED' ? new Date() : null,
          active: payload.active === undefined ? undefined : Boolean(payload.active),
        },
      });
    }
    await this.loadDatabaseData();
    return this.getAdminRecords(resource).find((record) => record.id === id);
  }

  private async deleteDatabaseRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', id: string) {
    await this.prisma.$transaction(async (transaction) => {
      if (resource === 'professionals') {
        await transaction.report.deleteMany({ where: { professionalId: id } });
        await transaction.favorite.deleteMany({ where: { professionalId: id } });
        await transaction.review.deleteMany({ where: { professionalId: id } });
        await transaction.recommendation.deleteMany({ where: { professionalId: id } });
        await transaction.professionalImage.deleteMany({ where: { professionalId: id } });
        await transaction.professionalService.deleteMany({ where: { professionalId: id } });
        await transaction.professionalCategory.deleteMany({ where: { professionalId: id } });
        await transaction.professional.delete({ where: { id } });
      } else if (resource === 'categories') {
        await transaction.professionalService.deleteMany({ where: { categoryService: { categoryId: id } } });
        await transaction.professionalCategory.deleteMany({ where: { categoryId: id } });
        await transaction.category.delete({ where: { id } });
      } else if (resource === 'residents' || resource === 'users') {
        await transaction.refreshToken.deleteMany({ where: { userId: id } });
        await transaction.report.deleteMany({ where: { userId: id } });
        await transaction.favorite.deleteMany({ where: { userId: id } });
        await transaction.review.deleteMany({ where: { userId: id } });
        await transaction.recommendation.deleteMany({ where: { userId: id } });
        await transaction.user.delete({ where: { id } });
      } else {
        const users = await transaction.user.findMany({ where: { condominiumId: id }, select: { id: true } });
        const userIds = users.map((user) => user.id);
        await transaction.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
        await transaction.report.deleteMany({ where: { condominiumId: id } });
        await transaction.favorite.deleteMany({ where: { condominiumId: id } });
        await transaction.review.deleteMany({ where: { condominiumId: id } });
        await transaction.recommendation.deleteMany({ where: { condominiumId: id } });
        await transaction.user.deleteMany({ where: { condominiumId: id } });
        await transaction.condominiumSettings.deleteMany({ where: { condominiumId: id } });
        await transaction.condominium.delete({ where: { id } });
      }
    });
    await this.loadDatabaseData();
    return { id };
  }

  private safeUser(user: DemoUser & { passwordHash?: string }) {
    const { password: _password, passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private userRole(value: unknown): DemoUser['role'] {
    return value === 'SUPER_ADMIN' || value === 'CONDO_ADMIN' ? value : 'RESIDENT';
  }

  private approvalStatus(value: unknown): DemoUser['approvalStatus'] {
    return value === 'REJECTED' || value === 'PENDING' ? value : 'APPROVED';
  }

  private mapDatabaseService(service: {
    id: string; categoryId: string; name: string; slug: string; icon: string | null; displayOrder: number; active: boolean;
    aliases: Array<{ alias: string }>;
  }): DemoCategoryService {
    return {
      id: service.id,
      categoryId: service.categoryId,
      name: service.name,
      slug: service.slug,
      icon: service.icon ?? 'wrench',
      displayOrder: service.displayOrder,
      active: service.active,
      aliases: service.aliases.map((item) => item.alias),
    };
  }

  private stringArray(value: unknown, fallback?: unknown): string[] {
    const source = Array.isArray(value) ? value : value ? [value] : Array.isArray(fallback) ? fallback : fallback ? [fallback] : [];
    return [...new Set(source.map(String).filter(Boolean))];
  }

  /** Mantém a mensagem consistente antes da validação única do banco. */
  private assertEmailAvailable(email: string, currentUserId = '') {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!normalizedEmail) return;
    const alreadyRegistered = this.users.some((user) => user.id !== currentUserId && user.email.trim().toLowerCase() === normalizedEmail);
    if (alreadyRegistered) throw new ConflictException('Este e-mail já possui cadastro. Entre com a conta existente ou use outro e-mail.');
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

  /**
   * "ar condicionado", "Ar-Condicionado" e "arcondicionado" encontram a mesma coisa:
   * cada palavra digitada precisa aparecer, em qualquer ordem. Palavras de até dois
   * caracteres exigem correspondência exata, para "ar" não casar com "reparo".
   */
  private matchesSearch(haystack: string, query: string) {
    const terms = this.normalize(query).split(' ').filter(Boolean);
    if (!terms.length) return true;
    const target = this.normalize(haystack);
    if (!target) return false;
    const compact = target.replace(/ /g, '');
    return terms.every((term) =>
      term.length <= 2 ? new RegExp(`(^| )${term}( |$)`).test(target) : target.includes(term) || compact.includes(term),
    );
  }

  private updateMemoryProfessionalTaxonomy(professional: DemoProfessional, payload: Record<string, unknown>) {
    const categoryIds = this.stringArray(payload.categoryIds, payload.categoryId ?? professional.categoryId);
    const categories = this.categories.filter((category) => categoryIds.includes(category.id));
    const serviceIds = this.stringArray(payload.serviceIds);
    const services = this.categoryServices.filter((service) => serviceIds.includes(service.id) && categoryIds.includes(service.categoryId));
    professional.categoryIds = categories.map((category) => category.id);
    professional.categories = categories;
    professional.categoryId = categories[0]?.id ?? '';
    professional.category = categories[0]?.name ?? 'Sem categoria';
    professional.serviceIds = services.map((service) => service.id);
    professional.serviceDetails = services;
    professional.services = services.map((service) => service.name);
  }

  private async validServiceIds(categoryIds: string[], serviceIds: string[]) {
    if (!serviceIds.length) return [];
    const services = await this.prisma.categoryService.findMany({ where: { id: { in: serviceIds }, categoryId: { in: categoryIds } }, select: { id: true } });
    return services.map((service) => service.id);
  }

  private toSlug(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /** Normaliza a jornada vinda do banco, descartando bloco malformado. */
  private parseWorkingHours(valor: unknown): Array<{ days: number[]; start: string; end: string }> {
    if (!Array.isArray(valor)) return [];
    return valor
      .filter((bloco): bloco is { days: unknown; start: unknown; end: unknown } => typeof bloco === 'object' && bloco !== null)
      .map((bloco) => ({
        days: Array.isArray(bloco.days) ? bloco.days.map(Number).filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6) : [],
        start: String(bloco.start ?? ''),
        end: String(bloco.end ?? ''),
      }))
      .filter((bloco) => bloco.days.length > 0 && /^\d{2}:\d{2}$/.test(bloco.start) && /^\d{2}:\d{2}$/.test(bloco.end));
  }

  /**
   * Profissionais que o app pode exibir. O administrador continua enxergando
   * todos por getAdminRecords, senão não teria como restaurar quem foi punido.
   */
  private visibleProfessionals() {
    return this.professionals.filter(
      (professional) =>
        professional.active !== false &&
        !professional.moderationHidden &&
        // Cadastros antigos não têm o campo e seguem visíveis.
        (professional.approvalStatus ?? 'APPROVED') === 'APPROVED',
    );
  }

  getProfessionals(categorySlug?: string, serviceSlug?: string, search?: string, condominiumId?: string): Array<DemoProfessional & { matchesLocation?: boolean }> {
    const query = search ?? '';
    const filtered = this.visibleProfessionals().filter((professional) => {
      const categoryMatch = !categorySlug || professional.categories.some((category) => category.slug === categorySlug);
      const serviceMatch = !serviceSlug || professional.serviceDetails.some((service) => service.slug === serviceSlug);
      if (!categoryMatch || !serviceMatch) return false;
      const searchable = [
        professional.name,
        professional.companyName ?? '',
        professional.bio,
        professional.city,
        professional.neighborhood,
        ...professional.categories.map((category) => category.name),
        ...professional.serviceDetails.flatMap((service) => [service.name, ...service.aliases]),
      ].join(' ');
      return this.matchesSearch(searchable, query);
    });

    const condominium = condominiumId ? this.condominiums.find((item) => item.id === condominiumId) : undefined;
    if (!condominium) return filtered;

    // Prioriza quem atende perto do morador: bairro+cidade primeiro, depois só cidade, depois o resto.
    // A ordem relativa dentro de cada camada é preservada (sort é estável).
    const condoCity = this.normalize(condominium.city);
    const condoNeighborhood = this.normalize(condominium.neighborhood);
    const locationTier = (professional: DemoProfessional) => {
      const cityMatch = Boolean(condoCity) && this.normalize(professional.city) === condoCity;
      const neighborhoodMatch = cityMatch && Boolean(condoNeighborhood) && this.normalize(professional.neighborhood) === condoNeighborhood;
      return { cityMatch, neighborhoodMatch };
    };

    return filtered
      .map((professional) => ({ professional, ...locationTier(professional) }))
      .sort((left, right) => {
        const tierOf = (item: { cityMatch: boolean; neighborhoodMatch: boolean }) => (item.neighborhoodMatch ? 0 : item.cityMatch ? 1 : 2);
        return tierOf(left) - tierOf(right);
      })
      .map(({ professional, neighborhoodMatch }) => ({ ...professional, matchesLocation: neighborhoodMatch }));
  }

  getCategoryById(id: string) {
    return this.categories.find((category) => category.id === id || category.slug === id);
  }

  async getOwnAccount(userId: string) {
    this.ensureDatabase('carregar o perfil');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.accountPayload(user);
  }

  async updateOwnAccount(userId: string, payload: Record<string, unknown>) {
    this.ensureDatabase('atualizar o perfil');
    const name = String(payload.name ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    if (!name || !email) throw new ConflictException('Informe nome e e-mail.');
    // O endereço é opcional aqui: só grava o que vier, para o cliente poder
    // completar aos poucos sem apagar o que já estava salvo.
    const texto = (campo: unknown) => (campo === undefined ? undefined : String(campo ?? '').trim() || null);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: String(payload.phone ?? '').trim() || null,
        zipCode: texto(payload.zipCode),
        street: texto(payload.street),
        number: texto(payload.number),
        complement: texto(payload.complement),
        neighborhood: texto(payload.neighborhood),
        city: texto(payload.city),
        state: texto(payload.state),
      },
    });
    await this.loadDatabaseData();
    return this.accountPayload(user);
  }

  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
    this.ensureDatabase('trocar a senha');
    if (String(newPassword).length < 6) throw new ConflictException('A nova senha deve ter ao menos 6 caracteres.');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !await bcrypt.compare(String(currentPassword ?? ''), user.passwordHash)) throw new UnauthorizedException('A senha atual está incorreta.');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
    return { success: true };
  }

  private accountPayload(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    zipCode?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      // O endereço já está cadastrado: as telas que precisam dele (ex.: pedir
      // propostas) preenchem sozinhas em vez de pedir tudo de novo.
      zipCode: user.zipCode ?? '',
      street: user.street ?? '',
      number: user.number ?? '',
      complement: user.complement ?? '',
      neighborhood: user.neighborhood ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
    };
  }

  getCategoryServices(categoryId: string, includeInactive = false) {
    const category = this.getCategoryById(categoryId);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return this.categoryServices
      .filter((service) => service.categoryId === category.id && (includeInactive || service.active))
      .sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name));
  }

  matchProblem(query: string) {
    return this.problemMatcher.matchProblem(
      query,
      this.categories.map((category) => ({ ...category, services: category.services ?? [] })),
      this.professionals,
    );
  }

  async createServiceRequest(payload: {
    userId: string;
    title: string;
    description: string;
    categoryId?: string;
    serviceIds?: string[];
    urgency?: string;
    preferredDate?: string;
    preferredPeriod?: string;
    budgetType?: string;
    budgetMin?: number | string | null;
    budgetMax?: number | string | null;
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  }) {
    this.ensureDatabase('publicar a solicitação');
    const user = this.findUserById(payload.userId);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    const title = String(payload.title ?? '').trim();
    const description = String(payload.description ?? '').trim();
    if (!title) throw new ConflictException('Informe um título para o problema');
    if (!description) throw new ConflictException('Descreva o problema para publicar a solicitação');

    const serviceIds = this.stringArray(payload.serviceIds);
    const firstService = serviceIds.length ? this.categoryServices.find((service) => service.id === serviceIds[0]) : undefined;
    const category = payload.categoryId ? this.getCategoryById(payload.categoryId) : firstService ? this.getCategoryById(firstService.categoryId) : undefined;
    if (!category) throw new ConflictException('Selecione uma categoria para a solicitação');
    const validServiceIds = serviceIds.length
      ? this.categoryServices
          .filter((service) => serviceIds.includes(service.id) && service.categoryId === category.id)
          .map((service) => service.id)
      : [];
    if (!validServiceIds.length) throw new ConflictException('Selecione ao menos um serviço relacionado');

    const record = await this.prisma.serviceRequest.create({
      data: {
        clientId: user.id,
        categoryId: category.id,
        title,
        description,
        urgency: this.parseUrgency(payload.urgency),
        preferredDate: payload.preferredDate ? new Date(payload.preferredDate) : null,
        preferredPeriod: this.parsePreferredPeriod(payload.preferredPeriod),
        budgetType: this.parseBudgetType(payload.budgetType),
        budgetMin: this.decimalOrNull(payload.budgetMin),
        budgetMax: this.decimalOrNull(payload.budgetMax),
        zipCode: this.optionalString(payload.zipCode),
        street: this.optionalString(payload.street),
        number: this.optionalString(payload.number),
        complement: this.optionalString(payload.complement),
        neighborhood: this.optionalString(payload.neighborhood),
        city: this.optionalString(payload.city),
        state: this.optionalString(payload.state),
        latitude: this.decimalOrNull(payload.latitude),
        longitude: this.decimalOrNull(payload.longitude),
        status: 'OPEN',
        services: {
          create: validServiceIds.map((categoryServiceId) => ({ categoryServiceId })),
        },
      },
    });

    return this.getServiceRequestById(record.id, user.id);
  }

  async attachServiceRequestMedia(
    requestId: string,
    userId: string,
    files: Array<{ url: string; storagePath: string; mediaType: 'IMAGE' | 'VIDEO' }>,
  ) {
    this.ensureDatabase('salvar as mídias da solicitação');
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { media: true },
    });
    if (!request || request.clientId !== userId) throw new NotFoundException('Solicitação não encontrada');

    const totalImages = request.media.filter((item) => item.mediaType === 'IMAGE').length + files.filter((item) => item.mediaType === 'IMAGE').length;
    const totalVideos = request.media.filter((item) => item.mediaType === 'VIDEO').length + files.filter((item) => item.mediaType === 'VIDEO').length;
    if (totalImages > 10) throw new ConflictException('A solicitação aceita no máximo 10 imagens.');
    if (totalVideos > 1) throw new ConflictException('A solicitação aceita apenas 1 vídeo.');

    if (files.length) {
      await this.prisma.serviceRequestMedia.createMany({
        data: files.map((file, index) => ({
          requestId,
          mediaType: file.mediaType,
          url: file.url,
          storagePath: file.storagePath,
          displayOrder: request.media.length + index,
        })),
      });
    }

    return this.getServiceRequestById(requestId, userId);
  }

  async getServiceRequestsForUser(userId: string) {
    this.ensureDatabase('carregar as solicitações');
    if (!this.findUserById(userId)) throw new UnauthorizedException('Sessão inválida');
    const requests = await this.prisma.serviceRequest.findMany({
      where: { clientId: userId },
      include: {
        category: true,
        services: { include: { categoryService: true } },
        media: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((request) => this.mapServiceRequest(request));
  }

  async getServiceRequestById(id: string, userId: string) {
    this.ensureDatabase('carregar a solicitação');
    if (!this.findUserById(userId)) throw new UnauthorizedException('Sessão inválida');
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        category: true,
        services: { include: { categoryService: true } },
        media: { orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!request || request.clientId !== userId) throw new NotFoundException('Solicitação não encontrada');
    return this.mapServiceRequest(request);
  }

  async createCategoryService(categoryId: string, payload: Record<string, unknown>) {
    this.ensureDatabase('criar o serviço da categoria');
    const category = this.getCategoryById(categoryId);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    const name = String(payload.name ?? '').trim();
    if (!name) throw new ConflictException('Informe o nome do serviço');
    if (this.databaseAvailable) {
      const aliases = this.stringArray(payload.aliases);
      const record = await this.prisma.categoryService.create({
        data: {
          categoryId: category.id, name, slug: this.toSlug(String(payload.slug || name)), icon: String(payload.icon || 'wrench'),
          displayOrder: Number(payload.displayOrder ?? this.getCategoryServices(category.id, true).length + 1), active: payload.active !== false,
          aliases: { create: aliases.map((alias) => ({ alias, normalizedAlias: this.normalize(alias) })) },
        },
      });
      await this.loadDatabaseData();
      return this.categoryServices.find((service) => service.id === record.id);
    }
    const service: DemoCategoryService = {
      id: `service-${Date.now()}`, categoryId: category.id, name, slug: this.toSlug(String(payload.slug || name)), icon: String(payload.icon || 'wrench'),
      displayOrder: Number(payload.displayOrder ?? this.getCategoryServices(category.id, true).length + 1), active: payload.active !== false, aliases: this.stringArray(payload.aliases),
    };
    this.categoryServices.push(service);
    category.services = this.getCategoryServices(category.id, true);
    return service;
  }

  async updateCategoryService(id: string, payload: Record<string, unknown>) {
    this.ensureDatabase('atualizar o serviço da categoria');
    const service = this.categoryServices.find((item) => item.id === id);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (this.databaseAvailable) {
      const aliases = payload.aliases === undefined ? undefined : this.stringArray(payload.aliases);
      await this.prisma.$transaction(async (transaction) => {
        await transaction.categoryService.update({ where: { id }, data: {
          name: payload.name === undefined ? undefined : String(payload.name), slug: payload.slug === undefined && payload.name === undefined ? undefined : this.toSlug(String(payload.slug || payload.name)),
          icon: payload.icon === undefined ? undefined : String(payload.icon), displayOrder: payload.displayOrder === undefined ? undefined : Number(payload.displayOrder), active: payload.active === undefined ? undefined : Boolean(payload.active),
        } });
        if (aliases) {
          await transaction.categoryServiceAlias.deleteMany({ where: { categoryServiceId: id } });
          if (aliases.length) await transaction.categoryServiceAlias.createMany({ data: aliases.map((alias) => ({ categoryServiceId: id, alias, normalizedAlias: this.normalize(alias) })), skipDuplicates: true });
        }
      });
      await this.loadDatabaseData();
      return this.categoryServices.find((item) => item.id === id);
    }
    if (payload.name !== undefined) service.name = String(payload.name);
    if (payload.name !== undefined || payload.slug !== undefined) service.slug = this.toSlug(String(payload.slug || payload.name));
    if (payload.icon !== undefined) service.icon = String(payload.icon);
    if (payload.displayOrder !== undefined) service.displayOrder = Number(payload.displayOrder);
    if (payload.active !== undefined) service.active = Boolean(payload.active);
    if (payload.aliases !== undefined) service.aliases = this.stringArray(payload.aliases);
    return service;
  }

  async deleteCategoryService(id: string) {
    this.ensureDatabase('excluir o serviço da categoria');
    if (!this.categoryServices.some((service) => service.id === id)) throw new NotFoundException('Serviço não encontrado');
    if (this.databaseAvailable) {
      await this.prisma.categoryService.delete({ where: { id } });
      await this.loadDatabaseData();
    } else {
      this.categoryServices.splice(this.categoryServices.findIndex((service) => service.id === id), 1);
      for (const professional of this.professionals) this.updateMemoryProfessionalTaxonomy(professional, { categoryIds: professional.categoryIds, serviceIds: professional.serviceIds.filter((serviceId) => serviceId !== id) });
    }
    return { id };
  }

  getProfessionalServices(id: string) {
    const professional = this.getProfessionalById(id);
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    return professional.serviceDetails;
  }

  async updateProfessionalServices(id: string, serviceIds: string[]) {
    this.ensureDatabase('atualizar os serviços do profissional');
    const professional = this.getProfessionalById(id);
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    const validIds = this.categoryServices.filter((service) => serviceIds.includes(service.id) && professional.categoryIds.includes(service.categoryId)).map((service) => service.id);
    if (this.databaseAvailable) {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.professionalService.deleteMany({ where: { professionalId: id } });
        if (validIds.length) await transaction.professionalService.createMany({ data: validIds.map((categoryServiceId) => ({ professionalId: id, categoryServiceId })) });
      });
      await this.loadDatabaseData();
    } else this.updateMemoryProfessionalTaxonomy(professional, { categoryIds: professional.categoryIds, serviceIds: validIds });
    return this.getProfessionalServices(id);
  }

  private mapServiceRequest(request: {
    id: string;
    clientId: string;
    title: string;
    description: string;
    urgency: string;
    preferredDate: Date | null;
    preferredPeriod: string | null;
    budgetType: string | null;
    budgetMin: { toNumber(): number } | null;
    budgetMax: { toNumber(): number } | null;
    zipCode: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    latitude: { toNumber(): number } | null;
    longitude: { toNumber(): number } | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    category: { id: string; name: string; slug: string } | null;
    services: Array<{ categoryService: { id: string; categoryId: string; name: string; slug: string; icon: string | null } }>;
    media: Array<{ id: string; mediaType: string; url: string; storagePath: string; displayOrder: number; createdAt: Date }>;
  }) {
    return {
      id: request.id,
      clientId: request.clientId,
      title: request.title,
      description: request.description,
      categoryId: request.category?.id ?? '',
      categoryName: request.category?.name ?? '',
      categorySlug: request.category?.slug ?? '',
      serviceIds: request.services.map((entry) => entry.categoryService.id),
      services: request.services.map((entry) => ({
        id: entry.categoryService.id,
        categoryId: entry.categoryService.categoryId,
        name: entry.categoryService.name,
        slug: entry.categoryService.slug,
        icon: entry.categoryService.icon ?? 'wrench',
      })),
      urgency: request.urgency,
      preferredDate: request.preferredDate?.toISOString() ?? '',
      preferredPeriod: request.preferredPeriod ?? '',
      budgetType: request.budgetType ?? '',
      budgetMin: request.budgetMin?.toNumber() ?? null,
      budgetMax: request.budgetMax?.toNumber() ?? null,
      zipCode: request.zipCode ?? '',
      street: request.street ?? '',
      number: request.number ?? '',
      complement: request.complement ?? '',
      neighborhood: request.neighborhood ?? '',
      city: request.city ?? '',
      state: request.state ?? '',
      latitude: request.latitude?.toNumber() ?? null,
      longitude: request.longitude?.toNumber() ?? null,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      closedAt: request.closedAt?.toISOString() ?? '',
      media: request.media.map((item) => ({
        id: item.id,
        mediaType: item.mediaType,
        url: item.url,
        storagePath: item.storagePath,
        displayOrder: item.displayOrder,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  private parseUrgency(value: unknown) {
    return value === 'EMERGENCY' || value === 'TODAY' || value === 'NEXT_DAYS' ? value : 'NO_RUSH';
  }

  private parsePreferredPeriod(value: unknown) {
    return value === 'MORNING' || value === 'AFTERNOON' || value === 'EVENING' ? value : value === 'ANY' ? 'ANY' : null;
  }

  private parseBudgetType(value: unknown) {
    return value === 'FIXED' || value === 'RANGE' || value === 'OPEN' ? value : null;
  }

  private optionalString(value: unknown) {
    const clean = String(value ?? '').trim();
    return clean || null;
  }

  private decimalOrNull(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }


  // ---------- Denúncias ----------

  /** Escritas nunca usam o modo de demonstração, evitando informar sucesso sem persistência. */
  private ensureDatabase(operation = 'concluir esta operação') {
    if (!this.databaseAvailable) {
      throw new ServiceUnavailableException(`Não foi possível ${operation}: banco de dados não conectado. Nenhuma alteração foi salva.`);
    }
  }

  private readonly denunciaInclude = {
    user: true,
    professional: { include: { professionalCategories: { include: { category: true } } } },
  } as const;

  private linhaDaDenuncia(denuncia: {
    id: string;
    professionalId: string;
    reason: string;
    details: string | null;
    status: string;
    channel: string;
    createdAt: Date;
    user: { name: string; block: string | null; unit: string | null };
    professional: { name: string; professionalCategories: Array<{ category: { name: string } }> };
  }) {
    const criada = denuncia.createdAt;
    return {
      id: denuncia.id,
      resident: denuncia.user.name,
      residentInitials: this.initials(denuncia.user.name),
      residentPlace: [denuncia.user.block, denuncia.user.unit].filter(Boolean).join(' - '),
      professionalId: denuncia.professionalId,
      professional: denuncia.professional.name,
      professionalCategory: denuncia.professional.professionalCategories[0]?.category.name ?? 'Sem categoria',
      reason: denuncia.reason,
      description: denuncia.details ?? '',
      date: criada.toLocaleDateString('pt-BR'),
      time: criada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: COMPLAINT_STATUS_TO_LABEL[denuncia.status as keyof typeof COMPLAINT_STATUS_TO_LABEL] ?? 'Pendente',
      channel: denuncia.channel,
    };
  }

  /** Punições já aplicadas ao prestador + status atual, calculado a partir das ações ainda ativas. */
  private async resumoDoProfissional(professionalId: string) {
    const profissional = this.getProfessionalById(professionalId);
    const acoes = await this.prisma.professionalAction.findMany({ where: { professionalId }, orderBy: { createdAt: 'desc' } });
    const acoesAtivas = acoes.filter((item) => item.active);
    const ultima = acoesAtivas[0];
    const suspensaoAtiva = ultima?.endsAt && ultima.endsAt.getTime() > Date.now() ? ultima : undefined;
    let status = 'Ativo no condomínio';
    if (acoesAtivas.some((item) => item.action === 'BLOCK')) status = 'Bloqueado permanentemente';
    else if (suspensaoAtiva) status = `Suspenso até ${suspensaoAtiva.endsAt!.toLocaleDateString('pt-BR')}`;
    else if (ultima?.action === 'HIDE') status = 'Oculto do app';
    else if (ultima?.action === 'WARN') status = 'Advertido';

    const complaintCount = await this.prisma.report.count({ where: { professionalId } });

    return {
      id: professionalId,
      name: profissional?.name ?? 'Profissional indisponível',
      category: profissional?.category ?? 'Sem categoria',
      avatar: profissional?.avatar ?? '',
      rating: profissional?.rating ?? 0,
      reviewCount: profissional?.reviewCount ?? 0,
      complaintCount,
      phone: profissional?.phone ?? '',
      whatsapp: profissional?.whatsapp ?? '',
      status,
      actions: acoes.map((item) => ({
        id: item.id,
        label: item.label,
        createdAt: item.createdAt.toISOString(),
        until: item.endsAt ? item.endsAt.toISOString() : null,
      })),
    };
  }

  async getComplaints() {
    this.ensureDatabase();
    const reports = await this.prisma.report.findMany({
      include: this.denunciaInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((denuncia) => this.linhaDaDenuncia(denuncia));
  }

  async getComplaintDetails(id: string) {
    this.ensureDatabase();
    const detailsInclude = {
      ...this.denunciaInclude,
      images: true,
      history: { include: { user: true }, orderBy: { createdAt: 'desc' as const } },
    };
    let denuncia = await this.prisma.report.findUnique({ where: { id }, include: detailsInclude });
    if (!denuncia) throw new NotFoundException('Denúncia não encontrada');

    const jaVisualizou = denuncia.history.some((item) => item.kind === 'view');
    if (!jaVisualizou) {
      await this.prisma.reportHistory.create({ data: { reportId: id, kind: 'view', label: 'Administrador visualizou os anexos' } });
      denuncia = await this.prisma.report.findUnique({ where: { id }, include: detailsInclude });
      if (!denuncia) throw new NotFoundException('Denúncia não encontrada');
    }

    return {
      ...this.linhaDaDenuncia(denuncia),
      createdAt: denuncia.createdAt.toISOString(),
      images: denuncia.images.map((image) => image.url),
      history: denuncia.history.map((item) => ({
        id: item.id,
        at: item.createdAt.toISOString(),
        label: item.label,
        detail: item.detail ?? undefined,
        kind: item.kind as ComplaintEvent['kind'],
      })),
      adminNote: denuncia.adminNote ?? '',
      notifyParties: denuncia.notifyParties,
      professionalSummary: await this.resumoDoProfissional(denuncia.professionalId),
    };
  }

  async updateComplaintStatus(id: string, status: ComplaintStatus) {
    this.ensureDatabase();
    const permitidos: ComplaintStatus[] = ['Pendente', 'Em análise', 'Urgente', 'Resolvida', 'Ignorada'];
    if (!permitidos.includes(status)) throw new ConflictException('Status inválido para a denúncia');
    const denuncia = await this.prisma.report.findUnique({ where: { id } });
    if (!denuncia) throw new NotFoundException('Denúncia não encontrada');

    await this.prisma.report.update({
      where: { id },
      data: {
        status: COMPLAINT_LABEL_TO_STATUS[status],
        resolvedAt: status === 'Resolvida' && !denuncia.resolvedAt ? new Date() : undefined,
        reviewedAt: status !== 'Pendente' && !denuncia.reviewedAt ? new Date() : undefined,
      },
    });
    await this.prisma.reportHistory.create({ data: { reportId: id, kind: 'status', label: `Status alterado para ${status}` } });

    const memoria = this.reports.find((item) => item.id === id);
    if (memoria) memoria.status = status;

    return this.getComplaintDetails(id);
  }

  async saveComplaintNote(id: string, note: string, notify: boolean) {
    this.ensureDatabase();
    const denuncia = await this.prisma.report.findUnique({ where: { id } });
    if (!denuncia) throw new NotFoundException('Denúncia não encontrada');
    const adminNote = String(note ?? '').trim();
    await this.prisma.report.update({ where: { id }, data: { adminNote, notifyParties: Boolean(notify) } });
    await this.prisma.reportHistory.create({
      data: {
        reportId: id,
        kind: 'note',
        label: 'Parecer administrativo registrado',
        detail: notify ? 'Morador e prestador serão notificados.' : undefined,
      },
    });
    return this.getComplaintDetails(id);
  }

  async applyComplaintAction(id: string, action: ComplaintAction) {
    this.ensureDatabase();
    if (!ACTION_LABELS[action]) throw new ConflictException('Ação inválida');
    const denuncia = await this.prisma.report.findUnique({ where: { id } });
    if (!denuncia) throw new NotFoundException('Denúncia não encontrada');
    const professionalId = denuncia.professionalId;

    if (action === 'restore') {
      // preserva o histórico: em vez de apagar as punições anteriores, apenas marca como inativas
      await this.prisma.professionalAction.updateMany({ where: { professionalId, active: true }, data: { active: false } });
    }

    const dias = action === 'suspend7' ? 7 : action === 'suspend30' ? 30 : 0;
    const endsAt = dias ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000) : null;

    await this.prisma.professionalAction.create({
      data: {
        professionalId,
        reportId: id,
        action: ACTION_TYPE_MAP[action],
        label: ACTION_LABELS[action],
        endsAt,
      },
    });

    if (action === 'restore') {
      await this.updateAdminRecord('professionals', professionalId, { active: true });
    } else if (action !== 'warn') {
      // esconder, suspender ou bloquear tira o profissional das listagens do app
      await this.updateAdminRecord('professionals', professionalId, { active: false }).catch(() => undefined);
    }

    await this.prisma.reportHistory.create({ data: { reportId: id, kind: 'action', label: ACTION_LABELS[action] } });

    return this.getComplaintDetails(id);
  }

  /** Denúncia enviada pelo morador contra um profissional, feita pelo app. */
  async submitComplaint(payload: { userId: string; professionalId: string; reason: string; description: string; images?: string[] }) {
    const user = this.findUserById(payload.userId);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    const professional = this.getProfessionalById(payload.professionalId);
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    this.ensureDatabase();

    const reason = String(payload.reason ?? '').trim();
    if (!reason) throw new ConflictException('Informe o motivo da denúncia');
    const description = String(payload.description ?? '').trim();
    const images = payload.images?.slice(0, 10) ?? [];

    const report = await this.prisma.report.create({
      data: {
        condominiumId: user.condominiumId,
        userId: payload.userId,
        professionalId: professional.id,
        reason,
        details: description || null,
        status: 'PENDENTE',
        channel: 'App do morador',
      },
    });

    if (images.length) {
      await this.prisma.reportImage.createMany({ data: images.map((url) => ({ reportId: report.id, url })) });
    }

    await this.prisma.reportHistory.create({
      data: { reportId: report.id, userId: payload.userId, kind: 'received', label: 'Denúncia recebida' },
    });

    this.reports.push({
      id: report.id,
      resident: user.name,
      professional: professional.name,
      reason,
      description,
      date: report.createdAt.toLocaleDateString('pt-BR'),
      status: 'Pendente',
    });

    return { id: report.id };
  }

  getProfessionalById(id: string): DemoProfessional | undefined {
    // Perfil de quem foi bloqueado nao deve abrir pelo link direto.
    return this.visibleProfessionals().find((item) => item.id === id);
  }

  getProfessionalReviews(professionalId: string): DemoReview[] {
    return this.reviews.filter((item) => item.professionalId === professionalId);
  }

  private toPublicName(name: string) {
    const [first, second] = name.trim().split(' ').filter(Boolean);
    return second ? `${first} ${second[0]}.` : (first ?? 'Morador');
  }

  getProfessionalComments(professionalId: string, userId?: string) {
    return this.getProfessionalReviews(professionalId)
      .slice()
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .map((review) => ({
        ...review,
        userAvatar: '',
        images: this.reviewImages.get(review.id) ?? [],
        likes: this.reviewLikes.get(review.id)?.size ?? 0,
        liked: userId ? (this.reviewLikes.get(review.id)?.has(userId) ?? false) : false,
        replies: this.reviewReplies.get(review.id) ?? [],
      }));
  }

  async toggleCommentLike(reviewId: string, userId: string) {
    this.ensureDatabase('registrar a curtida');
    if (!this.reviews.some((review) => review.id === reviewId)) throw new NotFoundException('Comentário não encontrado');
    if (!this.findUserById(userId)) throw new UnauthorizedException('Sessão inválida');
    const likes = this.reviewLikes.get(reviewId) ?? new Set<string>();
    const liked = !likes.has(userId);

    if (this.databaseAvailable) {
      if (liked) {
        await this.prisma.reviewLike.upsert({
          where: { reviewId_userId: { reviewId, userId } },
          update: {},
          create: { reviewId, userId },
        });
      } else {
        await this.prisma.reviewLike.deleteMany({ where: { reviewId, userId } });
      }
    }

    if (liked) likes.add(userId);
    else likes.delete(userId);
    this.reviewLikes.set(reviewId, likes);
    return { reviewId, liked, likes: likes.size };
  }

  async replyToComment(reviewId: string, userId: string, comment: string) {
    this.ensureDatabase('salvar a resposta');
    if (!this.reviews.some((review) => review.id === reviewId)) throw new NotFoundException('Comentário não encontrado');
    const user = this.findUserById(userId);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    const cleanComment = comment.trim();
    if (!cleanComment) throw new ConflictException('Escreva uma resposta');
    const replies = this.reviewReplies.get(reviewId) ?? [];
    let replyId = `reply-${reviewId}-${Date.now()}`;
    let createdAt = new Date();

    if (this.databaseAvailable) {
      const record = await this.prisma.reviewReply.create({
        data: { reviewId, userId, comment: cleanComment },
      });
      replyId = record.id;
      createdAt = record.createdAt;
    }

    const reply = {
      id: replyId,
      userId,
      userName: user.name,
      comment: cleanComment,
      createdAt: createdAt.toISOString(),
    };
    replies.push(reply);
    this.reviewReplies.set(reviewId, replies);
    return reply;
  }

  getFavorites(userId: string): DemoProfessional[] {
    const ids = this.favoriteProfessionalIds.get(userId) ?? new Set<string>();
    return this.visibleProfessionals().filter((item) => ids.has(item.id));
  }

  async toggleFavorite(userId: string, professionalId: string) {
    this.ensureDatabase('atualizar os favoritos');
    if (!this.getProfessionalById(professionalId)) throw new NotFoundException('Profissional não encontrado');
    const favorites = this.favoriteProfessionalIds.get(userId) ?? new Set<string>();
    const active = !favorites.has(professionalId);

    if (active) {
      const user = this.findUserById(userId);
      if (!user) throw new UnauthorizedException('Sessão inválida');
      await this.prisma.favorite.upsert({
        where: { userId_professionalId: { userId, professionalId } },
        update: {},
        create: { userId, professionalId, condominiumId: user.condominiumId },
      });
    } else {
      await this.prisma.favorite.deleteMany({ where: { userId, professionalId } });
    }

    if (active) favorites.add(professionalId);
    else favorites.delete(professionalId);
    this.favoriteProfessionalIds.set(userId, favorites);

    return { professionalId, active };
  }

  async createRecommendation(payload: {
    userId: string;
    condominiumId: string;
    professionalId?: string;
    name: string;
    category: string;
    phone: string;
    company?: string;
    city: string;
    neighborhood: string;
    services: string[];
    categoryIds?: string[];
    serviceIds?: string[];
    comment?: string;
    rating?: number;
    images?: string[];
    recommended: boolean;
  }) {
    this.ensureDatabase('salvar a indicação');
    const user = this.findUserById(payload.userId);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    let professional = payload.professionalId ? this.getProfessionalById(payload.professionalId) : undefined;
    if (!professional) {
      const categoryIds = payload.categoryIds?.length ? payload.categoryIds : [this.categories.find((item) => item.name === payload.category)?.id ?? this.categories[0].id];
      const categories = this.categories.filter((item) => categoryIds.includes(item.id));
      const serviceIds = payload.serviceIds?.length
        ? payload.serviceIds
        : this.categoryServices.filter((service) => categoryIds.includes(service.categoryId) && payload.services.some((name) => this.normalize(name) === this.normalize(service.name))).map((service) => service.id);
      const serviceDetails = this.categoryServices.filter((service) => serviceIds.includes(service.id));
      const category = categories[0] ?? this.categories[0];
      professional = {
        id: `pro-${this.professionals.length + 1}`,
        name: payload.name,
        categoryId: category.id,
        category: category.name,
        categoryIds: categories.map((item) => item.id),
        categories,
        serviceIds: serviceDetails.map((item) => item.id),
        serviceDetails,
        rating: 0,
        reviewCount: 0,
        recommendationCount: 0,
        services: serviceDetails.map((service) => service.name),
        city: payload.city,
        neighborhood: payload.neighborhood,
        condominiumId: payload.condominiumId,
        bio: payload.company ? `Profissional da empresa ${payload.company}.` : 'Profissional indicado por moradores.',
        whatsapp: payload.phone.replace(/\D/g, ''),
        phone: payload.phone,
        instagram: '',
        avatar: '',
        coverImage: '',
        featured: false,
      };
      if (this.databaseAvailable) {
        const record = await this.prisma.professional.create({
          data: {
            name: professional.name,
            bio: professional.bio || null,
            phone: professional.phone,
            whatsapp: professional.whatsapp || null,
            instagram: professional.instagram || null,
            city: professional.city,
            neighborhood: professional.neighborhood,
            avatar: professional.avatar || null,
            coverImage: professional.coverImage || null,
            professionalCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
            professionalServices: { create: serviceIds.map((categoryServiceId) => ({ categoryServiceId })) },
          },
        });
        professional.id = record.id;
      }
      this.professionals.push(professional);
    }
    if (this.recommendations.some((item) => item.userId === payload.userId && item.professionalId === professional.id)) {
      throw new ConflictException('Você já indicou este profissional');
    }
    const rating = Math.min(5, Math.max(0, Math.round(Number(payload.rating ?? 0))));
    let recommendationId = `rec-${Date.now()}-${this.recommendations.length + 1}`;
    if (this.databaseAvailable) {
      const record = await this.prisma.recommendation.create({
        data: {
          condominiumId: payload.condominiumId,
          userId: payload.userId,
          professionalId: professional.id,
          comment: payload.comment ?? '',
          rating,
          status: 'ACTIVE',
          recommended: payload.recommended,
        },
      });
      recommendationId = record.id;
    }
    const recommendation = {
      id: recommendationId,
      professionalId: professional.id,
      userId: payload.userId,
      condominiumId: payload.condominiumId,
      recommended: payload.recommended,
      comment: payload.comment ?? '',
      rating,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE' as const,
    };
    this.recommendations.push(recommendation);
    if (payload.recommended) professional.recommendationCount += 1;
    // the rating given while recommending also becomes a public review, so it counts on the profile
    if (rating > 0) {
      await this.createReview({
        userId: payload.userId,
        condominiumId: payload.condominiumId,
        professionalId: professional.id,
        rating,
        comment: payload.comment?.trim() || (payload.recommended ? 'Recomendo este profissional.' : 'Não recomendo este profissional.'),
        images: payload.images ?? [],
      });
    }
    return recommendation;
  }

  async removeRecommendation(id: string, userId: string) {
    this.ensureDatabase('remover a indicação');
    const recommendation = this.recommendations.find((item) => item.id === id && item.userId === userId);
    if (!recommendation) throw new NotFoundException('Indicação não encontrada');
    await this.prisma.recommendation.update({ where: { id }, data: { status: 'REMOVED' } });
    recommendation.status = 'REMOVED';
    return recommendation;
  }

  async toggleProfessionalRecommendation(userId: string, professionalId: string) {
    this.ensureDatabase('atualizar a recomendação');
    const user = this.findUserById(userId);
    const professional = this.getProfessionalById(professionalId);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    if (!professional) throw new NotFoundException('Profissional não encontrado');

    const existing = this.recommendations.find((item) => item.userId === userId && item.professionalId === professionalId);
    if (existing) {
      const active = existing.status !== 'ACTIVE';
      await this.prisma.recommendation.update({ where: { id: existing.id }, data: { status: active ? 'ACTIVE' : 'REMOVED', recommended: active } });
      existing.status = active ? 'ACTIVE' : 'REMOVED';
      existing.recommended = active;
      professional.recommendationCount = Math.max(0, professional.recommendationCount + (active ? 1 : -1));
      return { active, recommendationCount: professional.recommendationCount };
    }

    let newId = `rec-${this.recommendations.length + 1}`;
    if (this.databaseAvailable) {
      const record = await this.prisma.recommendation.create({
        data: {
          condominiumId: user.condominiumId,
          userId,
          professionalId,
          recommended: true,
          comment: '',
          status: 'ACTIVE',
        },
      });
      newId = record.id;
    }
    this.recommendations.push({
      id: newId,
      professionalId,
      userId,
      condominiumId: user.condominiumId,
      recommended: true,
      comment: '',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    });
    professional.recommendationCount += 1;
    return { active: true, recommendationCount: professional.recommendationCount };
  }

  async createReview(payload: { userId: string; condominiumId: string; professionalId: string; rating: number; comment: string; serviceDate?: string; images?: string[] }) {
    this.ensureDatabase('salvar a avaliação');
    const user = this.findUserById(payload.userId);
    const professional = this.getProfessionalById(payload.professionalId);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    const images = payload.images?.slice(0, 10) ?? [];
    const createdAt = new Date();
    let reviewId = `rev-${Date.now()}-${this.reviews.length + 1}`;

    if (this.databaseAvailable) {
      const record = await this.prisma.review.create({
        data: {
          userId: payload.userId,
          professionalId: professional.id,
          condominiumId: payload.condominiumId,
          rating: payload.rating,
          comment: payload.comment,
          serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : undefined,
        },
      });
      reviewId = record.id;
      if (images.length) {
        await this.prisma.reviewImage.createMany({ data: images.map((url) => ({ reviewId, url })) });
      }
    }

    const review = {
      id: reviewId,
      userId: payload.userId,
      professionalId: professional.id,
      condominiumId: payload.condominiumId,
      userName: this.toPublicName(user.name),
      rating: payload.rating,
      comment: payload.comment,
      createdAt: createdAt.toISOString(),
      serviceDate: payload.serviceDate ?? createdAt.toISOString(),
    };
    this.reviews.push(review);
    if (images.length) this.reviewImages.set(review.id, images);
    professional.reviewCount += 1;
    professional.rating = Number(((professional.rating * (professional.reviewCount - 1) + payload.rating) / professional.reviewCount).toFixed(1));
    return review;
  }

  getRecommendations(userId?: string): DemoRecommendation[] {
    if (!userId) return this.recommendations;
    return this.recommendations.filter((item) => item.userId === userId);
  }

  getDashboard() {
    const topProfessionals = [...this.professionals]
      .sort((left, right) => right.recommendationCount - left.recommendationCount || right.rating - left.rating || left.name.localeCompare(right.name))
      .slice(0, 5)
      .map((professional) => ({ name: professional.name, category: professional.category, total: professional.recommendationCount }));
    const totalRecommendations = this.professionals.reduce((total, professional) => total + professional.recommendationCount, 0);
    const totalReviews = this.professionals.reduce((total, professional) => total + professional.reviewCount, 0);
    return {
      stats: {
        residents: this.users.filter((user) => user.role === 'RESIDENT').length,
        professionals: this.professionals.length,
        recommendations: totalRecommendations,
        reviews: totalReviews,
        categories: this.categories.filter((category) => category.active).length,
      },
      indicationsByDay: this.recommendationsByPeriod(),
      topProfessionals,
      pending: {
        newResidents: this.users.filter((user) => user.role === 'RESIDENT' && user.approvalStatus === 'PENDING').length,
        reports: this.reports.filter((report) => report.status === 'Pendente').length,
      },
    };
  }

  async getPendingItems() {
    const condominiumName = (condominiumId: string) => this.condominiums.find((item) => item.id === condominiumId)?.name ?? '';

    const newResidents = this.users
      .filter((user) => user.role === 'RESIDENT' && user.approvalStatus === 'PENDING')
      .map((user) => ({
        id: `resident-${user.id}`,
        type: 'NEW_RESIDENT' as const,
        title: 'Novo morador aguardando aprovação',
        subtitle: [user.name, user.email, condominiumName(user.condominiumId), user.unit].filter(Boolean).join(' · '),
        link: '/admin/clientes',
        // Permite aprovar ou recusar direto da lista, sem abrir o cadastro.
        targetId: user.id,
      }));

    // Só entra na fila quem já tem serviços e jornada: cobrar aprovação de um
    // cadastro pela metade só geraria vaivém entre admin e profissional.
    const novosProfissionais = this.professionals
      .filter((professional) => professional.approvalStatus === 'PENDING' && professional.profileComplete)
      .map((professional) => ({
        id: `professional-${professional.id}`,
        type: 'NEW_PROFESSIONAL' as const,
        title: 'Novo profissional aguardando aprovação',
        subtitle: [professional.name, professional.category, professional.city].filter(Boolean).join(' · '),
        link: '/admin/profissionais',
        targetId: professional.id,
      }));

    // Denúncias exigem banco de dados; se ele estiver indisponível, apenas os moradores pendentes aparecem na lista.
    let pendingReports: Array<{ id: string; type: 'REPORT'; title: string; subtitle: string; link: string }> = [];
    if (this.databaseAvailable) {
      pendingReports = (await this.getComplaints())
        .filter((row) => row.status === 'Pendente')
        .map((row) => ({
          id: `report-${row.id}`,
          type: 'REPORT' as const,
          title: 'Denúncia aguardando análise',
          subtitle: [row.professional, row.reason, row.date].filter(Boolean).join(' · '),
          link: `/admin/denuncias/${row.id}`,
        }));
    }

    return [...newResidents, ...novosProfissionais, ...pendingReports];
  }

  private recommendationsByPeriod() {
    const buckets = Array.from({ length: 11 }, () => 0);
    for (const recommendation of this.recommendations) {
      const day = new Date(recommendation.createdAt).getDate();
      const index = Math.min(10, Math.max(0, Math.floor((day - 1) / 3)));
      buckets[index] += recommendation.status === 'ACTIVE' ? 1 : 0;
    }
    return buckets;
  }

  getHomePayload() {
    return {
      condominium: this.condominiums[0],
      categories: this.categories.filter((category) => category.active),
      featuredProfessionals: [...this.visibleProfessionals()]
        .sort((left, right) => right.recommendationCount - left.recommendationCount || right.rating - left.rating || left.name.localeCompare(right.name))
        .slice(0, 4),
      user: this.findUserById('user-leonardo'),
    };
  }
}
