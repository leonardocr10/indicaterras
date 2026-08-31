import type { Page, Route } from '@playwright/test';

/**
 * Item 9: os testes de IA nao podem depender da Gemini de verdade - seria lento,
 * instavel e pago. Interceptamos a resposta da propria API do IndicaFacil
 * (`POST /api/ai/problem-analysis`), que e o contrato que a Home consome.
 *
 * O item 11 (fallback) e coberto pelos cenarios de erro daqui: timeout, erro
 * HTTP, JSON invalido, baixa confianca e limite excedido.
 */

export interface RespostaDeAnalise {
  message?: string;
  confidence?: number;
  usedAi?: boolean;
  usedFallback?: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  services?: Array<{ id: string; name: string; slug: string }>;
  summary?: string | null;
}

const ROTA_ANALISE = '**/api/ai/problem-analysis';

function envelope(dados: RespostaDeAnalise) {
  return JSON.stringify({ data: dados });
}

/** Resposta feliz: categoria e servicos identificados com confianca alta. */
export async function mockIaSucesso(page: Page, resposta: Partial<RespostaDeAnalise> = {}) {
  await page.route(ROTA_ANALISE, async (rota: Route) => {
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        message: 'Encontramos o servico ideal para voce.',
        confidence: 0.95,
        usedAi: true,
        usedFallback: false,
        needsClarification: false,
        clarificationQuestion: null,
        category: { id: 'cat-eletricista', name: 'Eletricista', slug: 'eletricista' },
        services: [
          { id: 'srv-chuveiro', name: 'Chuveiro eletrico', slug: 'chuveiro-eletrico' },
          { id: 'srv-disjuntor', name: 'Troca de disjuntor', slug: 'troca-de-disjuntor' },
        ],
        summary: 'Chuveiro queimado, provavel resistencia ou disjuntor.',
        ...resposta,
      }),
    });
  });
}

/** A IA nao entendeu e devolve uma pergunta de esclarecimento. */
export async function mockIaPedindoEsclarecimento(page: Page) {
  await mockIaSucesso(page, {
    message: 'Preciso de mais um detalhe.',
    confidence: 0.4,
    needsClarification: true,
    clarificationQuestion: 'O problema e so no chuveiro ou a casa toda ficou sem luz?',
    category: null,
    services: [],
  });
}

/** Confianca abaixo do minimo: o app deve cair no texto de baixa confianca. */
export async function mockIaBaixaConfianca(page: Page) {
  await mockIaSucesso(page, {
    message: 'Nao tenho certeza. Pode dar mais detalhes?',
    confidence: 0.2,
    usedAi: true,
    usedFallback: true,
    category: null,
    services: [],
  });
}

/** Fallback: a IA falhou e o matcher por palavras-chave resolveu. */
export async function mockIaComFallbackDeKeywords(page: Page) {
  await mockIaSucesso(page, {
    message: 'Nao consegui analisar agora, mas achei por palavras-chave.',
    confidence: 0.6,
    usedAi: false,
    usedFallback: true,
  });
}

/** Erro HTTP do provedor. */
export async function mockIaErroHttp(page: Page, status = 500) {
  await page.route(ROTA_ANALISE, async (rota: Route) => {
    await rota.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Falha ao consultar o provedor de IA.', statusCode: status }),
    });
  });
}

/** Limite de uso estourado (429). */
export async function mockIaLimiteExcedido(page: Page) {
  await page.route(ROTA_ANALISE, async (rota: Route) => {
    await rota.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Limite diario de analises atingido.', statusCode: 429 }),
    });
  });
}

/** JSON quebrado: o app nao pode explodir na tela do usuario. */
export async function mockIaJsonInvalido(page: Page) {
  await page.route(ROTA_ANALISE, async (rota: Route) => {
    await rota.fulfill({ status: 200, contentType: 'application/json', body: '{"data": {"category": ' });
  });
}

/**
 * Timeout: a requisicao fica pendurada. `atrasoMs` maior que o timeout do app
 * (15s por padrao) faz o cliente desistir, que e o que queremos observar.
 */
export async function mockIaTimeout(page: Page, atrasoMs = 20_000) {
  await page.route(ROTA_ANALISE, async (rota: Route) => {
    await new Promise((resolve) => setTimeout(resolve, atrasoMs));
    await rota.abort('timedout');
  });
}

/** Remove qualquer mock e deixa a chamada seguir para a API real. */
export async function usarIaReal(page: Page) {
  await page.unroute(ROTA_ANALISE);
}
