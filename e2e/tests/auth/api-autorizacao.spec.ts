import { test, expect } from '../../fixtures/teste-base';
import { env } from '../../env';
import { autenticarPelaApi } from '../../fixtures/sessao';
import { CONTAS } from '../../fixtures/contas';

/**
 * A API tem porteiro.
 *
 * Estes testes existem por causa de uma falha real: ate 31/08/2026 nenhuma rota
 * do `ResourcesController` usava `JwtAuthGuard`, e `GET /api/admin/residents`
 * respondia 200 em producao para qualquer pessoa, sem token. A identidade
 * tambem viajava como `?userId=`, entao trocar o id na URL lia os dados de
 * outra conta.
 *
 * Cada expectativa aqui e a prova de que aquele buraco continua fechado.
 */

const ROTAS_ADMINISTRATIVAS = [
  '/admin/residents',
  '/admin/professionals',
  '/admin/users',
  '/admin-pending',
  '/admin-settings',
  '/admin-reports',
  '/dashboard',
  '/users',
  '/reports',
];

const ROTAS_DE_SESSAO = [
  '/me/account',
  '/me/professional/dashboard',
  '/me/professional/favorites',
  '/me/professional/reviews',
  '/favorites',
  '/recommendations',
  '/notifications',
  '/service-requests',
  '/dashboard/home',
];

const ROTAS_PUBLICAS = ['/categories', '/professionals', '/public-settings', '/condominiums'];

test.describe('@regression autorizacao da API', () => {
  test('rota administrativa recusa quem nao tem token', async ({ request }) => {
    for (const rota of ROTAS_ADMINISTRATIVAS) {
      const resposta = await request.get(`${env.apiUrl}${rota}`);
      expect(resposta.status(), `${rota} sem token deveria ser 401`).toBe(401);
    }
  });

  test('rota de sessao recusa quem nao tem token', async ({ request }) => {
    for (const rota of ROTAS_DE_SESSAO) {
      const resposta = await request.get(`${env.apiUrl}${rota}`);
      expect(resposta.status(), `${rota} sem token deveria ser 401`).toBe(401);
    }
  });

  test('cliente autenticado nao alcanca rota administrativa', async ({ request }) => {
    const sessao = await autenticarPelaApi(request, CONTAS.cliente.email, CONTAS.cliente.senha);
    const cabecalhos = { Authorization: `Bearer ${sessao.accessToken}` };

    for (const rota of ROTAS_ADMINISTRATIVAS) {
      const resposta = await request.get(`${env.apiUrl}${rota}`, { headers: cabecalhos });
      expect(resposta.status(), `${rota} com token de cliente deveria ser 403`).toBe(403);
    }
  });

  test('userId na URL nao troca a identidade', async ({ request }) => {
    const cliente = await autenticarPelaApi(request, CONTAS.cliente.email, CONTAS.cliente.senha);
    const outro = await autenticarPelaApi(request, CONTAS.clienteSecundario.email, CONTAS.clienteSecundario.senha);

    // Pedindo a conta do outro cliente, com o token do primeiro.
    const resposta = await request.get(`${env.apiUrl}/me/account?userId=${outro.user.id}`, {
      headers: { Authorization: `Bearer ${cliente.accessToken}` },
    });

    expect(resposta.ok()).toBeTruthy();
    const corpo = await resposta.json();
    expect(corpo.data.id, 'a API deve devolver a conta do dono do token').toBe(cliente.user.id);
    expect(corpo.data.email).toBe(CONTAS.cliente.email);
  });

  test('navegacao publica continua aberta', async ({ request }) => {
    for (const rota of ROTAS_PUBLICAS) {
      const resposta = await request.get(`${env.apiUrl}${rota}`);
      expect(resposta.ok(), `${rota} deveria continuar publica`).toBeTruthy();
    }
  });
});
