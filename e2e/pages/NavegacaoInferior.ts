import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Bottom navigation e drawer do layout mobile (`components.ts`).
 * Item 35: todo item de navegacao precisa levar a algum lugar.
 */
export class NavegacaoInferior extends PaginaBase {
  private get barra(): Locator {
    return this.page.locator('bottom-navigation');
  }

  get inicio(): Locator {
    return this.barra.getByRole('link', { name: 'Início' });
  }

  get buscar(): Locator {
    return this.barra.getByRole('link', { name: 'Buscar' });
  }

  get indicar(): Locator {
    return this.barra.getByRole('link', { name: 'Indicar' });
  }

  get favoritos(): Locator {
    return this.barra.getByRole('link', { name: 'Favoritos' });
  }

  get perfil(): Locator {
    return this.barra.getByRole('link', { name: 'Perfil' });
  }

  /** Todos os itens da barra, para varrer de uma vez. */
  get itens(): Locator {
    return this.barra.getByRole('link');
  }

  // --- Drawer (menu lateral) ---

  get botaoMenu(): Locator {
    return this.page.getByRole('button', { name: 'Menu', exact: true });
  }

  get drawer(): Locator {
    return this.page.getByRole('dialog', { name: 'Menu principal' });
  }

  async abrirMenu() {
    await this.botaoMenu.click();
    await expect(this.drawer).toBeVisible();
  }

  async fecharMenu() {
    await this.drawer.getByRole('button', { name: 'Fechar menu' }).click();
    await expect(this.drawer).toBeHidden();
  }

  itemDoMenu(nome: string | RegExp): Locator {
    return this.drawer.getByRole('link', { name: nome });
  }

  // --- Notificacoes ---

  get botaoNotificacoes(): Locator {
    return this.page.getByRole('button', { name: 'Notificações' });
  }

  get painelDeNotificacoes(): Locator {
    return this.page.locator('.mobile-notifications');
  }

  /** Confere qual item esta marcado como ativo pelo routerLinkActive. */
  async itemAtivo(): Promise<string> {
    return (await this.barra.locator('a.active').first().innerText()).trim();
  }
}
