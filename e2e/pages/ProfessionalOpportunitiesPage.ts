import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Oportunidades do profissional (`/profissional/oportunidades`).
 *
 * A tela lista solicitacoes OPEN compativeis com as categorias/servicos do
 * profissional e dentro do raio dele (`serviceRadiusKm`, ou 15 km por padrao).
 */
export class ProfessionalOpportunitiesPage extends PaginaBase {
  async abrir() {
    await this.page.goto('/profissional/oportunidades');
    await this.aguardarCarregamento();
  }

  get titulo(): Locator {
    return this.page.getByRole('heading', { name: 'Oportunidades', level: 1 });
  }

  get itens(): Locator {
    return this.page.locator('.provider-list-item, article').filter({ has: this.page.locator('h2') });
  }

  item(titulo: string | RegExp): Locator {
    return this.itens.filter({ hasText: titulo });
  }

  get vazio(): Locator {
    return this.page.locator('.provider-list-empty');
  }

  get erro(): Locator {
    return this.page.locator('.provider-list-error, .form-feedback');
  }

  get linkVoltar(): Locator {
    return this.page.getByRole('link', { name: 'Voltar' });
  }

  get linkAjustarPerfil(): Locator {
    return this.page.getByRole('link', { name: /Ajustar meu perfil/i });
  }

  /** Titulos das oportunidades listadas, na ordem em que aparecem. */
  async listarTitulos(): Promise<string[]> {
    await this.aguardarCarregamento();
    if (await this.vazio.count()) return [];
    return (await this.itens.locator('h2').allInnerTexts()).map((texto) => texto.trim());
  }

  async esperarCarregada() {
    await expect(this.titulo).toBeVisible({ timeout: 20_000 });
    await this.aguardarCarregamento();
  }
}
