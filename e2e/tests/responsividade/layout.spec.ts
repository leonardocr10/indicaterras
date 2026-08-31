import { test, expect } from '../../fixtures/teste-base';
import { entrarComo } from '../../fixtures/sessao';

/**
 * Item 28: responsividade.
 *
 * A config ja roda `@responsive` nos projetos mobile-430 e tablet. Aqui
 * verificamos o que quebra de verdade quando a largura muda: rolagem
 * horizontal, elementos fora da viewport e a bottom-nav sumindo.
 */
const TAMANHOS = [
  { nome: 'desktop', largura: 1440, altura: 900 },
  { nome: 'tablet', largura: 768, altura: 1024 },
  { nome: 'mobile-390', largura: 390, altura: 844 },
  { nome: 'mobile-430', largura: 430, altura: 932 },
];

const ROTAS = ['/app/home', '/app/profissionais', '/app/favoritos', '/app/solicitacoes'];

test.describe('@responsive Layout em varios tamanhos', () => {
  for (const tamanho of TAMANHOS) {
    test(`sem rolagem horizontal em ${tamanho.nome} (${tamanho.largura}x${tamanho.altura})`, async ({ page }) => {
      await page.setViewportSize({ width: tamanho.largura, height: tamanho.altura });
      await entrarComo(page, 'cliente');

      for (const rota of ROTAS) {
        await page.goto(rota);
        await page.waitForLoadState('networkidle');

        const estouro = await page.evaluate(() => {
          const documento = document.documentElement;
          return { rolagem: documento.scrollWidth, visivel: documento.clientWidth };
        });

        // Uma folga de 2px cobre arredondamento de subpixel do navegador.
        expect(
          estouro.rolagem,
          `${rota} em ${tamanho.nome} rola na horizontal: ${estouro.rolagem}px de conteudo em ${estouro.visivel}px de tela`,
        ).toBeLessThanOrEqual(estouro.visivel + 2);
      }
    });
  }

  test('a bottom navigation continua acessivel no mobile', async ({ page, navegacao }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrarComo(page, 'cliente');
    await page.goto('/app/home');
    await page.waitForLoadState('networkidle');

    await expect(navegacao.inicio).toBeVisible();
    await expect(navegacao.perfil).toBeVisible();

    const caixa = await navegacao.perfil.boundingBox();
    expect(caixa, 'o ultimo item da barra precisa ter area clicavel').not.toBeNull();
    expect(caixa!.x + caixa!.width, 'o item Perfil esta saindo da tela').toBeLessThanOrEqual(390 + 2);
  });

  test('o cartao do profissional nao deixa a foto invadir o texto', async ({ page, busca }) => {
    // Regressao conhecida: a foto do perfil ja invadiu o texto em telas
    // estreitas e ja escapou do formato quadrado (ver historico do repositorio).
    await page.setViewportSize({ width: 390, height: 844 });
    await entrarComo(page, 'cliente');
    await busca.abrirLista();
    await expect(busca.cartoes.first()).toBeVisible({ timeout: 20_000 });

    const cartao = busca.cartoes.first();
    const foto = cartao.locator('img').first();
    if (!(await foto.count())) test.skip(true, 'O cartao nao expoe imagem neste estado.');

    const caixaFoto = await foto.boundingBox();
    const caixaCartao = await cartao.boundingBox();
    expect(caixaFoto).not.toBeNull();
    expect(caixaCartao).not.toBeNull();

    // A foto tem de caber dentro do cartao.
    expect(caixaFoto!.x + caixaFoto!.width).toBeLessThanOrEqual(caixaCartao!.x + caixaCartao!.width + 2);
    // E continuar aproximadamente quadrada.
    const proporcao = caixaFoto!.width / caixaFoto!.height;
    expect(proporcao, `a foto esta deformada (proporcao ${proporcao.toFixed(2)})`).toBeGreaterThan(0.8);
    expect(proporcao).toBeLessThan(1.25);
  });

  test('o painel do admin continua utilizavel no tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await entrarComo(page, 'admin');
    await page.goto('/admin/profissionais');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.admin-page')).toBeVisible();
    // A tabela larga precisa rolar dentro do proprio container, nao empurrar a
    // pagina inteira para o lado.
    const documento = await page.evaluate(() => ({
      rolagem: document.documentElement.scrollWidth,
      visivel: document.documentElement.clientWidth,
    }));
    expect(documento.rolagem, 'o painel esta empurrando a pagina na horizontal').toBeLessThanOrEqual(documento.visivel + 2);
  });
});
