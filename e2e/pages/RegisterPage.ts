import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Cadastro (`/cadastro`), em 3 passos, com dois tipos de conta:
 * "Quero contratar" (cliente) e "Sou profissional".
 */
export class RegisterPage extends PaginaBase {
  async abrir() {
    await this.page.goto('/cadastro');
    await expect(this.page.getByRole('heading', { name: /Crie sua conta/i })).toBeVisible();
  }

  // --- Tipo de conta ---

  get seletorDeTipo(): Locator {
    return this.page.getByRole('radiogroup', { name: 'Tipo de conta' });
  }

  get tipoCliente(): Locator {
    return this.seletorDeTipo.getByRole('radio', { name: /Quero contratar/i });
  }

  get tipoProfissional(): Locator {
    return this.seletorDeTipo.getByRole('radio', { name: /Sou profissional/i });
  }

  async escolherTipoProfissional() {
    await this.tipoProfissional.click();
    await expect(this.tipoProfissional).toHaveAttribute('aria-checked', 'true');
  }

  // --- Campos (todos com formControlName, a ancora mais estavel aqui) ---

  campo(nome: string): Locator {
    return this.page.locator(`[formcontrolname="${nome}"]`).locator('input').or(this.page.locator(`input[formcontrolname="${nome}"]`)).first();
  }

  get nome(): Locator {
    return this.page.locator('input[formcontrolname="name"]');
  }

  get email(): Locator {
    return this.page.locator('input[formcontrolname="email"]');
  }

  get whatsapp(): Locator {
    return this.page.locator('input[formcontrolname="phone"]');
  }

  get cep(): Locator {
    return this.page.locator('input[formcontrolname="zipCode"]');
  }

  get rua(): Locator {
    return this.page.locator('input[formcontrolname="street"]');
  }

  get numero(): Locator {
    return this.page.locator('input[formcontrolname="number"]');
  }

  get bairro(): Locator {
    return this.page.locator('input[formcontrolname="neighborhood"]');
  }

  get cidade(): Locator {
    return this.page.locator('input[formcontrolname="city"]');
  }

  get estado(): Locator {
    return this.page.locator('input[formcontrolname="state"]');
  }

  get empresa(): Locator {
    return this.page.locator('input[formcontrolname="companyName"]');
  }

  get bio(): Locator {
    return this.page.locator('textarea[formcontrolname="bio"]');
  }

  get senha(): Locator {
    return this.page.locator('input[formcontrolname="password"]');
  }

  get forcaDaSenha(): Locator {
    return this.page.getByRole('progressbar');
  }

  // --- Navegacao entre passos ---

  get botaoContinuar(): Locator {
    return this.page.getByRole('button', { name: 'Continuar' });
  }

  get botaoVoltar(): Locator {
    return this.page.locator('.register-previous');
  }

  get botaoCriarConta(): Locator {
    return this.page.getByRole('button', { name: /^Criar conta$/i });
  }

  get botaoCriarContaProfissional(): Locator {
    return this.page.getByRole('button', { name: /Criar conta de profissional/i });
  }

  get mensagem(): Locator {
    return this.page.locator('.form-feedback');
  }

  // --- Confirmacao de e-mail ---

  get campoCodigo(): Locator {
    return this.page.getByPlaceholder('000000');
  }

  get botaoConfirmarEmail(): Locator {
    return this.page.getByRole('button', { name: /Confirmar e-mail|Confirmando/i });
  }

  get botaoReenviarCodigo(): Locator {
    return this.page.getByRole('button', { name: /Reenviar código|Reenviar codigo|Enviando código/i });
  }

  /** Indicador "Etapa N de 3", a forma confiavel de saber onde estamos. */
  get etapaAtual(): Locator {
    return this.page.locator('.register-step-label');
  }

  async numeroDaEtapa(): Promise<number> {
    const texto = await this.etapaAtual.innerText();
    return Number(texto.match(/Etapa (\d+)/)?.[1] ?? 0);
  }

  /**
   * Avanca um passo e confirma que avancou de fato.
   *
   * `nextStep()` valida os campos e simplesmente nao avanca quando algo esta
   * invalido, sem lancar nada. Sem esta checagem o teste seguia clicando em
   * campos do passo seguinte e falhava com um timeout que nao dizia o motivo.
   */
  private async avancar() {
    const antes = await this.numeroDaEtapa();
    await this.botaoContinuar.click();
    await expect(this.etapaAtual, `o cadastro nao saiu da etapa ${antes} — confira os campos obrigatorios`)
      .toHaveText(new RegExp(`Etapa ${antes + 1} de 3`), { timeout: 10_000 });
  }

  /**
   * Preenche os 3 passos de um cliente e envia.
   *
   * A ordem no passo 2 nao e arbitraria: digitar o CEP dispara a consulta que
   * preenche rua/bairro/cidade/estado sozinha. Preencher esses campos antes da
   * resposta chegar significa te-los sobrescritos. Por isso o CEP vem primeiro
   * e esperamos o preenchimento automatico assentar.
   */
  async cadastrarCliente(dados: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  }) {
    await this.nome.fill(dados.nome);
    await this.email.fill(dados.email);
    await this.whatsapp.fill(dados.telefone);
    await this.avancar();

    if (await this.cep.count()) {
      if (dados.cep) {
        await this.cep.fill(dados.cep);
        // A consulta preenche a rua; esperar por ela evita a corrida.
        await expect(this.rua).not.toHaveValue('', { timeout: 15_000 }).catch(() => undefined);
      }
      // Depois da consulta, o que o teste informou explicitamente prevalece.
      if (dados.rua) await this.rua.fill(dados.rua);
      if (dados.numero) await this.numero.fill(dados.numero);
      if (dados.bairro) await this.bairro.fill(dados.bairro);
      if (dados.cidade) await this.cidade.fill(dados.cidade);
      if (dados.estado) await this.estado.fill(dados.estado);
      await this.avancar();
    }

    await this.senha.fill(dados.senha);
    await this.botaoCriarConta.click();
  }
}
