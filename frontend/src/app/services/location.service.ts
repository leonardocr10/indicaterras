import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { fetchAddressByZipCode } from '../brazil-locations';

export type LocationOrigin = 'device' | 'zip' | 'profile' | 'manual';

export interface UserLocation {
  latitude: number;
  longitude: number;
  /** Rótulo exibido na tela. Nunca a rua e o número — só bairro/cidade. */
  label: string;
  origin: LocationOrigin;
}

export const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 30, 50] as const;
export const DEFAULT_RADIUS = 5;

const CHAVE_LOCAL = 'indicafacil-busca-local';
const CHAVE_RAIO = 'indicafacil-busca-raio';

/**
 * Resolve e memoriza a localização usada na busca por proximidade.
 *
 * Privacidade: guardamos apenas coordenada e um rótulo de bairro/cidade. A rua
 * e o número do cliente nunca entram aqui nem são exibidos a profissionais.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  readonly location = signal<UserLocation | null>(this.restaurar());
  readonly radius = signal<number>(this.restaurarRaio());
  readonly requesting = signal(false);

  setRadius(valor: number) {
    const permitido = RADIUS_OPTIONS.includes(valor as (typeof RADIUS_OPTIONS)[number]) ? valor : DEFAULT_RADIUS;
    this.radius.set(permitido);
    try {
      localStorage.setItem(CHAVE_RAIO, String(permitido));
    } catch {
      // Navegador sem armazenamento apenas perde a preferência; a busca segue.
    }
  }

  set(location: UserLocation) {
    this.location.set(location);
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(location));
    } catch {
      // idem
    }
  }

  clear() {
    this.location.set(null);
    try {
      localStorage.removeItem(CHAVE_LOCAL);
    } catch {
      // idem
    }
  }

  /** Pede a localização do aparelho. Rejeita com mensagem pronta para exibir. */
  async useDeviceLocation(): Promise<UserLocation> {
    if (!navigator.geolocation) throw new Error('Seu navegador não oferece localização.');
    this.requesting.set(true);
    try {
      const posicao = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      });
      const local: UserLocation = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        label: 'Sua localização atual',
        origin: 'device',
      };
      this.set(local);
      return local;
    } catch (erro) {
      const codigo = (erro as GeolocationPositionError)?.code;
      if (codigo === 1) throw new Error('Permissão de localização negada. Você pode informar o CEP.');
      throw new Error('Não conseguimos obter sua localização. Tente informar o CEP.');
    } finally {
      this.requesting.set(false);
    }
  }

  /** Converte um CEP em coordenada pela BrasilAPI, já usada no cadastro. */
  async useZipCode(zipCode: string, origin: LocationOrigin = 'zip'): Promise<UserLocation> {
    const digitos = String(zipCode ?? '').replace(/\D/g, '');
    if (digitos.length !== 8) throw new Error('Informe um CEP com 8 dígitos.');
    this.requesting.set(true);
    try {
      const endereco = await firstValueFrom(fetchAddressByZipCode(this.http, digitos));
      const coordenadas = endereco.coordinates;
      if (!coordenadas) throw new Error('Este CEP não tem coordenada. Escolha o bairro na lista.');
      const local: UserLocation = {
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
        label: [endereco.neighborhood, endereco.city].filter(Boolean).join(', ') || 'Endereço informado',
        origin,
      };
      this.set(local);
      return local;
    } catch (erro) {
      if (erro instanceof Error && erro.message.startsWith('Este CEP')) throw erro;
      throw new Error('Não encontramos esse CEP.');
    } finally {
      this.requesting.set(false);
    }
  }

  private restaurar(): UserLocation | null {
    try {
      const bruto = localStorage.getItem(CHAVE_LOCAL);
      if (!bruto) return null;
      const valor = JSON.parse(bruto) as UserLocation;
      return Number.isFinite(valor?.latitude) && Number.isFinite(valor?.longitude) ? valor : null;
    } catch {
      return null;
    }
  }

  private restaurarRaio(): number {
    try {
      const valor = Number(localStorage.getItem(CHAVE_RAIO));
      return RADIUS_OPTIONS.includes(valor as (typeof RADIUS_OPTIONS)[number]) ? valor : DEFAULT_RADIUS;
    } catch {
      return DEFAULT_RADIUS;
    }
  }
}
