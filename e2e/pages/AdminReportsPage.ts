import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Denuncias no admin: lista (`/admin/denuncias`) e detalhe (`/admin/denuncias/:id`).
 *
 * A suspensao do profissional (item 25) mora aqui, nas "Ações contra o
 * prestador" - nao ha um botao de suspender no CRUD de profissionais.
 */
export class AdminReportsPage extends PaginaBase {
  async abrirLista() {
    await this.page.goto('/admin/denuncias');
    await this.aguardarCarregamento();
    await expect(this.page.getByRole('heading', { name: 'Denúncias', level: 1 })).toBeVisible();
  }

  get linhas(): Locator {
    return this.page.locator('.admin-table-wrap tbody tr');
  }

  linha(texto: string | RegExp): Locator {
    return this.linhas.filter({ hasText: texto });
  }

  get campoBusca(): Locator {
    return this.page.getByPlaceholder('Buscar registros...');
  }

  /** Menu "Mais ações" da linha, onde ficam status e punicoes. */
  async abrirMenuDaLinha(texto: string | RegExp) {
    await this.linha(texto).getByRole('button', { name: 'Mais ações' }).click();
  }

  itemDoMenu(nome: string | RegExp): Locator {
    return this.page.getByRole('menuitem', { name: nome });
  }

  async aplicarPelaLista(texto: string | RegExp, acao: string | RegExp) {
    await this.abrirMenuDaLinha(texto);
    await this.itemDoMenu(acao).click();
    await this.aguardarCarregamento();
  }

  async abrirDetalhe(texto: string | RegExp) {
    await this.linha(texto).locator('td').first().click();
    await this.aguardarRota(/\/admin\/denuncias\/[^/]+$/);
  }

  // --- Detalhe ---

  get tituloDoDetalhe(): Locator {
    return this.page.getByRole('heading', { name: /Detalhes da denúncia/i });
  }

  get botaoMarcarEmAnalise(): Locator {
    return this.page.getByRole('button', { name: /Marcar em análise/i }).first();
  }

  get botaoResolver(): Locator {
    return this.page.getByRole('button', { name: /Resolver denúncia/i }).first();
  }

  get campoParecer(): Locator {
    return this.page.getByPlaceholder(/Registre seu parecer/i);
  }

  get botaoSalvarParecer(): Locator {
    return this.page.getByRole('button', { name: /Salvar parecer|Registrar parecer|Salvar/i }).last();
  }

  // Acoes contra o prestador
  get botaoAdvertir(): Locator {
    return this.page.getByRole('button', { name: /Advertir profissional/i });
  }

  get botaoOcultar(): Locator {
    return this.page.getByRole('button', { name: /Ocultar do app/i });
  }

  get botaoSuspender(): Locator {
    return this.page.getByRole('button', { name: /Suspender prestador/i });
  }

  get botaoBloquear(): Locator {
    return this.page.getByRole('button', { name: /Bloquear permanentemente/i });
  }

  get botaoReativar(): Locator {
    return this.page.getByRole('button', { name: /Reativar prestador no app/i });
  }

  get historico(): Locator {
    return this.page.getByRole('heading', { name: /Histórico da denúncia/i }).locator('xpath=..');
  }

  get resumoDoProfissional(): Locator {
    return this.page.getByRole('heading', { name: /Informações do prestador/i }).locator('xpath=..');
  }

  get evidencias(): Locator {
    return this.page.getByRole('heading', { name: /Evidências anexadas/i }).locator('xpath=..').locator('button');
  }
}
