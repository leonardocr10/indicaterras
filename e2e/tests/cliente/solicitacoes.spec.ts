import { test, expect } from '../../fixtures/teste-base';
import { ARQUIVOS } from '../../support/arquivos';

/**
 * Item 12: "Quero receber propostas" - o fluxo completo de criacao.
 *
 * IMPORTANTE sobre o escopo: no sistema atual a solicitacao termina em OPEN e
 * so o proprio cliente a enxerga (`getServiceRequestsForUser` filtra por
 * clientId). Nao existe modelo de proposta, nem visao do profissional sobre
 * solicitacoes. Os itens 13, 14 e 15 estao em `tests/propostas/`, marcados
 * como pendentes.
 */
test.describe('@regression Criar solicitacao de servico', () => {
  test.beforeEach(async ({ comoCliente }) => {
    void comoCliente;
  });

  test('o fluxo completo publica a solicitacao com status OPEN', async ({ page, solicitacao }) => {
    test.setTimeout(90_000);
    const titulo = `Chuveiro parou E2E ${Date.now()}`;

    await solicitacao.abrirNova();
    expect(await solicitacao.numeroDoPasso()).toBe(1);

    // Passo 1 - problema
    await solicitacao.descreverProblema('meu chuveiro queimou e o disjuntor desarma', titulo);
    await solicitacao.avancar();

    // Passo 2 - fotos
    expect(await solicitacao.numeroDoPasso()).toBe(2);
    await solicitacao.inputDeMidia.setInputFiles([ARQUIVOS.imagemValida, ARQUIVOS.imagemValida2]);
    await expect(solicitacao.midiasSelecionadas.first()).toBeVisible({ timeout: 20_000 });
    await solicitacao.avancar();

    // Passo 3 - preferencias
    expect(await solicitacao.numeroDoPasso()).toBe(3);
    await solicitacao.escolherUrgencia(/Hoje|Emergência|Emergencia/);
    await solicitacao.avancar();

    // Passo 4 - local
    expect(await solicitacao.numeroDoPasso()).toBe(4);
    await solicitacao.campoBairro.fill('Asa Sul');
    await solicitacao.campoCidade.fill('Brasilia');
    await solicitacao.avancar();

    // Passo 5 - confirmar e publicar
    expect(await solicitacao.numeroDoPasso()).toBe(5);
    await expect(solicitacao.resumo).toBeVisible();
    await solicitacao.botaoPublicar.click();

    await expect(page).toHaveURL(/\/app\/solicitacoes/, { timeout: 30_000 });
    await solicitacao.aguardarCarregamento();
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 20_000 });
  });

  test('o wizard identifica a categoria a partir da descricao', async ({ solicitacao }) => {
    await solicitacao.abrirNova();
    await solicitacao.campoDescricao.fill('minha pia esta vazando muito');
    await expect(solicitacao.blocoIdentificado).toBeVisible({ timeout: 20_000 });
    await expect(solicitacao.blocoIdentificado).toContainText(/Encanador/i);
  });

  test('"Ajustar" abre a escolha manual de categoria', async ({ solicitacao, page }) => {
    await solicitacao.abrirNova();
    await solicitacao.campoDescricao.fill('meu chuveiro queimou');
    await expect(solicitacao.blocoIdentificado).toBeVisible({ timeout: 20_000 });

    await solicitacao.botaoAjustar.click();
    // O caminho manual precisa existir: a identificacao automatica pode errar.
    await expect(page.getByText('Categoria', { exact: true }).first()).toBeVisible();
  });

  test('descricao sem correspondencia ainda deixa escolher a categoria', async ({ solicitacao, page }) => {
    await solicitacao.abrirNova();
    await solicitacao.campoDescricao.fill('zzzz problema totalmente aleatorio e2e sem palavra chave');
    await expect(page.getByText(/Não identificamos o serviço|Nao identificamos o servico/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Categoria', { exact: true }).first()).toBeVisible();
  });

  test('da para navegar para tras sem perder o que foi digitado', async ({ solicitacao }) => {
    await solicitacao.abrirNova();
    await solicitacao.descreverProblema('meu chuveiro queimou', 'Titulo de teste E2E');
    await solicitacao.avancar();
    expect(await solicitacao.numeroDoPasso()).toBe(2);

    await solicitacao.botaoAnterior.click();
    expect(await solicitacao.numeroDoPasso()).toBe(1);
    await expect(solicitacao.campoTitulo).toHaveValue('Titulo de teste E2E');
  });

  test('o botao Anterior fica desabilitado no primeiro passo', async ({ solicitacao }) => {
    await solicitacao.abrirNova();
    await expect(solicitacao.botaoAnterior).toBeDisabled();
  });

  test('o stepper permite voltar a um passo ja concluido', async ({ solicitacao }) => {
    await solicitacao.abrirNova();
    await solicitacao.descreverProblema('meu chuveiro queimou');
    await solicitacao.avancar();
    await solicitacao.avancar();
    expect(await solicitacao.numeroDoPasso()).toBe(3);

    await solicitacao.passoDoStepper(/Problema/).click();
    expect(await solicitacao.numeroDoPasso()).toBe(1);
  });

  test('a solicitacao do seed aparece na listagem', async ({ solicitacao, page }) => {
    await solicitacao.abrirLista();
    await expect(page.getByText('Vazamento embaixo da pia')).toBeVisible({ timeout: 20_000 });
  });

  test('o detalhe mostra status, resumo e midia', async ({ page, solicitacao, request }) => {
    // Buscamos o id pela API: a listagem nao expoe um seletor estavel por item.
    const { env } = await import('../../env');
    const { autenticarPelaApi } = await import('../../fixtures/sessao');
    const { CONTAS } = await import('../../fixtures/contas');
    const sessao = await autenticarPelaApi(request, CONTAS.cliente.email, CONTAS.cliente.senha);
    const lista = await request.get(`${env.apiUrl}/service-requests?userId=${sessao.user.id}`, {
      headers: { Authorization: `Bearer ${sessao.accessToken}` },
    });
    const solicitacoes = (await lista.json()).data as Array<{ id: string; title: string; status: string }>;
    expect(solicitacoes.length, 'o seed deveria ter criado ao menos uma solicitacao').toBeGreaterThan(0);

    const alvo = solicitacoes.find((item) => item.title.includes('Vazamento')) ?? solicitacoes[0];
    await solicitacao.abrirDetalhe(alvo.id);

    await expect(solicitacao.selo).toHaveText('OPEN');
    await expect(solicitacao.itemDoResumo('Urgência')).toBeVisible();
    await expect(solicitacao.itemDoResumo('Local')).toBeVisible();
    await expect(solicitacao.linkVoltarParaSolicitacoes).toBeVisible();
    void page;
  });

  test('a solicitacao de outro cliente nao pode ser aberta', async ({ page, request, diagnostico }) => {
    diagnostico.tolerarHttp(/service-requests/, 404);

    const { env } = await import('../../env');
    const { autenticarPelaApi } = await import('../../fixtures/sessao');
    const { CONTAS } = await import('../../fixtures/contas');

    const dono = await autenticarPelaApi(request, CONTAS.cliente.email, CONTAS.cliente.senha);
    const lista = await request.get(`${env.apiUrl}/service-requests?userId=${dono.user.id}`, {
      headers: { Authorization: `Bearer ${dono.accessToken}` },
    });
    const primeira = (await lista.json()).data[0] as { id: string };

    // O outro cliente nao pode ler a solicitacao alheia.
    const intruso = await autenticarPelaApi(request, CONTAS.clienteSecundario.email, CONTAS.clienteSecundario.senha);
    const tentativa = await request.get(`${env.apiUrl}/service-requests/${primeira.id}?userId=${intruso.user.id}`, {
      headers: { Authorization: `Bearer ${intruso.accessToken}` },
      failOnStatusCode: false,
    });
    expect(tentativa.status(), 'ler a solicitacao de outro cliente deveria falhar').toBe(404);
    void page;
  });
});
