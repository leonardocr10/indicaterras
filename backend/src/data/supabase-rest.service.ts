import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseRestService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = String(config.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
    this.apiKey = String(config.get('SUPABASE_SECRET_KEY') ?? '');
  }

  get configured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async select<T>(table: string, query = 'select=*'): Promise<T[]> {
    return this.request<T[]>(table, { method: 'GET' }, query);
  }

  async insert<T>(table: string, payload: Record<string, unknown>): Promise<T> {
    const records = await this.request<T[]>(table, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Prefer: 'return=representation' },
    });
    return records[0];
  }

  async update<T>(table: string, id: string, payload: Record<string, unknown>): Promise<T> {
    const records = await this.request<T[]>(table, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { Prefer: 'return=representation' },
    }, `id=eq.${encodeURIComponent(id)}`);
    return records[0];
  }

  async delete(table: string, id: string): Promise<void> {
    await this.request<unknown>(table, { method: 'DELETE' }, `id=eq.${encodeURIComponent(id)}`);
  }

  async deleteWhere(table: string, query: string): Promise<void> {
    await this.request<unknown>(table, { method: 'DELETE' }, query);
  }

  private async request<T>(table: string, init: RequestInit, query = ''): Promise<T> {
    if (!this.configured) throw new ServiceUnavailableException('Supabase não configurado no backend.');
    const response = await fetch(`${this.baseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`, {
      ...init,
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'indicaterras-backend/1.0',
        ...init.headers,
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      throw new ServiceUnavailableException(error.message || `Falha ao consultar ${table} no Supabase.`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
