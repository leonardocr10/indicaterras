import { test, expect } from '../../fixtures/teste-base';
import { ORIGEM, PROFISSIONAIS_SEED } from '../../fixtures/contas';
import { definirLocalizacaoSalva } from '../../fixtures/sessao';
import { mockGoogleMapsIndisponivel, mockGoogleMapsChaveRecusada } from '../../fixtures/maps-mock';
import { env } from '../../env';

/**
 * Item 5: mapa, marcadores e o card que abre ao tocar num pino.
 *
 * O SDK do Google e substituido pelo stub de `fixtures/maps-mock.ts`. Os pinos
 * continuam sendo os `button.map-pin` criados pelo proprio componente, entao o
 * que testamos aqui e o codigo da aplicacao, nao o mock.
 */
test.describe('@regression Mapa de profissionais', () => {
  test.beforeEach(async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 10);
    await busca.abrirProximos();
    await busca.definirRaio(10);
  });

  test('alternar entre Lista e Mapa funciona nos dois sentidos', async ({ busca }) => {
    await expect(busca.abaLista).toBeVisible();
    await busca.verNoMapa();
    await expect(busca.abaMapa).toHaveAttribute('aria-selected', 'true');

    await busca.verNaLista();
    await expect(busca.abaLista).toHaveAttribute('aria-selected', 'true');
    await expect(busca.cartoes.first()).toBeVisible();
  });

  test('o mapa desenha um marcador por profissional com coordenada', async ({ busca }) => {
    const naLista = (await busca.listarNomes()).length;
    await busca.verNoMapa();
    await expect(busca.marcadores.first()).toBeVisible({ timeout: 20_000 });
    expect(await busca.marcadores.count(), 'cada profissional da lista deveria virar um pino').toBe(naLista);
  });

  test('tocar num marcador abre o card com os dados do profissional', async ({ busca }) => {
    await busca.verNoMapa();
    await expect(busca.marcadores.first()).toBeVisible({ timeout: 20_000 });

    const nome = PROFISSIONAIS_SEED.eletricistaPerto.nome;
    await busca.marcador(nome).click();

    await expect(busca.cardDoMarcador).toBeVisible();
    await expect(busca.cardDoMarcador.getByRole('heading', { name: nome })).toBeVisible();
    await expect(busca.cardDoMarcador.locator('.map-sheet-meta')).toBeVisible();
  });

  test('o card do marcador fecha sem tirar a pessoa do mapa', async ({ busca }) => {
    await busca.verNoMapa();
    await busca.marcadores.first().click();
    await expect(busca.cardDoMarcador).toBeVisible();

    await busca.botaoFecharCardDoMarcador.click();
    await expect(busca.cardDoMarcador).toBeHidden();
    await expect(busca.mapa).toBeVisible();
  });

  test('da para favoritar direto pelo card do marcador', async ({ busca }) => {
    await busca.verNoMapa();
    await busca.marcador(PROFISSIONAIS_SEED.encanadorPerto.nome).click();
    await expect(busca.cardDoMarcador).toBeVisible();

    const botao = busca.botaoFavoritarNoCard;
    const rotuloAntes = (await botao.innerText()).trim();
    await botao.click();
    await expect(botao).not.toHaveText(rotuloAntes, { timeout: 15_000 });
  });

  test('o card leva para o perfil completo', async ({ page, busca }) => {
    await busca.verNoMapa();
    await busca.marcadores.first().click();
    await busca.linkVerPerfilNoCard.click();
    await expect(page).toHaveURL(/\/app\/profissional\//, { timeout: 15_000 });
  });

  test('o aviso sobre precisao do pino continua na tela', async ({ busca, page }) => {
    await busca.verNoMapa();
    // Privacidade: o pino e do bairro, nunca do endereco exato. O aviso nao
    // pode sumir numa refatoracao.
    await expect(page.locator('.nearby-map-note')).toContainText(/bairro do profissional/i);
  });
});

test.describe('@regression Mapa indisponivel', () => {
  test('sem o SDK, a lista continua funcionando', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await mockGoogleMapsIndisponivel(page);
    await definirLocalizacaoSalva(page, ORIGEM, 10);
    await busca.abrirProximos();

    // O mapa e complemento: a lista nao pode depender dele.
    await expect(busca.cartoes.first()).toBeVisible({ timeout: 20_000 });
  });

  test('chave recusada explica o problema em vez de deixar um quadrado branco', async ({ page, comoCliente, busca, diagnostico }) => {
    void comoCliente;
    diagnostico.tolerarConsole(/maps|google/i);
    await mockGoogleMapsChaveRecusada(page);
    await definirLocalizacaoSalva(page, ORIGEM, 10);
    await busca.abrirProximos();
    await busca.definirRaio(10);

    if (await busca.abaMapa.count()) {
      await busca.verNoMapa();
      await expect(busca.erroDoMapa).toBeVisible({ timeout: 20_000 });
      await expect(busca.erroDoMapa).toContainText(/chave|Google Cloud/i);
    }
  });
});

/**
 * Teste opcional contra o Google de verdade. So roda com
 * E2E_GOOGLE_MAPS_API_KEY preenchido - fora isso e pulado.
 */
test.describe('@maps-real Mapa com o SDK real', () => {
  test.skip(!env.googleMapsApiKey, 'Defina E2E_GOOGLE_MAPS_API_KEY para rodar contra o Google real.');

  test('o SDK real carrega e o mapa aparece', async ({ page, comoCliente, busca, diagnostico }) => {
    void comoCliente;
    diagnostico.tolerarConsole(/.*/);
    await page.unroute('https://maps.googleapis.com/maps/api/js*');
    await definirLocalizacaoSalva(page, ORIGEM, 10);
    await busca.abrirProximos();
    await busca.verNoMapa();
    await expect(busca.mapa).toBeVisible({ timeout: 30_000 });
  });
});
