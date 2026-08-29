import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { MailSettingsService } from './mail-settings.service';

/**
 * Envio de e-mail por SMTP. Funciona com qualquer provedor (Hostinger, Gmail,
 * Brevo, Resend...). A configuracao vem do painel administrativo; as variaveis
 * SMTP_HOST, SMTP_USER e SMTP_PASSWORD continuam valendo e tem prioridade.
 *
 * Sem SMTP o sistema nao quebra: o conteudo do e-mail vai para o log do
 * servidor, para a administracao repassar manualmente.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailSettings: MailSettingsService) {}

  /** Cria o transporte a cada envio: a configuracao muda pelo painel. */
  private async criarTransporte(): Promise<{ transporter: Transporter; from: string } | null> {
    const config = await this.mailSettings.getEffective();
    if (!config.enabled) return null;
    const transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: config.password },
    });
    const from = config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail;
    return { transporter, from };
  }

  async configurado() {
    return (await this.mailSettings.getEffective()).enabled;
  }

  /** Valida a configuracao sem enviar mensagem para ninguem. */
  async testarConexao(): Promise<{ ok: boolean; message: string }> {
    const transporte = await this.criarTransporte();
    if (!transporte) return { ok: false, message: 'Preencha servidor, usuário e senha e ative o envio de e-mail.' };
    try {
      await transporte.transporter.verify();
      return { ok: true, message: 'Conexão com o servidor de e-mail estabelecida.' };
    } catch (erro) {
      return { ok: false, message: erro instanceof Error ? erro.message : 'Não foi possível conectar ao servidor de e-mail.' };
    }
  }

  async enviarTeste(destino: string) {
    return this.enviar(destino, 'Teste de configuração - IndicaFácil', {
      texto: 'Este é um e-mail de teste do IndicaFácil. Se você recebeu, o envio está configurado corretamente.',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1f2937">
          <h2 style="color:#065f46">Envio de e-mail configurado</h2>
          <p>Este é um e-mail de teste do <b>IndicaFácil</b>.</p>
          <p style="color:#64748b;font-size:13px">Se você recebeu esta mensagem, o servidor de e-mail está funcionando.</p>
        </div>
      `,
    });
  }

  async enviarCodigoDeAtivacao(email: string, nome: string, codigo: string) {
    return this.enviar(email, 'Seu código de ativação - IndicaFácil', {
      texto: `Olá, ${nome}!\n\nSeu código de ativação do IndicaFácil é ${codigo}.\n\nEle vale por 30 minutos. Se não foi você quem se cadastrou, ignore este e-mail.`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1f2937">
          <h2 style="color:#065f46">Confirme seu e-mail</h2>
          <p>Olá, <b>${nome}</b>! Use o código abaixo para ativar sua conta no IndicaFácil:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#065f46;background:#f1faf5;padding:16px;border-radius:10px;text-align:center">${codigo}</p>
          <p style="color:#64748b;font-size:13px">O código vale por 30 minutos.</p>
          <p style="color:#64748b;font-size:13px">Se não foi você quem se cadastrou, ignore este e-mail.</p>
        </div>
      `,
    });
  }

  async enviarRecuperacaoDeSenha(email: string, link: string) {
    return this.enviar(email, 'Redefinição de senha - IndicaFácil', {
      texto: `Recebemos um pedido para redefinir sua senha no IndicaFácil.\n\nAbra o link abaixo para criar uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez:\n${link}\n\nSe não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.`,
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
      registroSemSmtp: `Link de redefinicao para ${email}: ${link}`,
    });
  }

  private async enviar(destino: string, assunto: string, corpo: { texto: string; html: string; registroSemSmtp?: string }) {
    const transporte = await this.criarTransporte();
    if (!transporte) {
      this.logger.warn(`[SEM SMTP] ${assunto} para ${destino}. ${corpo.registroSemSmtp ?? corpo.texto}`);
      return false;
    }
    try {
      await transporte.transporter.sendMail({ from: transporte.from, to: destino, subject: assunto, text: corpo.texto, html: corpo.html });
      return true;
    } catch (erro) {
      // Não propaga: quem se cadastrou ou pediu recuperação não deve ver erro de infraestrutura.
      this.logger.error(`Falha ao enviar e-mail para ${destino}: ${erro instanceof Error ? erro.message : ''}`);
      if (corpo.registroSemSmtp) this.logger.warn(corpo.registroSemSmtp);
      return false;
    }
  }
}
