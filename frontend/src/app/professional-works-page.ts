import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import {
  LucideArrowLeft,
  LucideChevronLeft,
  LucideChevronRight,
  LucideImage,
  LucideImagePlus,
  LucideLightbulb,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';
import { ProfessionalWork } from './models';

type Aba = 'todos' | 'recentes';

/**
 * Galeria completa de trabalhos do profissional, aberta pelo "Ver tudo" do
 * card "Meus trabalhos" no painel.
 *
 * Nao existe portfolio novo aqui: a tela consome os mesmos endpoints do painel
 * (`uploads/works` + `me/professional/works`), sobre a mesma tabela
 * `professional_images`. As fotos sao exatamente as que aparecem no perfil
 * publico, na mesma ordem (`displayOrder`), entao nao ha duas galerias para
 * manter em sincronia.
 *
 * O que ficou de fora, de proposito:
 *  - aba "Mais vistos": nao existe contagem de visualizacao por foto no
 *    modelo. Inventar numero seria pior do que nao ter a aba.
 *  - reordenar e destacar: `displayOrder` e `isCover` existem no banco, mas
 *    nao ha endpoint que os altere. Entra quando houver.
 */
@Component({
  selector: 'professional-works-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideArrowLeft,
    LucideChevronLeft,
    LucideChevronRight,
    LucideImage,
    LucideImagePlus,
    LucideLightbulb,
    LucideTrash2,
    LucideX,
  ],
  template: `
    <section class="mobile-page provider-list-page provider-works-page">
      <header class="provider-list-topbar">
        <a routerLink="/profissional/perfil" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <div>
          <h1>Meus trabalhos</h1>
          <small>Gerencie as fotos dos serviços que aparecem no seu perfil.</small>
        </div>
      </header>

      <div class="provider-list-body">
        <p class="provider-list-loading" *ngIf="carregando()">Carregando suas fotos...</p>
        <p class="provider-list-loading" *ngIf="erro()">{{ erro() }}</p>

        <ng-container *ngIf="!carregando() && !erro()">
          <!-- Contador: sempre o numero real, nunca um valor fixo. -->
          <section class="provider-works-count" *ngIf="total()">
            <span><svg lucideImage aria-hidden="true" /></span>
            <strong>{{ total() }} {{ total() === 1 ? 'foto publicada' : 'fotos publicadas' }}</strong>
          </section>

          <label class="provider-works-upload" [class.enviando]="enviando()">
            <svg lucideImagePlus aria-hidden="true" />
            <span>{{ enviando() ? 'Enviando fotos...' : 'Publicar fotos de trabalhos' }}</span>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              [disabled]="enviando()"
              (change)="publicar($event)"
            />
          </label>

          <div class="provider-works-tabs" role="tablist" aria-label="Filtrar trabalhos" *ngIf="total() > 1">
            <button
              *ngFor="let opcao of abas"
              type="button"
              role="tab"
              [attr.aria-selected]="aba() === opcao.valor"
              [class.active]="aba() === opcao.valor"
              (click)="aba.set(opcao.valor)"
            >
              {{ opcao.rotulo }}
            </button>
          </div>

          <div class="provider-works-gallery" *ngIf="total(); else semTrabalhos">
            <figure *ngFor="let trabalho of visiveis(); let indice = index">
              <button type="button" class="provider-works-open" (click)="abrirVisualizacao(indice)">
                <!-- lazy: a grade pode ter dezenas de fotos e o app roda no celular. -->
                <img [src]="api.assetUrl(trabalho.image)" [alt]="trabalho.title || 'Trabalho publicado'" loading="lazy" />
              </button>
              <button
                type="button"
                class="provider-works-delete"
                [attr.aria-label]="'Excluir foto' + (trabalho.title ? ' ' + trabalho.title : '')"
                (click)="pedirExclusao(trabalho)"
              >
                <svg lucideTrash2 />
              </button>
            </figure>
          </div>

          <ng-template #semTrabalhos>
            <section class="provider-works-empty">
              <span><svg lucideImage aria-hidden="true" /></span>
              <h2>Mostre seu trabalho</h2>
              <p>Publique fotos dos serviços que você já realizou. Elas ajudam os clientes a conhecer melhor seu trabalho.</p>
              <label class="primary-button" [class.disabled]="enviando()">
                <svg lucideImagePlus />{{ enviando() ? 'Enviando...' : 'Publicar minha primeira foto' }}
                <input type="file" multiple accept="image/png,image/jpeg,image/webp" [disabled]="enviando()" (change)="publicar($event)" />
              </label>
            </section>
          </ng-template>

          <aside class="provider-list-tip provider-works-tip">
            <span><svg lucideLightbulb aria-hidden="true" /></span>
            <p><b>Dica:</b> publique fotos reais dos seus serviços para atrair mais clientes. Evite imagens com documentos, endereços ou dados de clientes.</p>
          </aside>
        </ng-container>
      </div>
    </section>

    <!-- Confirmacao: exclusao nunca acontece direto no toque da lixeira. -->
    <div class="professional-filter-backdrop" *ngIf="paraExcluir() as alvo" (click)="cancelarExclusao()">
      <section class="provider-works-confirm" role="dialog" aria-modal="true" aria-labelledby="excluir-foto-titulo" (click)="$event.stopPropagation()">
        <h2 id="excluir-foto-titulo">Excluir esta foto?</h2>
        <p>Ela deixará de aparecer no seu perfil.</p>
        <img [src]="api.assetUrl(alvo.image)" alt="" />
        <footer>
          <button type="button" class="secondary-button" (click)="cancelarExclusao()">Cancelar</button>
          <button type="button" class="provider-works-confirm-delete" [disabled]="excluindo()" (click)="confirmarExclusao(alvo)">
            {{ excluindo() ? 'Excluindo...' : 'Excluir' }}
          </button>
        </footer>
      </section>
    </div>

    <!-- Visualizacao ampliada, com navegacao entre as fotos. -->
    <div class="provider-works-lightbox" *ngIf="ampliada() as foto" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <button type="button" class="provider-works-lightbox-close" aria-label="Fechar" (click)="fecharVisualizacao()"><svg lucideX /></button>
      <button
        type="button"
        class="provider-works-lightbox-nav anterior"
        aria-label="Foto anterior"
        *ngIf="visiveis().length > 1"
        (click)="navegar(-1)"
      >
        <svg lucideChevronLeft />
      </button>
      <img [src]="api.assetUrl(foto.image)" [alt]="foto.title || 'Trabalho publicado'" />
      <button
        type="button"
        class="provider-works-lightbox-nav proxima"
        aria-label="Próxima foto"
        *ngIf="visiveis().length > 1"
        (click)="navegar(1)"
      >
        <svg lucideChevronRight />
      </button>
      <footer class="provider-works-lightbox-bar">
        <span>{{ indiceAmpliado() + 1 }} de {{ visiveis().length }}</span>
        <button type="button" (click)="pedirExclusao(foto)"><svg lucideTrash2 />Excluir</button>
      </footer>
    </div>
  `,
})
export class ProfessionalWorksPageComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly trabalhos = signal<ProfessionalWork[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly enviando = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly paraExcluir = signal<ProfessionalWork | null>(null);
  protected readonly indiceAmpliado = signal(-1);
  protected readonly aba = signal<Aba>('todos');

  // "Mais vistos" so entra quando houver contagem por foto no backend.
  protected readonly abas: Array<{ valor: Aba; rotulo: string }> = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'recentes', rotulo: 'Recentes' },
  ];

  protected readonly total = computed(() => this.trabalhos().length);

  /**
   * "Todos" preserva a ordem do backend (`displayOrder`), que e a mesma do
   * card do painel e do perfil publico. "Recentes" reordena por data.
   */
  protected readonly visiveis = computed(() => {
    const lista = this.trabalhos();
    if (this.aba() !== 'recentes') return lista;
    return [...lista].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  protected readonly ampliada = computed(() => this.visiveis()[this.indiceAmpliado()] ?? null);

  ngOnInit() {
    this.carregar();
  }

  private carregar() {
    this.carregando.set(true);
    this.api.getOwnProfessional().subscribe({
      next: (profissional) => {
        this.api.getProfessionalWorks(profissional.id).subscribe({
          next: (trabalhos) => {
            this.trabalhos.set(trabalhos);
            this.carregando.set(false);
          },
          error: () => {
            this.erro.set('Não conseguimos carregar suas fotos agora. Tente novamente em instantes.');
            this.carregando.set(false);
          },
        });
      },
      error: () => {
        this.erro.set('Não encontramos um perfil profissional para esta conta.');
        this.carregando.set(false);
      },
    });
  }

  /** Mesmo fluxo do painel: sobe os arquivos e vincula ao perfil. */
  protected publicar(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    input.value = '';
    if (!arquivos.length) return;

    this.enviando.set(true);
    this.api
      .uploadWorkPhotos(arquivos.slice(0, 10))
      .pipe(switchMap((imagens) => this.api.addOwnProfessionalWorks(imagens)))
      .subscribe({
        next: (trabalhos) => {
          this.trabalhos.set(trabalhos);
          this.enviando.set(false);
          this.toast.success(arquivos.length === 1 ? 'Foto publicada.' : `${arquivos.length} fotos publicadas.`);
        },
        error: () => {
          this.enviando.set(false);
          this.toast.error('Não foi possível publicar as fotos. Verifique o formato e o tamanho.');
        },
      });
  }

  protected pedirExclusao(trabalho: ProfessionalWork) {
    this.paraExcluir.set(trabalho);
  }

  protected cancelarExclusao() {
    this.paraExcluir.set(null);
  }

  protected confirmarExclusao(trabalho: ProfessionalWork) {
    this.excluindo.set(true);
    this.api.removeOwnProfessionalWork(trabalho.id).subscribe({
      next: (trabalhos) => {
        this.trabalhos.set(trabalhos);
        this.excluindo.set(false);
        this.paraExcluir.set(null);
        // Se a foto aberta era a excluida, a visualizacao precisa se ajustar.
        if (this.indiceAmpliado() >= this.visiveis().length) this.fecharVisualizacao();
        this.toast.success('Foto removida do seu perfil.');
      },
      error: () => {
        this.excluindo.set(false);
        this.toast.error('Não foi possível excluir a foto.');
      },
    });
  }

  protected abrirVisualizacao(indice: number) {
    this.indiceAmpliado.set(indice);
  }

  protected fecharVisualizacao() {
    this.indiceAmpliado.set(-1);
  }

  /** Navegacao circular: da ultima volta para a primeira. */
  protected navegar(passo: number) {
    const total = this.visiveis().length;
    if (!total) return;
    this.indiceAmpliado.set((this.indiceAmpliado() + passo + total) % total);
  }
}
