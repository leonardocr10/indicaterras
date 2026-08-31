import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideHeart, LucideMapPin, LucideRocket, LucideUsersRound } from '@lucide/angular';
import { ApiService } from './services/api.service';
import { FavoriteClient } from './models';

const POR_PAGINA = 10;

/**
 * Lista completa de quem salvou o profissional nos favoritos, aberta pelo
 * "Ver todos" do painel.
 *
 * Privacidade: aqui só entra o que o cliente já mostra ao usar o app — nome,
 * bairro e cidade. Telefone, e-mail, rua e número nem chegam do backend, e a
 * linha não leva a lugar nenhum: favoritar não abre um canal para o
 * profissional procurar quem favoritou.
 */
@Component({
  selector: 'professional-favorites-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowLeft, LucideHeart, LucideMapPin, LucideRocket, LucideUsersRound],
  template: `
    <section class="mobile-page provider-list-page">
      <header class="provider-list-topbar">
        <a routerLink="/profissional/perfil" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <div>
          <h1>Clientes que favoritaram você</h1>
          <small>{{ total() }} {{ total() === 1 ? 'cliente' : 'clientes' }}</small>
        </div>
      </header>

      <div class="provider-list-body">
        <p class="provider-list-loading" *ngIf="carregando() && !clientes().length">Carregando...</p>
        <p class="provider-list-loading" *ngIf="erro()">{{ erro() }}</p>

        <ng-container *ngIf="!erro() && (clientes().length || !carregando())">
          <section class="provider-list-summary" *ngIf="total(); else vazio">
            <span><svg lucideHeart /></span>
            <div>
              <strong>{{ total() }} {{ total() === 1 ? 'pessoa favoritou' : 'pessoas favoritaram' }} seu perfil</strong>
              <p>Essas pessoas salvaram seu perfil nos favoritos. Mostre seu trabalho e conquiste ainda mais clientes!</p>
            </div>
          </section>

          <section class="provider-list-card" *ngIf="clientes().length">
            <article class="provider-list-row" *ngFor="let favorito of clientes()">
              <span class="provider-list-avatar">
                {{ favorito.client.initial }}
                <i><svg lucideHeart /></i>
              </span>
              <div class="provider-list-row-main">
                <strong>{{ favorito.client.name }}</strong>
                <small *ngIf="localDe(favorito)"><svg lucideMapPin />{{ localDe(favorito) }}</small>
              </div>
              <div class="provider-list-row-date">
                <span>Favoritou em</span>
                <time>{{ favorito.favoritedAt | date: 'dd/MM/yyyy' }}</time>
              </div>
            </article>
          </section>

          <button class="provider-list-more" type="button" *ngIf="temMais()" [disabled]="carregando()" (click)="carregarMais()">
            <svg lucideUsersRound />{{ carregando() ? 'Carregando...' : 'Ver mais clientes' }}
          </button>

          <section class="provider-list-tip" *ngIf="total()">
            <span><svg lucideRocket /></span>
            <div>
              <strong>Dica para conquistar mais clientes</strong>
              <p>Mantenha seu perfil atualizado, publique fotos dos seus trabalhos e responda às solicitações rapidamente.</p>
            </div>
          </section>
        </ng-container>

        <ng-template #vazio>
          <section class="provider-list-empty">
            <span><svg lucideHeart /></span>
            <h2>Ainda ninguém favoritou seu perfil</h2>
            <p>Complete seu perfil, publique seus trabalhos e mantenha suas informações atualizadas para chamar mais atenção dos clientes.</p>
            <a routerLink="/profissional/perfil">Melhorar meu perfil</a>
          </section>
        </ng-template>
      </div>
    </section>
  `,
})
export class ProfessionalFavoritesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly clientes = signal<FavoriteClient[]>([]);
  protected readonly total = signal(0);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  private readonly pagina = signal(1);
  protected readonly temMais = computed(() => this.clientes().length < this.total());

  ngOnInit() {
    this.carregar(1);
  }

  protected carregarMais() {
    if (this.carregando()) return;
    this.carregar(this.pagina() + 1);
  }

  /** Bairro e cidade, sem rua nem número. Cada parte só entra se existir. */
  protected localDe(favorito: FavoriteClient) {
    const { neighborhood, city, state } = favorito.client;
    const cidade = [city, state].filter(Boolean).join(' - ');
    return [neighborhood, cidade].filter(Boolean).join(', ');
  }

  private carregar(pagina: number) {
    this.carregando.set(true);
    this.api.getProfessionalFavoriteClients(pagina, POR_PAGINA).subscribe({
      next: (resposta) => {
        this.total.set(resposta.total);
        this.pagina.set(resposta.page);
        this.clientes.update((atual) => (resposta.page === 1 ? resposta.items : [...atual, ...resposta.items]));
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não conseguimos carregar seus favoritos agora. Tente novamente em instantes.');
        this.carregando.set(false);
      },
    });
  }
}
