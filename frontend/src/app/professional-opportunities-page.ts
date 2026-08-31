import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCircleAlert, LucideClock, LucideImage, LucideMapPin, LucideRefreshCw, LucideSearch } from '@lucide/angular';
import { ApiService } from './services/api.service';
import { Opportunity } from './models';

const POR_PAGINA = 10;

/**
 * Oportunidades: as solicitações abertas que combinam com o que o profissional
 * atende e estão dentro do raio que ele informou.
 *
 * A tela é de leitura por enquanto. Enviar proposta é a próxima tarefa da
 * Fase 1 — e até ela existir nada aqui promete resposta ao cliente, porque a
 * solicitação ainda não é entregue a ninguém automaticamente.
 */
@Component({
  selector: 'professional-opportunities-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowLeft, LucideCircleAlert, LucideClock, LucideImage, LucideMapPin, LucideRefreshCw, LucideSearch],
  template: `
    <section class="mobile-page provider-list-page">
      <header class="provider-list-topbar">
        <a routerLink="/profissional/perfil" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <div>
          <h1>Oportunidades</h1>
          <small>{{ total() }} {{ total() === 1 ? 'solicitação aberta' : 'solicitações abertas' }}</small>
        </div>
      </header>

      <div class="provider-list-body">
        <p class="provider-list-loading" *ngIf="carregando() && !oportunidades().length">Carregando...</p>
        <p class="provider-list-loading" *ngIf="erro()">{{ erro() }}</p>

        <ng-container *ngIf="!erro() && (oportunidades().length || !carregando())">
          <section class="provider-list-summary" *ngIf="oportunidades().length">
            <span><svg lucideSearch /></span>
            <div>
              <strong>{{ total() }} {{ total() === 1 ? 'cliente descreveu' : 'clientes descreveram' }} um problema que você atende</strong>
              <p>
                Dentro de {{ raio() }} km do seu endereço.
                <ng-container *ngIf="raioPadrao()">Você ainda não informou seu raio — estamos usando {{ raio() }} km. Ajuste no seu perfil.</ng-container>
              </p>
            </div>
          </section>

          <section class="provider-opportunity-list">
            <article *ngFor="let item of oportunidades()">
              <header>
                <span class="provider-urgency" [class]="'provider-urgency ' + classeDaUrgencia(item.urgency)">{{ rotuloDaUrgencia(item.urgency) }}</span>
                <time>{{ item.createdAt | date: 'dd/MM' }}</time>
              </header>

              <h2>{{ item.title }}</h2>
              <p>{{ item.summary }}</p>

              <div class="provider-opportunity-tags" *ngIf="item.category || item.services.length">
                <span *ngIf="item.category">{{ item.category.name }}</span>
                <span *ngFor="let servico of item.services">{{ servico.name }}</span>
              </div>

              <footer>
                <span *ngIf="item.distanceKm !== null"><svg lucideMapPin />~{{ item.distanceKm | number: '1.1-1' }} km</span>
                <span *ngIf="local(item)"><svg lucideMapPin />{{ local(item) }}</span>
                <span *ngIf="item.preferredDate"><svg lucideClock />{{ item.preferredDate | date: 'dd/MM' }} {{ periodo(item.preferredPeriod) }}</span>
                <span *ngIf="item.mediaCount"><svg lucideImage />{{ item.mediaCount }} {{ item.mediaCount === 1 ? 'foto' : 'fotos' }}</span>
              </footer>
            </article>
          </section>

          <button class="provider-list-more" type="button" *ngIf="temMais()" [disabled]="carregando()" (click)="carregarMais()">
            <svg lucideRefreshCw />{{ carregando() ? 'Carregando...' : 'Ver mais solicitações' }}
          </button>

          <section class="provider-list-tip" *ngIf="oportunidades().length">
            <span><svg lucideCircleAlert /></span>
            <div>
              <strong>O envio de proposta ainda está sendo construído</strong>
              <p>Por enquanto esta lista mostra o que os clientes estão pedindo na sua região. Enquanto isso, mantenha seu perfil completo: é por ele que o cliente chega até você.</p>
            </div>
          </section>
        </ng-container>

        <section class="provider-list-empty" *ngIf="!carregando() && !erro() && !oportunidades().length">
          <span><svg lucideSearch /></span>
          <h2>{{ bloqueado() ? 'Seu perfil ainda não está liberado' : 'Nenhuma solicitação aberta por perto' }}</h2>
          <p *ngIf="bloqueado()">Enquanto a administração não liberar seu cadastro, você não recebe oportunidades.</p>
          <p *ngIf="!bloqueado()">
            Assim que alguém descrever um problema das suas categorias dentro de {{ raio() }} km, ele aparece aqui.
            <ng-container *ngIf="raioPadrao()"> Informe até quantos km você atende para afinar essa busca.</ng-container>
          </p>
          <a routerLink="/profissional/perfil" *ngIf="!bloqueado()">Ajustar meu perfil</a>
        </section>
      </div>
    </section>
  `,
})
export class ProfessionalOpportunitiesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly oportunidades = signal<Opportunity[]>([]);
  protected readonly total = signal(0);
  protected readonly raio = signal(0);
  protected readonly raioPadrao = signal(false);
  protected readonly bloqueado = signal(false);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  private readonly pagina = signal(1);
  protected readonly temMais = computed(() => this.oportunidades().length < this.total());

  ngOnInit() {
    this.carregar(1);
  }

  protected carregarMais() {
    if (this.carregando()) return;
    this.carregar(this.pagina() + 1);
  }

  protected local(item: Opportunity) {
    const cidade = [item.city, item.state].filter(Boolean).join(' - ');
    return [item.neighborhood, cidade].filter(Boolean).join(', ');
  }

  protected rotuloDaUrgencia(urgencia: Opportunity['urgency']) {
    return { EMERGENCY: 'Emergência', TODAY: 'Para hoje', NEXT_DAYS: 'Próximos dias', NO_RUSH: 'Sem pressa' }[urgencia];
  }

  protected classeDaUrgencia(urgencia: Opportunity['urgency']) {
    return { EMERGENCY: 'urgente', TODAY: 'hoje', NEXT_DAYS: 'normal', NO_RUSH: 'calma' }[urgencia];
  }

  protected periodo(periodo: Opportunity['preferredPeriod']) {
    if (!periodo) return '';
    return { MORNING: 'de manhã', AFTERNOON: 'à tarde', EVENING: 'à noite' }[periodo];
  }

  private carregar(pagina: number) {
    this.carregando.set(true);
    this.api.getProfessionalOpportunities(pagina, POR_PAGINA).subscribe({
      next: (resposta) => {
        this.total.set(resposta.total);
        this.raio.set(resposta.radiusKm);
        this.raioPadrao.set(resposta.usingDefaultRadius);
        this.bloqueado.set(resposta.blocked);
        this.pagina.set(resposta.page);
        this.oportunidades.update((atual) => (resposta.page === 1 ? resposta.items : [...atual, ...resposta.items]));
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não conseguimos carregar as oportunidades agora. Tente novamente em instantes.');
        this.carregando.set(false);
      },
    });
  }
}
