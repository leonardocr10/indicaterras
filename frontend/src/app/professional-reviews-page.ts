import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideRefreshCw, LucideStar, LucideTrendingUp } from '@lucide/angular';
import { ApiService } from './services/api.service';
import { RatingStarsComponent } from './components';
import { ProfessionalReview } from './models';

const POR_PAGINA = 10;

/**
 * Todas as avaliações recebidas, abertas pelo "Ver todas" do painel.
 *
 * A média e o total vêm da mesma consulta do painel (só avaliações visíveis),
 * para as duas telas nunca mostrarem números diferentes. O profissional não
 * edita nem apaga nada por aqui: a tela é de leitura.
 */
@Component({
  selector: 'professional-reviews-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingStarsComponent, LucideArrowLeft, LucideRefreshCw, LucideStar, LucideTrendingUp],
  template: `
    <section class="mobile-page provider-list-page">
      <header class="provider-list-topbar">
        <a routerLink="/profissional/perfil" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <div>
          <h1>Avaliações recentes</h1>
          <small>{{ total() }} {{ total() === 1 ? 'avaliação' : 'avaliações' }}</small>
        </div>
      </header>

      <div class="provider-list-body">
        <p class="provider-list-loading" *ngIf="carregando() && !avaliacoes().length">Carregando...</p>
        <p class="provider-list-loading" *ngIf="erro()">{{ erro() }}</p>

        <ng-container *ngIf="!erro() && (avaliacoes().length || !carregando())">
          <section class="provider-list-summary review-summary-card" *ngIf="total(); else vazio">
            <span><svg lucideStar /></span>
            <div>
              <strong>{{ total() }} {{ total() === 1 ? 'avaliação recebida' : 'avaliações recebidas' }}</strong>
              <p>Veja o que seus clientes estão dizendo sobre seu trabalho. Continue assim!</p>
            </div>
            <div class="review-summary-score">
              <b>{{ media() | number: '1.1-1' }}</b>
              <rating-stars [rating]="media()" />
              <small>Média geral</small>
            </div>
          </section>

          <section class="provider-review-list" *ngIf="avaliacoes().length">
            <article *ngFor="let avaliacao of avaliacoes()">
              <span class="provider-list-avatar">
                {{ avaliacao.client.initial }}
                <i><svg lucideStar /></i>
              </span>
              <div class="provider-review-body">
                <header>
                  <strong>{{ avaliacao.client.name }}</strong>
                  <b>{{ avaliacao.rating | number: '1.1-1' }}</b>
                  <time>{{ dataRelativa(avaliacao.createdAt) }}</time>
                </header>
                <div class="provider-review-stars"><svg lucideStar *ngFor="let estrela of estrelasDe(avaliacao.rating)" /></div>
                <p>{{ avaliacao.comment }}</p>
              </div>
            </article>
          </section>

          <button class="provider-list-more" type="button" *ngIf="temMais()" [disabled]="carregando()" (click)="carregarMais()">
            <svg lucideRefreshCw />{{ carregando() ? 'Carregando...' : 'Carregar mais avaliações' }}
          </button>

          <section class="provider-list-tip" *ngIf="total()">
            <span><svg lucideTrendingUp /></span>
            <div>
              <strong>Dica para receber mais avaliações</strong>
              <p>Conclua seus serviços, mantenha um bom atendimento e peça para seus clientes avaliarem seu trabalho. Avaliações ajudam a conquistar mais clientes!</p>
            </div>
          </section>
        </ng-container>

        <ng-template #vazio>
          <section class="provider-list-empty">
            <span><svg lucideStar /></span>
            <h2>Ainda não há avaliações</h2>
            <p>As avaliações dos seus clientes aparecerão aqui depois dos serviços realizados.</p>
          </section>
        </ng-template>
      </div>
    </section>
  `,
})
export class ProfessionalReviewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly avaliacoes = signal<ProfessionalReview[]>([]);
  protected readonly total = signal(0);
  protected readonly media = signal(0);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  private readonly pagina = signal(1);
  protected readonly temMais = computed(() => this.avaliacoes().length < this.total());

  ngOnInit() {
    this.carregar(1);
  }

  protected carregarMais() {
    if (this.carregando()) return;
    this.carregar(this.pagina() + 1);
  }

  protected estrelasDe(nota: number) {
    return Array.from({ length: Math.max(0, Math.min(5, Math.round(nota))) });
  }

  /**
   * "Há 2 dias" enquanto o tempo ainda diz algo; passado um mês a data cheia
   * informa mais do que "há 7 semanas".
   */
  protected dataRelativa(data: string) {
    const quando = new Date(data).getTime();
    if (Number.isNaN(quando)) return '';
    const dias = Math.floor((Date.now() - quando) / 86400000);
    if (dias <= 0) return 'Hoje';
    if (dias === 1) return 'Há 1 dia';
    if (dias < 7) return `Há ${dias} dias`;
    if (dias < 14) return 'Há 1 semana';
    if (dias < 30) return `Há ${Math.floor(dias / 7)} semanas`;
    return new Date(data).toLocaleDateString('pt-BR');
  }

  private carregar(pagina: number) {
    this.carregando.set(true);
    this.api.getProfessionalReviews(pagina, POR_PAGINA).subscribe({
      next: (resposta) => {
        this.total.set(resposta.summary.total);
        this.media.set(resposta.summary.averageRating);
        this.pagina.set(resposta.page);
        this.avaliacoes.update((atual) => (resposta.page === 1 ? resposta.items : [...atual, ...resposta.items]));
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não conseguimos carregar suas avaliações agora. Tente novamente em instantes.');
        this.carregando.set(false);
      },
    });
  }
}
