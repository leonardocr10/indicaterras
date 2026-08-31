import { test, expect } from '../../fixtures/teste-base';
import { ligarIa, desligarIa } from '../../support/ia';
import {
  mockIaSucesso,
  mockIaPedindoEsclarecimento,
  mockIaBaixaConfianca,
  mockIaComFallbackDeKeywords,
  mockIaErroHttp,
  mockIaLimiteExcedido,
  mockIaJsonInvalido,
  mockIaTimeout,
} from '../../fixtures/ai-mock';
import { env } from '../../env';

/** Item 9: IA ativada. Sempre com a Gemini mockada. */
test.describe('@regression Assistente de IA ativado', () => {
  test.beforeEach(async ({ request }) => {
    await ligarIa(request);
  });

  test.afterEach(async ({ request }) => {
    await desligarIa(request);
  });

  test('a Home mostra o assistente quando a IA esta ligada', async ({ page, comoCliente, home }) => {
    void comoCliente;
    await mockIaSucesso(page);
    await home.abrir();
    await home.esperarCarregada();

    await expect(home.selosDaIa.first()).toBeVisible();
    await expect(home.botaoAnalisar).toBeVisible();
    await expect(home.heroClassico).toHaveCount(0);
  });

  test('analisar um problema mostra loading e depois o resultado', async ({ page, comoCliente, home }) => {
    void comoCliente;
    await mockIaSucesso(page);
    await home.abrir();
    await home.esperarCarregada();

    await home.analisar('meu chuveiro queimou e o disjuntor desarma');

    await expect(home.resultadoDaAnalise).toBeVisible({ timeout: 20_000 });
    await expect(home.resultadoDaAnalise.getByRole('heading', { name: 'Eletricista' })).toBeVisible();
    await expect(home.resultadoDaAnalise.getByText('Chuveiro eletrico')).toBeVisible();
    await expect(home.resultadoDaAnalise.getByText('Troca de disjuntor')).toBeVisible();
  });

  test('o indicador de progresso aparece durante a analise', async ({ page, comoCliente, home }) => {
    void comoCliente;
    // Atraso curto so para o estado de loading ser observavel.
    await page.route('**/api/ai/problem-analysis', async (rota) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            message: 'Encontramos o servico ideal para voce.',
            confidence: 0.95,
            category: { id: 'c', name: 'Eletricista', slug: 'eletricista' },
            services: [{ id: 's', name: 'Chuveiro eletrico', slug: 'chuveiro-eletrico' }],
          },
        }),
      });
    });

    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('meu chuveiro queimou');

    await expect(home.progressoDaAnalise).toBeVisible();
    await expect(home.resultadoDaAnalise).toBeVisible({ timeout: 20_000 });
    await expect(home.progressoDaAnalise).toBeHidden();
  });

  test('"Ver profissionais" leva para a busca filtrada', async ({ page, comoCliente, home, busca }) => {
    void comoCliente;
    await mockIaSucesso(page);
    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('meu chuveiro queimou');
    await expect(home.resultadoDaAnalise).toBeVisible({ timeout: 20_000 });

    await home.botaoVerProfissionaisDoResultado.click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
    await busca.aguardarCarregamento();
  });

  test('"Quero receber propostas" abre o wizard ja preenchido', async ({ page, comoCliente, home, solicitacao }) => {
    void comoCliente;
    await mockIaSucesso(page);
    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('meu chuveiro queimou e o disjuntor desarma');
    await expect(home.resultadoDaAnalise).toBeVisible({ timeout: 20_000 });

    await home.botaoQueroPropostasDoResultado.click();
    await expect(page).toHaveURL(/\/app\/solicitacoes\/nova/, { timeout: 15_000 });
    await expect(solicitacao.campoDescricao).toHaveValue(/chuveiro/i);
  });

  test('"Ajustar" limpa o resultado e devolve o controle', async ({ page, comoCliente, home }) => {
    void comoCliente;
    await mockIaSucesso(page);
    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('meu chuveiro queimou');
    await expect(home.resultadoDaAnalise).toBeVisible({ timeout: 20_000 });

    await home.botaoAjustar.click();
    await expect(home.resultadoDaAnalise).toBeHidden();
    await expect(home.campoBusca).toBeVisible();
  });

  test('os exemplos rapidos preenchem o campo', async ({ page, comoCliente, home }) => {
    void comoCliente;
    await mockIaSucesso(page);
    await home.abrir();
    await home.esperarCarregada();

    const exemplo = page.locator('.home-ai-examples button').first();
    const texto = (await exemplo.innerText()).trim();
    await exemplo.click();
    await expect(home.campoBusca).toHaveValue(texto);
  });

  test('quando a IA pede esclarecimento, a pergunta aparece', async ({ page, comoCliente, home }) => {
    void comoCliente;
    await mockIaPedindoEsclarecimento(page);
    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('ta com problema');

    await expect(home.esclarecimentoDaIa).toBeVisible({ timeout: 20_000 });
    await expect(home.esclarecimentoDaIa).toContainText(/chuveiro ou a casa toda/i);
  });
});

/** Item 10: IA desativada. */
test.describe('@regression Assistente de IA desativado', () => {
  test.beforeEach(async ({ request }) => {
    await desligarIa(request);
  });

  test('a Home nao mostra o assistente', async ({ comoCliente, home }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();

    await expect(home.selosDaIa).toHaveCount(0);
    await expect(home.botaoAnalisar).toHaveCount(0);
    await expect(home.heroClassico).toBeVisible();
  });

  test('a busca classica continua funcionando', async ({ page, comoCliente, home, busca }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();

    await home.buscarNoModoClassico('meu chuveiro queimou');
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
    await busca.aguardarCarregamento();
    expect((await busca.listarNomes()).length).toBeGreaterThan(0);
  });

  test('o matcher por palavras-chave segue ativo', async ({ comoCliente, home }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();

    await home.descreverProblema('minha pia esta vazando');
    await expect(home.sugestaoPorPalavraChave).toBeVisible({ timeout: 20_000 });
    await expect(home.sugestaoPorPalavraChave).toContainText(/Encanador/i);
  });

  test('o fluxo manual por categoria funciona sem IA', async ({ page, comoCliente, home, busca }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();

    await home.linkVerProfissionais.click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
    await busca.aguardarCarregamento();
    expect((await busca.listarNomes()).length).toBeGreaterThan(0);
  });

  test('o CTA da IA some da busca por proximidade', async ({ comoCliente, busca }) => {
    void comoCliente;
    await busca.abrirProximos();
    await expect(busca.ctaDaIa).toHaveCount(0);
  });
});

/**
 * Item 11: fallback. O criterio nao e "mostrar a mensagem certa" - e nao
 * quebrar a experiencia. Em todos os casos a pessoa precisa continuar com um
 * caminho para frente.
 */
test.describe('@regression Falhas da IA nao quebram a experiencia', () => {
  test.beforeEach(async ({ request }) => {
    await ligarIa(request);
  });

  test.afterEach(async ({ request }) => {
    await desligarIa(request);
  });

  const cenarios: Array<{ nome: string; preparar: (page: import('@playwright/test').Page) => Promise<void>; toleraHttp?: number }> = [
    { nome: 'erro HTTP 500 do provedor', preparar: (page) => mockIaErroHttp(page, 500), toleraHttp: 500 },
    { nome: 'erro HTTP 502 do provedor', preparar: (page) => mockIaErroHttp(page, 502), toleraHttp: 502 },
    { nome: 'limite de uso excedido (429)', preparar: mockIaLimiteExcedido },
    { nome: 'JSON invalido na resposta', preparar: mockIaJsonInvalido },
    { nome: 'confianca abaixo do minimo', preparar: mockIaBaixaConfianca },
    { nome: 'fallback por palavras-chave', preparar: mockIaComFallbackDeKeywords },
  ];

  for (const cenario of cenarios) {
    test(`${cenario.nome}: a tela continua utilizavel`, async ({ page, comoCliente, home, diagnostico }) => {
      void comoCliente;
      diagnostico.tolerarHttp(/ai\/problem-analysis/, cenario.toleraHttp);
      diagnostico.tolerarHttp(/ai\/problem-analysis/, 429);
      diagnostico.tolerarConsole(/problem-analysis|JSON|Unexpected|Http failure/i);

      await cenario.preparar(page);
      await home.abrir();
      await home.esperarCarregada();
      await home.analisar('meu chuveiro queimou');

      // O criterio: a Home nao pode ficar presa em "Analisando...".
      await expect(home.indicadorAnalisando).toHaveCount(0, { timeout: 30_000 });
      // E o caminho manual continua disponivel.
      await expect(home.cartaoVerProfissionais).toBeVisible();
      await expect(home.gradeDeCategorias).toBeVisible();
    });
  }

  test('timeout: a tela se recupera e nao trava em "Analisando..."', async ({ page, comoCliente, home, diagnostico }) => {
    void comoCliente;
    test.setTimeout(90_000);
    diagnostico.tolerarHttp(/ai\/problem-analysis/);
    diagnostico.tolerarConsole(/timeout|problem-analysis|Http failure/i);

    await mockIaTimeout(page, 20_000);
    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('meu chuveiro queimou');

    await expect(home.indicadorAnalisando).toHaveCount(0, { timeout: 60_000 });
    await expect(home.cartaoVerProfissionais).toBeVisible();
  });
});

/**
 * Item 9, parte final: um teste opcional contra a Gemini de verdade.
 * So roda com E2E_GEMINI_API_KEY preenchido.
 */
test.describe('@ai-real Integracao real com a IA', () => {
  test.skip(!env.geminiApiKey, 'Defina E2E_GEMINI_API_KEY para exercitar a Gemini de verdade.');

  test('a IA real classifica um problema comum', async ({ page, request, comoCliente, home, diagnostico }) => {
    void comoCliente;
    test.setTimeout(120_000);
    diagnostico.tolerarConsole(/.*/);

    await ligarIa(request, { apiKey: env.geminiApiKey, model: 'gemini-2.5-flash-lite' });
    await page.unroute('**/api/ai/problem-analysis');

    await home.abrir();
    await home.esperarCarregada();
    await home.analisar('meu chuveiro queimou e o disjuntor desarma toda vez que ligo');

    await expect(home.resultadoDaAnalise.or(home.esclarecimentoDaIa)).toBeVisible({ timeout: 60_000 });
    await desligarIa(request);
  });
});
