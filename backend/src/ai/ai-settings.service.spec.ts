import { AiSettingsService, maskApiKey } from './ai-settings.service';

const decimal = (value: number) => ({ toNumber: () => value }) as never;

const settingsRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'settings-1',
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  apiKey: 'AIzaSyTOP-SECRET-1234',
  endpointUrl: null,
  temperature: decimal(0.2),
  maxOutputTokens: 500,
  timeoutMs: 15000,
  problemAnalysisEnabled: true,
  categorySuggestionEnabled: true,
  serviceSuggestionEnabled: true,
  summaryEnabled: true,
  clarificationEnabled: true,
  fallbackKeywordsEnabled: true,
  minimumConfidence: decimal(0.75),
  autoApplyConfidence: decimal(0.85),
  dailyLimit: 500,
  monthlyLimit: 10000,
  maxInputLength: 500,
  homeTitle: 'Conte o que aconteceu',
  homeSubtitle: 'Subtitulo',
  homePlaceholder: 'Ex.: meu chuveiro queimou',
  homeHelperText: 'Ajuda',
  successMessage: 'Entendi',
  lowConfidenceMessage: 'Confirme',
  fallbackMessage: 'Relacionados',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildService = (row = settingsRow()) => {
  const findFirst = jest.fn().mockResolvedValue(row);
  const create = jest.fn();
  const update = jest.fn().mockImplementation(({ data }) => Promise.resolve(settingsRow(data)));
  const prisma = { aiSettings: { findFirst, create, update } } as never;
  return { service: new AiSettingsService(prisma), findFirst, create, update };
};

describe('maskApiKey', () => {
  it('mostra apenas os últimos 4 caracteres', () => {
    expect(maskApiKey('AIzaSyTOP-SECRET-1234')).toBe('****1234');
  });

  it('mascara totalmente chaves muito curtas e trata ausência', () => {
    expect(maskApiKey('ab')).toBe('****');
    expect(maskApiKey(null)).toBeNull();
  });
});

describe('AiSettingsService', () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('cria a linha de configuração padrão quando ainda não existe', async () => {
    const created = settingsRow({ apiKey: null });
    const create = jest.fn().mockResolvedValue(created);
    const prisma = { aiSettings: { findFirst: jest.fn().mockResolvedValue(null), create, update: jest.fn() } } as never;
    const service = new AiSettingsService(prisma);

    const settings = await service.getRaw();

    expect(create).toHaveBeenCalledTimes(1);
    expect(settings.enabled).toBe(false);
  });

  it('mantém cache de 60s e evita consultar o banco a cada leitura', async () => {
    const { service, findFirst } = buildService();

    await service.getRaw();
    await service.getRaw();
    await service.getRaw();

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('invalida o cache ao salvar as configurações', async () => {
    const { service, findFirst, update } = buildService();
    await service.getRaw();

    await service.update({ enabled: true });

    expect(update).toHaveBeenCalledTimes(1);
    // O valor atualizado passa a vir do cache renovado, sem nova leitura no banco.
    const settings = await service.getRaw();
    expect(settings.enabled).toBe(true);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('nunca devolve a api key completa para o painel admin', async () => {
    const { service } = buildService();

    const masked = await service.getMasked();

    expect(masked.apiKey).toBe('****1234');
    expect(JSON.stringify(masked)).not.toContain('AIzaSyTOP-SECRET-1234');
    expect(masked.apiKeySource).toBe('database');
  });

  it('não sobrescreve a api key salva quando recebe de volta o valor mascarado', async () => {
    const { service, update } = buildService();

    await service.update({ apiKey: '****1234', model: 'gemini-2.5-flash' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { model: 'gemini-2.5-flash' } }));
  });

  it('dá prioridade à api key vinda da variável de ambiente', async () => {
    process.env.GEMINI_API_KEY = 'chave-do-ambiente';
    const { service } = buildService();
    const settings = await service.getRaw();

    expect(await service.getResolvedApiKey(settings)).toBe('chave-do-ambiente');
    expect((await service.getMasked()).apiKeySource).toBe('env');
  });

  it('assume IA desativada quando o banco está indisponível, sem derrubar a configuração pública', async () => {
    const prisma = { aiSettings: { findFirst: jest.fn().mockRejectedValue(new Error('database unavailable')), create: jest.fn(), update: jest.fn() } } as never;
    const service = new AiSettingsService(prisma);

    const publicConfig = await service.getPublicConfig();

    expect(publicConfig.enabled).toBe(false);
    expect(publicConfig.homeTitle).toBe('Conte o que aconteceu');
  });

  it('expõe apenas textos públicos na configuração do app, sem segredos', async () => {
    const { service } = buildService();

    const publicConfig = await service.getPublicConfig();

    expect(publicConfig).toEqual({
      enabled: false,
      homeTitle: 'Conte o que aconteceu',
      homeSubtitle: 'Subtitulo',
      homePlaceholder: 'Ex.: meu chuveiro queimou',
      homeHelperText: 'Ajuda',
    });
    expect(publicConfig).not.toHaveProperty('apiKey');
    expect(publicConfig).not.toHaveProperty('endpointUrl');
  });
});
