import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ApiResponse, Category, CategoryService, Condominium, DashboardPayload, HomePayload, Professional, ProfessionalComment, Review } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'http://localhost:3000';

  getHome() {
    return this.http
      .get<ApiResponse<HomePayload>>(`${this.baseUrl}/dashboard/home`)
      .pipe(map((response) => ({ ...response.data, user: this.auth.user() ?? response.data.user })));
  }

  getProfessionals(category?: string, service?: string, search?: string) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (service) params.set('service', service);
    if (search) params.set('search', search);
    const query = params.size ? `?${params.toString()}` : '';
    return this.http
      .get<ApiResponse<Professional[]>>(`${this.baseUrl}/professionals${query}`)
      .pipe(map((response) => response.data));
  }

  getProfessional(id: string) {
    return this.http
      .get<ApiResponse<Professional>>(`${this.baseUrl}/professionals/${id}`)
      .pipe(map((response) => response.data));
  }

  getReviews(professionalId: string) {
    return this.http
      .get<ApiResponse<Review[]>>(`${this.baseUrl}/professionals/${professionalId}/reviews`)
      .pipe(map((response) => response.data));
  }

  getComments(professionalId: string) {
    const userId = this.auth.user()?.id ?? '';
    return this.http
      .get<ApiResponse<ProfessionalComment[]>>(`${this.baseUrl}/professionals/${professionalId}/comments?userId=${encodeURIComponent(userId)}`)
      .pipe(map((response) => response.data));
  }

  uploadCommentPhotos(files: File[]) {
    const body = new FormData();
    files.forEach((file) => body.append('files', file));
    return this.http.post<ApiResponse<string[]>>(`${this.baseUrl}/uploads/comments`, body).pipe(map((response) => response.data));
  }

  toggleCommentLike(commentId: string) {
    return this.http
      .post<ApiResponse<{ reviewId: string; liked: boolean; likes: number }>>(`${this.baseUrl}/comments/${commentId}/like`, { userId: this.auth.user()?.id })
      .pipe(map((response) => response.data));
  }

  replyToComment(commentId: string, comment: string) {
    return this.http
      .post<ApiResponse<{ id: string; userId: string; userName: string; comment: string; createdAt: string }>>(`${this.baseUrl}/comments/${commentId}/replies`, {
        userId: this.auth.user()?.id,
        comment,
      })
      .pipe(map((response) => response.data));
  }

  getFavorites() {
    const userId = this.auth.user()?.id ?? '';
    return this.http
      .get<ApiResponse<Professional[]>>(`${this.baseUrl}/favorites?userId=${userId}`)
      .pipe(map((response) => response.data));
  }

  getRecommendations() {
    const userId = this.auth.user()?.id ?? '';
    return this.http
      .get<ApiResponse<Array<{ id: string; professionalId: string; createdAt: string; status: string }>>>(
        `${this.baseUrl}/recommendations?userId=${userId}`,
      )
      .pipe(map((response) => response.data));
  }

  getDashboard() {
    return this.http
      .get<ApiResponse<DashboardPayload>>(`${this.baseUrl}/dashboard`)
      .pipe(map((response) => response.data));
  }

  getCondominiums() {
    return this.http
      .get<ApiResponse<Condominium[]>>(`${this.baseUrl}/condominiums`)
      .pipe(map((response) => response.data));
  }

  getCategories() {
    return this.http
      .get<ApiResponse<Category[]>>(`${this.baseUrl}/categories`)
      .pipe(map((response) => response.data));
  }

  getCategoryServices(categoryId: string, includeInactive = false) {
    return this.http.get<ApiResponse<CategoryService[]>>(`${this.baseUrl}/categories/${categoryId}/services?includeInactive=${includeInactive}`).pipe(map((response) => response.data));
  }

  createCategoryService(categoryId: string, payload: Partial<CategoryService>) {
    return this.http.post<ApiResponse<CategoryService>>(`${this.baseUrl}/categories/${categoryId}/services`, payload).pipe(map((response) => response.data));
  }

  updateCategoryService(id: string, payload: Partial<CategoryService>) {
    return this.http.put<ApiResponse<CategoryService>>(`${this.baseUrl}/category-services/${id}`, payload).pipe(map((response) => response.data));
  }

  deleteCategoryService(id: string) {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/category-services/${id}`).pipe(map((response) => response.data));
  }

  getProfessionalServices(professionalId: string) {
    return this.http.get<ApiResponse<CategoryService[]>>(`${this.baseUrl}/professionals/${professionalId}/services`).pipe(map((response) => response.data));
  }

  updateProfessionalServices(professionalId: string, serviceIds: string[]) {
    return this.http.put<ApiResponse<CategoryService[]>>(`${this.baseUrl}/professionals/${professionalId}/services`, { serviceIds }).pipe(map((response) => response.data));
  }

  getAdminRecords(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories') {
    return this.http.get<ApiResponse<Record<string, unknown>[]>>(`${this.baseUrl}/admin/${resource}`).pipe(map((response) => response.data));
  }

  createAdminRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', payload: Record<string, unknown>) {
    return this.http.post<ApiResponse<Record<string, unknown>>>(`${this.baseUrl}/admin/${resource}`, payload).pipe(map((response) => response.data));
  }

  updateAdminRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', id: string, payload: Record<string, unknown>) {
    return this.http.patch<ApiResponse<Record<string, unknown>>>(`${this.baseUrl}/admin/${resource}/${id}`, payload).pipe(map((response) => response.data));
  }

  deleteAdminRecord(resource: 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories', id: string) {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/admin/${resource}/${id}`).pipe(map((response) => response.data));
  }

  uploadProfessionalPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<{ url: string }>>(`${this.baseUrl}/admin/uploads/professionals`, formData)
      .pipe(map((response) => response.data));
  }

  uploadCondominiumPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<{ url: string }>>(`${this.baseUrl}/admin/uploads/condominiums`, formData)
      .pipe(map((response) => response.data));
  }

  assetUrl(path: string | null | undefined) {
    if (!path) return '';
    return /^https?:\/\//i.test(path) ? path : `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  getAdminSection(section: 'reviews' | 'recommendations' | 'reports') {
    return this.http.get<ApiResponse<Record<string, string>[]>>(`${this.baseUrl}/admin-sections/${section}`).pipe(map((response) => response.data));
  }

  updateAdminSectionStatus(section: 'reviews' | 'recommendations' | 'reports', id: string, status: string) {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/admin-sections/${section}/${id}`, { status }).pipe(map((response) => response.data));
  }

  getAdminReviewDetails(id: string) {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.baseUrl}/admin-reviews/${id}`).pipe(map((response) => response.data));
  }

  saveAdminReviewResponse(id: string, response: string) {
    return this.http.patch<ApiResponse<{ id: string; response: string; updatedAt: string }>>(`${this.baseUrl}/admin-reviews/${id}/response`, { response }).pipe(map((result) => result.data));
  }

  getAdminSettings() {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.baseUrl}/admin-settings`).pipe(map((response) => response.data));
  }

  updateAdminSettings(payload: Record<string, unknown>) {
    return this.http.patch<ApiResponse<Record<string, unknown>>>(`${this.baseUrl}/admin-settings`, payload).pipe(map((response) => response.data));
  }

  toggleFavorite(professionalId: string) {
    return this.http
      .post<ApiResponse<{ professionalId: string; active: boolean }>>(`${this.baseUrl}/favorites/${professionalId}/toggle`, {
        userId: this.auth.user()?.id,
      })
      .pipe(map((response) => response.data));
  }

  createRecommendation(payload: Record<string, unknown>) {
    return this.http.post(`${this.baseUrl}/recommendations`, {
      ...payload,
      userId: this.auth.user()?.id,
      condominiumId: this.auth.user()?.condominiumId,
    });
  }

  toggleRecommendation(professionalId: string) {
    return this.http
      .post<ApiResponse<{ active: boolean; recommendationCount: number }>>(`${this.baseUrl}/recommendations/${professionalId}/toggle`, { userId: this.auth.user()?.id })
      .pipe(map((response) => response.data));
  }

  createReview(payload: { professionalId: string; rating: number; comment: string; serviceDate?: string; images?: string[] }) {
    return this.http.post(`${this.baseUrl}/reviews`, {
      ...payload,
      userId: this.auth.user()?.id,
      condominiumId: this.auth.user()?.condominiumId,
    });
  }
}
