import { GeminiProvider, GeminiProviderError } from './gemini.provider';
import { ProblemAnalysisInput } from './ai-provider.interface';

const input: ProblemAnalysisInput = {
  text: 'meu chuveiro queimou',
  categories: [{ id: 'electrician', name: 'Eletricista', services: [{ id: 'service-shower', name: 'Chuveiro' }] }],
  model: 'gemini-2.5-flash-lite',
  apiKey: 'chave-de-teste',
  endpointUrl: null,
  temperature: 0.2,
  maxOutputTokens: 500,
  timeoutMs: 5000,
};

const geminiReply = (text: string) => ({
  ok: true,
  json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
});

describe('GeminiProvider', () => {
  const provider = new GeminiProvider();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('interpreta uma resposta válida do Gemini', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      geminiReply(JSON.stringify({ categoryId: 'electrician', serviceIds: ['service-shower'], normalizedProblem: 'Chuveiro não funciona.', confidence: 0.96, needsClarification: false, clarificationQuestion: null })),
    ) as never;

    const result = await provider.analyzeProblem(input);

    expect(result).toEqual({
      categoryId: 'electrician',
      serviceIds: ['service-shower'],
      normalizedProblem: 'Chuveiro não funciona.',
      confidence: 0.96,
      needsClarification: false,
      clarificationQuestion: null,
    });
  });

  it('aceita resposta envolvida em bloco markdown', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      geminiReply('```json\n{"categoryId":"electrician","serviceIds":[],"normalizedProblem":"x","confidence":0.5,"needsClarification":false,"clarificationQuestion":null}\n```'),
    ) as never;

    const result = await provider.analyzeProblem(input);

    expect(result.categoryId).toBe('electrician');
  });

  it('falha de forma explícita quando o Gemini retorna JSON inválido', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiReply('desculpe, não entendi o pedido')) as never;

    await expect(provider.analyzeProblem(input)).rejects.toThrow(GeminiProviderError);
  });

  it('falha quando a chamada estoura o timeout', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('The operation was aborted')));
      });
    }) as never;

    await expect(provider.analyzeProblem({ ...input, timeoutMs: 10 })).rejects.toThrow(/Tempo limite/);
  });

  it('falha quando a API responde com erro HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve('rate limited') }) as never;

    await expect(provider.analyzeProblem(input)).rejects.toThrow(/status 429/);
  });

  it('falha quando não há chave de API configurada', async () => {
    global.fetch = jest.fn() as never;

    await expect(provider.analyzeProblem({ ...input, apiKey: '' })).rejects.toThrow(/Chave de API/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('nunca envia a chave de API no corpo da requisição', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      geminiReply(JSON.stringify({ categoryId: 'electrician', serviceIds: [], normalizedProblem: '', confidence: 0.9, needsClarification: false, clarificationQuestion: null })),
    );
    global.fetch = fetchMock as never;

    await provider.analyzeProblem(input);

    const [, init] = fetchMock.mock.calls[0];
    expect(String(init.body)).not.toContain('chave-de-teste');
  });

  it('testConnection devolve ok=false com a mensagem de erro em vez de lançar', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('unauthorized') }) as never;

    const result = await provider.testConnection({ apiKey: 'errada', model: 'gemini-2.5-flash-lite', endpointUrl: null, timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/401/);
  });
});
