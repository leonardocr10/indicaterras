import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { ApiResponse } from '../models';
import { environment } from '../../environments/environment';

export interface SessionUser {
  id: string;
  condominiumId: string;
  name: string;
  email: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'CONDO_ADMIN' | 'RESIDENT' | 'PROFESSIONAL';
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface RegistrationResult {
  email: string;
  requiresApproval: boolean;
  session?: AuthSession | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'terras-alphas-session';
  private readonly baseUrl = environment.apiUrl;
  private readonly sessionState = signal<AuthSession | null>(this.restore());

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  login(payload: { email: string; password: string; rememberMe: boolean }) {
    return this.http.post<ApiResponse<AuthSession>>(`${this.baseUrl}/auth/login`, payload).pipe(
      map((response) => response.data),
      tap((session) => this.persist(session)),
    );
  }

  register(payload: { name: string; email: string; phone: string; condominiumId: string; block?: string; unit?: string; password: string }) {
    return this.http.post<ApiResponse<RegistrationResult>>(`${this.baseUrl}/auth/register`, payload).pipe(
      map((response) => response.data),
      tap((result) => { if (result.session) this.persist(result.session); }),
    );
  }

  registerProfessional(payload: {
    name: string;
    email: string;
    phone: string;
    categoryId: string;
    city: string;
    companyName?: string;
    neighborhood?: string;
    bio?: string;
    password: string;
  }) {
    return this.http.post<ApiResponse<RegistrationResult>>(`${this.baseUrl}/auth/register-professional`, payload).pipe(
      map((response) => response.data),
      tap((result) => { if (result.session) this.persist(result.session); }),
    );
  }

  logout() {
    this.sessionState.set(null);
    localStorage.removeItem(this.storageKey);
  }

  private persist(session: AuthSession) {
    this.sessionState.set(session);
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private restore(): AuthSession | null {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? 'null') as AuthSession | null;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
