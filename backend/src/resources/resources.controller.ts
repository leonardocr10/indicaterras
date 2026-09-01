import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';

/** Só o que precisamos do request para identificar quem visitou um perfil. */
interface RequisicaoComOrigem {
  ip?: string;
  headers?: Record<string, string | undefined>;
}
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OptionalUserId, UserId } from '../auth/current-user.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { DataStoreService } from '../data/data-store.service';
import { FileStorageService } from '../data/file-storage.service';
import type { ArquivoEnviado } from '../data/file-storage.service';
import type { ComplaintAction, ComplaintStatus } from '../data/complaints';
import { CommunicationsService } from './communications.service';
import { CatalogService } from '../data/catalog.service';
import { AiSettingsService } from '../ai/ai-settings.service';
import { NearbyProfessionalsService } from '../data/nearby-professionals.service';
import { ProfessionalDashboardService } from '../data/professional-dashboard.service';
import { OpportunitiesService } from '../data/opportunities.service';
import { MailSettingsService } from '../auth/mail-settings.service';
import { MailService } from '../auth/mail.service';

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_SOLICITACAO = [...TIPOS_ACEITOS, 'video/mp4', 'video/webm', 'video/quicktime'];

const opcoesDeUpload = (maximoMb: number) => ({
  limits: { fileSize: maximoMb * 1024 * 1024 },
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (erro: Error | null, aceito: boolean) => void,
  ) => {
    const aceito = TIPOS_ACEITOS.includes(file.mimetype);
    callback(aceito ? null : new BadRequestException('Envie imagens PNG, JPG ou WebP.'), aceito);
  },
});

const opcoesDeMidiaSolicitacao = {
  limits: { fileSize: 25 * 1024 * 1024, files: 11 },
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (erro: Error | null, aceito: boolean) => void,
  ) => {
    const aceito = TIPOS_SOLICITACAO.includes(file.mimetype);
    callback(aceito ? null : new BadRequestException('Envie imagens PNG, JPG, WebP ou vídeo MP4/WebM/MOV.'), aceito);
  },
};

@ApiTags('resources')
@Controller()
export class ResourcesController {
  constructor(
    private readonly dataStoreService: DataStoreService,
    private readonly fileStorageService: FileStorageService,
    private readonly communicationsService: CommunicationsService,
    private readonly catalogService: CatalogService,
    private readonly aiSettingsService: AiSettingsService,
    private readonly nearbyProfessionalsService: NearbyProfessionalsService,
    private readonly professionalDashboardService: ProfessionalDashboardService,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly mailSettingsService: MailSettingsService,
    private readonly mailService: MailService,
  ) {}

  @Get('condominiums')
  getCondominiums() {
    return { data: this.dataStoreService.getCondominiums() };
  }

  @Get('condominiums/:slug')
  getCondominiumBySlug(@Param('slug') slug: string) {
    return { data: this.dataStoreService.getCondominiumBySlug(slug) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('users')
  getUsers() {
    return { data: this.dataStoreService.getUsers() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  getNotifications(@UserId() userId: string) {
    return this.communicationsService.getNotifications(userId).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('notifications/read')
  markNotificationsRead(@UserId() userId: string, @Body('notificationIds') notificationIds?: string[]) {
    return this.communicationsService.markNotificationsRead(userId, notificationIds).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:professionalId')
  getConversation(@Param('professionalId') professionalId: string, @UserId() userId: string) {
    return this.communicationsService.getConversation(userId, professionalId).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:professionalId/messages')
  sendConversationMessage(@Param('professionalId') professionalId: string, @UserId() userId: string, @Body('content') content: string) {
    return this.communicationsService.sendMessage(userId, professionalId, content).then((data) => ({ data }));
  }

  @Get('categories')
  async getCategories() {
    return { data: this.dataStoreService.getCategories() };
  }

  @Get('category-groups')
  getCategoryGroups() {
    return this.catalogService.groups().then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/account')
  getOwnAccount(@UserId() userId: string) {
    return this.dataStoreService.getOwnAccount(userId).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/account')
  updateOwnAccount(@UserId() userId: string, @Body() payload: Record<string, unknown>) {
    return this.dataStoreService.updateOwnAccount(userId, payload).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/account/change-password')
  changeOwnPassword(@UserId() userId: string, @Body('currentPassword') currentPassword: string, @Body('newPassword') newPassword: string) {
    return this.dataStoreService.changeOwnPassword(userId, currentPassword, newPassword).then((data) => ({ data }));
  }

  @Get('categories/:id/services')
  async getCategoryServices(@Param('id') id: string, @Query('includeInactive') includeInactive?: string) {
    return { data: this.dataStoreService.getCategoryServices(id, includeInactive === 'true') };
  }

  @UseGuards(JwtAuthGuard)
  @Post('service-requests/match-problem')
  matchProblem(@Body('query') query: string) {
    return this.catalogService.match(String(query ?? '')).then((data) => ({ data }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('service-requests')
  async getServiceRequests(@UserId() userId: string) {
    return { data: await this.dataStoreService.getServiceRequestsForUser(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('service-requests')
  async createServiceRequest(
    @UserId() userId: string,
    @Body() payload: Omit<Parameters<DataStoreService['createServiceRequest']>[0], 'userId'>,
  ) {
    // A identidade vem do token, nunca do corpo. O frontend parou de enviar
    // `userId` quando a API passou a exigir Bearer, mas este handler continuou
    // lendo do payload - e respondia 401 para todo mundo.
    return { data: await this.dataStoreService.createServiceRequest({ ...payload, userId }) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('service-requests/:id')
  async getServiceRequestById(@Param('id') id: string, @UserId() userId: string) {
    return { data: await this.dataStoreService.getServiceRequestById(id, userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('service-requests/:id/media')
  @UseInterceptors(FilesInterceptor('files', 11, opcoesDeMidiaSolicitacao))
  async uploadServiceRequestMedia(
    @Param('id') id: string,
    @UserId() userId: string,
    @UploadedFiles() files: ArquivoEnviado[] = [],
  ) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma mídia para enviar.');
    const uploaded = await this.fileStorageService.salvarVariosComDestino('service-requests', [userId, id], files);
    return {
      data: await this.dataStoreService.attachServiceRequestMedia(
        id,
        userId,
        uploaded.map((item, index) => ({
          ...item,
          mediaType: files[index]?.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        })),
      ),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Post('categories/:id/services')
  async createCategoryService(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.createCategoryService(id, payload) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return { data: this.dataStoreService.getCategoryById(id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Put('category-services/:id')
  async updateCategoryService(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateCategoryService(id, payload) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Delete('category-services/:id')
  async deleteCategoryService(@Param('id') id: string) {
    return { data: await this.dataStoreService.deleteCategoryService(id) };
  }

  @Get('professionals')
  async getProfessionals(
    @Query('category') category?: string,
    @Query('service') service?: string,
    @Query('search') search?: string,
    @Query('condominiumId') condominiumId?: string,
  ) {
    return { data: this.dataStoreService.getProfessionals(category, service, search, condominiumId) };
  }

  // Precisa vir antes de 'professionals/:id', senão "nearby" seria lido como um id.
  @Get('professionals/nearby')
  async getNearbyProfessionals(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('serviceSlug') serviceSlug?: string,
    @Query('minRating') minRating?: string,
    @Query('recommended') recommended?: string,
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const numero = (valor?: string) => {
      const convertido = Number(valor);
      return valor !== undefined && valor !== '' && Number.isFinite(convertido) ? convertido : null;
    };
    const ordens = ['distance', 'recommended', 'rating', 'reviews', 'az'] as const;
    return {
      data: await this.nearbyProfessionalsService.search({
        lat: numero(lat),
        lng: numero(lng),
        radius: numero(radius),
        categorySlug,
        serviceSlug,
        minRating: numero(minRating) ?? undefined,
        recommended: recommended === 'true',
        sort: ordens.find((item) => item === sort),
        search,
        page: numero(page) ?? undefined,
        limit: numero(limit) ?? undefined,
      }),
    };
  }

  @Get('professionals/:id/services')
  async getProfessionalServices(@Param('id') id: string) {
    return { data: this.dataStoreService.getProfessionalServices(id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Put('professionals/:id/services')
  async updateProfessionalServices(@Param('id') id: string, @Body('serviceIds') serviceIds: string[] = []) {
    return { data: await this.dataStoreService.updateProfessionalServices(id, serviceIds) };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('professionals/:id')
  async getProfessionalById(@Param('id') id: string, @OptionalUserId() userId?: string, @Req() request?: RequisicaoComOrigem) {
    // Conta a visita sem segurar a resposta: a tela do cliente não depende disso.
    void this.professionalDashboardService.registerView(id, {
      userId,
      ip: request?.ip,
      userAgent: request?.headers?.['user-agent'],
    });
    return { data: this.dataStoreService.getProfessionalById(id) };
  }

  @Get('professionals/:id/reviews')
  getProfessionalReviews(@Param('id') id: string) {
    return { data: this.dataStoreService.getProfessionalReviews(id) };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('professionals/:id/comments')
  getProfessionalComments(@Param('id') id: string, @OptionalUserId() userId?: string) {
    return { data: this.dataStoreService.getProfessionalComments(id, userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('professionals/:id/reports')
  async submitComplaint(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body('reason') reason: string,
    @Body('description') description: string,
    @Body('images') images: string[] = [],
  ) {
    return { data: await this.dataStoreService.submitComplaint({ userId, professionalId: id, reason, description, images }) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/like')
  async toggleCommentLike(@Param('id') id: string, @UserId() userId: string) {
    return { data: await this.dataStoreService.toggleCommentLike(id, userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/replies')
  async replyToComment(@Param('id') id: string, @UserId() userId: string, @Body('comment') comment: string) {
    return { data: await this.dataStoreService.replyToComment(id, userId, comment) };
  }

  @Get('public-settings')
  async getPublicSettings() {
    return {
      data: {
        ...this.dataStoreService.getPublicSettings(),
        ai: await this.aiSettingsService.getPublicConfig(),
        // A chave do Maps é carregada pelo navegador por natureza da API do Google;
        // a proteção correta é restringi-la por referenciador no Google Cloud.
        maps: { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '' },
      },
    };
  }

  /** Painel do profissional: métricas, visão geral, trabalhos e avaliações em uma leitura. */
  @UseGuards(JwtAuthGuard)
  @Get('me/professional/dashboard')
  async getProfessionalDashboard(@UserId() userId: string) {
    return { data: await this.professionalDashboardService.getDashboard(userId) };
  }

  /** Solicitacoes abertas compativeis com o que o profissional atende. */
  @UseGuards(JwtAuthGuard)
  @Get('me/professional/opportunities')
  async getProfessionalOpportunities(
    @UserId() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return { data: await this.opportunitiesService.listar(userId, Number(page), Number(limit)) };
  }

  /** Quem favoritou o profissional, do mais recente para o mais antigo. */
  @UseGuards(JwtAuthGuard)
  @Get('me/professional/favorites')
  async getProfessionalFavorites(
    @UserId() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return { data: await this.professionalDashboardService.getFavoriteClients(userId, Number(page), Number(limit)) };
  }

  /** Avaliacoes visiveis recebidas pelo profissional, da mais recente para a mais antiga. */
  @UseGuards(JwtAuthGuard)
  @Get('me/professional/reviews')
  async getOwnProfessionalReviews(
    @UserId() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return { data: await this.professionalDashboardService.getProfessionalReviews(userId, Number(page), Number(limit)) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/professional')
  getOwnProfessional(@UserId() userId: string) {
    return { data: this.dataStoreService.getOwnProfessional(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/professional')
  async updateOwnProfessional(@UserId() userId: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateOwnProfessional(userId, payload) };
  }

  @Get('professionals/:id/works')
  getProfessionalWorks(@Param('id') id: string) {
    return { data: this.dataStoreService.getProfessionalWorks(id) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/professional/works')
  async addOwnProfessionalWorks(@UserId() userId: string, @Body('images') images: string[] = [], @Body('title') title = '') {
    return { data: await this.dataStoreService.addOwnProfessionalWorks(userId, images, title) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/professional/works/:workId')
  async removeOwnProfessionalWork(@Param('workId') workId: string, @UserId() userId: string) {
    return { data: await this.dataStoreService.removeOwnProfessionalWork(userId, workId) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommendations')
  getRecommendations(@UserId() userId: string) {
    return { data: this.dataStoreService.getRecommendations(userId) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('reviews')
  getReviews(@Query('professionalId') professionalId?: string) {
    const items = professionalId
      ? this.dataStoreService.getProfessionalReviews(professionalId)
      : this.dataStoreService.getProfessionalReviews('pro-1');
    return { data: items };
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  getFavorites(@UserId() userId: string) {
    return { data: this.dataStoreService.getFavorites(userId) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('reports')
  getReports() {
    return {
      data: [
        { id: 'report-1', reason: 'Atraso', professionalId: 'pro-3', status: 'pending' },
        { id: 'report-2', reason: 'Orcamento', professionalId: 'pro-6', status: 'pending' },
      ],
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('dashboard')
  async getDashboard() {
    return { data: this.dataStoreService.getDashboard() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/home')
  async getHomePayload() {
    return { data: this.dataStoreService.getHomePayload() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-pending')
  async getPendingItems() {
    return { data: await this.dataStoreService.getPendingItems() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorites/:professionalId/toggle')
  async toggleFavorite(@Param('professionalId') professionalId: string, @UserId() userId: string) {
    return { data: await this.dataStoreService.toggleFavorite(userId, professionalId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('recommendations')
  async createRecommendation(
    @UserId() userId: string,
    @Body() payload: Omit<Parameters<DataStoreService['createRecommendation']>[0], 'userId'>,
  ) {
    // Mesmo caso do createServiceRequest: identidade pelo token.
    return { data: await this.dataStoreService.createRecommendation({ ...payload, userId }) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('recommendations/:professionalId/toggle')
  async toggleProfessionalRecommendation(@Param('professionalId') professionalId: string, @UserId() userId: string) {
    return { data: await this.dataStoreService.toggleProfessionalRecommendation(userId, professionalId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('recommendations/:id/remove')
  async removeRecommendation(@Param('id') id: string, @UserId() userId: string) {
    return { data: await this.dataStoreService.removeRecommendation(id, userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  async createReview(
    @UserId() userId: string,
    @Body() payload: Omit<Parameters<DataStoreService['createReview']>[0], 'userId'>,
  ) {
    // Mesmo caso do createServiceRequest: identidade pelo token.
    return { data: await this.dataStoreService.createReview({ ...payload, userId }) };
  }

  @Get('uploads')
  getUploads() {
    return {
      data: {
        storage: 'local',
        futureProviders: ['AWS S3', 'Google Cloud Storage', 'Azure Blob'],
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('uploads/comments')
  @UseInterceptors(FilesInterceptor('files', 10, opcoesDeUpload(10)))
  async uploadCommentPhotos(@UploadedFiles() files: ArquivoEnviado[] = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: await this.fileStorageService.salvarVarios('comments', files) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('uploads/works')
  @UseInterceptors(FilesInterceptor('files', 10, opcoesDeUpload(10)))
  async uploadWorkPhotos(@UploadedFiles() files: ArquivoEnviado[] = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: await this.fileStorageService.salvarVarios('works', files) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('uploads/reports')
  @UseInterceptors(FilesInterceptor('files', 10, opcoesDeUpload(10)))
  async uploadReportPhotos(@UploadedFiles() files: ArquivoEnviado[] = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: await this.fileStorageService.salvarVarios('reports', files) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Post('admin/uploads/professionals')
  @UseInterceptors(FileInterceptor('file', opcoesDeUpload(5)))
  async uploadProfessionalPhoto(@UploadedFile() file?: ArquivoEnviado) {
    if (!file) throw new BadRequestException('Selecione uma foto para enviar.');
    return { data: { url: await this.fileStorageService.salvar('professionals', file) } };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Post('admin/uploads/condominiums')
  @UseInterceptors(FileInterceptor('file', opcoesDeUpload(5)))
  async uploadCondominiumPhoto(@UploadedFile() file?: ArquivoEnviado) {
    if (!file) throw new BadRequestException('Selecione uma foto para enviar.');
    return { data: { url: await this.fileStorageService.salvar('condominiums', file) } };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin/:resource')
  async getAdminRecords(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories') {
    return { data: await this.dataStoreService.getAdminRecords(resource) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Post('admin/:resource')
  async createAdminRecord(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.createAdminRecord(resource, payload) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin/:resource/:id')
  async updateAdminRecord(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', @Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateAdminRecord(resource, id, payload) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Delete('admin/:resource/:id')
  async deleteAdminRecord(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', @Param('id') id: string) {
    return { data: await this.dataStoreService.deleteAdminRecord(resource, id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-sections/:section')
  getAdminSection(@Param('section') section: 'reviews' | 'recommendations' | 'reports') {
    return { data: this.dataStoreService.getAdminSection(section) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin-sections/:section/:id')
  updateAdminSectionStatus(@Param('section') section: 'reviews' | 'recommendations' | 'reports', @Param('id') id: string, @Body('status') status: string) {
    return { data: this.dataStoreService.updateAdminSectionStatus(section, id, status) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-reviews/:id')
  getAdminReviewDetails(@Param('id') id: string) {
    return { data: this.dataStoreService.getAdminReviewDetails(id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin-reviews/:id/response')
  saveAdminReviewResponse(@Param('id') id: string, @Body('response') response: string) {
    return { data: this.dataStoreService.saveAdminReviewResponse(id, response ?? '') };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-reports')
  async getComplaints() {
    return { data: await this.dataStoreService.getComplaints() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-reports/:id')
  async getComplaintDetails(@Param('id') id: string) {
    return { data: await this.dataStoreService.getComplaintDetails(id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin-reports/:id/status')
  async updateComplaintStatus(@Param('id') id: string, @Body('status') status: ComplaintStatus) {
    return { data: await this.dataStoreService.updateComplaintStatus(id, status) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin-reports/:id/note')
  async saveComplaintNote(@Param('id') id: string, @Body('note') note: string, @Body('notify') notify = true) {
    return { data: await this.dataStoreService.saveComplaintNote(id, note, notify) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Post('admin-reports/:id/actions')
  async applyComplaintAction(@Param('id') id: string, @Body('action') action: ComplaintAction) {
    return { data: await this.dataStoreService.applyComplaintAction(id, action) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-mail-settings')
  async getMailSettings() {
    return { data: await this.mailSettingsService.getMasked() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin-mail-settings')
  async updateMailSettings(@Body() payload: Record<string, unknown>) {
    return { data: await this.mailSettingsService.update(payload) };
  }

  /** Valida a conexao sem enviar mensagem; com destino, manda um e-mail de teste. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Post('admin-mail-settings/test')
  async testMailSettings(@Body('email') email?: string) {
    const conexao = await this.mailService.testarConexao();
    if (!conexao.ok || !email) return { data: conexao };
    const enviado = await this.mailService.enviarTeste(String(email));
    return {
      data: {
        ok: enviado,
        message: enviado ? `E-mail de teste enviado para ${email}.` : 'Conectou no servidor, mas o envio falhou. Verifique o remetente.',
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Get('admin-settings')
  getAdminSettings() {
    return { data: this.dataStoreService.getAdminSettings() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'CONDO_ADMIN')
  @Patch('admin-settings')
  async updateAdminSettings(@Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateAdminSettings(payload) };
  }
}
