import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Busca de profissionais. A MESMA classe atende duas rotas com comportamento
 * diferente (`ProfessionalsPageComponent.nearbyMode` olha o fim da URL):
 *
 *   /app/buscar        -> modo proximidade: raio, lista/mapa, localizacao
 *   /app/profissionais -> lista completa com filtros, sem raio nem mapa
 *
 * Confundir as duas foi a primeira armadilha ao mapear a tela, entao os metodos
 * de abertura sao explicitos.
 */
export class SearchPage extends PaginaBase {
  /** Modo proximidade (raio + mapa). */
  async abrirProximos() {
    await this.page.goto('/app/buscar');
    await this.aguardarCarregamento();
  }

  /** Lista completa com filtros. */
  async abrirLista(parametros: Record<string, string> = {}) {
    const query = new URLSearchParams(parametros).toString();
    await this.page.goto(`/app/profissionais${query ? `?${query}` : ''}`);
    await this.aguardarCarregamento();
  }

  get titulo(): Locator {
    return this.page.locator('.professionals-heading').getByRole('heading');
  }

  get contagem(): Locator {
    return this.page.locator('.professionals-heading p');
  }

  get vazio(): Locator {
    return this.page.locator('.professionals-empty');
  }

  // --- Cartoes de profissional ---

  get cartoes(): Locator {
    return this.page.locator('professional-card');
  }

  cartao(nome: string | RegExp): Locator {
    return this.cartoes.filter({ hasText: nome });
  }

  get nomesVisiveis(): Locator {
    return this.cartoes.locator('h3');
  }

  async listarNomes(): Promise<string[]> {
    await this.aguardarCarregamento();
    return (await this.nomesVisiveis.allInnerTexts()).map((texto) => texto.trim());
  }

  /** Distancia exibida no cartao, ex.: "1,2 km". */
  async distanciaDe(nome: string): Promise<string | null> {
    const cartao = this.cartao(nome).first();
    const distancia = cartao.locator('.card-distance, [class*="distance"]').first();
    return (await distancia.count()) ? (await distancia.innerText()).trim() : null;
  }

  async abrirPerfil(nome: string) {
    await this.cartao(nome).first().getByRole('link', { name: /Ver perfil/i }).click();
    await this.aguardarRota(/\/app\/profissional\//);
  }

  botaoFavoritar(nome: string): Locator {
    return this.cartao(nome).first().getByRole('button', { name: new RegExp(`Favoritar ${nome}`, 'i') });
  }

  // --- Ordenacao e filtros ---

  get botaoMaisIndicados(): Locator {
    return this.page.getByRole('button', { name: /Mais indicados/i });
  }

  get botaoOrdenar(): Locator {
    return this.page.getByRole('button', { name: 'Ordenar' });
  }

  opcaoDeOrdenacao(nome: string | RegExp): Locator {
    return this.page.locator('.sort-menu-options').getByRole('button', { name: nome });
  }

  async ordenarPor(nome: string | RegExp) {
    await this.botaoOrdenar.click();
    await this.opcaoDeOrdenacao(nome).click();
  }

  get botaoFiltros(): Locator {
    return this.page.getByRole('button', { name: /^Filtros/ });
  }

  get painelDeFiltros(): Locator {
    return this.page.getByRole('dialog', { name: 'Filtros de profissionais' });
  }

  async abrirFiltros() {
    await this.botaoFiltros.click();
    await expect(this.painelDeFiltros).toBeVisible();
  }

  get campoBuscaNosFiltros(): Locator {
    return this.painelDeFiltros.getByPlaceholder('Ex.: instalação elétrica');
  }

  get botaoAplicarFiltros(): Locator {
    return this.painelDeFiltros.getByRole('button', { name: /^Ver \d+ profissiona/i });
  }

  get botaoLimparFiltros(): Locator {
    return this.painelDeFiltros.getByRole('button', { name: 'Limpar' });
  }

  /**
   * Os selects sao o componente `app-searchable-select`, nao um `<select>`.
   * Abrir -> digitar -> escolher e o unico caminho confiavel.
   */
  async escolherNoSelect(rotulo: string | RegExp, opcao: string | RegExp) {
    const campo = this.painelDeFiltros.locator('label').filter({ hasText: rotulo }).locator('app-searchable-select');
    await campo.getByRole('button').first().click();
    const busca = this.page.locator('app-searchable-select input[type="search"], app-searchable-select input').last();
    if (await busca.count()) await busca.fill(typeof opcao === 'string' ? opcao : '');
    await this.page.getByRole('option', { name: opcao }).or(this.page.locator('.select-option', { hasText: opcao })).first().click();
  }

  async buscarPorTexto(texto: string) {
    await this.abrirFiltros();
    await this.campoBuscaNosFiltros.fill(texto);
    await this.botaoAplicarFiltros.click();
    await expect(this.painelDeFiltros).toBeHidden();
    await this.aguardarCarregamento();
  }

  // --- Proximidade e raio ---

  get barraDeLocalizacao(): Locator {
    return this.page.locator('.nearby-location-bar');
  }

  get textoDoRaio(): Locator {
    return this.barraDeLocalizacao.locator('strong');
  }

  get botaoAlterarLocalizacao(): Locator {
    return this.page.getByRole('button', { name: /Alterar localização|Alterar localizacao/i });
  }

  get avisoSemLocalizacao(): Locator {
    return this.page.locator('.nearby-no-location');
  }

  get botaoUsarMinhaLocalizacao(): Locator {
    return this.page.getByRole('button', { name: /Usar minha localização|Usar minha localizacao/i }).first();
  }

  botaoDeRaio(km: number): Locator {
    return this.page.locator('.nearby-radius-row').getByRole('button', { name: `${km} km`, exact: true });
  }

  async definirRaio(km: number) {
    await this.botaoDeRaio(km).click();
    await this.aguardarCarregamento();
  }

  get avisoSemCoordenada(): Locator {
    return this.page.locator('.nearby-without-location');
  }

  // --- Sheet de localizacao ---

  get sheetDeLocalizacao(): Locator {
    return this.page.getByRole('dialog', { name: 'Alterar localização' });
  }

  get campoCep(): Locator {
    return this.sheetDeLocalizacao.getByPlaceholder('00000-000');
  }

  get botaoUsarCep(): Locator {
    return this.sheetDeLocalizacao.getByRole('button', { name: /Usar este CEP/i });
  }

  get botaoRemoverLocalizacao(): Locator {
    return this.sheetDeLocalizacao.getByRole('button', { name: /Remover localização|Remover localizacao/i });
  }

  get botaoConcluirLocalizacao(): Locator {
    return this.sheetDeLocalizacao.getByRole('button', { name: 'Concluir' });
  }

  get erroDeLocalizacao(): Locator {
    return this.page.locator('.location-sheet-hint').first();
  }

  async abrirSheetDeLocalizacao() {
    await this.botaoAlterarLocalizacao.click();
    await expect(this.sheetDeLocalizacao).toBeVisible();
  }

  // --- Lista x Mapa ---

  get abaLista(): Locator {
    return this.page.getByRole('tab', { name: 'Lista' });
  }

  get abaMapa(): Locator {
    return this.page.getByRole('tab', { name: 'Mapa' });
  }

  get mapa(): Locator {
    return this.page.locator('.nearby-map');
  }

  get erroDoMapa(): Locator {
    return this.page.locator('.nearby-map-error');
  }

  /** Marcadores HTML criados pelo componente (`button.map-pin`). */
  get marcadores(): Locator {
    return this.page.locator('button.map-pin');
  }

  marcador(nome: string): Locator {
    return this.page.locator('button.map-pin').filter({ has: this.page.locator(`[aria-label^="${nome}"]`) })
      .or(this.page.getByRole('button', { name: new RegExp(`^${nome},`) }))
      .first();
  }

  get cardDoMarcador(): Locator {
    return this.page.locator('.map-sheet');
  }

  get botaoFecharCardDoMarcador(): Locator {
    return this.cardDoMarcador.getByRole('button', { name: 'Fechar' });
  }

  get botaoFavoritarNoCard(): Locator {
    return this.cardDoMarcador.getByRole('button', { name: /Favoritar|Favoritado/i });
  }

  get linkVerPerfilNoCard(): Locator {
    return this.cardDoMarcador.getByRole('link', { name: /Ver perfil/i });
  }

  async verNoMapa() {
    await this.abaMapa.click();
    await expect(this.mapa).toBeVisible();
  }

  async verNaLista() {
    await this.abaLista.click();
  }

  // --- Categorias rapidas (modo proximidade) ---

  categoriaRapida(nome: string | RegExp): Locator {
    return this.page.locator('.nearby-quick-categories').getByRole('button', { name: nome });
  }

  get ctaDaIa(): Locator {
    return this.page.locator('.nearby-ai-cta');
  }

  get botaoQueroPropostas(): Locator {
    return this.page.getByRole('button', { name: /Quero receber propostas/i });
  }
}
