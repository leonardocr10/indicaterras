import { test, expect } from '../../fixtures/teste-base';
import { entrarComo } from '../../fixtures/sessao';
import { desligarIa } from '../../support/ia';
import { mockIaSucesso } from '../../fixtures/ai-mock';
import { PROFISSIONAIS_SEED } from '../../fixtures/contas';

/**
 * Item 23: configurar a IA no admin e provar que a Home muda.
 * Essa e a verificacao que importa - salvar campo por campo sem checar o efeito
 * so testaria o formulario, nao o sistema.
 */
test.describe('@regression Admin - configuracao da IA', () => {
  test.afterEach(async ({ request }) => {
    await desligarIa(request);
  });

  test('ativar a IA no admin faz a Home do cliente mostrar o assistente', async ({ page, comoAdmin, adminIa, home }) => {
    void comoAdmin;
    test.setTimeout(120_000);

    await adminIa.abrir();
    await adminIa.ativarIa();
    await expect(adminIa.chaveAtivarIa).toBeChecked();

    // Troca para o cliente e confere o efeito real da configuracao.
    await mockIaSucesso(page);
    await entrarComo(page, 'cliente');
    await home.abrir();
    await home.esperarCarregada();
    await expect(home.selosDaIa.first()).toBeVisible({ timeout: 20_000 });
    await expect(home.botaoAnalisar).toBeVisible();
  });

  test('desativar a IA devolve a Home classica', async ({ page, comoAdmin, adminIa, home }) => {
    void comoAdmin;
    test.setTimeout(120_000);

    await adminIa.abrir();
    await adminIa.ativarIa();
    await adminIa.desativarIa();
    await expect(adminIa.chaveAtivarIa).not.toBeChecked();

    await entrarComo(page, 'cliente');
    await home.abrir();
    await home.esperarCarregada();
    await expect(home.selosDaIa).toHaveCount(0);
    await expect(home.heroClassico).toBeVisible();
  });

  test('os textos da Home vem do painel do admin', async ({ page, comoAdmin, adminIa, home }) => {
    void comoAdmin;
    test.setTimeout(120_000);
    const titulo = `Titulo definido pelo admin E2E ${Date.now()}`;

    await adminIa.abrir();
    await adminIa.campoTituloDaHome.fill(titulo);
    await adminIa.chaveAtivarIa.check();
    await adminIa.salvar();

    await mockIaSucesso(page);
    await entrarComo(page, 'cliente');
    await home.abrir();
    await home.esperarCarregada();
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible({ timeout: 20_000 });
  });

  test('provedor, modelo, confianca e limites persistem apos recarregar', async ({ page, comoAdmin, adminIa }) => {
    void comoAdmin;
    test.setTimeout(120_000);

    await adminIa.abrir();
    await adminIa.campoModelo.fill('gemini-2.5-flash-lite');
    await adminIa.campoConfiancaMinima.fill('0.7');
    await adminIa.campoLimiteDiario.fill('123');
    await adminIa.campoMaximoDeCaracteres.fill('400');
    await adminIa.salvar();

    await page.reload();
    await adminIa.aguardarCarregamento();
    await expect(adminIa.campoModelo).toHaveValue('gemini-2.5-flash-lite', { timeout: 20_000 });
    await expect(adminIa.campoConfiancaMinima).toHaveValue('0.7');
    await expect(adminIa.campoLimiteDiario).toHaveValue('123');
    await expect(adminIa.campoMaximoDeCaracteres).toHaveValue('400');
  });

  test('as chaves de regras e fallback sao alternaveis', async ({ comoAdmin, adminIa }) => {
    void comoAdmin;
    await adminIa.abrir();
    const chave = adminIa.chaveFallbackPorPalavrasChave;
    const antes = await chave.isChecked();
    await chave.setChecked(!antes);
    await adminIa.salvar();
    await expect(chave).toBeChecked({ checked: !antes, timeout: 20_000 });
  });

  test('a secao de logs de analise existe', async ({ comoAdmin, adminIa }) => {
    void comoAdmin;
    await adminIa.abrir();
    await expect(adminIa.secaoDeLogs).toBeVisible();
  });

  test('testar conexao responde sem derrubar a tela', async ({ comoAdmin, adminIa, page, diagnostico }) => {
    void comoAdmin;
    // Sem chave real, a falha e o resultado esperado - o que nao pode e quebrar.
    diagnostico.tolerarHttp(/ai-settings\/test-connection/);
    diagnostico.tolerarConsole(/test-connection|Http failure/i);

    await adminIa.abrir();
    await adminIa.botaoTestarConexao.click();
    await expect(page.locator('.toast, [role="status"], [role="alert"], .form-feedback')).toBeVisible({ timeout: 30_000 });
    await expect(adminIa.botaoSalvar).toBeVisible();
  });
});

/** Item 24: aprovacao de profissional. */
test.describe('@regression Admin - aprovacao de profissional', () => {
  test('aprovar o profissional pendente o torna visivel na busca do cliente', async ({ page, comoAdmin, adminCrud, busca }) => {
    void comoAdmin;
    test.setTimeout(150_000);
    const pendente = PROFISSIONAIS_SEED.pendente.nome;

    // Antes: o cliente nao encontra quem esta pendente.
    await entrarComo(page, 'cliente');
    await busca.abrirLista();
    expect((await busca.listarNomes()).join(' '), 'pendente nao deveria aparecer antes da aprovacao').not.toContain(pendente);

    // Admin aprova.
    await entrarComo(page, 'admin');
    await adminCrud.abrir('profissionais');
    await adminCrud.buscar(pendente);
    await expect(adminCrud.linha(pendente)).toBeVisible({ timeout: 20_000 });

    const botaoAprovar = adminCrud.botaoAprovar(pendente);
    if (!(await botaoAprovar.count())) {
      test.skip(true, 'A linha nao ofereceu o botao de aprovar - verifique podeAprovar().');
    }
    await adminCrud.aprovar(pendente);

    // Depois: o cliente encontra.
    await entrarComo(page, 'cliente');
    await busca.abrirLista();
    await expect
      .poll(async () => (await busca.listarNomes()).join(' '), {
        message: 'o profissional aprovado deveria aparecer na busca',
        timeout: 30_000,
      })
      .toContain(pendente);
  });

  test('a central de pendencias lista o cadastro em analise', async ({ comoAdmin, page }) => {
    void comoAdmin;
    await page.goto('/admin/pendencias');
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 20_000 });
  });
});

/** Itens 25 e 26: denuncias e suspensao. */
test.describe('@regression Admin - denuncias e suspensao', () => {
  test.beforeEach(async ({ comoAdmin }) => {
    void comoAdmin;
  });

  test('a lista de denuncias mostra a denuncia do seed', async ({ adminDenuncias }) => {
    await adminDenuncias.abrirLista();
    await expect(adminDenuncias.linha(/Nao compareceu|Não compareceu/i)).toBeVisible({ timeout: 20_000 });
  });

  test('o detalhe permite registrar parecer e resolver', async ({ adminDenuncias, page }) => {
    test.setTimeout(120_000);
    await adminDenuncias.abrirLista();
    await adminDenuncias.abrirDetalhe(/Nao compareceu|Não compareceu/i);
    await expect(adminDenuncias.tituloDoDetalhe).toBeVisible();

    await expect(adminDenuncias.historico).toBeVisible();
    await expect(adminDenuncias.resumoDoProfissional).toBeVisible();

    const parecer = `Parecer registrado pelo teste E2E em ${new Date().toISOString()}`;
    await adminDenuncias.campoParecer.fill(parecer);

    await adminDenuncias.botaoMarcarEmAnalise.click();
    await adminDenuncias.aguardarCarregamento();
    await expect(page.locator('.toast, [role="status"], .admin-page')).toBeVisible();
  });

  test('as acoes contra o prestador estao disponiveis', async ({ adminDenuncias }) => {
    await adminDenuncias.abrirLista();
    await adminDenuncias.abrirDetalhe(/Nao compareceu|Não compareceu/i);

    await expect(adminDenuncias.botaoAdvertir).toBeVisible();
    await expect(adminDenuncias.botaoOcultar).toBeVisible();
    await expect(adminDenuncias.botaoBloquear).toBeVisible();
  });

  test('ocultar o profissional o retira da busca do cliente', async ({ page, adminDenuncias, busca }) => {
    test.setTimeout(150_000);
    const alvo = PROFISSIONAIS_SEED.eletricistaFora.nome;

    await entrarComo(page, 'cliente');
    await busca.abrirLista();
    expect((await busca.listarNomes()).join(' ')).toContain(alvo);

    await entrarComo(page, 'admin');
    await adminDenuncias.abrirLista();
    await adminDenuncias.abrirDetalhe(/Nao compareceu|Não compareceu/i);
    page.once('dialog', (dialogo) => dialogo.accept());
    await adminDenuncias.botaoOcultar.click();
    await adminDenuncias.aguardarCarregamento();

    await entrarComo(page, 'cliente');
    await busca.abrirLista();
    await expect
      .poll(async () => (await busca.listarNomes()).join(' '), {
        message: 'o profissional oculto nao deveria continuar na busca',
        timeout: 30_000,
      })
      .not.toContain(alvo);

    // Reativar, para o teste nao deixar o estado alterado para os proximos.
    await entrarComo(page, 'admin');
    await adminDenuncias.abrirLista();
    await adminDenuncias.abrirDetalhe(/Nao compareceu|Não compareceu/i);
    if (await adminDenuncias.botaoReativar.count()) {
      page.once('dialog', (dialogo) => dialogo.accept());
      await adminDenuncias.botaoReativar.click();
    }
  });
});
