import { test, expect } from '../../fixtures/teste-base';
import { SENHA_PADRAO } from '../../fixtures/contas';
import { ORIGEM } from '../../fixtures/contas';
import { definirLocalizacaoSalva } from '../../fixtures/sessao';
import { ARQUIVOS } from '../../support/arquivos';

/**
 * Item 43: a jornada real, do cadastro a avaliacao, numa sessao so.
 *
 * Escopo honesto: os passos 9 a 12 do enunciado (profissional envia proposta,
 * cliente aceita, servico concluido) dependem do ENVIO E ACEITE de proposta, que
 * ainda nao existe - ver `tests/profissional/oportunidades.spec.ts`, onde a
 * listagem de oportunidades (que ja existe) e testada de verdade. A
 * jornada vai ate onde o produto vai hoje: cadastro, busca, perfil, favorito,
 * solicitacao publicada e avaliacao.
 */
test.describe('@journey @regression Jornada completa do cliente', () => {
  test('do cadastro a avaliacao', async ({ page, cadastro, home, busca, perfilProfissional, favoritos, solicitacao, comentarios, navegacao }) => {
    test.setTimeout(300_000);

    const marca = Date.now();
    const email = `jornada.${marca}.e2e@example.test`;
    const nome = `Cliente Jornada ${marca}`;

    // ------------------------------------------------------------------
    // 1. Cria a conta
    // ------------------------------------------------------------------
    await cadastro.abrir();
    await cadastro.cadastrarCliente({
      nome,
      email,
      telefone: '(61) 90000-7777',
      senha: SENHA_PADRAO,
      cep: '70000-000',
      rua: 'Rua da Jornada',
      numero: '10',
      bairro: 'Asa Sul',
      cidade: 'Brasilia',
      estado: 'DF',
    });

    // ------------------------------------------------------------------
    // 2. Entra (o seed desliga a aprovacao manual, entao a conta ja vale)
    // ------------------------------------------------------------------
    await expect(page).toHaveURL(/\/app\/home|\/login/, { timeout: 30_000 });
    if (page.url().includes('/login')) {
      const { LoginPage } = await import('../../pages/LoginPage');
      const login = new LoginPage(page);
      await login.entrar(email, SENHA_PADRAO);
    }
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 30_000 });
    await home.esperarCarregada();

    // ------------------------------------------------------------------
    // 3 e 4. Descreve o problema e ve o sistema identificar o servico
    // ------------------------------------------------------------------
    await home.descreverProblema('meu chuveiro queimou e o disjuntor desarma');
    await expect(home.sugestaoPorPalavraChave).toBeVisible({ timeout: 25_000 });
    await expect(home.sugestaoPorPalavraChave).toContainText(/Eletricista/i);

    // ------------------------------------------------------------------
    // 5. Encontra profissionais pela sugestao
    // ------------------------------------------------------------------
    await home.sugestaoPorPalavraChave.getByRole('button', { name: /Ver profissionais/i }).click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 20_000 });
    await busca.aguardarCarregamento();

    const encontrados = await busca.listarNomes();
    expect(encontrados.length, 'a jornada precisa achar ao menos um eletricista').toBeGreaterThan(0);
    const escolhido = encontrados[0].split('\n')[0].trim();

    // ------------------------------------------------------------------
    // 6. Abre o perfil do profissional
    // ------------------------------------------------------------------
    await busca.abrirPerfil(escolhido);
    await expect(perfilProfissional.nome).toContainText(escolhido);
    const idDoProfissional = page.url().split('/app/profissional/')[1].split('?')[0];

    // ------------------------------------------------------------------
    // 7. Favorita
    // ------------------------------------------------------------------
    if (!(await perfilProfissional.estaFavoritado())) {
      await perfilProfissional.alternarFavorito();
    }
    expect(await perfilProfissional.estaFavoritado()).toBeTruthy();

    await favoritos.abrir();
    expect(await favoritos.contem(escolhido), 'o favorito deveria estar na lista').toBeTruthy();

    // ------------------------------------------------------------------
    // 8. Cria a solicitacao de servico completa
    // ------------------------------------------------------------------
    await definirLocalizacaoSalva(page, ORIGEM, 5);
    const tituloDaSolicitacao = `Chuveiro queimado - jornada ${marca}`;

    await solicitacao.abrirNova();
    await solicitacao.descreverProblema('meu chuveiro queimou e o disjuntor desarma', tituloDaSolicitacao);
    await solicitacao.avancar();

    await solicitacao.inputDeMidia.setInputFiles(ARQUIVOS.imagemValida);
    await expect(solicitacao.midiasSelecionadas.first()).toBeVisible({ timeout: 25_000 });
    await solicitacao.avancar();

    await solicitacao.escolherUrgencia(/Hoje|Emergência|Emergencia|Próximos|Proximos/);
    await solicitacao.avancar();

    await solicitacao.campoBairro.fill('Asa Sul');
    await solicitacao.campoCidade.fill('Brasilia');
    await solicitacao.avancar();

    await expect(solicitacao.resumo).toBeVisible();
    await solicitacao.botaoPublicar.click();

    await expect(page).toHaveURL(/\/app\/solicitacoes/, { timeout: 40_000 });
    await solicitacao.aguardarCarregamento();
    await expect(page.getByText(tituloDaSolicitacao)).toBeVisible({ timeout: 25_000 });

    // ------------------------------------------------------------------
    // 9 a 11. Envio/aceite de proposta e ciclo do servico ainda nao existem.
    // Documentado em tests/profissional/oportunidades.spec.ts.
    // A jornada segue para a avaliacao, que existe.
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // 12. Avalia o profissional
    // ------------------------------------------------------------------
    const avaliacao = `Resolveu o chuveiro no mesmo dia. Jornada E2E ${marca}`;
    await comentarios.abrir(idDoProfissional, true);
    await comentarios.avaliar(5, avaliacao);
    await comentarios.esperarComentarioVisivel(avaliacao);

    // A avaliacao precisa aparecer no perfil publico, nao so na tela de envio.
    await perfilProfissional.abrir(idDoProfissional);
    await expect(perfilProfissional.contadorDeComentarios).toBeVisible();

    // ------------------------------------------------------------------
    // Fecha o ciclo: a navegacao continua saudavel no fim de tudo
    // ------------------------------------------------------------------
    await navegacao.inicio.click();
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 20_000 });
    await home.esperarCarregada();
  });
});
