import { test, expect } from '../../fixtures/teste-base';
import { ARQUIVOS } from '../../support/arquivos';

/** Itens 18, 19 e 20: perfil, uploads e painel do profissional. */
test.describe('@regression Painel do profissional', () => {
  test.beforeEach(async ({ comoProfissional, painelProfissional }) => {
    void comoProfissional;
    await painelProfissional.abrir();
    await painelProfissional.esperarCarregado();
  });

  test('o painel abre com o nome e a visao geral', async ({ painelProfissional }) => {
    await expect(painelProfissional.nomeNoTopo).toContainText('Profissional E2E');
    await expect(painelProfissional.visaoGeral).toBeVisible();
  });

  test('as secoes principais do painel estao presentes', async ({ painelProfissional, page }) => {
    // Item 20: nota, avaliacoes, indicacoes, favoritos, visualizacoes,
    // solicitacoes, completude, disponibilidade, trabalhos, avaliacoes recentes.
    await expect(painelProfissional.secaoTrabalhos).toBeVisible();
    await expect(painelProfissional.secaoAvaliacoesRecentes.or(painelProfissional.secaoFavoritaram)).toBeVisible();
    // O seed cria uma avaliacao 5 estrelas para este profissional.
    await expect(page.locator('.provider-page, .mobile-page').first()).toContainText(/5|avaliaç/i);
  });

  test('o painel responde a API do dashboard sem erro', async ({ page }) => {
    const chamadas: number[] = [];
    page.on('response', (resposta) => {
      if (resposta.url().includes('/me/professional/dashboard')) chamadas.push(resposta.status());
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(chamadas.every((status) => status < 400), `dashboard respondeu ${chamadas.join(', ')}`).toBeTruthy();
  });
});

test.describe('@regression Edicao do perfil profissional', () => {
  test.beforeEach(async ({ comoProfissional, painelProfissional }) => {
    void comoProfissional;
    await painelProfissional.abrir();
    await painelProfissional.esperarCarregado();
  });

  test('editar os dados salva e persiste apos recarregar', async ({ page, painelProfissional }) => {
    test.setTimeout(90_000);
    const marca = Date.now();
    const empresa = `Servicos E2E ${marca}`;
    const bio = `Bio atualizada pelo teste automatizado em ${marca}. Atendo com pontualidade e garantia.`;
    const instagram = `@e2e${marca}`;

    await painelProfissional.botaoEditarPerfil.click();
    await painelProfissional.campoEmpresa.fill(empresa);
    await painelProfissional.campoBio.fill(bio);
    await painelProfissional.campoInstagram.fill(instagram);
    await painelProfissional.salvarPerfil();

    // Persistencia de verdade: recarregar e conferir que veio do servidor.
    await page.reload();
    await painelProfissional.esperarCarregado();
    await expect(painelProfissional.campoEmpresa).toHaveValue(empresa, { timeout: 20_000 });
    await expect(painelProfissional.campoBio).toHaveValue(bio);
    await expect(painelProfissional.campoInstagram).toHaveValue(instagram);
  });

  test('o nome e obrigatorio', async ({ painelProfissional }) => {
    await painelProfissional.botaoEditarPerfil.click();
    await painelProfissional.campoNome.fill('');
    await painelProfissional.salvarPerfil();
    // Campo obrigatorio vazio nao pode ser aceito em silencio.
    await expect(painelProfissional.campoNome).toHaveClass(/ng-invalid/, { timeout: 15_000 });
  });

  test('da para adicionar outro bloco de horario', async ({ painelProfissional, page }) => {
    await painelProfissional.botaoEditarPerfil.click();
    const antes = await page.locator('.provider-hours-row, .working-hours-row').count();
    await painelProfissional.botaoAdicionarHorario.click();
    await expect
      .poll(() => page.locator('.provider-hours-row, .working-hours-row').count())
      .toBeGreaterThan(antes);
  });

  test('texto muito longo na bio e limitado pelo maxlength', async ({ painelProfissional }) => {
    await painelProfissional.botaoEditarPerfil.click();
    await painelProfissional.campoBio.fill('x'.repeat(900));
    const valor = await painelProfissional.campoBio.inputValue();
    // O campo declara maxlength=600; passar disso seria estourar no backend.
    expect(valor.length).toBeLessThanOrEqual(600);
  });

  test('caracteres especiais no nome sao aceitos e persistem', async ({ page, painelProfissional }) => {
    const nome = 'Profissional E2E àçãõ "aspas" & <tag>';
    await painelProfissional.botaoEditarPerfil.click();
    await painelProfissional.campoNome.fill(nome);
    await painelProfissional.salvarPerfil();

    await page.reload();
    await painelProfissional.esperarCarregado();
    await expect(painelProfissional.campoNome).toHaveValue(nome, { timeout: 20_000 });

    // E precisa aparecer como texto, nunca interpretado como HTML.
    await expect(painelProfissional.nomeNoTopo).toContainText('<tag>');

    await painelProfissional.botaoEditarPerfil.click();
    await painelProfissional.campoNome.fill('Profissional E2E');
    await painelProfissional.salvarPerfil();
  });

  test('clique duplo em salvar nao duplica o envio', async ({ page, painelProfissional }) => {
    await painelProfissional.botaoEditarPerfil.click();
    await painelProfissional.campoEmpresa.fill(`Duplo clique E2E ${Date.now()}`);

    const envios: string[] = [];
    page.on('request', (requisicao) => {
      if (requisicao.method() === 'PATCH' && requisicao.url().includes('/me/professional')) {
        envios.push(requisicao.url());
      }
    });

    await painelProfissional.botaoSalvar.dblclick();
    await page.waitForTimeout(3000);
    expect(envios.length, `o formulario enviou ${envios.length} vezes com um duplo clique`).toBeLessThanOrEqual(1);
  });
});

/** Item 19: uploads. */
test.describe('@regression Upload de arquivos', () => {
  test.beforeEach(async ({ comoProfissional, painelProfissional }) => {
    void comoProfissional;
    await painelProfissional.abrir();
    await painelProfissional.esperarCarregado();
  });

  test('foto de perfil valida e aceita', async ({ painelProfissional, page }) => {
    test.setTimeout(90_000);
    await painelProfissional.inputFoto.setInputFiles(ARQUIVOS.imagemValida);
    // Sucesso: um toast ou a imagem trocando. Nao pode dar erro silencioso.
    await expect(page.locator('.toast, [role="status"], .provider-avatar img')).toBeVisible({ timeout: 30_000 });
  });

  test('arquivo grande demais e recusado com aviso', async ({ painelProfissional, page, diagnostico }) => {
    test.setTimeout(120_000);
    // O 400/413 e a resposta correta do backend para arquivo acima do limite.
    diagnostico.tolerarHttp(/uploads|professional/, 400);
    diagnostico.tolerarHttp(/uploads|professional/, 413);
    diagnostico.tolerarConsole(/upload|413|400|Http failure/i);

    await painelProfissional.inputFoto.setInputFiles(ARQUIVOS.imagemGrande);
    // O importante: a pessoa e avisada, a pagina nao quebra.
    await expect(page.locator('.toast, [role="status"], [role="alert"], .form-feedback')).toBeVisible({ timeout: 60_000 });
    await expect(painelProfissional.nomeNoTopo).toBeVisible();
  });

  test('o input de foto so aceita formatos de imagem', async ({ painelProfissional }) => {
    // Barreira do lado do cliente: o `accept` impede o seletor de oferecer .txt.
    const aceita = await painelProfissional.inputFoto.getAttribute('accept');
    expect(aceita).toContain('image/');
    expect(aceita).not.toContain('text/plain');
  });
});
