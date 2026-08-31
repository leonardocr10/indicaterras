import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/** Meus favoritos (`/app/favoritos`). */
export class FavoritesPage extends PaginaBase {
  async abrir() {
    await this.page.goto('/app/favoritos');
    await this.aguardarCarregamento();
    await expect(this.page.getByRole('heading', { name: 'Meus favoritos' })).toBeVisible();
  }

  get cartoes(): Locator {
    return this.page.locator('professional-card');
  }

  cartao(nome: string | RegExp): Locator {
    return this.cartoes.filter({ hasText: nome });
  }

  get vazio(): Locator {
    return this.page.locator('.favorites-empty');
  }

  filtroDeCategoria(nome: string | RegExp): Locator {
    return this.page.locator('.favorite-category-filters').getByRole('button', { name: nome });
  }

  async listarNomes(): Promise<string[]> {
    await this.aguardarCarregamento();
    return (await this.cartoes.locator('h3').allInnerTexts()).map((texto) => texto.trim());
  }

  async contem(nome: string): Promise<boolean> {
    return (await this.listarNomes()).some((item) => item.includes(nome));
  }

  /** No modo favorito o cartao expoe o menu "Mais opções" com a remocao. */
  async remover(nome: string) {
    const cartao = this.cartao(nome).first();
    await cartao.getByRole('button', { name: new RegExp(`Mais opções para ${nome}|Favoritar ${nome}`, 'i') }).first().click();
    const remover = this.page.getByRole('menuitem', { name: /Remover/i }).or(this.page.getByRole('button', { name: /Remover dos favoritos/i }));
    if (await remover.count()) await remover.first().click();
  }
}
