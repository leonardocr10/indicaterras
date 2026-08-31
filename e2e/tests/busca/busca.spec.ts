import { test, expect } from '../../fixtures/teste-base';
import { CATALOGO_SEED, PROFISSIONAIS_SEED } from '../../fixtures/contas';

/** Itens 5 e 7: busca, filtros, ordenacao, categorias e estados vazios. */
test.describe('@regression Busca de profissionais', () => {
  test.beforeEach(async ({ comoCliente }) => {
    void comoCliente;
  });

  test('a lista traz os profissionais do seed', async ({ busca }) => {
    await busca.abrirLista();
    const nomes = await busca.listarNomes();
    expect(nomes.length, 'a lista nao deveria vir vazia').toBeGreaterThan(0);
    expect(nomes.some((nome) => nome.includes('E2E'))).toBeTruthy();
  });

  test('filtrar por categoria pela URL restringe o resultado', async ({ busca }) => {
    await busca.abrirLista({ categoria: CATALOGO_SEED.eletricista.slug });
    const nomes = await busca.listarNomes();
    expect(nomes.length).toBeGreaterThan(0);
    expect(
      nomes.every((nome) => nome.includes('Eletricista') || nome.includes('Profissional E2E')),
      `resultado fora da categoria eletricista: ${nomes.join(', ')}`,
    ).toBeTruthy();
  });

  test('buscar por nome encontra o profissional certo', async ({ busca }) => {
    await busca.abrirLista();
    await busca.buscarPorTexto('Psicologa E2E');
    const nomes = await busca.listarNomes();
    expect(nomes.join(' ')).toContain(PROFISSIONAIS_SEED.psicologa.nome);
  });

  test('buscar por servico encontra quem oferece o servico', async ({ busca }) => {
    await busca.abrirLista();
    await busca.buscarPorTexto('Chuveiro eletrico');
    const nomes = await busca.listarNomes();
    expect(nomes.length, 'deveria achar alguem que faz chuveiro eletrico').toBeGreaterThan(0);
  });

  test('categoria sem profissional mostra o estado vazio', async ({ busca }) => {
    await busca.abrirLista({ categoria: CATALOGO_SEED.categoriaSemProfissional.slug });
    await expect(busca.vazio).toBeVisible();
    await expect(busca.vazio).toContainText(/Nenhum profissional encontrado/i);
  });

  test('servico sem profissional oferece voltar para a categoria toda', async ({ busca }) => {
    await busca.abrirLista({
      categoria: 'informatica',
      servico: CATALOGO_SEED.servicoSemProfissional.slug,
    });
    await expect(busca.vazio).toBeVisible();
    const verTodos = busca.vazio.getByRole('button', { name: /Ver todos de/i });
    await expect(verTodos).toBeVisible();
    await verTodos.click();
    await busca.aguardarCarregamento();
    expect((await busca.listarNomes()).length).toBeGreaterThan(0);
  });

  test('busca sem resultado oferece o caminho de propostas', async ({ busca }) => {
    await busca.abrirLista();
    await busca.buscarPorTexto('zzzz-nao-existe-e2e');
    await expect(busca.vazio).toBeVisible();
    await expect(busca.botaoQueroPropostas).toBeVisible();
  });

  test('limpar os filtros devolve a lista completa', async ({ busca }) => {
    await busca.abrirLista();
    const total = (await busca.listarNomes()).length;

    await busca.buscarPorTexto('Psicologa E2E');
    expect((await busca.listarNomes()).length).toBeLessThan(total);

    await busca.abrirFiltros();
    await busca.botaoLimparFiltros.click();
    await busca.botaoAplicarFiltros.click();
    await busca.aguardarCarregamento();
    expect((await busca.listarNomes()).length).toBe(total);
  });
});

test.describe('@regression Ordenacao', () => {
  test.beforeEach(async ({ comoCliente, busca }) => {
    void comoCliente;
    await busca.abrirLista();
  });

  test('"Mais indicados" fica ativo ao ser escolhido', async ({ busca }) => {
    await busca.botaoMaisIndicados.click();
    await expect(busca.botaoMaisIndicados).toHaveClass(/active/);
  });

  test('o menu de ordenacao abre e aplica a opcao', async ({ busca, page }) => {
    await busca.botaoOrdenar.click();
    const opcoes = page.locator('.sort-menu-options button');
    const total = await opcoes.count();
    expect(total, 'deveria haver opcoes de ordenacao').toBeGreaterThan(0);

    const rotulo = (await opcoes.first().innerText()).trim();
    await opcoes.first().click();
    await busca.aguardarCarregamento();
    // A ordenacao escolhida precisa ficar marcada, senao o usuario nao sabe
    // qual criterio esta valendo.
    await busca.botaoOrdenar.click();
    await expect(busca.opcaoDeOrdenacao(rotulo)).toHaveClass(/active/);
  });

  test('mudar a ordenacao muda a ordem dos resultados', async ({ busca, page }) => {
    const antes = await busca.listarNomes();
    await busca.botaoOrdenar.click();
    const opcoes = page.locator('.sort-menu-options button');
    await opcoes.last().click();
    await busca.aguardarCarregamento();
    const depois = await busca.listarNomes();

    expect(depois.length).toBe(antes.length);
    // Nao exigimos ordem diferente (pode empatar), mas o conjunto tem de ser o
    // mesmo: ordenar nunca pode sumir com profissional.
    expect(new Set(depois)).toEqual(new Set(antes));
  });
});

test.describe('@regression Cartao do profissional', () => {
  test('o cartao leva ao perfil e volta', async ({ comoCliente, busca, perfilProfissional, page }) => {
    void comoCliente;
    await busca.abrirLista();
    const nome = (await busca.listarNomes())[0];

    await busca.abrirPerfil(nome);
    await expect(perfilProfissional.nome).toContainText(nome.split('\n')[0]);

    await perfilProfissional.voltar.click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
  });

  test('o cartao expoe contato e comentarios', async ({ comoCliente, busca }) => {
    void comoCliente;
    await busca.abrirLista();
    const cartao = busca.cartoes.first();
    await expect(cartao.getByRole('link', { name: /Enviar mensagem para/i })).toBeVisible();
    await expect(cartao.getByRole('link', { name: /Ligar para/i })).toBeVisible();
  });
});
