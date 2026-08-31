import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Solicitacao de servico: listagem, wizard de 5 passos e detalhe.
 *
 * Passos: Problema -> Fotos -> Preferencias -> Local -> Confirmar.
 * O rodape tem "Anterior" / "Proximo" e, no ultimo, "Publicar solicitacao".
 */
export class ServiceRequestPage extends PaginaBase {
  // --- Listagem ---

  async abrirLista() {
    await this.page.goto('/app/solicitacoes');
    await this.aguardarCarregamento();
  }

  get itensDaLista(): Locator {
    return this.page.locator('.request-card, article').filter({ has: this.page.locator('.status-badge') });
  }

  itemDaLista(titulo: string | RegExp): Locator {
    return this.page.getByText(titulo).first();
  }

  // --- Wizard ---

  async abrirNova(problema?: string) {
    const query = problema ? `?problema=${encodeURIComponent(problema)}` : '';
    await this.page.goto(`/app/solicitacoes/nova${query}`);
    await expect(this.indicadorDePasso).toBeVisible();
  }

  get indicadorDePasso(): Locator {
    return this.page.locator('.request-builder-header strong');
  }

  get stepper(): Locator {
    return this.page.getByRole('navigation', { name: 'Etapas da solicitação' });
  }

  passoDoStepper(nome: string | RegExp): Locator {
    return this.stepper.getByRole('button', { name: nome });
  }

  get botaoProximo(): Locator {
    return this.page.getByRole('button', { name: 'Próximo' });
  }

  get botaoAnterior(): Locator {
    return this.page.getByRole('button', { name: 'Anterior' });
  }

  get botaoPublicar(): Locator {
    return this.page.getByRole('button', { name: /Publicar solicitação|Publicando/i });
  }

  async avancar() {
    await this.botaoProximo.click();
  }

  async avancarAte(passo: 1 | 2 | 3 | 4 | 5) {
    while ((await this.numeroDoPasso()) < passo) await this.avancar();
  }

  async numeroDoPasso(): Promise<number> {
    const texto = await this.indicadorDePasso.innerText();
    return Number(texto.match(/Passo (\d+)/)?.[1] ?? 0);
  }

  // Passo 1 - Problema

  get campoDescricao(): Locator {
    return this.page.getByPlaceholder(/Ex\.: meu chuveiro queimou/i);
  }

  get campoTitulo(): Locator {
    return this.page.getByPlaceholder(/Ex\.: Chuveiro não esquenta/i);
  }

  get blocoIdentificado(): Locator {
    return this.page.locator('.request-identified');
  }

  get botaoAjustar(): Locator {
    return this.blocoIdentificado.getByRole('button', { name: 'Ajustar' });
  }

  get analisando(): Locator {
    return this.page.locator('.request-analyzing');
  }

  chipDeServico(nome: string | RegExp): Locator {
    return this.page.locator('.request-chip-grid').getByRole('button', { name: nome });
  }

  /** Descreve o problema e espera a identificacao automatica assentar. */
  async descreverProblema(descricao: string, titulo?: string) {
    await this.campoDescricao.fill(descricao);
    // O match e disparado por debounce; esperar o bloco "Identificamos" evita
    // avancar de passo antes de a categoria ser gravada no rascunho.
    await expect(this.blocoIdentificado.or(this.page.getByText(/Não identificamos o serviço/i)))
      .toBeVisible({ timeout: 15_000 });
    if (titulo) await this.campoTitulo.fill(titulo);
  }

  // Passo 2 - Fotos

  get inputDeMidia(): Locator {
    return this.page.locator('.request-upload-box input[type="file"]');
  }

  get midiasSelecionadas(): Locator {
    return this.page.locator('.request-media-card, .request-upload-list li');
  }

  // Passo 3 - Preferencias

  chipDeUrgencia(nome: string | RegExp): Locator {
    return this.page.locator('.request-chip').filter({ hasText: nome });
  }

  async escolherUrgencia(nome: string | RegExp) {
    await this.chipDeUrgencia(nome).first().click();
  }

  get campoDataPreferida(): Locator {
    return this.page.locator('input[type="date"]');
  }

  campoPorRotulo(rotulo: string | RegExp): Locator {
    return this.page.locator('label.request-field').filter({ hasText: rotulo }).locator('input, textarea').first();
  }

  // Passo 4 - Local

  get campoCep(): Locator {
    return this.campoPorRotulo('CEP');
  }

  get campoNumero(): Locator {
    return this.campoPorRotulo('Número');
  }

  get campoBairro(): Locator {
    return this.campoPorRotulo('Bairro');
  }

  get campoCidade(): Locator {
    return this.campoPorRotulo('Cidade');
  }

  // Passo 5 - Confirmar

  get resumo(): Locator {
    return this.page.locator('request-confirm-step');
  }

  // --- Detalhe ---

  async abrirDetalhe(id: string) {
    await this.page.goto(`/app/solicitacoes/${id}`);
    await this.aguardarCarregamento();
  }

  get selo(): Locator {
    return this.page.locator('.status-badge');
  }

  get descricaoNoDetalhe(): Locator {
    return this.page.locator('.request-detail-card p').first();
  }

  itemDoResumo(rotulo: string): Locator {
    return this.page.locator('.request-summary-list article').filter({ hasText: rotulo }).locator('strong');
  }

  get midiaAnexada(): Locator {
    return this.page.locator('.request-media-grid .request-media-card');
  }

  get linkVoltarParaSolicitacoes(): Locator {
    return this.page.getByRole('link', { name: /Voltar para solicitações/i });
  }
}
