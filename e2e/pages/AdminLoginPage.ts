import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/** Tela `/admin/login`. Inputs sem label: a ancora e o placeholder. */
export class AdminLoginPage extends PaginaBase {
  get campoEmail(): Locator {
    return this.page.getByPlaceholder('E-mail administrativo');
  }

  get campoSenha(): Locator {
    return this.page.getByPlaceholder('Senha', { exact: true });
  }

  get botaoEntrar(): Locator {
    return this.page.getByRole('button', { name: /Entrar no painel/i });
  }

  get mensagem(): Locator {
    return this.page.locator('.form-feedback');
  }

  get linkVoltarParaApp(): Locator {
    return this.page.getByRole('link', { name: /Voltar ao aplicativo do cliente/i });
  }

  async abrir() {
    await this.page.goto('/admin/login');
    await expect(this.page.getByRole('heading', { name: /Acessar painel/i })).toBeVisible();
  }

  async entrar(email: string, senha: string) {
    await this.campoEmail.fill(email);
    await this.campoSenha.fill(senha);
    await this.botaoEntrar.click();
  }
}
