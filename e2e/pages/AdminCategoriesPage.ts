import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * `/admin/categorias`: CRUD de categorias, e dentro do editor da categoria um
 * segundo CRUD de servicos com palavras-chave. As palavras-chave importam para
 * o teste: sao elas que alimentam a busca por problema.
 */
export class AdminCategoriesPage extends PaginaBase {
  async abrir() {
    await this.page.goto('/admin/categorias');
    await this.aguardarCarregamento();
    await expect(this.page.getByRole('heading', { name: 'Categorias', level: 1 })).toBeVisible();
  }

  get tabela(): Locator {
    return this.page.locator('.admin-table-wrap table').first();
  }

  get linhas(): Locator {
    return this.tabela.locator('tbody tr');
  }

  linha(nome: string | RegExp): Locator {
    return this.linhas.filter({ hasText: nome });
  }

  get campoBusca(): Locator {
    return this.page.getByPlaceholder('Buscar categoria...');
  }

  get botaoNovaCategoria(): Locator {
    return this.page.getByRole('button', { name: /Nova categoria/i });
  }

  botaoEditar(nome: string | RegExp): Locator {
    return this.linha(nome).getByRole('button', { name: 'Editar categoria' });
  }

  botaoExcluir(nome: string | RegExp): Locator {
    return this.linha(nome).getByRole('button', { name: 'Excluir categoria' });
  }

  // --- Editor de categoria ---

  get editor(): Locator {
    return this.page.locator('.admin-modal').first();
  }

  get tituloDoEditor(): Locator {
    return this.editor.locator('.admin-modal-header h2');
  }

  get campoNome(): Locator {
    return this.editor.getByPlaceholder('Ex.: Eletricista');
  }

  get campoSlug(): Locator {
    return this.editor.getByPlaceholder('eletricista');
  }

  get campoDescricao(): Locator {
    return this.editor.getByPlaceholder(/Descreva os profissionais/i);
  }

  get botaoSalvarCategoria(): Locator {
    return this.editor.getByRole('button', { name: /Salvar categoria|Salvando/i });
  }

  get botaoCancelar(): Locator {
    return this.editor.getByRole('button', { name: /^Cancelar$/i });
  }

  async abrirNova() {
    await this.botaoNovaCategoria.click();
    await expect(this.tituloDoEditor).toHaveText(/Nova categoria/i);
  }

  async abrirEdicao(nome: string | RegExp) {
    await this.botaoEditar(nome).click();
    await expect(this.tituloDoEditor).toHaveText(/Editar categoria/i);
  }

  async criar(nome: string, slug: string, descricao?: string) {
    await this.abrirNova();
    await this.campoNome.fill(nome);
    await this.campoSlug.fill(slug);
    if (descricao) await this.campoDescricao.fill(descricao);
    await this.botaoSalvarCategoria.click();
  }

  async excluir(nome: string | RegExp) {
    this.page.once('dialog', (dialogo) => dialogo.accept());
    await this.botaoExcluir(nome).click();
    await this.aguardarCarregamento();
  }

  // --- Servicos dentro do editor ---

  get botaoAdicionarServico(): Locator {
    return this.editor.getByRole('button', { name: /Adicionar serviço|Adicionar servico/i });
  }

  get modalDeServico(): Locator {
    return this.page.locator('.service-modal, .admin-modal').last();
  }

  get campoNomeDoServico(): Locator {
    return this.page.getByPlaceholder('Ex.: Tomada');
  }

  get campoSlugDoServico(): Locator {
    return this.page.getByPlaceholder('tomada');
  }

  get campoPalavrasChave(): Locator {
    return this.page.getByPlaceholder(/tomadas, plug, ponto elétrico|tomadas, plug/i);
  }

  get botaoSalvarServico(): Locator {
    return this.page.getByRole('button', { name: /Salvar serviço|Salvar servico/i });
  }

  linhaDeServico(nome: string | RegExp): Locator {
    return this.editor.locator('tbody tr').filter({ hasText: nome });
  }

  botaoEditarServico(nome: string | RegExp): Locator {
    return this.linhaDeServico(nome).getByRole('button', { name: 'Editar serviço' });
  }

  botaoExcluirServico(nome: string | RegExp): Locator {
    return this.linhaDeServico(nome).getByRole('button', { name: 'Excluir serviço' });
  }

  /** Cria um servico com sinonimos, que e o que alimenta a busca por problema. */
  async adicionarServico(nome: string, slug: string, palavrasChave: string) {
    await this.botaoAdicionarServico.click();
    await this.campoNomeDoServico.fill(nome);
    await this.campoSlugDoServico.fill(slug);
    await this.campoPalavrasChave.fill(palavrasChave);
    await this.botaoSalvarServico.click();
  }
}
