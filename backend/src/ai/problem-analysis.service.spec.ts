import { ProblemAnalysisService } from './problem-analysis.service';
import { AiProviderFactory } from './provider-factory';
import { GeminiProviderError } from './providers/gemini.provider';

const decimal = (value: number) => ({ toNumber: () => value }) as never;

const categories = [
  {
    id: 'electrician',
    name: 'Eletricista',
    slug: 'eletricista',
    group: { id: 'group-home', name: 'Casa e manutenção', slug: 'casa-e-manutencao' },
    services: [
      { id: 'service-shower', categoryId: 'electrician', name: 'Chuveiro', slug: 'chuveiro', aliases: [{ alias: 'chuveiro queimou' }] },
      { id: 'service-breaker', categoryId: 'electrician', name: 'Disjuntores', slug: 'disjuntores', aliases: [{ alias: 'disjuntor cai' }] },
    ],
  },
  {
    id: 'plumber',
    name: 'Encanador',
    slug: 'encanador',
    group: { id: 'group-home', name: 'Casa e manutenção', slug: 'casa-e-manutencao' },
    services: [{ id: 'service-leak', categoryId: 'plumber', name: 'Vazamento', slug: 'vazamento', aliases: [{ alias: 'pia vazando' }] }],
  },
];

const settings = (overrides: Record<string, unknown> = {}) => ({
  id: 'settings-1',
  enabled: true,
  provider: 'gemini',
  model: 'gemini-3.5-flash-lite',
  apiKey: 'chave',
  endpointUrl: null,
  temperature: decimal(0.2),
  maxOutputTokens: 500,
  timeoutMs: 15000,
  problemAnalysisEnabled: true,
  clarificationEnabled: true,
  fallbackKeywordsEnabled: true,
  minimumConfidence: decimal(0.75),
  autoApplyConfidence: decimal(0.85),
  dailyLimit: 500,
  monthlyLimit: 10000,
  maxInputLength: 500,
  successMessage: 'Entendi o que você precisa.',
  lowConfidenceMessage: 'Encontrei algumas possibilidades. Confirme para continuar.',
  fallbackMessage: 'Encontramos serviços relacionados ao que você descreveu.',
  ...overrides,
});

const build = (options: { settings?: Record<string, unknown>; analyze?: jest.Mock; aiCallCount?: number } = {}) => {
  const currentSettings = settings(options.settings);
  const catalogService = {
    activeCategories: jest.fn().mockResolvedValue(categories),
    professionalsForCategory: jest.fn().mockResolvedValue([{ id: 'pro-1', name: 'João Elétrica' }]),
    match: jest.fn().mockResolvedValue({
      confidence: 0.9,
      group: categories[0].group,
      category: { id: 'electrician', name: 'Eletricista', slug: 'eletricista' },
      services: [{ id: 'service-shower', categoryId: 'electrician', name: 'Chuveiro', slug: 'chuveiro', score: 90 }],
      alternativeServices: [],
      professionals: [{ id: 'pro-1', name: 'João Elétrica' }],
    }),
  };
  const settingsService = {
    getRaw: jest.fn().mockResolvedValue(currentSettings),
    getResolvedApiKey: jest.fn().mockResolvedValue(currentSettings.apiKey),
  };
  const logsService = {
    record: jest.fn().mockResolvedValue(null),
    countAiCallsSince: jest.fn().mockResolvedValue(options.aiCallCount ?? 0),
  };
  const analyze = options.analyze ?? jest.fn();
  const providerFactory = { getProvider: jest.fn().mockReturnValue({ analyzeProblem: analyze, testConnection: jest.fn() }) } as unknown as AiProviderFactory;

  const service = new ProblemAnalysisService(catalogService as never, settingsService as never, logsService as never, providerFactory);
  return { service, catalogService, logsService, analyze, settingsService };
};

describe('ProblemAnalysisService', () => {
  it('usa o matcher local quando a IA está desativada, sem chamar o provedor', async () => {
    const { service, analyze, catalogService } = build({ settings: { enabled: false } });

    const result = await service.analyze('meu chuveiro queimou');

    expect(analyze).not.toHaveBeenCalled();
    expect(catalogService.match).toHaveBeenCalledWith('meu chuveiro queimou');
    expect(result.usedAi).toBe(false);
    expect(result.usedFallback).toBe(true);
    expect(result.category?.name).toBe('Eletricista');
  });

  it('usa a IA quando ativa e devolve categoria e serviços validados', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: ['service-shower', 'service-breaker'],
      normalizedProblem: 'Chuveiro não funciona e o disjuntor desarma.',
      confidence: 0.96,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service } = build({ analyze });

    const result = await service.analyze('meu chuveiro queimou e cai o disjuntor');

    expect(result.usedAi).toBe(true);
    expect(result.usedFallback).toBe(false);
    expect(result.category?.name).toBe('Eletricista');
    expect(result.services.map((item) => item.name)).toEqual(['Chuveiro', 'Disjuntores']);
    expect(result.normalizedProblem).toBe('Chuveiro não funciona e o disjuntor desarma.');
    expect(result.suggestedActions).toEqual(['view_professionals', 'request_proposals']);
  });

  it('descarta serviços inventados pela IA que não existem no catálogo', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: ['service-shower', 'service-inexistente', '../../etc/passwd'],
      normalizedProblem: 'Chuveiro queimado.',
      confidence: 0.9,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service } = build({ analyze });

    const result = await service.analyze('meu chuveiro queimou');

    expect(result.services.map((item) => item.id)).toEqual(['service-shower']);
  });

  it('descarta serviços que existem mas pertencem a outra categoria', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: ['service-leak'],
      normalizedProblem: 'x',
      confidence: 0.9,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service } = build({ analyze });

    const result = await service.analyze('meu chuveiro queimou');

    expect(result.services).toEqual([]);
  });

  it('cai no matcher local quando a IA retorna uma categoria inexistente', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'categoria-inventada',
      serviceIds: [],
      normalizedProblem: 'x',
      confidence: 0.99,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service, catalogService } = build({ analyze });

    const result = await service.analyze('meu chuveiro queimou');

    expect(catalogService.match).toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
    expect(result.category?.name).toBe('Eletricista');
  });

  it('cai no matcher local quando a IA falha, sem propagar o erro técnico ao cliente', async () => {
    const analyze = jest.fn().mockRejectedValue(new GeminiProviderError('Tempo limite de 15000ms excedido ao chamar o Gemini.'));
    const { service } = build({ analyze });

    const result = await service.analyze('meu chuveiro queimou');

    expect(result.usedFallback).toBe(true);
    expect(result.message).toBe('Encontramos serviços relacionados ao que você descreveu.');
    expect(JSON.stringify(result)).not.toContain('Gemini');
  });

  it('não chama a IA quando o limite diário já foi atingido', async () => {
    const analyze = jest.fn();
    const { service, logsService } = build({ analyze, aiCallCount: 500, settings: { dailyLimit: 500 } });

    const result = await service.analyze('meu chuveiro queimou');

    expect(analyze).not.toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
    expect(logsService.record).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: 'daily_limit_reached' }));
  });

  it('pede esclarecimento quando a confiança fica abaixo do mínimo configurado', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: ['service-shower'],
      normalizedProblem: 'Carro não liga.',
      confidence: 0.52,
      needsClarification: true,
      clarificationQuestion: 'Quando você tenta ligar o carro, o painel acende normalmente?',
    });
    const { service } = build({ analyze });

    const result = await service.analyze('meu carro nao pega');

    expect(result.needsClarification).toBe(true);
    expect(result.clarificationQuestion).toBe('Quando você tenta ligar o carro, o painel acende normalmente?');
    expect(result.message).toBe('Encontrei algumas possibilidades. Confirme para continuar.');
  });

  it('registra o log da análise com a origem correta', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: ['service-shower'],
      normalizedProblem: 'Chuveiro queimado.',
      confidence: 0.96,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service, logsService } = build({ analyze });

    await service.analyze('meu chuveiro queimou', { userId: 'user-1' });

    expect(logsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', usedAi: true, usedFallback: false, status: 'success', matchedCategoryId: 'electrician' }),
    );
  });

  it('não registra log quando roda em modo de teste do admin', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: ['service-shower'],
      normalizedProblem: 'x',
      confidence: 0.96,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service, logsService } = build({ analyze });

    await service.analyze('meu chuveiro queimou', { dryRun: true });

    expect(logsService.record).not.toHaveBeenCalled();
  });

  it('não chama a IA quando não há chave de API configurada', async () => {
    const analyze = jest.fn();
    const { service, settingsService } = build({ analyze, settings: { apiKey: null } });
    settingsService.getResolvedApiKey.mockResolvedValue(null);

    const result = await service.analyze('meu chuveiro queimou');

    expect(analyze).not.toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
  });

  it('devolve resposta vazia sem chamar IA nem matcher para texto em branco', async () => {
    const analyze = jest.fn();
    const { service, catalogService } = build({ analyze });

    const result = await service.analyze('   ');

    expect(analyze).not.toHaveBeenCalled();
    expect(catalogService.match).not.toHaveBeenCalled();
    expect(result.category).toBeNull();
  });

  it('trunca a entrada no limite configurado antes de enviar à IA', async () => {
    const analyze = jest.fn().mockResolvedValue({
      categoryId: 'electrician',
      serviceIds: [],
      normalizedProblem: 'x',
      confidence: 0.9,
      needsClarification: false,
      clarificationQuestion: null,
    });
    const { service } = build({ analyze, settings: { maxInputLength: 20 } });

    await service.analyze('a'.repeat(500));

    expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ text: 'a'.repeat(20) }));
  });
});
