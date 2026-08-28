import { Injectable, Logger } from '@nestjs/common';
import { AiSettings, Prisma } from '@prisma/client';
import { PrismaService } from '../data/prisma.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

const CACHE_TTL_MS = 60_000;

const DEFAULTS: Prisma.AiSettingsCreateInput = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-3.5-flash-lite',
  apiKey: null,
  endpointUrl: null,
  temperature: 0.2,
  maxOutputTokens: 500,
  timeoutMs: 15000,
  problemAnalysisEnabled: true,
  categorySuggestionEnabled: true,
  serviceSuggestionEnabled: true,
  summaryEnabled: true,
  clarificationEnabled: true,
  fallbackKeywordsEnabled: true,
  minimumConfidence: 0.75,
  autoApplyConfidence: 0.85,
  dailyLimit: 500,
  monthlyLimit: 10000,
  maxInputLength: 500,
  homeTitle: 'Conte o que aconteceu',
  homeSubtitle: 'A IA do IndicaFácil ajuda você a encontrar quem pode resolver.',
  homePlaceholder: 'Ex.: meu chuveiro queimou',
  homeHelperText: 'Descreva o problema com suas palavras. A IA identifica o serviço para você.',
  successMessage: 'Entendi o que você precisa.',
  lowConfidenceMessage: 'Encontrei algumas possibilidades. Confirme para continuar.',
  fallbackMessage: 'Encontramos serviços relacionados ao que você descreveu.',
};

export function maskApiKey(apiKey: string | null | undefined): string | null {
  if (!apiKey) return null;
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) return '****';
  return `****${trimmed.slice(-4)}`;
}

/** Prisma serializa Decimal com toJSON() -> string; convertemos para number antes de expor a API. */
function toPlainNumbers(settings: AiSettings) {
  return {
    ...settings,
    temperature: settings.temperature.toNumber(),
    minimumConfidence: settings.minimumConfidence.toNumber(),
    autoApplyConfidence: settings.autoApplyConfidence.toNumber(),
  };
}

@Injectable()
export class AiSettingsService {
  private readonly logger = new Logger(AiSettingsService.name);
  private cached: AiSettings | null = null;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /** Configurações completas, incluindo apiKey em texto puro — uso interno do backend apenas. */
  async getRaw(): Promise<AiSettings> {
    const now = Date.now();
    if (this.cached && now - this.cachedAt < CACHE_TTL_MS) return this.cached;

    let settings: AiSettings;
    try {
      settings = (await this.prisma.aiSettings.findFirst()) ?? (await this.prisma.aiSettings.create({ data: DEFAULTS }));
    } catch (error) {
      // Banco indisponível não pode derrubar a Home nem a busca: a IA apenas fica desligada.
      this.logger.warn(`Configurações de IA indisponíveis, assumindo IA desativada: ${(error as Error).message}`);
      return this.fallbackSettings();
    }
    this.cached = settings;
    this.cachedAt = now;
    return settings;
  }

  private fallbackSettings(): AiSettings {
    const decimal = (value: number) => new Prisma.Decimal(value);
    return {
      ...DEFAULTS,
      id: 'unavailable',
      enabled: false,
      temperature: decimal(0.2),
      minimumConfidence: decimal(0.75),
      autoApplyConfidence: decimal(0.85),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AiSettings;
  }

  /** Configurações resolvendo a api key: variável de ambiente tem prioridade sobre o valor salvo no banco. */
  async getResolvedApiKey(settings: AiSettings): Promise<string | null> {
    return process.env.GEMINI_API_KEY || settings.apiKey || null;
  }

  /** Configurações para o painel admin — nunca inclui a api key completa. */
  async getMasked() {
    const settings = await this.getRaw();
    return {
      ...toPlainNumbers(settings),
      apiKey: maskApiKey(settings.apiKey),
      apiKeySource: process.env.GEMINI_API_KEY ? 'env' : settings.apiKey ? 'database' : 'none',
    };
  }

  /** Bloco exposto no endpoint público (`/public-settings`) — nunca inclui segredos ou limites internos. */
  async getPublicConfig() {
    const settings = await this.getRaw();
    return {
      enabled: settings.enabled,
      homeTitle: settings.homeTitle,
      homeSubtitle: settings.homeSubtitle,
      homePlaceholder: settings.homePlaceholder,
      homeHelperText: settings.homeHelperText,
    };
  }

  async update(payload: UpdateAiSettingsDto) {
    const current = await this.getRaw();
    const data: Record<string, unknown> = { ...payload };
    // Nunca sobrescreve a api key salva com a versão mascarada devolvida pelo próprio GET.
    if (payload.apiKey !== undefined && /^\*+/.test(payload.apiKey)) {
      delete data.apiKey;
    }
    const updated = await this.prisma.aiSettings.update({ where: { id: current.id }, data });
    this.cached = updated;
    this.cachedAt = Date.now();
    return this.getMasked();
  }
}
