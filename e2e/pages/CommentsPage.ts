import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { PaginaBase } from './PaginaBase';

/**
 * Comentarios e avaliacoes (`/app/profissional/:id/comentarios`).
 *
 * E aqui que a avaliacao acontece de verdade: o `ReviewsPageComponent` tem um
 * formulario no codigo, mas ele nao esta no template. O caminho real do usuario
 * e o botao "Avaliar" do perfil, que traz para esta tela com `?avaliar=1`.
 */
export class CommentsPage extends PaginaBase {
  async abrir(idProfissional: string, paraAvaliar = false) {
    await this.page.goto(`/app/profissional/${idProfissional}/comentarios${paraAvaliar ? '?avaliar=1' : ''}`);
    await this.aguardarCarregamento();
  }

  get campoComentario(): Locator {
    return this.page.getByLabel('Novo comentário');
  }

  get botaoPublicar(): Locator {
    return this.page.getByRole('button', { name: /Publicar|Publicando/i }).first();
  }

  /** As estrelas sao botoes com aria-label "N estrelas". */
  estrela(nota: number): Locator {
    return this.page.getByRole('button', { name: `${nota} estrelas` });
  }

  get inputDeFotos(): Locator {
    return this.page.locator('.comment-compose-tools input[type="file"]');
  }

  get botaoEmoji(): Locator {
    return this.page.getByRole('button', { name: 'Adicionar emoji' });
  }

  get fotosSelecionadas(): Locator {
    return this.page.locator('.comment-selected-photos figure');
  }

  get comentarios(): Locator {
    return this.page.locator('article.comment-feed-item');
  }

  comentario(texto: string | RegExp): Locator {
    return this.comentarios.filter({ hasText: texto });
  }

  get vazio(): Locator {
    return this.page.locator('.comments-empty');
  }

  get contador(): Locator {
    return this.page.locator('.comments-header p');
  }

  /** Publica uma avaliacao completa: nota, texto e (opcional) fotos. */
  async avaliar(nota: number, comentario: string, arquivos?: string[]) {
    await this.estrela(nota).click();
    await this.campoComentario.fill(comentario);
    if (arquivos?.length) await this.inputDeFotos.setInputFiles(arquivos);
    await this.botaoPublicar.click();
  }

  botaoCurtir(textoDoComentario: string | RegExp): Locator {
    return this.comentario(textoDoComentario).locator('.comment-actions button').first();
  }

  botaoResponder(textoDoComentario: string | RegExp): Locator {
    return this.comentario(textoDoComentario).getByRole('button', { name: 'Responder' });
  }

  get campoResposta(): Locator {
    return this.page.getByPlaceholder('Escreva uma resposta...');
  }

  get lightbox(): Locator {
    return this.page.locator('.comment-lightbox');
  }

  async quantidadeDeComentarios(): Promise<number> {
    return this.comentarios.count();
  }

  async esperarComentarioVisivel(texto: string | RegExp) {
    await expect(this.comentario(texto).first()).toBeVisible({ timeout: 15_000 });
  }
}
