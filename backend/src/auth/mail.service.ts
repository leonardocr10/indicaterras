import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { MailSettingsService } from './mail-settings.service';

/**
 * Envio de e-mail por SMTP. Funciona com qualquer provedor (Hostinger, Gmail,
 * Brevo, Resend...). A configuracao vem do painel administrativo; as variaveis
 * SMTP_HOST, SMTP_USER e SMTP_PASSWORD continuam valendo e têm prioridade.
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
      return { ok: false, message: await this.formatarErroDeConexao(erro) };
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
      texto: `Olá, ${nome}!\n\nSeu código de confirmação do IndicaFácil é ${codigo}.\n\nEle vale por 30 minutos. Se não foi você quem se cadastrou, ignore este e-mail.`,
      html: this.templateEmail({
        titulo: 'Confirme seu e-mail',
        conteudo: `<p>Olá, <strong>${this.escaparHtml(nome)}</strong>! Para concluir seu cadastro, informe este código no aplicativo:</p><div style="margin:26px 0;padding:18px;border:1px solid #c9e8d8;border-radius:12px;background:#f1faf5;color:#065f46;font-size:30px;font-weight:800;letter-spacing:8px;text-align:center">${codigo}</div><p style="margin:0;color:#5b6b63;font-size:13px;line-height:20px">O código vale por 30 minutos. Se não foi você quem se cadastrou, ignore esta mensagem.</p>`,
      }),
    });
  }

  async enviarRecuperacaoDeSenha(email: string, link: string) {
    return this.enviar(email, 'Redefinição de senha - IndicaFácil', {
      texto: `Recebemos um pedido para redefinir sua senha no IndicaFácil.\n\nAbra o link abaixo para criar uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez:\n${link}\n\nSe não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.`,
      html: this.templateEmail({
        titulo: 'Redefinição de senha',
        conteudo: `<p>Recebemos um pedido para redefinir sua senha no <strong>IndicaFácil</strong>.</p><p style="margin:26px 0"><a href="${this.escaparHtml(link)}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#065f46;color:#ffffff;text-decoration:none;font-weight:700">Criar nova senha</a></p><p style="margin:0;color:#5b6b63;font-size:13px;line-height:20px">O link vale por 1 hora e só pode ser usado uma vez. Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.</p>`,
      }),
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

  private templateEmail({ titulo, conteudo }: { titulo: string; conteudo: string }) {
    return `<div style="margin:0;padding:32px 16px;background:#f5f8f6;font-family:Arial,Helvetica,sans-serif;color:#173427"><div style="max-width:520px;margin:0 auto;overflow:hidden;border:1px solid #dce7e0;border-radius:16px;background:#ffffff"><div style="padding:26px 30px;background:#065f46;color:#ffffff"><div style="font-size:20px;font-weight:800">IndicaFácil</div><div style="margin-top:5px;font-size:13px;opacity:.85">Sua comunidade de indicações</div></div><div style="padding:30px"><h1 style="margin:0 0 16px;color:#173427;font-size:23px;line-height:30px">${titulo}</h1><div style="font-size:15px;line-height:23px">${conteudo}</div></div><div style="padding:16px 30px;border-top:1px solid #edf2ee;color:#718078;font-size:12px;line-height:18px">Este é um e-mail automático. Não responda esta mensagem.</div></div></div>`;
  }

  private escaparHtml(valor: string) {
    return valor.replace(/[&<>'"]/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caractere] ?? caractere);
  }

  private async formatarErroDeConexao(erro: unknown) {
    if (!(erro instanceof Error)) return 'Não foi possível conectar ao servidor de e-mail.';
    const mensagem = erro.message || '';
    if (mensagem.includes('ssl3_get_record:wrong version number')) {
      const config = await this.mailSettings.getEffective();
      if (config.port === 587 && config.secure) {
        return 'A porta 587 normalmente usa STARTTLS. Desligue "Conexão segura (TLS/SSL)" e teste novamente.';
      }
      if (config.port === 465 && !config.secure) {
        return 'A porta 465 normalmente usa TLS direto. Ligue "Conexão segura (TLS/SSL)" e teste novamente.';
      }
      return 'O servidor recusou a negociação SSL/TLS. Revise a combinação entre porta e modo seguro.';
    }
    return mensagem;
  }
}
