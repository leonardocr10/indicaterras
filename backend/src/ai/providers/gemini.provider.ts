import { Injectable, Logger } from '@nestjs/common';
import { AiConnectionTestResult, AiProvider, ProblemAnalysisInput, ProblemAnalysisResult } from './ai-provider.interface';

const DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = `Você é o classificador de intenção do IndicaFácil.

Sua função é interpretar o problema descrito pelo usuário e escolher somente entre os grupos, categorias e serviços fornecidos.

Nunca invente categorias ou serviços.
Nunca retorne IDs inexistentes.
Se não houver informação suficiente, use needsClarification=true.
Retorne SOMENTE JSON válido.
Não responda com markdown.
Não dê diagnóstico médico.
Não forneça instruções perigosas de manutenção elétrica, gás ou similares.
Sua função é apenas identificar qual profissional ou serviço é necessário.

Formato obrigatório da resposta (sem nenhum texto além do JSON):
{
  "categoryId": "...",
  "serviceIds": ["..."],
  "normalizedProblem": "...",
  "confidence": 0.00,
  "needsClarification": false,
  "clarificationQuestion": null
}`;

/** Falha interna e explícita do provedor — nunca deve vazar para o cliente, só para o log administrativo. */
export class GeminiProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeminiProviderError';
  }
}

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  async analyzeProblem(input: ProblemAnalysisInput): Promise<ProblemAnalysisResult> {
    const userPrompt = this.buildUserPrompt(input);
    const raw = await this.callGemini(input, userPrompt);
    return this.parseResponse(raw);
  }

  async testConnection(input: { apiKey: string; model: string; endpointUrl?: string | null; timeoutMs: number }): Promise<AiConnectionTestResult> {
    const startedAt = Date.now();
    try {
      await this.callGemini({ ...input, temperature: 0, maxOutputTokens: 32 }, 'Responda apenas com o JSON {"ok": true}.');
      return { ok: true, message: 'Conexão com o Gemini estabelecida com sucesso.', latencyMs: Date.now() - startedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida ao conectar com o Gemini.';
      return { ok: false, message, latencyMs: Date.now() - startedAt };
    }
  }

  private buildUserPrompt(input: ProblemAnalysisInput): string {
    const catalog = input.categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      services: category.services.map((service) => ({ serviceId: service.id, serviceName: service.name })),
    }));
    return JSON.stringify({
      problemText: input.text,
      availableCategories: catalog,
    });
  }

  private async callGemini(
    input: Pick<ProblemAnalysisInput, 'apiKey' | 'model' | 'endpointUrl' | 'temperature' | 'maxOutputTokens' | 'timeoutMs'>,
    userPrompt: string,
  ): Promise<string> {
    if (!input.apiKey) throw new GeminiProviderError('Chave de API do Gemini não configurada.');

    const base = input.endpointUrl?.trim() || DEFAULT_ENDPOINT;
    const url = `${base.replace(/\/$/, '')}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: input.temperature,
            maxOutputTokens: input.maxOutputTokens,
            responseMimeType: 'application/json',
          },
        }),
      });
    } catch (error) {
      if (controller.signal.aborted) throw new GeminiProviderError(`Tempo limite de ${input.timeoutMs}ms excedido ao chamar o Gemini.`, error);
      throw new GeminiProviderError('Falha de rede ao chamar o Gemini.', error);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(`Gemini respondeu ${response.status}: ${body.slice(0, 300)}`);
      throw new GeminiProviderError(`Gemini respondeu com status ${response.status}.`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new GeminiProviderError('Resposta do Gemini não contém texto.');
    return text;
  }

  private parseResponse(raw: string): ProblemAnalysisResult {
    let parsed: unknown;
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (error) {
      throw new GeminiProviderError('Gemini retornou um JSON inválido.', error);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new GeminiProviderError('Gemini retornou um formato inesperado.');
    }

    const value = parsed as Record<string, unknown>;
    const serviceIds = Array.isArray(value['serviceIds']) ? (value['serviceIds'] as unknown[]).filter((item): item is string => typeof item === 'string') : [];

    return {
      categoryId: typeof value['categoryId'] === 'string' ? value['categoryId'] : null,
      serviceIds,
      normalizedProblem: typeof value['normalizedProblem'] === 'string' ? value['normalizedProblem'] : '',
      confidence: typeof value['confidence'] === 'number' ? Math.min(1, Math.max(0, value['confidence'])) : 0,
      needsClarification: Boolean(value['needsClarification']),
      clarificationQuestion: typeof value['clarificationQuestion'] === 'string' ? value['clarificationQuestion'] : null,
    };
  }
}
