import type { ConsoleMessage, Page, Request, Response } from '@playwright/test';

/**
 * Itens 33 e 34: o teste falha quando a pagina cospe erro de console ou quando
 * a API responde algo inesperado.
 *
 * O criterio e "inesperado", nao "qualquer erro": um 401 no /auth/login de um
 * teste de senha errada e o comportamento CORRETO. Por isso cada teste declara
 * o que tolera, em vez de a suite inteira baixar a guarda.
 */

/** Erros de console conhecidos e justificados. Qualquer outro derruba o teste. */
export const ERROS_DE_CONSOLE_CONHECIDOS: Array<{ padrao: RegExp; motivo: string }> = [
  {
    padrao: /Failed to load resource.*maps\.googleapis\.com/i,
    motivo: 'O SDK do Google Maps e bloqueado de proposito pelo mock de mapa.',
  },
  {
    padrao: /Google Maps JavaScript API|InvalidKeyMapError|ApiNotActivatedMapError/i,
    motivo: 'Mesma razao: sem chave real, o SDK reclama antes de o app assumir o fallback.',
  },
  {
    padrao: /ngsw|service worker|ServiceWorker/i,
    motivo: 'O service worker do PWA nao e registrado em dev; o aviso e esperado.',
  },
  {
    padrao: /Download the Angular DevTools/i,
    motivo: 'Banner informativo do Angular em modo de desenvolvimento.',
  },
  {
    padrao: /\[webpack-dev-server\]|Angular is running in development mode/i,
    motivo: 'Ruido do servidor de desenvolvimento.',
  },
  {
    padrao: /favicon\.ico/i,
    motivo: 'Favicon ausente no dev server nao afeta o comportamento testado.',
  },
];

export interface RegistroDeErro {
  tipo: 'console' | 'pagina';
  texto: string;
  url: string;
}

export interface RegistroHttp {
  metodo: string;
  url: string;
  status: number;
}

/** Status que sempre indicam problema quando ninguem os declarou como esperados. */
const STATUS_SUSPEITOS = [400, 401, 403, 404, 500, 502, 503];

export class Diagnostico {
  readonly errosDeConsole: RegistroDeErro[] = [];
  readonly respostasSuspeitas: RegistroHttp[] = [];

  /** Padroes que ESTE teste declarou tolerar, via `diagnostico.tolerar(...)`. */
  private readonly toleradosConsole: RegExp[] = [];
  private readonly toleradosHttp: Array<{ url: RegExp; status?: number }> = [];

  constructor(private readonly page: Page) {
    page.on('console', (mensagem) => this.registrarConsole(mensagem));
    page.on('pageerror', (erro) => {
      this.errosDeConsole.push({ tipo: 'pagina', texto: erro.message, url: page.url() });
    });
    page.on('response', (resposta) => this.registrarResposta(resposta));
    page.on('requestfailed', (requisicao) => this.registrarFalha(requisicao));
  }

  /** Declara que este teste espera um erro de console casando com o padrao. */
  tolerarConsole(...padroes: RegExp[]) {
    this.toleradosConsole.push(...padroes);
  }

  /**
   * Declara uma resposta HTTP esperada. Ex.: um teste de login invalido chama
   * `tolerarHttp(/\/auth\/login/, 401)` - o 401 e o resultado desejado ali.
   */
  tolerarHttp(url: RegExp, status?: number) {
    this.toleradosHttp.push({ url, status });
  }

  private registrarConsole(mensagem: ConsoleMessage) {
    if (mensagem.type() !== 'error') return;
    const texto = mensagem.text();
    if (ERROS_DE_CONSOLE_CONHECIDOS.some((item) => item.padrao.test(texto))) return;
    if (this.toleradosConsole.some((padrao) => padrao.test(texto))) return;
    this.errosDeConsole.push({ tipo: 'console', texto, url: this.page.url() });
  }

  private registrarResposta(resposta: Response) {
    const status = resposta.status();
    if (!STATUS_SUSPEITOS.includes(status)) return;
    const url = resposta.url();
    // So monitoramos a propria aplicacao: recurso de terceiro que falha e
    // problema do mock, nao do sistema sob teste.
    if (!/localhost|127\.0\.0\.1/.test(url)) return;
    if (this.toleradoHttp(url, status)) return;
    this.respostasSuspeitas.push({ metodo: resposta.request().method(), url, status });
  }

  private registrarFalha(requisicao: Request) {
    const url = requisicao.url();
    if (!/localhost|127\.0\.0\.1/.test(url)) return;
    if (this.toleradoHttp(url)) return;
    // Requisicao abortada pelo mock de rota nao e falha real.
    if (requisicao.failure()?.errorText?.includes('net::ERR_FAILED')) return;
    this.respostasSuspeitas.push({ metodo: requisicao.method(), url, status: 0 });
  }

  private toleradoHttp(url: string, status?: number) {
    return this.toleradosHttp.some((item) => {
      if (!item.url.test(url)) return false;
      return item.status === undefined || status === undefined || item.status === status;
    });
  }

  /** Monta a mensagem de falha. Vazio significa "nada a reportar". */
  relatorio(): string {
    const partes: string[] = [];
    if (this.errosDeConsole.length) {
      partes.push(
        `${this.errosDeConsole.length} erro(s) de console nao esperados:\n` +
          this.errosDeConsole.map((erro) => `  - [${erro.tipo}] ${erro.texto}\n    em ${erro.url}`).join('\n'),
      );
    }
    if (this.respostasSuspeitas.length) {
      partes.push(
        `${this.respostasSuspeitas.length} resposta(s) HTTP inesperada(s):\n` +
          this.respostasSuspeitas
            .map((item) => `  - ${item.metodo} ${item.status || 'FALHOU'} ${item.url}`)
            .join('\n'),
      );
    }
    return partes.join('\n\n');
  }
}
