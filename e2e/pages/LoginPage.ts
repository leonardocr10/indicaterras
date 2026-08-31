import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Tela `/login` (cliente e profissional).
 *
 * Os campos ficam dentro de `<label class="auth-field">E-mail <span><input/></span></label>`,
 * entao o texto do label e a ancora natural - nao ha `for`/`id` no HTML.
 */
export class LoginPage extends PaginaBase {
  get campoEmail(): Locator {
    return this.page.getByRole('textbox', { name: 'E-mail', exact: true }).or(this.page.locator('input[type="email"]').first()).first();
  }

  get campoSenha(): Locator {
    return this.page.locator('input[formcontrolname="password"]').first();
  }

  get lembrarMe(): Locator {
    return this.page.getByRole('checkbox', { name: /Lembrar-me/i });
  }

  get botaoEntrar(): Locator {
    return this.page.getByRole('button', { name: 'Entrar', exact: true });
  }

  get botaoMostrarSenha(): Locator {
    return this.page.getByRole('button', { name: 'Mostrar ou ocultar senha' });
  }

  get linkCriarConta(): Locator {
    return this.page.getByRole('link', { name: /Criar conta/i });
  }

  get botaoEsqueciSenha(): Locator {
    return this.page.getByRole('button', { name: /Esqueci minha senha/i });
  }

  get mensagem(): Locator {
    return this.page.locator('.form-feedback');
  }

  get avisoAguardandoAprovacao(): Locator {
    return this.page.getByText(/Sua conta esta aguardando aprovacao|Sua conta está aguardando aprovação/i);
  }

  async abrir() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Bem-vindo de volta/i })).toBeVisible();
  }

  async preencher(email: string, senha: string) {
    await this.campoEmail.fill(email);
    await this.campoSenha.fill(senha);
  }

  async entrar(email: string, senha: string) {
    await this.preencher(email, senha);
    await this.botaoEntrar.click();
  }

  // --- Modal "Esqueci minha senha" ---

  get campoEmailRecuperacao(): Locator {
    return this.dialogo.locator('input[type="email"]');
  }

  get botaoEnviarRecuperacao(): Locator {
    return this.dialogo.getByRole('button', { name: /Enviar link de recuperacao|Enviar link de recuperação/i });
  }

  async abrirRecuperacaoDeSenha() {
    await this.botaoEsqueciSenha.click();
    await expect(this.page.getByRole('heading', { name: /Recuperar senha/i })).toBeVisible();
  }
}
