import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Home do cliente (`/app/home`).
 *
 * A tela tem dois modos exclusivos, decididos por `aiEnabled()` vindo de
 * `GET /public-settings`:
 *   - IA ligada  -> hero "Assistente IA" com "Analisar meu problema"
 *   - IA desligada -> hero classico com a busca "Conte o que aconteceu"
 * Os dois compartilham o mesmo `[(ngModel)]="searchText"`, entao `campoBusca`
 * resolve o input dos dois modos.
 */
export class HomePage extends PaginaBase {
  async abrir() {
    await this.page.goto('/app/home');
    await this.aguardarCarregamento();
  }

  // --- Estado da IA ---

  get selosDaIa(): Locator {
    return this.page.locator('.home-ai-badge');
  }

  get heroClassico(): Locator {
    return this.page.getByRole('heading', { name: /Encontre o profissional ideal/i });
  }

  async iaEstaVisivel(): Promise<boolean> {
    return (await this.selosDaIa.count()) > 0;
  }

  // --- Busca / analise ---

  get campoBusca(): Locator {
    return this.page.getByLabel('Descreva o problema');
  }

  get botaoAnalisar(): Locator {
    return this.page.getByRole('button', { name: /Analisar meu problema/i });
  }

  get indicadorAnalisando(): Locator {
    return this.page.getByRole('button', { name: /Analisando\.\.\./i });
  }

  get progressoDaAnalise(): Locator {
    return this.page.locator('.home-ai-progress');
  }

  get resultadoDaAnalise(): Locator {
    return this.page.locator('.home-ai-result');
  }

  get esclarecimentoDaIa(): Locator {
    return this.page.locator('.home-ai-clarification');
  }

  /** Sugestao por palavras-chave ("Parece que você precisa de ..."). */
  get sugestaoPorPalavraChave(): Locator {
    return this.page.locator('.home-problem-suggestion');
  }

  exemploRapido(texto: string | RegExp): Locator {
    return this.page.locator('.home-ai-examples').getByRole('button', { name: texto });
  }

  get botaoVerProfissionaisDoResultado(): Locator {
    return this.resultadoDaAnalise.getByRole('button', { name: /Ver profissionais/i });
  }

  get botaoQueroPropostasDoResultado(): Locator {
    return this.resultadoDaAnalise.getByRole('button', { name: /Quero receber propostas/i });
  }

  get botaoAjustar(): Locator {
    return this.resultadoDaAnalise.getByRole('button', { name: /Ajustar/i });
  }

  /** Descreve o problema e dispara a analise (IA) ou a busca (classico). */
  async descreverProblema(texto: string) {
    await this.campoBusca.fill(texto);
  }

  async analisar(texto: string) {
    await this.descreverProblema(texto);
    await this.botaoAnalisar.click();
  }

  async buscarNoModoClassico(texto: string) {
    await this.descreverProblema(texto);
    await this.campoBusca.press('Enter');
  }

  // --- Cartoes de decisao ---

  get cartaoDescrevaProblema(): Locator {
    return this.page.locator('.home-decision-card.request');
  }

  get cartaoVerProfissionais(): Locator {
    return this.page.locator('.home-decision-card.browse');
  }

  get botaoQueroPropostas(): Locator {
    return this.cartaoDescrevaProblema.getByRole('button', { name: /Quero receber propostas/i });
  }

  get linkVerProfissionais(): Locator {
    return this.cartaoVerProfissionais.getByRole('link', { name: /Ver profissionais/i });
  }

  // --- Categorias ---

  get gradeDeCategorias(): Locator {
    return this.page.locator('.category-grid');
  }

  get cartoesDeCategoria(): Locator {
    return this.gradeDeCategorias.locator('a.category-card');
  }

  categoria(nome: string | RegExp): Locator {
    return this.gradeDeCategorias.getByRole('link', { name: nome });
  }

  get linkVerTodasAsCategorias(): Locator {
    return this.page.getByRole('link', { name: /Ver todas/i }).first();
  }

  categoriaPopular(nome: string | RegExp): Locator {
    return this.page.locator('.home-popular').getByRole('link', { name: nome });
  }

  // --- Aviso e formulario de endereco ---

  get avisoDeEndereco(): Locator {
    return this.page.locator('.home-address-prompt');
  }

  get botaoCompletarEndereco(): Locator {
    return this.avisoDeEndereco.getByRole('button', { name: /Completar agora/i });
  }

  get botaoDispensarEndereco(): Locator {
    return this.avisoDeEndereco.getByRole('button', { name: /Agora não|Agora nao/i });
  }

  get formularioDeEndereco(): Locator {
    return this.page.locator('.home-address-form');
  }

  get campoCep(): Locator {
    return this.formularioDeEndereco.getByPlaceholder('00000-000');
  }

  get campoNumero(): Locator {
    return this.formularioDeEndereco.getByPlaceholder('123');
  }

  get botaoSalvarEndereco(): Locator {
    return this.formularioDeEndereco.getByRole('button', { name: /Salvar endereço|Salvar endereco/i });
  }

  async esperarCarregada() {
    await expect(this.page.locator('.home-page')).toBeVisible({ timeout: 20_000 });
    await this.aguardarCarregamento();
  }
}
