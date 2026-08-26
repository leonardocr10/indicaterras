import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { DataStoreService } from '../data/data-store.service';

const professionalUploadDirectory = join(process.cwd(), 'uploads', 'professionals');
const condominiumUploadDirectory = join(process.cwd(), 'uploads', 'condominiums');
const commentUploadDirectory = join(process.cwd(), 'uploads', 'comments');
const workUploadDirectory = join(process.cwd(), 'uploads', 'works');
mkdirSync(professionalUploadDirectory, { recursive: true });
mkdirSync(condominiumUploadDirectory, { recursive: true });
mkdirSync(commentUploadDirectory, { recursive: true });

@ApiTags('resources')
@Controller()
export class ResourcesController {
  constructor(private readonly dataStoreService: DataStoreService) {}

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

  @Get('categories')
  async getCategories() {
    await this.dataStoreService.syncPublicData();
    return { data: this.dataStoreService.getCategories() };
  }

  @Get('categories/:id/services')
  async getCategoryServices(@Param('id') id: string, @Query('includeInactive') includeInactive?: string) {
    await this.dataStoreService.syncPublicData();
    return { data: this.dataStoreService.getCategoryServices(id, includeInactive === 'true') };
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
  async getProfessionals(@Query('category') category?: string, @Query('service') service?: string, @Query('search') search?: string) {
    await this.dataStoreService.syncPublicData();
    return { data: this.dataStoreService.getProfessionals(category, service, search) };
  }

  @Get('professionals/:id/services')
  async getProfessionalServices(@Param('id') id: string) {
    await this.dataStoreService.syncPublicData();
    return { data: this.dataStoreService.getProfessionalServices(id) };
  }

  @Put('professionals/:id/services')
  async updateProfessionalServices(@Param('id') id: string, @Body('serviceIds') serviceIds: string[] = []) {
    return { data: await this.dataStoreService.updateProfessionalServices(id, serviceIds) };
  }

  @Get('professionals/:id')
  async getProfessionalById(@Param('id') id: string) {
    await this.dataStoreService.syncPublicData();
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

  @Post('comments/:id/like')
  toggleCommentLike(@Param('id') id: string, @Body('userId') userId: string) {
    return { data: this.dataStoreService.toggleCommentLike(id, userId) };
  }

  @Post('comments/:id/replies')
  replyToComment(@Param('id') id: string, @Body('userId') userId: string, @Body('comment') comment: string) {
    return { data: this.dataStoreService.replyToComment(id, userId, comment) };
  }

  @Get('public-settings')
  getPublicSettings() {
    return { data: this.dataStoreService.getPublicSettings() };
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
  addOwnProfessionalWorks(@Body('userId') userId: string, @Body('images') images: string[] = [], @Body('title') title = '') {
    return { data: this.dataStoreService.addOwnProfessionalWorks(userId, images, title) };
  }

  @Delete('me/professional/works/:workId')
  removeOwnProfessionalWork(@Param('workId') workId: string, @Query('userId') userId: string) {
    return { data: this.dataStoreService.removeOwnProfessionalWork(userId, workId) };
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
    await this.dataStoreService.syncPublicData();
    return { data: this.dataStoreService.getDashboard() };
  }

  @Get('dashboard/home')
  async getHomePayload() {
    await this.dataStoreService.syncPublicData();
    return { data: this.dataStoreService.getHomePayload() };
  }

  @Post('favorites/:professionalId/toggle')
  toggleFavorite(@Param('professionalId') professionalId: string, @Body('userId') userId: string) {
    return { data: this.dataStoreService.toggleFavorite(userId, professionalId) };
  }

  @Post('recommendations')
  async createRecommendation(@Body() payload: Parameters<DataStoreService['createRecommendation']>[0]) {
    return { data: await this.dataStoreService.createRecommendation(payload) };
  }

  @Post('recommendations/:professionalId/toggle')
  toggleProfessionalRecommendation(@Param('professionalId') professionalId: string, @Body('userId') userId: string) {
    return { data: this.dataStoreService.toggleProfessionalRecommendation(userId, professionalId) };
  }

  @Post('recommendations/:id/remove')
  removeRecommendation(@Param('id') id: string, @Body('userId') userId: string) {
    return { data: this.dataStoreService.removeRecommendation(id, userId) };
  }

  @Post('reviews')
  createReview(@Body() payload: Parameters<DataStoreService['createReview']>[0]) {
    return { data: this.dataStoreService.createReview(payload) };
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
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: commentUploadDirectory,
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          callback(null, `comment-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extension}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const accepted = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        callback(accepted ? null : new BadRequestException('Envie imagens PNG, JPG ou WebP.'), accepted);
      },
    }),
  )
  uploadCommentPhotos(@UploadedFiles() files: Array<{ filename: string }> = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: files.map((file) => `/uploads/comments/${file.filename}`) };
  }

  @Post('uploads/works')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: workUploadDirectory,
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          callback(null, `work-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extension}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const accepted = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        callback(accepted ? null : new BadRequestException('Envie imagens PNG, JPG ou WebP.'), accepted);
      },
    }),
  )
  uploadWorkPhotos(@UploadedFiles() files: Array<{ filename: string }> = []) {
    if (!files.length) throw new BadRequestException('Selecione ao menos uma foto para enviar.');
    return { data: files.map((file) => `/uploads/works/${file.filename}`) };
  }

  @Post('admin/uploads/professionals')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: professionalUploadDirectory,
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          callback(null, `professional-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extension}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const accepted = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        callback(accepted ? null : new BadRequestException('Envie uma imagem PNG, JPG ou WebP.'), accepted);
      },
    }),
  )
  uploadProfessionalPhoto(@UploadedFile() file?: { filename: string }) {
    if (!file) throw new BadRequestException('Selecione uma foto para enviar.');
    return { data: { url: `/uploads/professionals/${file.filename}` } };
  }

  @Post('admin/uploads/condominiums')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: condominiumUploadDirectory,
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          callback(null, `condominium-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${extension}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const accepted = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        callback(accepted ? null : new BadRequestException('Envie uma imagem PNG, JPG ou WebP.'), accepted);
      },
    }),
  )
  uploadCondominiumPhoto(@UploadedFile() file?: { filename: string }) {
    if (!file) throw new BadRequestException('Selecione uma foto para enviar.');
    return { data: { url: `/uploads/condominiums/${file.filename}` } };
  }

  @Get('admin/:resource')
  async getAdminRecords(@Param('resource') resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories') {
    await this.dataStoreService.syncPublicData();
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

  @Get('admin-settings')
  getAdminSettings() {
    return { data: this.dataStoreService.getAdminSettings() };
  }

  @Patch('admin-settings')
  async updateAdminSettings(@Body() payload: Record<string, unknown>) {
    return { data: await this.dataStoreService.updateAdminSettings(payload) };
  }
}
