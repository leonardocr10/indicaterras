import { Injectable, Logger } from '@nestjs/common';
import { CatalogService, CategoryRecord } from '../data/catalog.service';
import { AiSettingsService } from './ai-settings.service';
import { AiLogsService } from './ai-logs.service';
import { AiProviderFactory } from './provider-factory';
import { GeminiProviderError } from './providers/gemini.provider';

export interface AnalyzeOptions {
  userId?: string | null;
  /** Quando true, roda a análise sem persistir log (usado pelo botão "Testar IA" do admin). */
  dryRun?: boolean;
}

@Injectable()
export class ProblemAnalysisService {
  private readonly logger = new Logger(ProblemAnalysisService.name);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly settingsService: AiSettingsService,
    private readonly logsService: AiLogsService,
    private readonly providerFactory: AiProviderFactory,
  ) {}

  async analyze(text: string, options: AnalyzeOptions = {}) {
    const startedAt = Date.now();
    const settings = await this.settingsService.getRaw();
    const trimmed = String(text ?? '').trim().slice(0, settings.maxInputLength);

    if (!trimmed) {
      return this.buildEmptyResponse(settings);
    }

    // Palavra-chave primeiro: "meu chuveiro queimou" o matcher local resolve
    // sozinho, com a mesma resposta que a IA daria. Chamar o provedor nesses
    // casos só gastaria token, então a IA fica para o que ele não reconhece.
    if (settings.keywordFirstEnabled) {
      const local = await this.fallback(trimmed, settings, null);
      if (local.response.category && local.response.confidence >= settings.keywordFirstConfidence.toNumber()) {
        const resolvido = {
          response: { ...local.response, message: settings.successMessage },
          logInput: { ...local.logInput, status: 'keyword_hit' },
        };
        if (!options.dryRun) {
          await this.persistLog({ settings, text: trimmed, startedAt, options, ...resolvido });
        }
        return resolvido.response;
      }
    }

    const eligibility = await this.aiEligibility(settings);
    if (eligibility.eligible) {
      try {
        const result = await this.tryAi(trimmed, settings);
        if (!options.dryRun) {
          await this.persistLog({ settings, text: trimmed, startedAt, options, ...result });
        }
        return result.response;
      } catch (error) {
        this.logger.warn(`IA indisponível, usando fallback local: ${(error as Error).message}`);
        const fallback = await this.fallback(trimmed, settings, (error as Error).message);
        if (!options.dryRun) {
          await this.persistLog({ settings, text: trimmed, startedAt, options, ...fallback });
        }
        return fallback.response;
      }
    }

    const fallback = await this.fallback(trimmed, settings, eligibility.reason ?? null);
    if (!options.dryRun) {
      await this.persistLog({ settings, text: trimmed, startedAt, options, ...fallback });
    }
    return fallback.response;
  }

  private async aiEligibility(settings: Awaited<ReturnType<AiSettingsService['getRaw']>>) {
    if (!settings.enabled || !settings.problemAnalysisEnabled) return { eligible: false, reason: 'ai_disabled' };
    const apiKey = await this.settingsService.getResolvedApiKey(settings);
    if (!apiKey) return { eligible: false, reason: 'missing_api_key' };
    if (settings.dailyLimit) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const count = await this.logsService.countAiCallsSince(since);
      if (count >= settings.dailyLimit) return { eligible: false, reason: 'daily_limit_reached' };
    }
    if (settings.monthlyLimit) {
      const since = new Date();
      since.setDate(1);
      since.setHours(0, 0, 0, 0);
      const count = await this.logsService.countAiCallsSince(since);
      if (count >= settings.monthlyLimit) return { eligible: false, reason: 'monthly_limit_reached' };
    }
    return { eligible: true, reason: null as string | null };
  }

  private async tryAi(text: string, settings: Awaited<ReturnType<AiSettingsService['getRaw']>>) {
    // Só os candidatos locais vão no prompt: mandar o catálogo inteiro custa
    // milhares de tokens por chamada e ainda aumenta o risco de alucinação.
    const categories = await this.catalogService.candidateCategories(text);
    const apiKey = (await this.settingsService.getResolvedApiKey(settings))!;
    const provider = this.providerFactory.getProvider(settings.provider);

    const result = await provider.analyzeProblem({
      text,
      categories: categories.map((category) => ({ id: category.id, name: category.name, services: category.services.map((service) => ({ id: service.id, name: service.name })) })),
      model: settings.model,
      apiKey,
      endpointUrl: settings.endpointUrl,
      temperature: settings.temperature.toNumber(),
      maxOutputTokens: settings.maxOutputTokens,
      timeoutMs: settings.timeoutMs,
    });

    const validated = this.validateAgainstCatalog(result, categories);
    const minimumConfidence = settings.minimumConfidence.toNumber();
    const needsClarification = settings.clarificationEnabled && (result.needsClarification || (!!validated.category && validated.confidence < minimumConfidence));

    if (!validated.category && !needsClarification) {
      // IA não encontrou nada aproveitável e nem pediu esclarecimento — melhor cair no matcher local.
      throw new GeminiProviderError('IA não retornou uma categoria válida do catálogo.');
    }

    const professionals = validated.category ? await this.catalogService.professionalsForCategory(validated.category, validated.services.map((service) => service.id)) : [];

    const response = {
      usedAi: true,
      usedFallback: false,
      confidence: validated.confidence,
      needsClarification,
      clarificationQuestion: needsClarification ? result.clarificationQuestion || 'Pode dar mais detalhes sobre o problema?' : null,
      message: needsClarification ? settings.lowConfidenceMessage : settings.successMessage,
      group: validated.category?.group ?? null,
      category: validated.category ? { id: validated.category.id, name: validated.category.name, slug: validated.category.slug } : null,
      services: validated.services,
      alternativeServices: [] as never[],
      normalizedProblem: result.normalizedProblem || text,
      professionals,
      suggestedActions: validated.category ? ['view_professionals', 'request_proposals'] : [],
    };

    return {
      response,
      logInput: {
        provider: settings.provider,
        model: settings.model,
        matchedCategoryId: validated.category?.id ?? null,
        confidence: validated.confidence,
        usedAi: true,
        usedFallback: false,
        needsClarification,
        status: 'success',
        errorMessage: null,
        services: validated.services.map((service, index) => ({ serviceId: service.id, score: null, position: index })),
      },
    };
  }

  private async fallback(text: string, settings: Awaited<ReturnType<AiSettingsService['getRaw']>>, reason: string | null) {
    const match = await this.catalogService.match(text);
    const isDegraded = reason !== null && reason !== 'ai_disabled';
    const response = {
      usedAi: false,
      usedFallback: true,
      confidence: match.confidence,
      needsClarification: false,
      clarificationQuestion: null,
      message: match.category ? (isDegraded ? settings.fallbackMessage : settings.successMessage) : settings.lowConfidenceMessage,
      group: match.group,
      category: match.category,
      services: match.services,
      alternativeServices: match.alternativeServices,
      normalizedProblem: text,
      professionals: match.professionals,
      suggestedActions: match.category ? ['view_professionals', 'request_proposals'] : [],
    };

    return {
      response,
      logInput: {
        provider: null,
        model: null,
        matchedCategoryId: match.category?.id ?? null,
        confidence: match.confidence,
        usedAi: false,
        usedFallback: true,
        needsClarification: false,
        status: reason && reason !== 'ai_disabled' ? 'fallback_after_error' : 'fallback',
        errorMessage: reason,
        services: match.services.map((service, index) => ({ serviceId: service.id, score: service.score ?? null, position: index })),
      },
    };
  }

  private validateAgainstCatalog(
    result: { categoryId: string | null; serviceIds: string[]; confidence: number },
    categories: CategoryRecord[],
  ) {
    const category = categories.find((item) => item.id === result.categoryId) ?? null;
    if (!category) return { category: null, services: [] as Array<{ id: string; categoryId: string; name: string; slug: string }>, confidence: 0 };

    const validServiceIds = new Set(category.services.map((service) => service.id));
    const services = result.serviceIds
      .filter((id) => validServiceIds.has(id))
      .map((id) => category.services.find((service) => service.id === id)!)
      .map((service) => ({ id: service.id, categoryId: service.categoryId, name: service.name, slug: service.slug }));

    return { category, services, confidence: Math.min(1, Math.max(0, result.confidence)) };
  }

  private buildEmptyResponse(settings: Awaited<ReturnType<AiSettingsService['getRaw']>>) {
    return {
      usedAi: false,
      usedFallback: true,
      confidence: 0,
      needsClarification: false,
      clarificationQuestion: null,
      message: settings.lowConfidenceMessage,
      group: null,
      category: null,
      services: [],
      alternativeServices: [],
      normalizedProblem: '',
      professionals: [],
      suggestedActions: [],
    };
  }

  private async persistLog(args: {
    settings: Awaited<ReturnType<AiSettingsService['getRaw']>>;
    text: string;
    startedAt: number;
    options: AnalyzeOptions;
    response: Record<string, unknown>;
    logInput: {
      provider: string | null;
      model: string | null;
      matchedCategoryId: string | null;
      confidence: number;
      usedAi: boolean;
      usedFallback: boolean;
      needsClarification: boolean;
      status: string;
      errorMessage: string | null;
      services: Array<{ serviceId: string; score: number | null; position: number }>;
    };
  }) {
    await this.logsService.record({
      userId: args.options.userId ?? null,
      provider: args.logInput.provider,
      model: args.logInput.model,
      inputText: args.text,
      normalizedText: typeof args.response['normalizedProblem'] === 'string' ? (args.response['normalizedProblem'] as string) : null,
      matchedCategoryId: args.logInput.matchedCategoryId,
      confidence: args.logInput.confidence,
      usedAi: args.logInput.usedAi,
      usedFallback: args.logInput.usedFallback,
      needsClarification: args.logInput.needsClarification,
      responseJson: args.response,
      status: args.logInput.status,
      errorMessage: args.logInput.errorMessage,
      latencyMs: Date.now() - args.startedAt,
      services: args.logInput.services,
    });
  }
}
