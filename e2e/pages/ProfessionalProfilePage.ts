import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/** Perfil publico do profissional (`/app/profissional/:id`). */
export class ProfessionalProfilePage extends PaginaBase {
  async abrir(id: string) {
    await this.page.goto(`/app/profissional/${id}`);
    await this.aguardarCarregamento();
  }

  get nome(): Locator {
    return this.page.locator('.profile-card h1');
  }

  get categoria(): Locator {
    return this.page.locator('.profile-meta > span').first();
  }

  get nota(): Locator {
    return this.page.locator('.rating-line strong').first();
  }

  get linkAvaliacoes(): Locator {
    return this.page.getByRole('link', { name: /\(\d+ avaliações\)|\(\d+ avaliacoes\)/ });
  }

  get contadorDeRecomendacoes(): Locator {
    return this.page.locator('.profile-recommendation');
  }

  get botaoFavoritar(): Locator {
    return this.page.getByRole('button', { name: 'Salvar profissional' });
  }

  get botaoCompartilhar(): Locator {
    return this.page.getByRole('button', { name: 'Compartilhar profissional' });
  }

  /** O estado de favorito vive na classe `.active` do botao. */
  async estaFavoritado(): Promise<boolean> {
    return (await this.botaoFavoritar.getAttribute('class'))?.includes('active') ?? false;
  }

  async alternarFavorito() {
    const antes = await this.estaFavoritado();
    await this.botaoFavoritar.click();
    await expect
      .poll(() => this.estaFavoritado(), { message: 'O botao de favorito nao mudou de estado.' })
      .toBe(!antes);
  }

  // --- Acoes rapidas ---

  get linkMensagem(): Locator {
    return this.page.locator('.quick-actions').getByRole('link', { name: 'Mensagem' });
  }

  get linkLigar(): Locator {
    return this.page.locator('.quick-actions').getByRole('link', { name: 'Ligar' });
  }

  get linkAvaliar(): Locator {
    return this.page.locator('.quick-actions').getByRole('link', { name: 'Avaliar' });
  }

  get botaoAvaliarNaSecao(): Locator {
    return this.page.locator('.profile-rate-button');
  }

  get botaoEnviarMensagem(): Locator {
    return this.page.locator('.profile-cta-bar').getByRole('link', { name: /Enviar mensagem/i });
  }

  // --- Secoes ---

  get secaoSobre(): Locator {
    return this.page.locator('.detail-section').filter({ hasText: 'Sobre' });
  }

  get servicos(): Locator {
    return this.page.locator('.detail-section').filter({ hasText: 'Serviços' }).locator('li');
  }

  get trabalhos(): Locator {
    return this.page.locator('.profile-work-strip button');
  }

  get contadorDeComentarios(): Locator {
    return this.page.getByRole('heading', { name: /Comentários \(\d+\)|Comentarios \(\d+\)/ });
  }

  get linkVerTodosComentarios(): Locator {
    return this.page.locator('.profile-comments').getByRole('link', { name: /Ver todos/i });
  }

  // --- Denuncia ---

  get botaoDenunciar(): Locator {
    return this.page.getByRole('button', { name: /Denunciar este profissional/i });
  }

  get sheetDeDenuncia(): Locator {
    return this.page.getByRole('dialog', { name: 'Denunciar profissional' });
  }

  get descricaoDaDenuncia(): Locator {
    return this.sheetDeDenuncia.getByPlaceholder(/Conte com detalhes/i);
  }

  async abrirDenuncia() {
    await this.botaoDenunciar.click();
    await expect(this.sheetDeDenuncia).toBeVisible();
  }

  /** Le a contagem de avaliacoes do link "(N avaliações)". */
  async quantidadeDeAvaliacoes(): Promise<number> {
    const texto = await this.linkAvaliacoes.innerText();
    return Number(texto.replace(/\D/g, ''));
  }

  async notaNumerica(): Promise<number> {
    return Number((await this.nota.innerText()).replace(',', '.'));
  }
}
