import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * `/admin/inteligencia-artificial`.
 *
 * O teste mais valioso desta tela nao e preencher campo: e virar a chave
 * `enabled` e confirmar que a Home do cliente muda de cara (item 23).
 */
export class AdminAiPage extends PaginaBase {
  async abrir() {
    await this.page.goto('/admin/inteligencia-artificial');
    await this.aguardarCarregamento();
    await expect(this.page.getByRole('heading', { name: 'Inteligência Artificial' })).toBeVisible();
  }

  // --- Status ---

  get chaveAtivarIa(): Locator {
    return this.page.getByRole('checkbox', { name: /Ativar IA no aplicativo/i });
  }

  async ativarIa() {
    if (!(await this.chaveAtivarIa.isChecked())) await this.chaveAtivarIa.check();
    await this.salvar();
  }

  async desativarIa() {
    if (await this.chaveAtivarIa.isChecked()) await this.chaveAtivarIa.uncheck();
    await this.salvar();
  }

  // --- Provedor e modelo ---

  get seletorDeProvedor(): Locator {
    return this.page.locator('select[formcontrolname="provider"]');
  }

  get campoModelo(): Locator {
    return this.page.locator('input[formcontrolname="model"]');
  }

  get campoChaveApi(): Locator {
    return this.page.locator('input[formcontrolname="apiKey"]');
  }

  get campoEndpoint(): Locator {
    return this.page.locator('input[formcontrolname="endpointUrl"]');
  }

  get campoTemperatura(): Locator {
    return this.page.locator('input[formcontrolname="temperature"]');
  }

  get campoTimeout(): Locator {
    return this.page.locator('input[formcontrolname="timeoutMs"]');
  }

  get botaoTestarConexao(): Locator {
    return this.page.getByRole('button', { name: /Testar conexão|Testando/i });
  }

  // --- Regras, confianca e limites ---

  regra(nome: string | RegExp): Locator {
    return this.page.getByRole('checkbox', { name: nome });
  }

  get campoConfiancaMinima(): Locator {
    return this.page.locator('input[formcontrolname="minimumConfidence"]');
  }

  get campoConfiancaAutomatica(): Locator {
    return this.page.locator('input[formcontrolname="autoApplyConfidence"]');
  }

  get campoLimiteDiario(): Locator {
    return this.page.locator('input[formcontrolname="dailyLimit"]');
  }

  get campoLimiteMensal(): Locator {
    return this.page.locator('input[formcontrolname="monthlyLimit"]');
  }

  get campoMaximoDeCaracteres(): Locator {
    return this.page.locator('input[formcontrolname="maxInputLength"]');
  }

  get chaveFallbackPorPalavrasChave(): Locator {
    return this.regra(/Usar palavras-chave caso a IA falhe/i);
  }

  // --- Textos da Home ---

  get campoTituloDaHome(): Locator {
    return this.page.locator('input[formcontrolname="homeTitle"]');
  }

  get campoSubtituloDaHome(): Locator {
    return this.page.locator('input[formcontrolname="homeSubtitle"]');
  }

  get campoPlaceholderDaHome(): Locator {
    return this.page.locator('input[formcontrolname="homePlaceholder"]');
  }

  get campoMensagemDeFallback(): Locator {
    return this.page.locator('input[formcontrolname="fallbackMessage"]');
  }

  get botaoSalvar(): Locator {
    return this.page.getByRole('button', { name: /Salvar configurações|Salvar configuracoes/i });
  }

  async salvar() {
    await this.botaoSalvar.click();
    await this.aguardarCarregamento();
  }

  // --- Teste de analise ---

  get campoTexto(): Locator {
    return this.page.getByPlaceholder('Ex.: meu chuveiro queimou');
  }

  get botaoAnalisar(): Locator {
    return this.page.getByRole('button', { name: /^Analisar$|Analisando/i });
  }

  // --- Logs ---

  get secaoDeLogs(): Locator {
    return this.page.getByRole('heading', { name: /Logs de análise|Logs de analise/i });
  }

  get totalDeLogs(): Locator {
    return this.secaoDeLogs.locator('xpath=../span');
  }

  get linhasDeLog(): Locator {
    return this.page.locator('.admin-table-wrap').last().locator('tbody tr');
  }

  botaoMarcarCorreto(indice = 0): Locator {
    return this.linhasDeLog.nth(indice).getByRole('button', { name: 'Marcar como correto' });
  }
}
