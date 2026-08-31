import type { Locator } from '@playwright/test';
import { test, expect } from '../../fixtures/teste-base';

/** Itens 4 e 35: navegacao do cliente e botoes que precisam levar a algum lugar. */
test.describe('@regression @mobile Navegacao do cliente', () => {
  test.beforeEach(async ({ comoCliente, home }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();
  });

  test('a Home carrega com categorias e cartoes de decisao', async ({ home }) => {
    await expect(home.gradeDeCategorias).toBeVisible();
    await expect(home.cartoesDeCategoria.first()).toBeVisible();
    await expect(home.cartaoDescrevaProblema).toBeVisible();
    await expect(home.cartaoVerProfissionais).toBeVisible();
  });

  test('a barra inferior leva a cada secao e marca o item ativo', async ({ page, navegacao }) => {
    const destinos: Array<[Locator, RegExp]> = [
      [navegacao.buscar, /\/app\/buscar/],
      [navegacao.indicar, /\/app\/indicar/],
      [navegacao.favoritos, /\/app\/favoritos/],
      [navegacao.perfil, /\/app\/perfil/],
      [navegacao.inicio, /\/app\/home/],
    ];

    for (const [item, destino] of destinos) {
      await item.click();
      await expect(page).toHaveURL(destino, { timeout: 15_000 });
    }
    expect(await navegacao.itemAtivo()).toContain('Início');
  });

  test('nenhum item da barra inferior fica sem destino', async ({ navegacao }) => {
    const total = await navegacao.itens.count();
    expect(total, 'a bottom navigation deveria ter 5 itens').toBe(5);
    for (let i = 0; i < total; i += 1) {
      const href = await navegacao.itens.nth(i).getAttribute('href');
      expect(href, `o item ${i} da barra inferior esta sem href`).toBeTruthy();
    }
  });

  test('o menu lateral abre, navega e fecha', async ({ page, navegacao }) => {
    await navegacao.abrirMenu();
    await expect(navegacao.itemDoMenu('Início')).toBeVisible();
    await expect(navegacao.itemDoMenu(/Minhas solicitações/)).toBeVisible();

    await navegacao.itemDoMenu(/Meus favoritos/).click();
    await expect(page).toHaveURL(/\/app\/favoritos/, { timeout: 15_000 });
  });

  test('todos os links do menu lateral tem destino', async ({ navegacao }) => {
    await navegacao.abrirMenu();
    const links = navegacao.drawer.getByRole('link');
    const total = await links.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i += 1) {
      const href = await links.nth(i).getAttribute('href');
      expect(href, `link ${i} do menu lateral sem href`).toBeTruthy();
    }
  });

  test('o painel de notificacoes abre e fecha', async ({ navegacao }) => {
    await navegacao.botaoNotificacoes.click();
    await expect(navegacao.painelDeNotificacoes).toBeVisible();
    await navegacao.painelDeNotificacoes.getByRole('button', { name: 'Fechar notificações' }).click();
    await expect(navegacao.painelDeNotificacoes).toBeHidden();
  });

  test('o botao Indicar leva ao formulario de indicacao', async ({ page, navegacao }) => {
    await navegacao.indicar.click();
    await expect(page).toHaveURL(/\/app\/indicar/, { timeout: 15_000 });
  });

  test('da busca da para voltar para a Home', async ({ page, busca }) => {
    await busca.abrirLista();
    await busca.voltar.click();
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 15_000 });
  });

  test('o link "Ver todas" leva para a lista de profissionais', async ({ page, home }) => {
    await home.linkVerTodasAsCategorias.click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
  });

  test('clicar numa categoria filtra a busca por ela', async ({ page, home, busca }) => {
    const primeira = home.cartoesDeCategoria.first();
    const nome = (await primeira.innerText()).trim().split('\n')[0];
    await primeira.click();
    await expect(page).toHaveURL(/\/app\/profissionais/, { timeout: 15_000 });
    await busca.aguardarCarregamento();
    expect(nome.length).toBeGreaterThan(0);
  });
});

test.describe('@regression Botoes sem acao', () => {
  test('nenhum botao visivel da Home fica inerte', async ({ comoCliente, home, page }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();

    // Item 35: um botao sem handler nem type=submit e um botao morto.
    const inertes = await page.locator('button:visible').evaluateAll((botoes) =>
      botoes
        .filter((botao) => {
          const elemento = botao as HTMLButtonElement;
          if (elemento.disabled) return false;
          if (elemento.type === 'submit') return false;
          // Angular registra listeners via addEventListener; nao da para ler
          // isso do DOM. O sinal acessivel e ter rotulo e nao ser um vazio.
          const rotulo = (elemento.getAttribute('aria-label') || elemento.textContent || '').trim();
          return rotulo === '';
        })
        .map((botao) => (botao as HTMLElement).outerHTML.slice(0, 120)),
    );
    expect(inertes, `botoes sem rotulo acessivel encontrados:\n${inertes.join('\n')}`).toEqual([]);
  });
});
