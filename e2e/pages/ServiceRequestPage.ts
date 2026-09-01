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
    // `exact`: sem isso o nome tambem casa com o chip "Próximos dias" do passo
    // de preferencias, e o clique falha por ambiguidade.
    return this.page.getByRole('button', { name: 'Próximo', exact: true });
  }

  get botaoAnterior(): Locator {
    return this.page.getByRole('button', { name: 'Anterior' });
  }

  get botaoPublicar(): Locator {
    return this.page.getByRole('button', { name: /Publicar solicitação|Publicando/i });
  }


  /**
   * Le o rascunho direto do componente, via ferramentas de debug do Angular.
   *
   * So serve para diagnostico: quando o wizard recusa avancar, saber o que o
   * store tinha no instante do clique separa "a aplicacao esta errada" de "o
   * teste clicou cedo demais". Devolve null em build de producao, onde
   * window.ng nao existe.
   */
  private async lerRascunho(): Promise<string> {
    return this.page
      .evaluate(() => {
        const ng = (window as unknown as { ng?: { getComponent?: (el: Element) => unknown } }).ng;
        const elemento = document.querySelector('service-request-new-page');
        if (!ng?.getComponent || !elemento) return '(indisponivel)';
        const componente = ng.getComponent(elemento) as { draft?: () => Record<string, unknown> } | null;
        const rascunho = componente?.draft?.();
        if (!rascunho) return '(sem rascunho)';
        return JSON.stringify({
          title: rascunho.title,
          categoryId: rascunho.categoryId,
          serviceIds: rascunho.serviceIds,
        });
      })
      .catch(() => '(falhou ao ler)');
  }

  /**
   * Avanca um passo e confirma que avancou.
   *
   * `validateStep` apenas mostra um toast e nao avanca quando algo falta, sem
   * lancar nada. Sem esta checagem o teste seguia clicando em campos do passo
   * seguinte e falhava com um timeout que nao explicava a causa. Aqui a
   * mensagem do toast entra no erro.
   */
  async avancar() {
    const antes = await this.numeroDoPasso();
    const rascunhoAntes = await this.lerRascunho();
    await this.botaoProximo.click();

    // O toast some sozinho; capturamos logo apos o clique, senao a mensagem
    // que explica a recusa ja desapareceu quando o assert falha.
    const aviso = await this.toast
      .first()
      .innerText({ timeout: 3_000 })
      .catch(() => '');

    try {
      await expect(this.indicadorDePasso).toHaveText(new RegExp(`Passo ${antes + 1} de 5`), { timeout: 10_000 });
    } catch {
      const descricao = await this.campoDescricao.inputValue().catch(() => '(ausente)');
      const titulo = await this.campoTitulo.inputValue().catch(() => '(ausente)');
      const identificado = await this.blocoIdentificado
        .innerText()
        .catch(() => '(bloco Identificamos ausente)');
      throw new Error(
        `O wizard nao saiu do passo ${antes}.\n` +
          (aviso ? `  Aviso na tela: ${aviso}\n` : '  Nenhum aviso capturado.\n') +
          `  Descricao: "${descricao}"\n` +
          `  Titulo: "${titulo}"\n` +
          `  Bloco Identificamos: ${JSON.stringify(identificado)}
` +
          `  Rascunho ANTES do clique: ${rascunhoAntes}
` +
          `  Rascunho DEPOIS: ${await this.lerRascunho()}`,
      );
    }
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

  /**
   * Servicos ja escolhidos, dentro do bloco "Identificamos".
   *
   * O `:not(.request-muted)` importa: quando nenhum servico foi escolhido o
   * bloco mostra um `<p class="request-muted">Nenhum serviço específico
   * selecionado</p>`. Mirar o paragrafo certo permite esperar de forma
   * POSITIVA (ele aparecer), em vez de negativa - `not.toHaveText` sobre um
   * elemento que ainda nao existe passa vazio e libera o teste cedo demais.
   */
  get servicosIdentificados(): Locator {
    return this.blocoIdentificado.locator('p:not(.request-muted)');
  }

  /**
   * Descreve o problema e espera a identificacao automatica assentar por
   * completo.
   *
   * Nao basta esperar o bloco "Identificamos" aparecer: ele surge assim que a
   * categoria e reconhecida, mas os serviços vem de uma segunda requisicao
   * (os serviços da categoria). Avancar nesse intervalo deixava
   * `draft.serviceIds` vazio e o wizard recusava com "Selecione a categoria e
   * pelo menos um serviço" - sem que nada estivesse errado na aplicacao.
   */
  async descreverProblema(descricao: string, titulo?: string) {
    await this.campoDescricao.fill(descricao);

    // Espera unica e POSITIVA: o paragrafo com os serviços dentro do bloco
    // "Identificamos". Ele so existe quando `draft.serviceIds` ja foi
    // preenchido, que e exatamente o que `validateStep(0)` exige.
    //
    // Duas armadilhas foram descobertas aqui, ambas do teste:
    //  - esperar pelo bloco "ou" pela mensagem "Não identificamos o serviço"
    //    liberava cedo: essa mensagem aparece ENQUANTO o matcher roda, some
    //    quando ele responde, e o clique acontecia com o rascunho vazio;
    //  - `not.toHaveText(...)` sobre um elemento que ainda nao existe passa
    //    vazio, entao tambem nao segurava nada.
    await expect(
      this.servicosIdentificados,
      'a identificacao automatica nao preencheu categoria e serviços a tempo',
    ).toBeVisible({ timeout: 25_000 });

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
