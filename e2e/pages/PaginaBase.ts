import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Base dos Page Objects (item 40).
 *
 * Regra de seletores (item 41): `getByRole` / `getByLabel` / `getByText`
 * primeiro; `data-testid` so onde o app nao oferece ancora estavel. Nada de
 * `div:nth-child(4) > span`.
 */
export abstract class PaginaBase {
  constructor(protected readonly page: Page) {}

  /** Aguarda o Angular terminar de trocar de rota e assentar a renderizacao. */
  async aguardarRota(padrao: string | RegExp) {
    await this.page.waitForURL(padrao, { timeout: 20_000 });
  }

  get toast(): Locator {
    return this.page.locator('.toast, [role="status"], [role="alert"]');
  }

  /** Confere uma mensagem de toast sem prender o teste a estrutura do outlet. */
  async esperarToast(texto: string | RegExp) {
    await expect(this.toast.filter({ hasText: texto }).first()).toBeVisible({ timeout: 15_000 });
  }

  /** Qualquer dialogo/sheet aberto na tela. O app usa role="dialog" em todos. */
  get dialogo(): Locator {
    return this.page.getByRole('dialog');
  }

  async fecharDialogo() {
    await this.dialogo.getByRole('button', { name: /^Fechar/i }).first().click();
    await expect(this.dialogo).toBeHidden();
  }

  /** Botao de voltar. O app usa aria-label="Voltar" em varias telas. */
  get voltar(): Locator {
    return this.page.getByRole('link', { name: /^Voltar/i }).or(this.page.getByRole('button', { name: /^Voltar/i })).first();
  }

  /**
   * Espera a lista/tela terminar de carregar. O app mostra textos "Carregando..."
   * enquanto busca; esperar eles sumirem evita clicar em conteudo antigo.
   */
  async aguardarCarregamento() {
    const carregando = this.page.getByText(/^Carregando/i);
    if (await carregando.count()) {
      await expect(carregando.first()).toBeHidden({ timeout: 20_000 });
    }
  }

  async capturarTela(nome: string) {
    await this.page.screenshot({ path: `reports/screenshots/${nome}.png`, fullPage: true });
  }
}
