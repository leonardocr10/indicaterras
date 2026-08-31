import { test, expect } from '../../fixtures/teste-base';
import { env } from '../../env';
import { autenticarPelaApi } from '../../fixtures/sessao';
import { CONTAS } from '../../fixtures/contas';

/**
 * ITENS 13, 14 e 15 DA ESPECIFICACAO - AINDA NAO IMPLEMENTAVEIS.
 *
 * Estes testes descrevem o fluxo de propostas pedido na especificacao, mas o
 * sistema atual nao tem esse recurso. Levantamento feito no codigo:
 *
 *   - `backend/prisma/schema.prisma` nao tem modelo `Proposal` nem equivalente.
 *   - `ServiceRequestStatus` so tem OPEN, MATCHED, CLOSED e CANCELLED. Nao
 *     existem SENT, ACCEPTED, REJECTED, SCHEDULED, IN_PROGRESS nem COMPLETED.
 *   - `DataStoreService.getServiceRequestsForUser` filtra por `clientId`, entao
 *     o profissional nao enxerga solicitacao nenhuma.
 *   - Nao ha endpoint de envio, listagem ou aceite de proposta.
 *
 * Ficam como `fixme` de proposito: nao quebram a suite, e servem como
 * especificacao executavel de quando o recurso for construido. O teste
 * "sentinela" abaixo roda de verdade e AVISA quando o recurso aparecer.
 */

test.describe('Propostas (recurso ainda inexistente)', () => {
  test('@regression sentinela: avisa quando o recurso de propostas for criado', async ({ request }) => {
    // Se algum destes endpoints passar a existir, esta suite precisa sair do
    // fixme. Melhor descobrir por um teste do que por acaso, meses depois.
    const sessao = await autenticarPelaApi(request, CONTAS.profissional.email, CONTAS.profissional.senha);
    const cabecalho = { Authorization: `Bearer ${sessao.accessToken}` };

    const candidatos = ['/proposals', '/me/professional/opportunities', '/service-requests/opportunities'];
    const existentes: string[] = [];

    for (const caminho of candidatos) {
      const resposta = await request.get(`${env.apiUrl}${caminho}`, { headers: cabecalho, failOnStatusCode: false });
      if (resposta.status() !== 404) existentes.push(`${caminho} -> ${resposta.status()}`);
    }

    expect(
      existentes,
      `Parece que o fluxo de propostas comecou a existir (${existentes.join(', ')}).\n` +
        'Tire os test.fixme deste arquivo e implemente os testes dos itens 13, 14 e 15.',
    ).toEqual([]);
  });

  test.fixme('o profissional visualiza as oportunidades abertas', async () => {
    // Esperado: logado como profissional, uma tela lista as solicitacoes OPEN
    // compativeis com as categorias e a regiao dele.
  });

  test.fixme('o profissional abre a solicitacao e ve problema e fotos', async () => {
    // Esperado: descricao, servicos, urgencia, local aproximado e as midias
    // anexadas pelo cliente.
  });

  test.fixme('o profissional envia uma proposta com valor, disponibilidade, duracao e mensagem', async () => {
    // Esperado: apos enviar, a proposta fica com status SENT.
  });

  test.fixme('o cliente ve as propostas recebidas e consegue ordena-las', async () => {
    // Esperado: lista de propostas na solicitacao, ordenavel por valor e prazo.
  });

  test.fixme('o cliente aceita uma proposta', async () => {
    // Esperado: a escolhida vira ACCEPTED, as demais REJECTED e a solicitacao
    // passa para MATCHED.
  });

  test.fixme('o servico percorre SCHEDULED -> IN_PROGRESS -> COMPLETED', async () => {
    // Esperado: transicoes de status visiveis para os dois lados.
  });

  test.fixme('o servico pode ser cancelado', async () => {
    // Esperado: status CANCELLED, com o motivo registrado.
  });
});
