import { test, expect } from '../../fixtures/teste-base';
import { env } from '../../env';
import { autenticarPelaApi } from '../../fixtures/sessao';
import { CONTAS } from '../../fixtures/contas';

/**
 * Item 13 da especificacao: o profissional recebe a oportunidade.
 *
 * ESTADO DO RECURSO (verificado no codigo em 31/08/2026):
 *   - Ver oportunidades   -> EXISTE, desde o commit 55eae07.
 *   - Enviar proposta     -> NAO EXISTE. Nao ha modelo Proposal no Prisma nem
 *                            endpoint de envio; `professional-dashboard.service.ts`
 *                            registra em comentario: "O sistema ainda nao
 *                            registra proposta enviada".
 *
 * Por isso a listagem e testada de verdade aqui, e o envio/aceite continua como
 * `fixme` no fim do arquivo, junto do sentinela que avisa quando nascer.
 *
 * O casamento e por categoria OU servico, restrito ao raio do profissional. O
 * seed posiciona tudo para que o resultado seja exato: o profissional
 * autenticado e eletricista, esta a 1,8 km da origem e tem raio de 10 km.
 */
test.describe('@regression Oportunidades do profissional', () => {
  test.beforeEach(async ({ comoProfissional, oportunidades }) => {
    void comoProfissional;
    await oportunidades.abrir();
    await oportunidades.esperarCarregada();
  });

  test('lista a solicitacao aberta e compativel que esta dentro do raio', async ({ oportunidades }) => {
    const titulos = (await oportunidades.listarTitulos()).join(' | ');
    expect(titulos, 'a solicitacao de eletricista a 1,8 km deveria aparecer').toContain('Chuveiro queimado E2E PERTO');
  });

  test('nao mostra solicitacao fora do raio do profissional', async ({ oportunidades }) => {
    const titulos = (await oportunidades.listarTitulos()).join(' | ');
    // O profissional tem raio de 10 km; esta solicitacao esta a ~38 km dele.
    expect(titulos, 'a solicitacao a 38 km nao deveria entrar num raio de 10 km').not.toContain('Chuveiro queimado E2E LONGE');
  });

  test('nao mostra solicitacao de outra categoria', async ({ oportunidades }) => {
    const titulos = (await oportunidades.listarTitulos()).join(' | ');
    // "Vazamento embaixo da pia" e de encanador; o profissional e eletricista.
    expect(titulos, 'solicitacao de encanador nao e oportunidade para um eletricista').not.toContain('Vazamento embaixo da pia');
  });

  test('nao mostra solicitacao ja encerrada', async ({ oportunidades }) => {
    const titulos = (await oportunidades.listarTitulos()).join(' | ');
    // Mesma categoria e dentro do raio, mas com status CLOSED.
    expect(titulos, 'so solicitacao OPEN vira oportunidade').not.toContain('Chuveiro queimado E2E FECHADA');
  });

  test('o cartao traz o que o profissional precisa para decidir', async ({ oportunidades }) => {
    const cartao = oportunidades.item('Chuveiro queimado E2E PERTO').first();
    await expect(cartao).toBeVisible();
    // Resumo do problema e localizacao aproximada: e o que sustenta a decisao.
    await expect(cartao).toContainText(/dentro do raio|eletricista|Asa Sul/i);
  });

  test('da para voltar para a area do profissional', async ({ page, oportunidades }) => {
    await oportunidades.linkVoltar.click();
    await expect(page).toHaveURL(/\/profissional\/perfil/, { timeout: 15_000 });
  });
});

test.describe('@regression Oportunidades - regras de acesso', () => {
  test('cliente nao alcanca a tela de oportunidades', async ({ page, comoCliente }) => {
    void comoCliente;
    await page.goto('/profissional/oportunidades');
    await expect(page).toHaveURL(/\/app\/home/, { timeout: 15_000 });
  });

  test('sem sessao, a tela manda para o login', async ({ page }) => {
    await page.goto('/profissional/oportunidades');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('a API recusa a listagem sem token', async ({ request }) => {
    const resposta = await request.get(`${env.apiUrl}/me/professional/opportunities?page=1&limit=10`, {
      failOnStatusCode: false,
    });
    expect(resposta.status(), 'a rota de oportunidades precisa exigir autenticacao').toBe(401);
  });

  test('perfil pendente nao recebe oportunidade', async ({ request }) => {
    // O servico marca `blocked` e devolve lista vazia quando o profissional nao
    // esta ativo/aprovado: mostrar servico que ele nao pode atender seria pior.
    const sessao = await autenticarPelaApi(request, CONTAS.profissionalPendente.email, CONTAS.profissionalPendente.senha).catch(
      () => null,
    );
    if (!sessao) test.skip(true, 'A conta pendente nao consegue autenticar neste ambiente.');

    const resposta = await request.get(`${env.apiUrl}/me/professional/opportunities?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${sessao!.accessToken}` },
      failOnStatusCode: false,
    });
    if (!resposta.ok()) test.skip(true, `A API respondeu ${resposta.status()} para o perfil pendente.`);

    const { data } = await resposta.json();
    expect(data.blocked, 'perfil pendente deveria vir marcado como bloqueado').toBeTruthy();
    expect(data.items, 'perfil pendente nao deveria receber oportunidades').toEqual([]);
  });

  test('a paginacao devolve os campos de controle', async ({ request }) => {
    const sessao = await autenticarPelaApi(request, CONTAS.profissional.email, CONTAS.profissional.senha);
    const resposta = await request.get(`${env.apiUrl}/me/professional/opportunities?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${sessao.accessToken}` },
    });
    expect(resposta.ok()).toBeTruthy();

    const { data } = await resposta.json();
    expect(data).toMatchObject({ page: 1, limit: 2, blocked: false });
    expect(typeof data.total).toBe('number');
    expect(data.radiusKm, 'o raio configurado no seed e 10 km').toBe(10);
    expect(Array.isArray(data.items)).toBeTruthy();
  });
});

/**
 * Itens 13 (segunda metade), 14 e 15: envio e aceite de proposta, e o ciclo do
 * servico. Ainda nao existem. Ficam como especificacao executavel.
 */
test.describe('Propostas e ciclo do servico (recurso ainda inexistente)', () => {
  test('@regression sentinela: avisa quando o envio de proposta for criado', async ({ request }) => {
    const sessao = await autenticarPelaApi(request, CONTAS.profissional.email, CONTAS.profissional.senha);
    const cabecalho = { Authorization: `Bearer ${sessao.accessToken}` };

    const candidatos = ['/proposals', '/me/professional/proposals', '/service-requests/proposals'];
    const existentes: string[] = [];
    for (const caminho of candidatos) {
      const resposta = await request.get(`${env.apiUrl}${caminho}`, { headers: cabecalho, failOnStatusCode: false });
      if (resposta.status() !== 404) existentes.push(`${caminho} -> ${resposta.status()}`);
    }

    expect(
      existentes,
      `Parece que o envio de propostas comecou a existir (${existentes.join(', ')}).\n` +
        'Tire os test.fixme abaixo e escreva os testes dos itens 13, 14 e 15.',
    ).toEqual([]);
  });

  test.fixme('o profissional abre a oportunidade e ve as fotos enviadas pelo cliente', async () => {
    // Hoje o cartao mostra `mediaCount`, mas nao ha tela de detalhe da
    // oportunidade com as midias.
  });

  test.fixme('o profissional envia proposta com valor, disponibilidade, duracao e mensagem', async () => {
    // Esperado: a proposta nasce com status SENT.
  });

  test.fixme('o cliente ve as propostas recebidas e consegue ordena-las', async () => {
    // Esperado: lista na solicitacao, ordenavel por valor e por prazo.
  });

  test.fixme('o cliente aceita uma proposta', async () => {
    // Esperado: a escolhida vira ACCEPTED, as demais REJECTED, e a solicitacao
    // passa de OPEN para MATCHED.
  });

  test.fixme('o servico percorre SCHEDULED -> IN_PROGRESS -> COMPLETED', async () => {
    // Esperado: transicoes visiveis para cliente e profissional.
  });

  test.fixme('o servico pode ser cancelado com motivo registrado', async () => {
    // Esperado: status CANCELLED.
  });
});
