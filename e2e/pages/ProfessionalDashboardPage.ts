import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Area do profissional (`/profissional/perfil`).
 * Uma tela so acumula painel, edicao de perfil, trabalhos e troca de senha.
 */
export class ProfessionalDashboardPage extends PaginaBase {
  async abrir() {
    await this.page.goto('/profissional/perfil');
    await this.aguardarCarregamento();
  }

  get nomeNoTopo(): Locator {
    return this.page.locator('.provider-topbar-identity h1');
  }

  get visaoGeral(): Locator {
    return this.page.getByRole('heading', { name: 'Visão geral' });
  }

  /** Metricas do painel: nota, avaliacoes, indicacoes, favoritos, visualizacoes. */
  metrica(rotulo: string | RegExp): Locator {
    return this.page.locator('.provider-overview, .provider-metrics').filter({ hasText: rotulo }).first();
  }

  get secaoTrabalhos(): Locator {
    return this.page.getByRole('heading', { name: 'Meus trabalhos' });
  }

  get secaoFavoritaram(): Locator {
    return this.page.getByRole('heading', { name: /Clientes que favoritaram você/i });
  }

  get secaoAvaliacoesRecentes(): Locator {
    return this.page.getByRole('heading', { name: /Avaliações recentes/i });
  }

  get avisoCompletude(): Locator {
    return this.page.getByRole('button', { name: /Completar agora/i });
  }

  // --- Edicao do perfil ---

  get botaoEditarPerfil(): Locator {
    return this.page.getByRole('button', { name: /Editar perfil/i });
  }

  campo(rotulo: string | RegExp): Locator {
    return this.page.locator('label').filter({ hasText: rotulo }).locator('input, textarea').first();
  }

  get campoNome(): Locator {
    return this.page.locator('input[formcontrolname="name"]');
  }

  get campoEmpresa(): Locator {
    return this.page.locator('input[formcontrolname="companyName"]');
  }

  get campoTelefone(): Locator {
    return this.page.locator('input[formcontrolname="phone"]');
  }

  get campoWhatsapp(): Locator {
    return this.page.locator('input[formcontrolname="whatsapp"]');
  }

  get campoCidade(): Locator {
    return this.page.locator('input[formcontrolname="city"], [formcontrolname="city"]').first();
  }

  get campoBairro(): Locator {
    return this.page.locator('input[formcontrolname="neighborhood"], [formcontrolname="neighborhood"]').first();
  }

  get campoInstagram(): Locator {
    return this.page.locator('input[formcontrolname="instagram"]');
  }

  get campoBio(): Locator {
    return this.page.locator('textarea[formcontrolname="bio"]');
  }

  get botaoSalvar(): Locator {
    return this.page.getByRole('button', { name: /Salvar perfil|Salvando/i });
  }

  get inputFoto(): Locator {
    return this.page.locator('label[aria-label="Trocar foto"] input[type="file"]');
  }

  get botaoAdicionarHorario(): Locator {
    return this.page.getByRole('button', { name: /Adicionar outro horário|Adicionar outro horario/i });
  }

  async salvarPerfil() {
    await this.botaoSalvar.click();
  }

  // --- Conta ---

  get menuDaConta(): Locator {
    return this.page.getByRole('button', { name: 'Opções da conta' });
  }

  async abrirMenuDaConta() {
    await this.menuDaConta.click();
  }

  get botaoAlterarSenha(): Locator {
    return this.page.getByRole('button', { name: /Alterar senha/i });
  }

  get botaoSair(): Locator {
    return this.page.getByRole('button', { name: 'Sair' });
  }

  async sair() {
    await this.abrirMenuDaConta();
    await this.botaoSair.click();
  }

  async esperarCarregado() {
    await expect(this.nomeNoTopo).toBeVisible({ timeout: 20_000 });
  }
}
