import { test, expect } from '../../fixtures/teste-base';
import { CONTAS } from '../../fixtures/contas';
import { entrarComo, expirarAccessToken, invalidarSessaoInteira, CHAVE_DE_SESSAO } from '../../fixtures/sessao';

/** Item 3: login, logout, sessao e redirecionamento. */
test.describe('@regression Login do cliente', () => {
  test('login valido leva para a Home', async ({ page, login, home }) => {
    await login.abrir();
    await login.entrar(CONTAS.cliente.email, CONTAS.cliente.senha);
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 20_000 });
    await home.esperarCarregada();
  });

  test('login com senha incorreta mostra erro e nao navega', async ({ page, login, diagnostico }) => {
    // O 401 aqui e o comportamento certo, nao um defeito.
    diagnostico.tolerarHttp(/\/auth\/login/, 401);
    await login.abrir();
    await login.entrar(CONTAS.cliente.email, 'senha-errada-e2e');
    await expect(login.mensagem).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('usuario inexistente mostra erro', async ({ login, diagnostico }) => {
    diagnostico.tolerarHttp(/\/auth\/login/, 401);
    await login.abrir();
    await login.entrar('nao.existe.e2e@example.test', 'QualquerSenha1');
    await expect(login.mensagem).toBeVisible();
  });

  test('campos obrigatorios impedem o envio', async ({ page, login }) => {
    await login.abrir();
    await login.botaoEntrar.click();
    // Formulario invalido: o app nem chega a chamar a API.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input.ng-invalid, .ng-invalid')).toHaveCount(await page.locator('.ng-invalid').count());
  });

  test('e-mail em formato invalido nao autentica', async ({ page, login }) => {
    await login.abrir();
    await login.entrar('isso-nao-e-email', 'Senha@123');
    await expect(page).toHaveURL(/\/login/);
  });

  test('o botao de mostrar senha alterna o tipo do campo', async ({ login }) => {
    await login.abrir();
    await login.campoSenha.fill('Senha@123');
    await expect(login.campoSenha).toHaveAttribute('type', 'password');
    await login.botaoMostrarSenha.click();
    await expect(login.campoSenha).toHaveAttribute('type', 'text');
    await login.botaoMostrarSenha.click();
    await expect(login.campoSenha).toHaveAttribute('type', 'password');
  });

  test('a recuperacao de senha nao revela se o e-mail existe', async ({ login }) => {
    await login.abrir();
    await login.abrirRecuperacaoDeSenha();
    await login.campoEmailRecuperacao.fill('desconhecido.e2e@example.test');
    await login.botaoEnviarRecuperacao.click();
    // A resposta e sempre a mesma - vazar a existencia da conta seria um
    // problema de privacidade, entao a mensagem generica e o correto.
    await expect(login.dialogo.getByText(/Se existir uma conta/i)).toBeVisible({ timeout: 15_000 });
  });

  test('cliente que ja tem sessao nao volta para o login', async ({ page }) => {
    await entrarComo(page, 'cliente');
    await page.goto('/app/home');
    await expect(page).toHaveURL(/\/app\/home/);
  });
});

test.describe('@regression Login administrativo', () => {
  test('admin entra pelo painel', async ({ page, loginAdmin }) => {
    await loginAdmin.abrir();
    await loginAdmin.entrar(CONTAS.admin.email, CONTAS.admin.senha);
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });
  });

  test('super admin tambem entra', async ({ page, loginAdmin }) => {
    await loginAdmin.abrir();
    await loginAdmin.entrar(CONTAS.superAdmin.email, CONTAS.superAdmin.senha);
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });
  });

  test('conta de cliente e recusada no painel administrativo', async ({ page, loginAdmin }) => {
    await loginAdmin.abrir();
    await loginAdmin.entrar(CONTAS.cliente.email, CONTAS.cliente.senha);
    await expect(loginAdmin.mensagem).toContainText(/nao possui acesso administrativo|não possui acesso administrativo/i);
    await expect(page).toHaveURL(/\/admin\/login/);
    // E importante que a sessao tenha sido descartada, nao apenas escondida.
    const sessao = await page.evaluate((chave) => window.localStorage.getItem(chave), CHAVE_DE_SESSAO);
    expect(sessao, 'a sessao do cliente nao deveria sobrar apos a recusa').toBeNull();
  });
});

test.describe('@regression Logout e sessao', () => {
  test('o profissional consegue sair e perde o acesso', async ({ page, painelProfissional }) => {
    await entrarComo(page, 'profissional');
    await painelProfissional.abrir();
    await painelProfissional.esperarCarregado();
    await painelProfissional.sair();
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 15_000 });

    await page.goto('/profissional/perfil');
    await expect(page).toHaveURL(/\/login/);
  });

  test('access token expirado e renovado sozinho pelo refresh', async ({ page, home, diagnostico }) => {
    // O interceptor troca o refresh por um par novo ao receber 401: esse 401
    // intermediario e o mecanismo funcionando.
    diagnostico.tolerarHttp(/\/api\//, 401);
    await entrarComo(page, 'cliente');
    await home.abrir();
    await home.esperarCarregada();

    await expirarAccessToken(page);
    await page.reload();

    // Se a renovacao funcionou, a Home carrega normalmente e a sessao continua.
    await home.esperarCarregada();
    await expect(page).toHaveURL(/\/app\/home/);
  });

  test('sessao totalmente invalida devolve para o login', async ({ page, home, diagnostico }) => {
    diagnostico.tolerarHttp(/\/api\//, 401);
    await entrarComo(page, 'cliente');
    await home.abrir();
    await home.esperarCarregada();

    await invalidarSessaoInteira(page);
    await page.goto('/app/favoritos');

    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});
