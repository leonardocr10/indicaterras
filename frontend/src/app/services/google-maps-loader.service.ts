import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Carrega o SDK do Google Maps sob demanda — só quando alguém abre o mapa.
 * A chave vem das configurações públicas; ela é necessariamente visível no
 * navegador (é assim que a API do Google funciona), então a proteção correta
 * é restringi-la por referenciador HTTP no Google Cloud Console.
 *
 * Sem chave ou sem faturamento ativo o SDK não carrega, e a lista continua
 * funcionando sozinha — o mapa é um complemento, nunca o caminho único.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private readonly api = inject(ApiService);
  private carregamento: Promise<boolean> | null = null;
  /**
   * O Google recusa a chave DEPOIS de o script carregar (domínio não autorizado,
   * faturamento desligado, chave inválida) e avisa só por este callback global.
   * Sem ele, o mapa vira um quadrado branco sem explicação nenhuma.
   */
  private readonly autorizacaoNegada = signal(false);

  readonly authFailed = this.autorizacaoNegada.asReadonly();

  /** Resolve true quando `google.maps` está disponível. Nunca lança. */
  load(): Promise<boolean> {
    if (this.carregamento) return this.carregamento;
    this.carregamento = this.carregar().catch(() => false);
    return this.carregamento;
  }

  private async carregar() {
    if (typeof window === 'undefined') return false;
    if (this.mapsPronto()) return true;

    if (!(window as unknown as Record<string, unknown>)['google']) {
      const settings = await firstValueFrom(this.api.getPublicSettings());
      const apiKey = settings.maps?.apiKey ?? '';
      if (!apiKey) return false;

      (window as unknown as Record<string, unknown>)['gm_authFailure'] = () => this.autorizacaoNegada.set(true);

      const carregou = await new Promise<boolean>((resolve) => {
        const script = document.createElement('script');
        // Sem `loading=async`: nesse modo o Google entrega so o carregador e as
        // classes precisam ser pedidas uma a uma, o que ja quebrou o mapa aqui.
        // No modo classico `google.maps.Map` existe assim que o script carrega.
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=pt-BR&region=BR`;
        script.async = true;
        script.onload = () => resolve(Boolean((window as unknown as Record<string, unknown>)['google']));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
      if (!carregou) return false;
    }

    // Com `loading=async` o script baixa apenas o carregador: `google.maps.Map`
    // e as demais classes só existem depois de pedir cada biblioteca. Sem isto,
    // o mapa quebrava com "google.maps.Map is not a constructor".
    const maps = (window as unknown as { google?: { maps?: { importLibrary?: (nome: string) => Promise<unknown> } } }).google?.maps;
    if (!maps) return false;
    // Cinto e suspensorio: se a versao da API ainda assim entregar so o
    // carregador, pedimos as bibliotecas antes de desistir.
    if (!this.mapsPronto() && typeof maps.importLibrary === 'function') {
      try {
        await Promise.all([maps.importLibrary('core'), maps.importLibrary('maps'), maps.importLibrary('marker')]);
      } catch {
        return false;
      }
    }
    return this.mapsPronto();
  }

  /** Só reportamos sucesso quando as classes que a tela usa existem de fato. */
  private mapsPronto() {
    const maps = (window as unknown as { google?: { maps?: Record<string, unknown> } }).google?.maps;
    return Boolean(maps && typeof maps['Map'] === 'function');
  }
}
