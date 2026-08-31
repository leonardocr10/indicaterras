import { test, expect } from '../../fixtures/teste-base';
import { CONTAS } from '../../fixtures/contas';
import { entrarComo } from '../../fixtures/sessao';
import { env } from '../../env';

/**
 * Item 44: suite rapida para rodar depois de cada deploy.
 * So verifica que as pecas principais respondem - sem regra de negocio.
 */
test.describe('@smoke Fumaca', () => {
  test('a landing publica abre', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('a tela de login abre e tem os campos', async ({ login }) => {
    await login.abrir();
    await expect(login.campoEmail).toBeVisible();
    await expect(login.campoSenha).toBeVisible();
    await expect(login.botaoEntrar).toBeEnabled();
  });

  test('o login do cliente funciona e cai na Home', async ({ page, login, home }) => {
    await login.abrir();
    await login.entrar(CONTAS.cliente.email, CONTAS.cliente.senha);
    await page.waitForURL(/\/app\/home/, { timeout: 20_000 });
    await home.esperarCarregada();
  });

  test('a Home lista categorias', async ({ comoCliente, home }) => {
    void comoCliente;
    await home.abrir();
    await home.esperarCarregada();
    await expect(home.cartoesDeCategoria.first()).toBeVisible();
  });

  test('a busca de profissionais abre e traz resultados', async ({ comoCliente, busca }) => {
    void comoCliente;
    await busca.abrirLista();
    await expect(busca.cartoes.first()).toBeVisible({ timeout: 20_000 });
  });

  test('o perfil do cliente abre', async ({ comoCliente, page }) => {
    void comoCliente;
    await page.goto('/app/perfil');
    await expect(page.locator('resident-profile-page, .mobile-page')).toBeVisible();
  });

  test('o painel do admin abre', async ({ comoAdmin, page }) => {
    void comoAdmin;
    await page.goto('/admin/dashboard');
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 20_000 });
  });

  test('a area do profissional abre', async ({ comoProfissional, painelProfissional }) => {
    void comoProfissional;
    await painelProfissional.abrir();
    await painelProfissional.esperarCarregado();
  });

  test('as APIs principais respondem', async ({ request }) => {
    const sessao = await request.post(`${env.apiUrl}/auth/login`, {
      data: { email: CONTAS.cliente.email, password: CONTAS.cliente.senha, rememberMe: true },
    });
    expect(sessao.ok(), 'POST /auth/login deveria responder 2xx').toBeTruthy();
    const token = (await sessao.json()).data.accessToken;
    const autenticado = { Authorization: `Bearer ${token}` };

    for (const caminho of ['/public-settings', '/categories', '/category-groups', '/professionals']) {
      const resposta = await request.get(`${env.apiUrl}${caminho}`, { headers: autenticado });
      expect(resposta.ok(), `GET ${caminho} respondeu ${resposta.status()}`).toBeTruthy();
      const corpo = await resposta.json();
      expect(corpo, `GET ${caminho} deveria devolver { data }`).toHaveProperty('data');
    }
  });

  test('rota protegida sem sessao manda para o login', async ({ page }) => {
    await page.goto('/app/home');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

/**
 * Item 30: capturas das telas principais. Nao valida pixel - serve para o
 * relatorio ter um retrato de cada tela a cada execucao.
 */
test.describe('@smoke Capturas das telas principais', () => {
  test('registra Home, Buscar, mapa, perfil, profissional e admin', async ({ page, home, busca, perfilProfissional }) => {
    await entrarComo(page, 'cliente');

    await home.abrir();
    await home.esperarCarregada();
    await home.capturarTela('01-home');

    await busca.abrirLista();
    await busca.cartoes.first().waitFor({ state: 'visible', timeout: 20_000 });
    await busca.capturarTela('02-buscar');

    await busca.abrirProximos();
    await busca.aguardarCarregamento();
    if (await busca.abaMapa.count()) {
      await busca.verNoMapa();
      await busca.capturarTela('03-mapa');
    }

    const primeiro = await busca.cartoes.first().locator('h3').innerText().catch(() => '');
    await busca.abrirLista();
    if (primeiro) {
      await busca.abrirPerfil(primeiro.trim());
      await perfilProfissional.capturarTela('04-profissional');
    }

    await page.goto('/app/perfil');
    await page.locator('.mobile-page').first().waitFor({ state: 'visible' });
    await page.screenshot({ path: 'reports/screenshots/05-perfil.png', fullPage: true });

    await entrarComo(page, 'admin');
    await page.goto('/admin/dashboard');
    await page.locator('.admin-page').waitFor({ state: 'visible', timeout: 20_000 });
    await page.screenshot({ path: 'reports/screenshots/06-admin.png', fullPage: true });
  });
});
