import { test, expect } from '../../fixtures/teste-base';
import { entrarComo } from '../../fixtures/sessao';

/**
 * Item 2 e 3: cada papel so alcanca o que e dele.
 *
 * As regras vem de `frontend/src/app/guards/auth.guard.ts`:
 *   residentGuard     -> so RESIDENT; PROFESSIONAL vai para /profissional/perfil,
 *                        admin vai para /admin/dashboard
 *   professionalGuard -> so PROFESSIONAL; o resto vai para /app/home
 *   adminGuard        -> CONDO_ADMIN e SUPER_ADMIN; o resto vai para /app/home
 *                        e quem nao tem sessao vai para /admin/login
 */

const ROTAS_DO_CLIENTE = [
  '/app/home',
  '/app/buscar',
  '/app/profissionais',
  '/app/favoritos',
  '/app/perfil',
  '/app/indicar',
  '/app/minhas-indicacoes',
  '/app/solicitacoes',
  '/app/solicitacoes/nova',
];

const ROTAS_DO_ADMIN = [
  '/admin/dashboard',
  '/admin/clientes',
  '/admin/usuarios',
  '/admin/profissionais',
  '/admin/categorias',
  '/admin/avaliacoes',
  '/admin/indicacoes',
  '/admin/denuncias',
  '/admin/configuracoes',
  '/admin/inteligencia-artificial',
  '/admin/relatorios',
  '/admin/pendencias',
];

test.describe('@regression Acesso sem sessao', () => {
  for (const rota of ROTAS_DO_CLIENTE) {
    test(`sem login, ${rota} redireciona para /login`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }

  test('sem login, rota de admin redireciona para /admin/login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
  });

  test('sem login, a area do profissional redireciona para /login', async ({ page }) => {
    await page.goto('/profissional/perfil');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe('@regression Cliente nao alcanca outras areas', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, 'cliente');
  });

  test('cliente em rota de admin cai na Home', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 15_000 });
  });

  test('cliente na area do profissional cai na Home', async ({ page }) => {
    await page.goto('/profissional/perfil');
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 15_000 });
  });

  test('cliente abre todas as proprias rotas', async ({ page }) => {
    for (const rota of ROTAS_DO_CLIENTE) {
      await page.goto(rota);
      await expect(page, `${rota} deveria abrir para o cliente`).toHaveURL(new RegExp(rota.replace(/\//g, '\\/')));
    }
  });
});

test.describe('@regression Profissional nao alcanca a area do cliente', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, 'profissional');
  });

  test('profissional em rota de cliente vai para o proprio perfil', async ({ page }) => {
    await page.goto('/app/home');
    await expect(page).toHaveURL(/\/profissional\/perfil/, { timeout: 15_000 });
  });

  test('profissional em rota de admin vai para a Home, e de la para o proprio perfil', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // adminGuard manda para /app/home; residentGuard entao manda para o perfil.
    await expect(page).toHaveURL(/\/profissional\/perfil/, { timeout: 15_000 });
  });

  test('profissional abre a propria area', async ({ page }) => {
    await page.goto('/profissional/perfil');
    await expect(page).toHaveURL(/\/profissional\/perfil/);
  });
});

test.describe('@regression Admin', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, 'admin');
  });

  test('admin abre todas as rotas administrativas', async ({ page }) => {
    for (const rota of ROTAS_DO_ADMIN) {
      await page.goto(rota);
      await expect(page, `${rota} deveria abrir para o admin`).toHaveURL(new RegExp(rota.replace(/\//g, '\\/')));
      await expect(page.locator('.admin-page')).toBeVisible({ timeout: 20_000 });
    }
  });

  test('admin em rota de cliente e mandado para o painel', async ({ page }) => {
    await page.goto('/app/home');
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 });
  });
});

test.describe('@regression Redirecionamentos legados', () => {
  const legados: Array<[string, RegExp]> = [
    ['/home', /\/app\/home/],
    ['/profissionais', /\/app\/profissionais/],
    ['/favoritos', /\/app\/favoritos/],
    ['/indicar', /\/app\/indicar/],
    ['/minhas-indicacoes', /\/app\/minhas-indicacoes/],
    ['/admin/moradores', /\/admin\/clientes/],
    ['/admin/condominios', /\/admin\/clientes/],
  ];

  for (const [origem, destino] of legados) {
    test(`${origem} redireciona corretamente`, async ({ page }) => {
      await entrarComo(page, origem.startsWith('/admin') ? 'admin' : 'cliente');
      await page.goto(origem);
      await expect(page).toHaveURL(destino, { timeout: 15_000 });
    });
  }

  test('rota inexistente cai na landing', async ({ page }) => {
    await page.goto('/rota-que-nao-existe-e2e');
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 15_000 });
  });
});
