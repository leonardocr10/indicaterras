import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../data/prisma.service';

export interface CreateLogInput {
  userId?: string | null;
  provider?: string | null;
  model?: string | null;
  inputText: string;
  normalizedText?: string | null;
  matchedCategoryId?: string | null;
  confidence?: number | null;
  usedAi: boolean;
  usedFallback: boolean;
  needsClarification: boolean;
  responseJson: unknown;
  status: string;
  errorMessage?: string | null;
  latencyMs: number;
  services: Array<{ serviceId: string; score?: number | null; position: number }>;
}

@Injectable()
export class AiLogsService {
  private readonly logger = new Logger(AiLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: CreateLogInput) {
    try {
      return await this.prisma.aiAnalysisLog.create({
        data: {
          userId: input.userId ?? null,
          provider: input.provider ?? null,
          model: input.model ?? null,
          inputText: input.inputText,
          normalizedText: input.normalizedText ?? null,
          matchedCategoryId: input.matchedCategoryId ?? null,
          confidence: input.confidence ?? null,
          usedAi: input.usedAi,
          usedFallback: input.usedFallback,
          needsClarification: input.needsClarification,
          responseJson: input.responseJson as never,
          status: input.status,
          errorMessage: input.errorMessage ?? null,
          latencyMs: input.latencyMs,
          services: { create: input.services.map((service) => ({ serviceId: service.serviceId, score: service.score ?? null, position: service.position })) },
        },
      });
    } catch (error) {
      // Falha ao registrar o log nunca deve derrubar a resposta ao cliente.
      this.logger.warn(`Falha ao registrar log de análise de IA: ${(error as Error).message}`);
      return null;
    }
  }

  async countAiCallsSince(since: Date) {
    return this.prisma.aiAnalysisLog.count({ where: { usedAi: true, createdAt: { gte: since } } });
  }

  async list(params: { page: number; pageSize: number }) {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(100, Math.max(1, params.pageSize));
    const [total, items] = await Promise.all([
      this.prisma.aiAnalysisLog.count(),
      this.prisma.aiAnalysisLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  }

  async getById(id: string) {
    const log = await this.prisma.aiAnalysisLog.findUnique({ where: { id }, include: { services: true } });
    if (!log) throw new NotFoundException('Log de análise não encontrado.');
    return log;
  }

  async setFeedback(id: string, feedback: 'correct' | 'incorrect') {
    await this.getById(id);
    return this.prisma.aiAnalysisLog.update({ where: { id }, data: { adminFeedback: feedback } });
  }

  async usage() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, month] = await Promise.all([
      this.prisma.aiAnalysisLog.findMany({ where: { createdAt: { gte: startOfDay } }, select: { usedAi: true, usedFallback: true, status: true, confidence: true, latencyMs: true } }),
      this.prisma.aiAnalysisLog.findMany({ where: { createdAt: { gte: startOfMonth } }, select: { usedAi: true, usedFallback: true, status: true } }),
    ]);

    const summarize = (rows: Array<{ usedAi: boolean; usedFallback: boolean; status: string }>) => ({
      total: rows.length,
      aiCalls: rows.filter((row) => row.usedAi).length,
      fallbackCalls: rows.filter((row) => row.usedFallback).length,
      errors: rows.filter((row) => row.status === 'error').length,
      // Resolvidos pela palavra-chave: cada um e uma chamada de IA economizada.
      keywordHits: rows.filter((row) => row.status === 'keyword_hit').length,
    });

    const confidences = today.map((row) => row.confidence).filter((value): value is NonNullable<typeof value> => value !== null);
    const latencies = today.map((row) => row.latencyMs).filter((value): value is number => value !== null && value !== undefined);

    return {
      today: summarize(today),
      month: summarize(month),
      averageConfidence: confidences.length ? Number((confidences.reduce((total, value) => total + Number(value), 0) / confidences.length).toFixed(2)) : null,
      averageLatencyMs: latencies.length ? Math.round(latencies.reduce((total, value) => total + value, 0) / latencies.length) : null,
    };
  }
}
