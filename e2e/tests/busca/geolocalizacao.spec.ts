import { test, expect } from '../../fixtures/teste-base';
import { ORIGEM, PROFISSIONAIS_SEED } from '../../fixtures/contas';
import { definirLocalizacaoSalva, limparLocalizacaoSalva } from '../../fixtures/sessao';

/**
 * Item 6: geolocalizacao, raio e distancia.
 *
 * O seed posiciona cada profissional a uma distancia exata da origem, entao
 * cada raio tem um resultado esperado - nao dependemos de geocoding externo:
 *   0.4 km Eletricista Perto   -> 1, 5 e 10 km
 *   1.2 km Encanador Perto     -> 5 e 10 km (fora de 1 km)
 *   3.0 km Eletricista Medio   -> 5 e 10 km
 *   7.5 km Eletricista Longe   -> so 10 km
 *  25.0 km Eletricista Fora    -> nenhum dos raios testados
 */
test.describe('@regression Geolocalizacao', () => {
  test('sem localizacao, a tela explica e oferece as duas saidas', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await limparLocalizacaoSalva(page);
    await busca.abrirProximos();

    await expect(busca.avisoSemLocalizacao).toBeVisible();
    await expect(busca.botaoUsarMinhaLocalizacao).toBeVisible();
    await expect(busca.avisoSemLocalizacao.getByRole('button', { name: /Informar endereço/i })).toBeVisible();
  });

  test('permitir a localizacao do aparelho carrega os proximos', async ({ page, context, comoCliente, busca }) => {
    void comoCliente;
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(ORIGEM);
    await limparLocalizacaoSalva(page);

    await busca.abrirProximos();
    await busca.botaoUsarMinhaLocalizacao.click();

    await expect(busca.barraDeLocalizacao).toBeVisible({ timeout: 20_000 });
    await busca.aguardarCarregamento();
    expect((await busca.listarNomes()).length).toBeGreaterThan(0);
  });

  test('negar a localizacao mostra a mensagem e mantem a alternativa por CEP', async ({ page, context, comoCliente, busca }) => {
    void comoCliente;
    await context.clearPermissions();
    await limparLocalizacaoSalva(page);
    // Sem permissao concedida, o getCurrentPosition rejeita com code 1.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (_ok: PositionCallback, erro?: PositionErrorCallback) =>
            erro?.({ code: 1, message: 'negado', PERMISSION_DENIED: 1 } as GeolocationPositionError),
          watchPosition: () => 0,
          clearWatch: () => {},
        },
      });
    });

    await busca.abrirProximos();
    await busca.botaoUsarMinhaLocalizacao.click();

    // A recusa nao pode virar tela morta: o caminho por CEP continua.
    await expect(busca.avisoSemLocalizacao.or(busca.erroDeLocalizacao)).toBeVisible({ timeout: 15_000 });
    await expect(busca.avisoSemLocalizacao.getByRole('button', { name: /Informar endereço/i })).toBeVisible();
  });

  test('raio de 1 km traz so quem esta dentro de 1 km', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 1);
    await busca.abrirProximos();
    await busca.definirRaio(1);

    const nomes = (await busca.listarNomes()).join(' | ');
    expect(nomes, 'o de 0,4 km deveria aparecer').toContain(PROFISSIONAIS_SEED.eletricistaPerto.nome);
    expect(nomes, 'o de 3 km nao deveria aparecer em 1 km').not.toContain(PROFISSIONAIS_SEED.eletricistaMedio.nome);
    expect(nomes, 'o de 7,5 km nao deveria aparecer em 1 km').not.toContain(PROFISSIONAIS_SEED.eletricistaLonge.nome);
  });

  test('raio de 5 km inclui o de 3 km e exclui o de 7,5 km', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 5);
    await busca.abrirProximos();
    await busca.definirRaio(5);

    const nomes = (await busca.listarNomes()).join(' | ');
    expect(nomes).toContain(PROFISSIONAIS_SEED.eletricistaPerto.nome);
    expect(nomes).toContain(PROFISSIONAIS_SEED.eletricistaMedio.nome);
    expect(nomes, 'o de 7,5 km esta fora do raio de 5 km').not.toContain(PROFISSIONAIS_SEED.eletricistaLonge.nome);
  });

  test('raio de 10 km inclui o de 7,5 km e ainda exclui o de 25 km', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 10);
    await busca.abrirProximos();
    await busca.definirRaio(10);

    const nomes = (await busca.listarNomes()).join(' | ');
    expect(nomes).toContain(PROFISSIONAIS_SEED.eletricistaLonge.nome);
    expect(nomes, 'o de 25 km continua fora').not.toContain(PROFISSIONAIS_SEED.eletricistaFora.nome);
  });

  test('aumentar o raio nunca diminui o numero de resultados', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 1);
    await busca.abrirProximos();

    await busca.definirRaio(1);
    const em1 = (await busca.listarNomes()).length;
    await busca.definirRaio(5);
    const em5 = (await busca.listarNomes()).length;
    await busca.definirRaio(10);
    const em10 = (await busca.listarNomes()).length;

    expect(em5).toBeGreaterThanOrEqual(em1);
    expect(em10).toBeGreaterThanOrEqual(em5);
  });

  test('o raio escolhido aparece na barra de localizacao', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 5);
    await busca.abrirProximos();
    await busca.definirRaio(10);
    await expect(busca.textoDoRaio).toContainText('10 km');
  });

  test('a distancia mostrada bate com a posicao do seed', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 5);
    await busca.abrirProximos();
    await busca.definirRaio(5);

    const distancia = await busca.distanciaDe(PROFISSIONAIS_SEED.eletricistaMedio.nome);
    if (distancia) {
      const km = Number(distancia.replace(/[^\d,.]/g, '').replace(',', '.'));
      // O seed coloca este profissional a 3 km. Meio km de folga cobre o
      // arredondamento da formula de distancia usada pelo backend.
      expect(km, `distancia exibida "${distancia}" fora do esperado para 3 km`).toBeGreaterThan(2.5);
      expect(km).toBeLessThan(3.5);
    }
  });

  test('quem nao tem coordenada e informado, nao escondido', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 10);
    await busca.abrirProximos();
    await busca.definirRaio(10);

    // O seed tem exatamente um profissional sem coordenada.
    await expect(busca.avisoSemCoordenada).toBeVisible();
    await expect(busca.avisoSemCoordenada).toContainText(/localização cadastrada|localizacao cadastrada/i);
    expect((await busca.listarNomes()).join(' ')).not.toContain(PROFISSIONAIS_SEED.semLocalizacao.nome);
  });

  test('alterar a localizacao pelo sheet e remove-la funciona', async ({ page, comoCliente, busca }) => {
    void comoCliente;
    await definirLocalizacaoSalva(page, ORIGEM, 5);
    await busca.abrirProximos();

    await busca.abrirSheetDeLocalizacao();
    await expect(busca.campoCep).toBeVisible();
    await busca.botaoRemoverLocalizacao.click();
    await busca.botaoConcluirLocalizacao.click();

    await expect(busca.avisoSemLocalizacao).toBeVisible({ timeout: 15_000 });
  });

  test('CEP invalido no sheet mostra erro e nao quebra a tela', async ({ page, comoCliente, busca, diagnostico }) => {
    void comoCliente;
    diagnostico.tolerarConsole(/brasilapi|CEP/i);
    await definirLocalizacaoSalva(page, ORIGEM, 5);
    await busca.abrirProximos();

    await busca.abrirSheetDeLocalizacao();
    await busca.campoCep.fill('123');
    await busca.botaoUsarCep.click();

    await expect(busca.erroDeLocalizacao).toBeVisible({ timeout: 15_000 });
    await expect(busca.sheetDeLocalizacao).toBeVisible();
  });
});
