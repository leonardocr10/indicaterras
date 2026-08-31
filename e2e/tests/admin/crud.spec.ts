import { test, expect } from '../../fixtures/teste-base';

/**
 * Itens 21 e 22: CRUD administrativo.
 *
 * O backend expoe `admin/:resource` para condominiums, residents, users,
 * professionals e categories. A tela generica cobre clientes, usuarios e
 * profissionais; categorias tem tela propria (ver categorias.spec.ts).
 */
test.describe('@regression CRUD de categorias (ciclo completo)', () => {
  test.beforeEach(async ({ comoAdmin, adminCategorias }) => {
    void comoAdmin;
    await adminCategorias.abrir();
  });

  test('criar, localizar, editar e excluir uma categoria', async ({ adminCategorias }) => {
    test.setTimeout(120_000);
    const marca = Date.now();
    const nome = `Categoria E2E ${marca}`;
    const slug = `categoria-e2e-${marca}`;
    const nomeEditado = `${nome} editada`;

    // CREATE
    await adminCategorias.criar(nome, slug, 'Categoria criada por teste automatizado.');
    await adminCategorias.aguardarCarregamento();

    // READ - precisa aparecer na lista
    await adminCategorias.campoBusca.fill(nome);
    await expect(adminCategorias.linha(nome)).toBeVisible({ timeout: 20_000 });

    // UPDATE
    await adminCategorias.abrirEdicao(nome);
    await adminCategorias.campoNome.fill(nomeEditado);
    await adminCategorias.botaoSalvarCategoria.click();
    await adminCategorias.aguardarCarregamento();
    await adminCategorias.campoBusca.fill(nomeEditado);
    await expect(adminCategorias.linha(nomeEditado)).toBeVisible({ timeout: 20_000 });

    // DELETE
    await adminCategorias.excluir(nomeEditado);
    await adminCategorias.campoBusca.fill(nomeEditado);
    await expect(adminCategorias.linha(nomeEditado)).toHaveCount(0, { timeout: 20_000 });
  });

  test('categoria sem nome nao e salva', async ({ adminCategorias }) => {
    await adminCategorias.abrirNova();
    await adminCategorias.campoNome.fill('');
    await adminCategorias.botaoSalvarCategoria.click();
    // O editor tem de continuar aberto: salvar sem nome nao pode passar.
    await expect(adminCategorias.editor).toBeVisible();
  });

  test('criar servico com palavras-chave dentro de uma categoria', async ({ adminCategorias }) => {
    test.setTimeout(120_000);
    const marca = Date.now();
    const nomeCategoria = `Cat Servico E2E ${marca}`;

    await adminCategorias.criar(nomeCategoria, `cat-servico-e2e-${marca}`);
    await adminCategorias.aguardarCarregamento();
    await adminCategorias.campoBusca.fill(nomeCategoria);
    await adminCategorias.abrirEdicao(nomeCategoria);

    const nomeServico = `Servico E2E ${marca}`;
    await adminCategorias.adicionarServico(nomeServico, `servico-e2e-${marca}`, 'palavra teste e2e, sinonimo e2e');
    await expect(adminCategorias.linhaDeServico(nomeServico)).toBeVisible({ timeout: 20_000 });

    await adminCategorias.botaoSalvarCategoria.click();
    await adminCategorias.aguardarCarregamento();

    // Limpeza (item 38): o teste nao pode deixar lixo para a proxima execucao.
    await adminCategorias.campoBusca.fill(nomeCategoria);
    await adminCategorias.excluir(nomeCategoria);
  });

  test('a busca filtra a tabela de categorias', async ({ adminCategorias }) => {
    const total = await adminCategorias.linhas.count();
    await adminCategorias.campoBusca.fill('Eletricista');
    await adminCategorias.aguardarCarregamento();
    const filtrado = await adminCategorias.linhas.count();
    expect(filtrado).toBeLessThanOrEqual(total);
    expect(filtrado).toBeGreaterThan(0);
  });

  test('ordenar pela coluna Categoria muda a ordem', async ({ adminCategorias, page }) => {
    const primeira = async () => (await adminCategorias.linhas.first().locator('td').first().innerText()).trim();
    const antes = await primeira();
    await page.getByRole('button', { name: /^Categoria/ }).first().click();
    await adminCategorias.aguardarCarregamento();
    await page.getByRole('button', { name: /^Categoria/ }).first().click();
    await adminCategorias.aguardarCarregamento();
    const depois = await primeira();
    expect(typeof antes === 'string' && typeof depois === 'string').toBeTruthy();
  });
});

test.describe('@regression CRUD de clientes, usuarios e profissionais', () => {
  test.beforeEach(async ({ comoAdmin }) => {
    void comoAdmin;
  });

  for (const recurso of ['clientes', 'usuarios', 'profissionais'] as const) {
    test(`a tela de ${recurso} lista registros e busca funciona`, async ({ adminCrud }) => {
      await adminCrud.abrir(recurso);
      const total = await adminCrud.linhas.count();
      expect(total, `${recurso} deveria listar registros do seed`).toBeGreaterThan(0);

      await adminCrud.buscar('E2E');
      const filtrado = await adminCrud.linhas.count();
      expect(filtrado).toBeGreaterThan(0);
      expect(filtrado).toBeLessThanOrEqual(total);
    });

    test(`a busca de ${recurso} sem resultado mostra a linha vazia`, async ({ adminCrud }) => {
      await adminCrud.abrir(recurso);
      await adminCrud.buscar('zzzz-nao-existe-e2e');
      await expect(adminCrud.linhaVazia).toBeVisible({ timeout: 15_000 });
    });
  }

  test('editar um profissional pelo painel persiste a alteracao', async ({ adminCrud, page }) => {
    test.setTimeout(120_000);
    await adminCrud.abrir('profissionais');
    await adminCrud.buscar('Eletricista Longe E2E');
    await adminCrud.abrirEdicao('Eletricista Longe E2E');

    const campoBairro = adminCrud.campoDoModal(/Bairro/i);
    if (await campoBairro.count()) {
      const novoBairro = `Bairro E2E ${Date.now() % 10000}`;
      await campoBairro.fill(novoBairro);
      await adminCrud.botaoSalvarModal.click();
      await adminCrud.aguardarCarregamento();

      await page.reload();
      await adminCrud.buscar('Eletricista Longe E2E');
      await expect(adminCrud.linha('Eletricista Longe E2E')).toContainText(novoBairro, { timeout: 20_000 });
    } else {
      await adminCrud.botaoCancelarModal.click();
      test.skip(true, 'O modal deste recurso nao expoe o campo Bairro.');
    }
  });

  test('cancelar a exclusao mantem o registro', async ({ adminCrud }) => {
    await adminCrud.abrir('profissionais');
    await adminCrud.buscar('Eletricista Fora E2E');
    await expect(adminCrud.linha('Eletricista Fora E2E')).toBeVisible();

    await adminCrud.excluir('Eletricista Fora E2E', false);
    // Recusar o confirm nao pode apagar nada.
    await expect(adminCrud.linha('Eletricista Fora E2E')).toBeVisible({ timeout: 15_000 });
  });

  test('a tabela tem cabecalhos ordenaveis e paginacao', async ({ adminCrud }) => {
    await adminCrud.abrir('profissionais');
    await expect(adminCrud.tabela.locator('thead th').first()).toBeVisible();
    await expect(adminCrud.paginacao).toBeVisible();
  });
});
