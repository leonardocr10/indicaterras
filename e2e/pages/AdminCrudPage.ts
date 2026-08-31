import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Tela generica de CRUD do admin (`AdminCrudPageComponent`), usada por
 * `/admin/clientes`, `/admin/usuarios` e `/admin/profissionais`.
 *
 * A tabela nao tem ancora propria por linha, entao localizamos a linha pelo
 * texto que ela contem - estavel o suficiente porque os nomes do seed sao
 * unicos e terminam em "E2E".
 */
export class AdminCrudPage extends PaginaBase {
  async abrir(recurso: 'clientes' | 'usuarios' | 'profissionais') {
    await this.page.goto(`/admin/${recurso}`);
    await this.aguardarCarregamento();
    await expect(this.tabela).toBeVisible({ timeout: 20_000 });
  }

  get titulo(): Locator {
    return this.page.locator('.admin-topbar h1');
  }

  get tabela(): Locator {
    return this.page.locator('.admin-table-wrap table');
  }

  get linhas(): Locator {
    return this.tabela.locator('tbody tr');
  }

  linha(texto: string | RegExp): Locator {
    return this.linhas.filter({ hasText: texto });
  }

  get linhaVazia(): Locator {
    return this.page.locator('.admin-empty-row');
  }

  get contador(): Locator {
    return this.page.locator('.admin-card-header span').first();
  }

  get campoBusca(): Locator {
    return this.page.locator('.admin-search-field input');
  }

  async buscar(termo: string) {
    await this.campoBusca.fill(termo);
    await this.aguardarCarregamento();
  }

  /** Cabecalhos sao botoes de ordenacao. */
  cabecalho(nome: string | RegExp): Locator {
    return this.tabela.locator('thead').getByRole('button', { name: nome });
  }

  async ordenarPor(coluna: string | RegExp) {
    await this.cabecalho(coluna).click();
  }

  async nomesDaColuna(indice = 0): Promise<string[]> {
    return (await this.linhas.locator('td').nth(indice).allInnerTexts()).map((texto) => texto.trim());
  }

  // --- Acoes por linha ---

  botaoEditar(texto: string | RegExp): Locator {
    return this.linha(texto).getByRole('button', { name: 'Editar registro' });
  }

  botaoExcluir(texto: string | RegExp): Locator {
    return this.linha(texto).getByRole('button', { name: 'Excluir registro' });
  }

  botaoAprovar(texto: string | RegExp): Locator {
    return this.linha(texto).getByRole('button', { name: 'Aprovar cadastro' });
  }

  botaoRecusar(texto: string | RegExp): Locator {
    return this.linha(texto).getByRole('button', { name: 'Recusar cadastro' });
  }

  // --- Modal de edicao ---

  get modal(): Locator {
    return this.page.locator('.admin-modal, [role="dialog"]').first();
  }

  campoDoModal(rotulo: string | RegExp): Locator {
    return this.modal.locator('label').filter({ hasText: rotulo }).locator('input, textarea').first();
  }

  get botaoSalvarModal(): Locator {
    return this.modal.getByRole('button', { name: /^Salvar|Salvando/i });
  }

  get botaoCancelarModal(): Locator {
    return this.modal.getByRole('button', { name: /^Cancelar$/i });
  }

  get botaoNovoRegistro(): Locator {
    return this.page.getByRole('button', { name: /Novo|Adicionar|Cadastrar/i }).first();
  }

  async abrirEdicao(texto: string | RegExp) {
    await this.botaoEditar(texto).click();
    await expect(this.modal).toBeVisible();
  }

  /**
   * Exclusao passa por `window.confirm`. O handler precisa ser instalado ANTES
   * do clique, senao o dialogo trava a pagina.
   */
  async excluir(texto: string | RegExp, confirmar = true) {
    this.page.once('dialog', (dialogo) => (confirmar ? dialogo.accept() : dialogo.dismiss()));
    await this.botaoExcluir(texto).click();
    await this.aguardarCarregamento();
  }

  async aprovar(texto: string | RegExp) {
    this.page.once('dialog', (dialogo) => dialogo.accept());
    await this.botaoAprovar(texto).click();
    await this.aguardarCarregamento();
  }

  async contemRegistro(texto: string): Promise<boolean> {
    return (await this.linha(texto).count()) > 0;
  }

  // --- Paginacao ---

  get paginacao(): Locator {
    return this.page.locator('.admin-pagination');
  }
}
