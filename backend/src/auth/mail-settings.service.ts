import { Injectable, Logger } from '@nestjs/common';
import { MailSettings, Prisma } from '@prisma/client';
import { PrismaService } from '../data/prisma.service';

const CACHE_TTL_MS = 60_000;

const DEFAULTS: Prisma.MailSettingsCreateInput = {
  enabled: false,
  host: null,
  port: 587,
  secure: false,
  username: null,
  password: null,
  fromName: 'IndicaFácil',
  fromEmail: null,
};

export function maskPassword(senha: string | null | undefined): string | null {
  if (!senha) return null;
  return '••••••••';
}

/**
 * Configuração de SMTP editável pelo painel. As variáveis de ambiente continuam
 * valendo e têm prioridade, para quem já configurou no servidor não perder o
 * que tinha ao atualizar.
 */
@Injectable()
export class MailSettingsService {
  private readonly logger = new Logger(MailSettingsService.name);
  private cached: MailSettings | null = null;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getRaw(): Promise<MailSettings> {
    const agora = Date.now();
    if (this.cached && agora - this.cachedAt < CACHE_TTL_MS) return this.cached;
    try {
      const registro = (await this.prisma.mailSettings.findFirst()) ?? (await this.prisma.mailSettings.create({ data: DEFAULTS }));
      this.cached = registro;
      this.cachedAt = agora;
      return registro;
    } catch (erro) {
      // Banco indisponível não pode derrubar o login nem o cadastro.
      this.logger.warn(`Configuração de e-mail indisponível: ${(erro as Error).message}`);
      return { ...DEFAULTS, id: 'unavailable', createdAt: new Date(), updatedAt: new Date() } as MailSettings;
    }
  }

  /** Configuração efetiva, com as variáveis de ambiente na frente do banco. */
  async getEffective() {
    const salvo = await this.getRaw();
    const host = process.env.SMTP_HOST || salvo.host || '';
    const username = process.env.SMTP_USER || salvo.username || '';
    const password = process.env.SMTP_PASSWORD || salvo.password || '';
    const port = Number(process.env.SMTP_PORT ?? salvo.port ?? 587);
    return {
      // Só considera ligado quando há o mínimo para conectar.
      enabled: Boolean((salvo.enabled || process.env.SMTP_HOST) && host && username && password),
      host,
      port,
      secure: process.env.SMTP_PORT ? port === 465 : salvo.secure,
      username,
      password,
      fromName: salvo.fromName || 'IndicaFácil',
      fromEmail: process.env.SMTP_FROM || salvo.fromEmail || username,
    };
  }

  /** Para o painel: nunca inclui a senha por extenso. */
  async getMasked() {
    const salvo = await this.getRaw();
    return {
      ...salvo,
      password: maskPassword(salvo.password),
      passwordSource: process.env.SMTP_PASSWORD ? 'env' : salvo.password ? 'database' : 'none',
      envOverride: Boolean(process.env.SMTP_HOST),
    };
  }

  async update(payload: Record<string, unknown>) {
    const atual = await this.getRaw();
    const dados: Record<string, unknown> = { ...payload };
    // Campo em branco ou mascarado significa "manter a senha atual".
    if (typeof dados.password === 'string' && (!dados.password.trim() || dados.password.startsWith('•'))) delete dados.password;
    delete dados.passwordSource;
    delete dados.envOverride;
    delete dados.id;
    delete dados.createdAt;
    delete dados.updatedAt;
    const atualizado = await this.prisma.mailSettings.update({ where: { id: atual.id }, data: dados });
    this.cached = atualizado;
    this.cachedAt = Date.now();
    return this.getMasked();
  }
}
