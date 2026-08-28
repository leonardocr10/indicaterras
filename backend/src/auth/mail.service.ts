import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Envio de e-mail por SMTP. Funciona com qualquer provedor (Hostinger, Gmail,
 * Brevo, Resend...) - basta preencher SMTP_HOST, SMTP_PORT, SMTP_USER e
 * SMTP_PASSWORD no .env. Sem essas variaveis o sistema nao quebra: o link de
 * recuperacao vai para o log do servidor, para a administracao repassar.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    if (!host || !user || !password) {
      this.logger.warn('SMTP nao configurado: os e-mails serao apenas registrados no log.');
      return;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
  }

  get configurado() {
    return Boolean(this.transporter);
  }

  async enviarRecuperacaoDeSenha(email: string, link: string) {
    const assunto = 'Redefinição de senha - IndicaFácil';
    if (!this.transporter) {
      this.logger.warn(`[SEM SMTP] Link de redefinicao para ${email}: ${link}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER'),
        to: email,
        subject: assunto,
        text: `Recebemos um pedido para redefinir sua senha no IndicaFácil.\n\nAbra o link abaixo para criar uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez:\n${link}\n\nSe não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1f2937">
            <h2 style="color:#065f46">Redefinição de senha</h2>
            <p>Recebemos um pedido para redefinir sua senha no <b>IndicaFácil</b>.</p>
            <p>
              <a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#065f46;color:#fff;text-decoration:none;font-weight:700">
                Criar nova senha
              </a>
            </p>
            <p style="color:#64748b;font-size:13px">O link vale por 1 hora e só pode ser usado uma vez.</p>
            <p style="color:#64748b;font-size:13px">Se não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.</p>
          </div>
        `,
      });
    } catch (erro) {
      // nao propaga: quem pediu a recuperacao nao deve ver erro de infraestrutura
      this.logger.error(`Falha ao enviar e-mail para ${email}: ${erro instanceof Error ? erro.message : ''}`);
      this.logger.warn(`Link de redefinicao para ${email}: ${link}`);
    }
  }
}
