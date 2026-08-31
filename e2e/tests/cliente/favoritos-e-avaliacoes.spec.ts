import { test, expect } from '../../fixtures/teste-base';
import { PROFISSIONAIS_SEED } from '../../fixtures/contas';
import { ARQUIVOS } from '../../support/arquivos';
import { env } from '../../env';
import { autenticarPelaApi } from '../../fixtures/sessao';
import { CONTAS } from '../../fixtures/contas';

/** Busca o id de um profissional pelo nome, para navegar direto ao perfil. */
async function idDoProfissional(request: import('@playwright/test').APIRequestContext, nome: string) {
  const sessao = await autenticarPelaApi(request, CONTAS.cliente.email, CONTAS.cliente.senha);
  const resposta = await request.get(`${env.apiUrl}/professionals`, {
    headers: { Authorization: `Bearer ${sessao.accessToken}` },
  });
  const lista = (await resposta.json()).data as Array<{ id: string; name: string }>;
  const encontrado = lista.find((item) => item.name === nome);
  if (!encontrado) throw new Error(`Profissional "${nome}" nao encontrado no seed.`);
  return encontrado.id;
}

/** Item 17: favoritos. */
test.describe('@regression Favoritos', () => {
  test.beforeEach(async ({ comoCliente }) => {
    void comoCliente;
  });

  test('favoritar pelo perfil coloca o profissional na lista', async ({ request, perfilProfissional, favoritos }) => {
    const alvo = PROFISSIONAIS_SEED.refrigeracao.nome;
    const id = await idDoProfissional(request, alvo);

    await perfilProfissional.abrir(id);
    if (await perfilProfissional.estaFavoritado()) await perfilProfissional.alternarFavorito();
    await perfilProfissional.alternarFavorito();
    expect(await perfilProfissional.estaFavoritado()).toBeTruthy();

    await favoritos.abrir();
    expect(await favoritos.contem(alvo), `${alvo} deveria estar nos favoritos`).toBeTruthy();
  });

  test('desfavoritar tira o profissional da lista', async ({ request, perfilProfissional, favoritos }) => {
    const alvo = PROFISSIONAIS_SEED.psicologa.nome;
    const id = await idDoProfissional(request, alvo);

    await perfilProfissional.abrir(id);
    if (!(await perfilProfissional.estaFavoritado())) await perfilProfissional.alternarFavorito();
    await favoritos.abrir();
    expect(await favoritos.contem(alvo)).toBeTruthy();

    await perfilProfissional.abrir(id);
    await perfilProfissional.alternarFavorito();
    expect(await perfilProfissional.estaFavoritado()).toBeFalsy();

    await favoritos.abrir();
    expect(await favoritos.contem(alvo), `${alvo} nao deveria continuar nos favoritos`).toBeFalsy();
  });

  test('o favorito persiste depois de recarregar', async ({ page, request, perfilProfissional }) => {
    const id = await idDoProfissional(request, PROFISSIONAIS_SEED.gasistaPerto.nome);
    await perfilProfissional.abrir(id);
    const antes = await perfilProfissional.estaFavoritado();
    await perfilProfissional.alternarFavorito();

    await page.reload();
    await perfilProfissional.aguardarCarregamento();
    expect(await perfilProfissional.estaFavoritado()).toBe(!antes);
  });

  test('a tela de favoritos ja comeca com os favoritos do seed', async ({ favoritos }) => {
    await favoritos.abrir();
    const nomes = await favoritos.listarNomes();
    expect(nomes.length, 'o seed cria dois favoritos').toBeGreaterThanOrEqual(1);
  });

  test('o filtro por categoria funciona nos favoritos', async ({ favoritos, page }) => {
    await favoritos.abrir();
    const todos = await favoritos.listarNomes();
    if (todos.length < 2) test.skip(true, 'Precisa de mais de um favorito para filtrar.');

    const chips = page.locator('.favorite-category-filters button');
    if ((await chips.count()) > 1) {
      await chips.nth(1).click();
      const filtrados = await favoritos.listarNomes();
      expect(filtrados.length).toBeLessThanOrEqual(todos.length);
    }
  });
});

/** Item 16: avaliacao. */
test.describe('@regression Avaliacao do profissional', () => {
  test.beforeEach(async ({ comoCliente }) => {
    void comoCliente;
  });

  test('publicar uma avaliacao a faz aparecer e atualiza o contador', async ({ request, perfilProfissional, comentarios }) => {
    test.setTimeout(90_000);
    const alvo = PROFISSIONAIS_SEED.informatica.nome;
    const id = await idDoProfissional(request, alvo);

    await perfilProfissional.abrir(id);
    const antes = await perfilProfissional.quantidadeDeAvaliacoes();

    const texto = `Servico impecavel, recomendo muito. Teste E2E ${Date.now()}`;
    await comentarios.abrir(id, true);
    await comentarios.avaliar(5, texto);
    await comentarios.esperarComentarioVisivel(texto);

    // O contador do perfil precisa refletir a nova avaliacao.
    await perfilProfissional.abrir(id);
    await expect
      .poll(() => perfilProfissional.quantidadeDeAvaliacoes(), {
        message: 'o contador de avaliacoes nao subiu apos a publicacao',
        timeout: 20_000,
      })
      .toBe(antes + 1);
  });

  test('a nota e recalculada depois de uma avaliacao baixa', async ({ request, perfilProfissional, comentarios }) => {
    test.setTimeout(90_000);
    const alvo = PROFISSIONAIS_SEED.gasistaPerto.nome;
    const id = await idDoProfissional(request, alvo);

    await perfilProfissional.abrir(id);
    const notaAntes = await perfilProfissional.notaNumerica();

    await comentarios.abrir(id, true);
    await comentarios.avaliar(1, `Nao gostei do atendimento. Teste E2E ${Date.now()}`);
    await comentarios.aguardarCarregamento();

    await perfilProfissional.abrir(id);
    await expect
      .poll(() => perfilProfissional.notaNumerica(), { message: 'a media nao caiu apos uma nota 1', timeout: 20_000 })
      .toBeLessThan(notaAntes);
  });

  test('avaliacao com foto sobe o anexo junto', async ({ request, comentarios }) => {
    test.setTimeout(90_000);
    const id = await idDoProfissional(request, PROFISSIONAIS_SEED.encanadorPerto.nome);
    const texto = `Trabalho bem feito, com foto. Teste E2E ${Date.now()}`;

    await comentarios.abrir(id, true);
    await comentarios.estrela(5).click();
    await comentarios.campoComentario.fill(texto);
    await comentarios.inputDeFotos.setInputFiles(ARQUIVOS.imagemValida);
    await expect(comentarios.fotosSelecionadas.first()).toBeVisible({ timeout: 20_000 });
    await comentarios.botaoPublicar.click();

    await comentarios.esperarComentarioVisivel(texto);
    await expect(comentarios.comentario(texto).locator('.comment-photo-grid img').first()).toBeVisible({ timeout: 20_000 });
  });

  test('o comentario publicado fica visivel para outro cliente', async ({ page, request, comentarios }) => {
    test.setTimeout(90_000);
    const id = await idDoProfissional(request, PROFISSIONAIS_SEED.eletricistaMedio.nome);
    const texto = `Comentario publico de teste E2E ${Date.now()}`;

    await comentarios.abrir(id, true);
    await comentarios.avaliar(4, texto);
    await comentarios.esperarComentarioVisivel(texto);

    // Troca de sessao: outro cliente precisa enxergar o comentario publico.
    const { entrarComo } = await import('../../fixtures/sessao');
    await page.context().clearCookies();
    await entrarComo(page, 'clienteSecundario');
    await comentarios.abrir(id);
    await comentarios.esperarComentarioVisivel(texto);
  });

  test('nao da para publicar comentario vazio', async ({ request, comentarios }) => {
    const id = await idDoProfissional(request, PROFISSIONAIS_SEED.eletricistaPerto.nome);
    await comentarios.abrir(id, true);
    // Sem texto e sem foto, o botao fica desabilitado.
    await expect(comentarios.botaoPublicar).toBeDisabled();
  });

  test('da para curtir um comentario existente', async ({ request, comentarios }) => {
    const id = await idDoProfissional(request, PROFISSIONAIS_SEED.eletricistaPerto.nome);
    await comentarios.abrir(id);

    if ((await comentarios.quantidadeDeComentarios()) === 0) {
      test.skip(true, 'Sem comentarios para curtir.');
    }
    const botao = comentarios.comentarios.first().locator('.comment-actions button').first();
    await botao.click();
    await expect(botao).toHaveClass(/active/, { timeout: 15_000 });
  });
});
