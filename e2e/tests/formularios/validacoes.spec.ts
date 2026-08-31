import { test, expect } from '../../fixtures/teste-base';
import { CONTAS, SENHA_PADRAO } from '../../fixtures/contas';

/** Item 27: validacoes de formulario. */
test.describe('@regression Validacoes do cadastro', () => {
  test.beforeEach(async ({ cadastro }) => {
    await cadastro.abrir();
  });

  test('campos obrigatorios impedem avancar de passo', async ({ cadastro }) => {
    await cadastro.botaoContinuar.click();
    // Sem nome, e-mail e telefone, o passo 1 nao pode ser concluido.
    await expect(cadastro.nome).toBeVisible();
    await expect(cadastro.email).toBeVisible();
  });

  test('e-mail em formato invalido e recusado', async ({ cadastro }) => {
    await cadastro.nome.fill('Teste E2E');
    await cadastro.email.fill('email-sem-arroba');
    await cadastro.whatsapp.fill('(61) 90000-0000');
    await cadastro.botaoContinuar.click();
    await expect(cadastro.email).toHaveClass(/ng-invalid/, { timeout: 10_000 });
  });

  test('telefone incompleto e recusado', async ({ cadastro }) => {
    await cadastro.nome.fill('Teste E2E');
    await cadastro.email.fill('teste.valido.e2e@example.test');
    await cadastro.whatsapp.fill('123');
    await cadastro.botaoContinuar.click();
    await expect(cadastro.whatsapp).toHaveClass(/ng-invalid/, { timeout: 10_000 });
  });

  test('a mascara de telefone formata o que foi digitado', async ({ cadastro }) => {
    await cadastro.whatsapp.fill('61900001111');
    // A diretiva appPhoneMask deve inserir parenteses e hifen.
    await expect(cadastro.whatsapp).toHaveValue(/\(\d{2}\)\s?\d{4,5}-\d{4}/, { timeout: 10_000 });
  });

  test('e-mail ja cadastrado e recusado com mensagem', async ({ cadastro, page, diagnostico }) => {
    diagnostico.tolerarHttp(/\/auth\/register/, 400);
    diagnostico.tolerarHttp(/\/auth\/register/, 409);

    await cadastro.cadastrarCliente({
      nome: 'Duplicado E2E',
      email: CONTAS.cliente.email,
      telefone: '(61) 90000-9999',
      senha: SENHA_PADRAO,
      cep: '70000-000',
      numero: '1',
      bairro: 'Asa Sul',
      cidade: 'Brasilia',
      estado: 'DF',
    });

    await expect(cadastro.mensagem.or(page.locator('.toast, [role="alert"]'))).toBeVisible({ timeout: 25_000 });
  });

  test('o medidor de forca da senha reage ao que e digitado', async ({ cadastro }) => {
    await cadastro.nome.fill('Teste E2E');
    await cadastro.email.fill(`forca.${Date.now()}.e2e@example.test`);
    await cadastro.whatsapp.fill('(61) 90000-0000');
    await cadastro.botaoContinuar.click();
    if (await cadastro.cep.count()) await cadastro.botaoContinuar.click();

    await cadastro.senha.fill('123');
    const fraca = await cadastro.forcaDaSenha.getAttribute('aria-valuenow');
    await cadastro.senha.fill('Senha@Muito#Forte2026');
    const forte = await cadastro.forcaDaSenha.getAttribute('aria-valuenow');
    expect(Number(forte)).toBeGreaterThan(Number(fraca));
  });

  test('o tipo profissional troca os campos do formulario', async ({ cadastro }) => {
    if (!(await cadastro.seletorDeTipo.count())) {
      test.skip(true, 'O auto-cadastro de profissional esta desligado nas configuracoes.');
    }
    await cadastro.escolherTipoProfissional();
    await cadastro.nome.fill('Profissional Novo E2E');
    await cadastro.email.fill(`prof.${Date.now()}.e2e@example.test`);
    await cadastro.whatsapp.fill('(61) 90000-8888');
    await cadastro.botaoContinuar.click();

    // O passo 2 do profissional traz empresa, categoria e horarios.
    await expect(cadastro.empresa).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('@regression Validacoes gerais de formulario', () => {
  test('clique duplo em Entrar nao envia o login duas vezes', async ({ page, login, diagnostico }) => {
    diagnostico.tolerarHttp(/\/auth\/login/);
    await login.abrir();
    await login.preencher(CONTAS.cliente.email, CONTAS.cliente.senha);

    const envios: string[] = [];
    page.on('request', (requisicao) => {
      if (requisicao.url().includes('/auth/login') && requisicao.method() === 'POST') envios.push(requisicao.url());
    });

    await login.botaoEntrar.dblclick();
    await page.waitForURL(/\/app\/home/, { timeout: 25_000 }).catch(() => undefined);
    expect(envios.length, `o login foi enviado ${envios.length} vezes`).toBeLessThanOrEqual(1);
  });

  test('texto muito longo no comentario respeita o limite', async ({ comoCliente, comentarios, request }) => {
    void comoCliente;
    const { env } = await import('../../env');
    const { autenticarPelaApi } = await import('../../fixtures/sessao');
    const sessao = await autenticarPelaApi(request, CONTAS.cliente.email, CONTAS.cliente.senha);
    const lista = await request.get(`${env.apiUrl}/professionals`, {
      headers: { Authorization: `Bearer ${sessao.accessToken}` },
    });
    const id = ((await lista.json()).data as Array<{ id: string }>)[0].id;

    await comentarios.abrir(id, true);
    await comentarios.campoComentario.fill('a'.repeat(1000));
    const valor = await comentarios.campoComentario.inputValue();
    // O textarea declara maxlength=700.
    expect(valor.length).toBeLessThanOrEqual(700);
  });

  test('caracteres especiais na busca nao quebram a tela', async ({ comoCliente, busca }) => {
    void comoCliente;
    await busca.abrirLista();
    for (const termo of ['<script>alert(1)</script>', "'; DROP TABLE users; --", '%%%', 'ãçõ "aspas"']) {
      await busca.buscarPorTexto(termo);
      // O criterio e nao quebrar: a tela continua respondendo, com resultado
      // ou com o estado vazio.
      await expect(busca.cartoes.first().or(busca.vazio)).toBeVisible({ timeout: 20_000 });
    }
  });

  test('a API recusa payload com campo desconhecido', async ({ request }) => {
    const { env } = await import('../../env');
    // O ValidationPipe usa forbidNonWhitelisted: campo estranho deve dar 400.
    const resposta = await request.post(`${env.apiUrl}/auth/login`, {
      data: { email: CONTAS.cliente.email, password: CONTAS.cliente.senha, rememberMe: true, campoIntruso: 'x' },
      failOnStatusCode: false,
    });
    expect(resposta.status(), 'campo nao declarado deveria ser recusado com 400').toBe(400);
  });
});
