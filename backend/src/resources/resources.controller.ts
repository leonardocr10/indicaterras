import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { DataStoreService } from '../data/data-store.service';
import { FileStorageService } from '../data/file-storage.service';
import type { ArquivoEnviado } from '../data/file-storage.service';
import type { ComplaintAction, ComplaintStatus } from '../data/complaints';
import { CommunicationsService } from './communications.service';
import { CatalogService } from '../data/catalog.service';
import { AiSettingsService } from '../ai/ai-settings.service';
import { NearbyProfessionalsService } from '../data/nearby-professionals.service';
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

  @Get('users')
  getUsers() {
    return { data: this.dataStoreService.getUsers() };
  }

  @Get('notifications')
  getNotifications(@Query('userId') userId: string) {
    return this.communicationsService.getNotifications(userId).then((data) => ({ data }));
  }

  @Post('notifications/read')
  markNotificationsRead(@Body('userId') userId: string, @Body('notificationIds') notificationIds?: string[]) {
    return this.communicationsService.markNotificationsRead(userId, notificationIds).then((data) => ({ data }));
  }

  @Get('conversations/:professionalId')
  getConversation(@Param('professionalId') professionalId: string, @Query('userId') userId: string) {
    return this.communicationsService.getConversation(userId, professionalId).then((data) => ({ data }));
  }

  @Post('conversations/:professionalId/messages')
  sendConversationMessage(@Param('professionalId') professionalId: string, @Body('userId') userId: string, @Body('content') content: string) {
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

  @Get('me/account')
  getOwnAccount(@Query('userId') userId: string) {
    return this.dataStoreService.getOwnAccount(userId).then((data) => ({ data }));
  }

  @Patch('me/account')
  updateOwnAccount(@Body('userId') userId: string, @Body() payload: Record<string, unknown>) {
    return this.dataStoreService.updateOwnAccount(userId, payload).then((data) => ({ data }));
  }

  @Post('me/account/change-password')
  changeOwnPassword(@Body('userId') userId: string, @Body('currentPassword') currentPassword: string, @Body('newPassword') newPassword: string) {
    return this.dataStoreService.changeOwnPassword(userId, currentPassword, newPassword).then((data) => ({ data }));
  }

  @Get('categories/:id/services')
  async getCategoryServices(@Param('id') id: string, @Query('includeInactive') includeInactive?: string) {
    return { data: this.dataStoreService.getCategoryServices(id, includeInactive === 'true') };
  }

  @Post('service-requests/match-problem')
  matchProblem(@Body('query') query: string) {
    return this.catalogService.match(String(query ?? '')).then((data) => ({ data }));
  }

  @Get('service-requests')
  async getServiceRequests(@Query('userId') userId: string) {
    return { data: await this.dataStoreService.getServiceRequestsForUser(userId) };
  }

  @Post('service-requests')
  async createServiceRequest(@Body() payload: Parameters<DataStoreService['createServiceRequest']>[0]) {
    return { data: await this.dataStoreService.createServiceRequest(payload) };
  }

  @Get('service-requests/:id')
  async getServiceRequestById(@Param('id') id: string, @Query('userId') userId: string) {
    return { data: await this.dataStoreService.getServiceRequestById(id, userId) };
  }

  @Post('service-requests/:id/media')
  @UseInterceptors(FilesInterceptor('files', 11, opcoesDeMidiaSolicitacao))
  async uploadServiceRequestMedia(
    @Param('id') id: string,
    @Body('userId') userId: string,
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

  @Post('categories/:id/services')
  async createCategoryService(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.createCategoryService(id, payload) };
  }

  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return { data: this.dataStoreService.getCategoryById(id) };
  }

  @Put('category-services/:id')
  async updateCategoryService(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateCategoryService(id, payload) };
  }

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

  @Put('professionals/:id/services')
  async updateProfessionalServices(@Param('id') id: string, @Body('serviceIds') serviceIds: string[] = []) {
    return { data: await this.dataStoreService.updateProfessionalServices(id, serviceIds) };
  }

  @Get('professionals/:id')
  async getProfessionalById(@Param('id') id: string) {
    return { data: this.dataStoreService.getProfessionalById(id) };
  }

  @Get('professionals/:id/reviews')
  getProfessionalReviews(@Param('id') id: string) {
    return { data: this.dataStoreService.getProfessionalReviews(id) };
  }

  @Get('professionals/:id/comments')
  getProfessionalComments(@Param('id') id: string, @Query('userId') userId?: string) {
    return { data: this.dataStoreService.getProfessionalComments(id, userId) };
  }

  @Post('professionals/:id/reports')
  async submitComplaint(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body('reason') reason: string,
    @Body('description') description: string,
    @Body('images') images: string[] = [],
  ) {
    return { data: await this.dataStoreService.submitComplaint({ userId, professionalId: id, reason, description, images }) };
  }

  @Post('comments/:id/like')
  async toggleCommentLike(@Param('id') id: string, @Body('userId') userId: string) {
    return { data: await this.dataStoreService.toggleCommentLike(id, userId) };
  }

  @Post('comments/:id/replies')
  async replyToComment(@Param('id') id: string, @Body('userId') userId: string, @Body('comment') comment: string) {
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

  @Get('me/professional')
  getOwnProfessional(@Query('userId') userId: string) {
    return { data: this.dataStoreService.getOwnProfessional(userId) };
  }

  @Patch('me/professional')
  async updateOwnProfessional(@Body('userId') userId: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateOwnProfessional(userId, payload) };
  }

  @Get('professionals/:id/works')
  getProfessionalWorks(@Param('id') id: string) {
    return { data: this.dataStoreService.getProfessionalWorks(id) };
  }

  @Post('me/professional/works')
  async addOwnProfessionalWorks(@Body('userId') userId: string, @Body('images') images: string[] = [], @Body('title') title = '') {
    return { data: await this.dataStoreService.addOwnProfessionalWorks(userId, images, title) };
  }

  @Delete('me/professional/works/:workId')
  async removeOwnProfessionalWork(@Param('workId') workId: string, @Query('userId') userId: string) {
    return { data: await this.dataStoreService.removeOwnProfessionalWork(userId, workId) };
  }

  @Get('recommendations')
  getRecommendations(@Query('userId') userId?: string) {
    return { data: this.dataStoreService.getRecommendations(userId) };
  }

  @Get('reviews')
  getReviews(@Query('professionalId') professionalId?: string) {
    const items = professionalId
      ? this.dataStoreService.getProfessionalReviews(professionalId)
      : this.dataStoreService.getProfessionalReviews('pro-1');
    return { data: items };
  }

  @Get('favorites')
  getFavorites(@Query('userId') userId = 'user-leonardo') {
    return { data: this.dataStoreService.getFavorites(userId) };
  }

  @Get('reports')
  getReports() {
    return {
      data: [
        { id: 'report-1', reason: 'Atraso', professionalId: 'pro-3', status: 'pending' },
        { id: 'report-2', reason: 'Orcamento', professionalId: 'pro-6', status: 'pending' },
      ],
    };
  }

  @Get('dashboard')
  async getDashboard() {
    return { data: this.dataStoreService.getDashboard() };
  }

  @Get('dashboard/home')
  async getHomePayload() {
    return { data: this.dataStoreService.getHomePayload() };
  }

  @Get('admin-pending')
  async getPendingItems() {
    return { data: await this.dataStoreService.getPendingItems() };
  }

  @Post('favorites/:professionalId/toggle')
  async toggleFavorite(@Param('professionalId') professionalId: string, @Body('userId') userId: string) {
    return { data: await this.dataStoreService.toggleFavorite(userId, professionalId) };
  }

  @Post('recommendations')
  async createRecommendation(@Body() payload: Parameters<DataStoreService['createRecommendation']>[0]) {
    return { data: await this.dataStoreService.createRecommendation(payload) };
  }

  @Post('recommendations/:professionalId/toggle')
  async toggleProfessionalRecommendation(@Param('professionalId') professionalId: string, @Body('userId') userId: string) {
    return { data: await this.dataStoreService.toggleProfessionalRecommendation(userId, professionalId) };
  }

  @Post('recommendations/:id/remove')
  async removeRecommendation(@Param('id') id: string, @Body('userId') userId: string) {
    return { data: await this.dataStoreService.removeRecommendation(id, userId) };
  }

  @Post('reviews')
  async createReview(@Body() payload: Parameters<DataStoreService['createReview']>[0]) {
    return { data: await this.dataStoreService.createReview(payload) };
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

  @Post('uploads/comments')
  @UseInterceptors(FilesInterceptor('files', 10, opcoesDeUpload(10)))
  async uploadCommentPhotos(@UploadedFiles() files: ArquivoEnviado[] = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: await this.fileStorageService.salvarVarios('comments', files) };
  }

  @Post('uploads/works')
  @UseInterceptors(FilesInterceptor('files', 10, opcoesDeUpload(10)))
  async uploadWorkPhotos(@UploadedFiles() files: ArquivoEnviado[] = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: await this.fileStorageService.salvarVarios('works', files) };
  }

  @Post('uploads/reports')
  @UseInterceptors(FilesInterceptor('files', 10, opcoesDeUpload(10)))
  async uploadReportPhotos(@UploadedFiles() files: ArquivoEnviado[] = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: await this.fileStorageService.salvarVarios('reports', files) };
  }

  @Post('admin/uploads/professionals')
  @UseInterceptors(FileInterceptor('file', opcoesDeUpload(5)))
  async uploadProfessionalPhoto(@UploadedFile() file?: ArquivoEnviado) {
    if (!file) throw new BadRequestException('Selecione uma foto para enviar.');
    return { data: { url: await this.fileStorageService.salvar('professionals', file) } };
  }

  @Post('admin/uploads/condominiums')
  @UseInterceptors(FileInterceptor('file', opcoesDeUpload(5)))
  async uploadCondominiumPhoto(@UploadedFile() file?: ArquivoEnviado) {
    if (!file) throw new BadRequestException('Selecione uma foto para enviar.');
    return { data: { url: await this.fileStorageService.salvar('condominiums', file) } };
  }

  @Get('admin/:resource')
  async getAdminRecords(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories') {
    return { data: await this.dataStoreService.getAdminRecords(resource) };
  }

  @Post('admin/:resource')
  async createAdminRecord(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.createAdminRecord(resource, payload) };
  }

  @Patch('admin/:resource/:id')
  async updateAdminRecord(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', @Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateAdminRecord(resource, id, payload) };
  }

  @Delete('admin/:resource/:id')
  async deleteAdminRecord(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', @Param('id') id: string) {
    return { data: await this.dataStoreService.deleteAdminRecord(resource, id) };
  }

  @Get('admin-sections/:section')
  getAdminSection(@Param('section') section: 'reviews' | 'recommendations' | 'reports') {
    return { data: this.dataStoreService.getAdminSection(section) };
  }

  @Patch('admin-sections/:section/:id')
  updateAdminSectionStatus(@Param('section') section: 'reviews' | 'recommendations' | 'reports', @Param('id') id: string, @Body('status') status: string) {
    return { data: this.dataStoreService.updateAdminSectionStatus(section, id, status) };
  }

  @Get('admin-reviews/:id')
  getAdminReviewDetails(@Param('id') id: string) {
    return { data: this.dataStoreService.getAdminReviewDetails(id) };
  }

  @Patch('admin-reviews/:id/response')
  saveAdminReviewResponse(@Param('id') id: string, @Body('response') response: string) {
    return { data: this.dataStoreService.saveAdminReviewResponse(id, response ?? '') };
  }

  @Get('admin-reports')
  async getComplaints() {
    return { data: await this.dataStoreService.getComplaints() };
  }

  @Get('admin-reports/:id')
  async getComplaintDetails(@Param('id') id: string) {
    return { data: await this.dataStoreService.getComplaintDetails(id) };
  }

  @Patch('admin-reports/:id/status')
  async updateComplaintStatus(@Param('id') id: string, @Body('status') status: ComplaintStatus) {
    return { data: await this.dataStoreService.updateComplaintStatus(id, status) };
  }

  @Patch('admin-reports/:id/note')
  async saveComplaintNote(@Param('id') id: string, @Body('note') note: string, @Body('notify') notify = true) {
    return { data: await this.dataStoreService.saveComplaintNote(id, note, notify) };
  }

  @Post('admin-reports/:id/actions')
  async applyComplaintAction(@Param('id') id: string, @Body('action') action: ComplaintAction) {
    return { data: await this.dataStoreService.applyComplaintAction(id, action) };
  }

  @Get('admin-mail-settings')
  async getMailSettings() {
    return { data: await this.mailSettingsService.getMasked() };
  }

  @Patch('admin-mail-settings')
  async updateMailSettings(@Body() payload: Record<string, unknown>) {
    return { data: await this.mailSettingsService.update(payload) };
  }

  /** Valida a conexao sem enviar mensagem; com destino, manda um e-mail de teste. */
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

  @Get('admin-settings')
  getAdminSettings() {
    return { data: this.dataStoreService.getAdminSettings() };
  }

  @Patch('admin-settings')
  async updateAdminSettings(@Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateAdminSettings(payload) };
  }
}
