import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendarDays,
  LucideCamera,
  LucideCircleAlert,
  LucideFileText,
  LucideMapPin,
  LucideSparkles,
  LucideTrash2,
} from '@lucide/angular';
import { AppHeaderComponent } from './components';
import { SearchableSelectComponent } from './searchable-select';
import { Category, CategoryService, ProblemMatchResult, ServiceRequestRecord } from './models';
import { ServiceRequestDraft, ServiceRequestDraftStore } from './service-request-draft.store';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';

const STEP_LABELS = ['Problema', 'Fotos', 'Preferências', 'Local', 'Confirmar'] as const;

@Component({
  selector: 'request-problem-step',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideSparkles, SearchableSelectComponent],
  template: `
    <section class="request-step-card">
      <div class="request-step-intro">
        <span><svg lucideSparkles /></span>
        <div>
          <h2>Descreva o problema</h2>
          <p>Vamos sugerir a categoria e os serviços mais compatíveis.</p>
        </div>
      </div>

      <label class="request-field">
        <span>Título</span>
        <input [ngModel]="draft.title" (ngModelChange)="patch.emit({ title: $event })" placeholder="Ex.: Chuveiro não esquenta" />
      </label>

      <label class="request-field">
        <span>Descrição</span>
        <textarea
          rows="5"
          [ngModel]="draft.description"
          (ngModelChange)="patch.emit({ description: $event }); descriptionChanged.emit()"
          placeholder="Conte o que está acontecendo, quando começou e qualquer detalhe útil."
        ></textarea>
      </label>

      <div class="request-field">
        <span>Categoria</span>
        <app-searchable-select [ngModel]="draft.categoryId" (ngModelChange)="patch.emit({ categoryId: $event })" [items]="categories" valueKey="id" labelKey="name" iconKey="icon" emptyLabel="Selecione uma categoria" searchPlaceholder="Pesquisar categoria..." />
      </div>

      <div class="request-field">
        <span>Serviços relacionados</span>
        <div class="request-chip-grid" *ngIf="services.length; else noServices">
          <button
            *ngFor="let service of services"
            type="button"
            class="request-chip"
            [class.active]="draft.serviceIds.includes(service.id)"
            (click)="toggleService.emit(service.id)"
          >
            {{ service.name }}
          </button>
        </div>
        <ng-template #noServices><p class="request-muted">Selecione uma categoria para ver os serviços disponíveis.</p></ng-template>
      </div>

      <div class="request-suggestion-card" *ngIf="match">
        <div class="request-suggestion-header">
          <strong>Sugestão automática</strong>
          <small *ngIf="matching">Analisando...</small>
        </div>
        <p *ngIf="match.category">Categoria sugerida: <b>{{ match.category.name }}</b></p>
        <p *ngIf="match.services.length">Serviços: {{ matchServiceNames() }}</p>
      </div>
    </section>
  `,
})
export class RequestProblemStepComponent {
  @Input({ required: true }) draft!: ServiceRequestDraft;
  @Input({ required: true }) categories: Category[] = [];
  @Input({ required: true }) services: CategoryService[] = [];
  @Input() match: ProblemMatchResult | null = null;
  @Input() matching = false;
  @Output() patch = new EventEmitter<Partial<ServiceRequestDraft>>();
  @Output() toggleService = new EventEmitter<string>();
  @Output() descriptionChanged = new EventEmitter<void>();

  protected matchServiceNames() {
    return this.match?.services.map((service) => service.name).join(', ') ?? '';
  }
}

@Component({
  selector: 'request-media-step',
  standalone: true,
  imports: [CommonModule, LucideCamera, LucideTrash2],
  template: `
    <section class="request-step-card">
      <div class="request-step-intro">
        <span><svg lucideCamera /></span>
        <div>
          <h2>Adicione fotos ou vídeo</h2>
          <p>Até 10 imagens e 1 vídeo opcional.</p>
        </div>
      </div>

      <label class="request-upload-box">
        <input type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" (change)="filesSelected.emit($event)" />
        <strong>Selecionar mídia</strong>
        <small>PNG, JPG, WebP, MP4, WebM ou MOV.</small>
      </label>

      <div class="request-media-grid" *ngIf="draft.media.length; else noMedia">
        <article class="request-media-card" *ngFor="let item of draft.media; let index = index">
          <img *ngIf="item.mediaType === 'IMAGE'; else previewVideo" [src]="item.previewUrl" alt="Pré-visualização" />
          <ng-template #previewVideo><video [src]="item.previewUrl" controls preload="metadata"></video></ng-template>
          <div class="request-media-meta">
            <span>{{ item.mediaType === 'VIDEO' ? 'Vídeo' : 'Imagem ' + (index + 1) }}</span>
            <button type="button" (click)="remove.emit(index)"><svg lucideTrash2 /></button>
          </div>
        </article>
      </div>
      <ng-template #noMedia><p class="request-muted">Você pode publicar sem mídia, mas fotos costumam gerar propostas melhores.</p></ng-template>
    </section>
  `,
})
export class RequestMediaStepComponent {
  @Input({ required: true }) draft!: ServiceRequestDraft;
  @Output() filesSelected = new EventEmitter<Event>();
  @Output() remove = new EventEmitter<number>();
}

@Component({
  selector: 'request-preferences-step',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideCalendarDays, SearchableSelectComponent],
  template: `
    <section class="request-step-card">
      <div class="request-step-intro">
        <span><svg lucideCalendarDays /></span>
        <div>
          <h2>Defina as preferências</h2>
          <p>Urgência, janela de atendimento e faixa de orçamento.</p>
        </div>
      </div>

      <div class="request-field">
        <span>Urgência</span>
        <div class="request-chip-grid">
          <button *ngFor="let item of urgencyOptions" type="button" class="request-chip" [class.active]="draft.urgency === item.value" (click)="patch.emit({ urgency: item.value })">{{ item.label }}</button>
        </div>
      </div>

      <div class="request-grid-2">
        <label class="request-field">
          <span>Data preferida</span>
          <input type="date" [ngModel]="draft.preferredDate" (ngModelChange)="patch.emit({ preferredDate: $event })" />
        </label>

        <div class="request-field">
          <span>Período</span>
          <app-searchable-select [ngModel]="draft.preferredPeriod" (ngModelChange)="patch.emit({ preferredPeriod: $event })" [items]="periodOptions" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar período..." />
        </div>
      </div>

      <div class="request-field">
        <span>Tipo de orçamento</span>
        <div class="request-chip-grid">
          <button *ngFor="let item of budgetOptions" type="button" class="request-chip" [class.active]="draft.budgetType === item.value" (click)="patch.emit({ budgetType: item.value })">{{ item.label }}</button>
        </div>
      </div>

      <div class="request-grid-2" *ngIf="draft.budgetType !== 'OPEN'">
        <label class="request-field">
          <span>Valor mínimo</span>
          <input type="number" min="0" step="0.01" [ngModel]="draft.budgetMin" (ngModelChange)="patch.emit({ budgetMin: $event })" />
        </label>

        <label class="request-field">
          <span>Valor máximo</span>
          <input type="number" min="0" step="0.01" [ngModel]="draft.budgetMax" (ngModelChange)="patch.emit({ budgetMax: $event })" />
        </label>
      </div>
    </section>
  `,
})
export class RequestPreferencesStepComponent {
  @Input({ required: true }) draft!: ServiceRequestDraft;
  @Output() patch = new EventEmitter<Partial<ServiceRequestDraft>>();

  protected readonly urgencyOptions = [
    { value: 'EMERGENCY', label: 'Emergência' },
    { value: 'TODAY', label: 'Hoje' },
    { value: 'NEXT_DAYS', label: 'Próximos dias' },
    { value: 'NO_RUSH', label: 'Sem pressa' },
  ] as const;

  protected readonly periodOptions = [
    { value: 'ANY', label: 'Qualquer período' },
    { value: 'MORNING', label: 'Manhã' },
    { value: 'AFTERNOON', label: 'Tarde' },
    { value: 'EVENING', label: 'Noite' },
  ] as const;

  protected readonly budgetOptions = [
    { value: 'OPEN', label: 'Em aberto' },
    { value: 'FIXED', label: 'Valor fechado' },
    { value: 'RANGE', label: 'Faixa de valor' },
  ] as const;
}

@Component({
  selector: 'request-location-step',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideMapPin],
  template: `
    <section class="request-step-card">
      <div class="request-step-intro">
        <span><svg lucideMapPin /></span>
        <div>
          <h2>Informe o local</h2>
          <p>O endereço completo fica privado nesta fase e só será usado na solicitação.</p>
        </div>
      </div>

      <div class="request-grid-2">
        <label class="request-field"><span>CEP</span><input [ngModel]="draft.zipCode" (ngModelChange)="patch.emit({ zipCode: $event })" /></label>
        <label class="request-field"><span>Número</span><input [ngModel]="draft.number" (ngModelChange)="patch.emit({ number: $event })" /></label>
      </div>

      <label class="request-field"><span>Rua</span><input [ngModel]="draft.street" (ngModelChange)="patch.emit({ street: $event })" /></label>
      <label class="request-field"><span>Complemento</span><input [ngModel]="draft.complement" (ngModelChange)="patch.emit({ complement: $event })" /></label>

      <div class="request-grid-2">
        <label class="request-field"><span>Bairro</span><input [ngModel]="draft.neighborhood" (ngModelChange)="patch.emit({ neighborhood: $event })" /></label>
        <label class="request-field"><span>Cidade</span><input [ngModel]="draft.city" (ngModelChange)="patch.emit({ city: $event })" /></label>
      </div>

      <div class="request-grid-2">
        <label class="request-field"><span>Estado</span><input maxlength="2" [ngModel]="draft.state" (ngModelChange)="patch.emit({ state: ($event || '').toUpperCase() })" /></label>
        <label class="request-field"><span>Latitude (opcional)</span><input [ngModel]="draft.latitude" (ngModelChange)="patch.emit({ latitude: $event })" /></label>
      </div>

      <label class="request-field"><span>Longitude (opcional)</span><input [ngModel]="draft.longitude" (ngModelChange)="patch.emit({ longitude: $event })" /></label>
    </section>
  `,
})
export class RequestLocationStepComponent {
  @Input({ required: true }) draft!: ServiceRequestDraft;
  @Output() patch = new EventEmitter<Partial<ServiceRequestDraft>>();
}

@Component({
  selector: 'request-confirm-step',
  standalone: true,
  imports: [CommonModule, LucideCircleAlert, LucideFileText],
  template: `
    <section class="request-step-card">
      <div class="request-step-intro">
        <span><svg lucideFileText /></span>
        <div>
          <h2>Revise a solicitação</h2>
          <p>Confira os dados antes de publicar.</p>
        </div>
      </div>

      <div class="request-summary-list">
        <article><span>Problema</span><strong>{{ draft.title }}</strong><small>{{ draft.description }}</small></article>
        <article><span>Categoria</span><strong>{{ categoryName || 'Não informada' }}</strong><small>{{ serviceNamesLabel() }}</small></article>
        <article><span>Preferências</span><strong>{{ urgencyLabel }}</strong><small>{{ preferredDateLabel }}</small></article>
        <article><span>Local</span><strong>{{ locationLabel }}</strong><small>{{ draft.street }} {{ draft.number }}</small></article>
        <article><span>Mídia</span><strong>{{ draft.media.length }} arquivo(s)</strong><small>Imagens e vídeo enviados junto com a publicação.</small></article>
      </div>

      <div class="request-warning">
        <svg lucideCircleAlert />
        <p>Ao publicar, sua solicitação entra com status <b>OPEN</b> e fica pronta para as próximas fases de matching e propostas.</p>
      </div>
    </section>
  `,
})
export class RequestConfirmStepComponent {
  @Input({ required: true }) draft!: ServiceRequestDraft;
  @Input() categoryName = '';
  @Input() serviceNames: string[] = [];

  get urgencyLabel() {
    return {
      EMERGENCY: 'Emergência',
      TODAY: 'Hoje',
      NEXT_DAYS: 'Próximos dias',
      NO_RUSH: 'Sem pressa',
    }[this.draft.urgency];
  }

  get preferredDateLabel() {
    const period = {
      MORNING: 'Manhã',
      AFTERNOON: 'Tarde',
      EVENING: 'Noite',
      ANY: 'Qualquer período',
    }[this.draft.preferredPeriod];
    return [this.draft.preferredDate || 'Sem data definida', period].filter(Boolean).join(' · ');
  }

  get locationLabel() {
    return [this.draft.neighborhood, this.draft.city, this.draft.state].filter(Boolean).join(' - ');
  }

  protected serviceNamesLabel() {
    return this.serviceNames.length ? this.serviceNames.join(', ') : 'Sem serviços selecionados';
  }
}

@Component({
  selector: 'service-requests-page',
  standalone: true,
  imports: [CommonModule, RouterLink, AppHeaderComponent, LucideFileText],
  template: `
    <section class="mobile-page service-requests-page">
      <app-header eyebrow="Minhas solicitações" title="Solicitações" subtitle="Acompanhe o que você já publicou." />
      <section class="request-page-body">
        <a class="primary-button request-create-button" routerLink="/app/solicitacoes/nova">Nova solicitação</a>

        <div class="request-list" *ngIf="requests().length; else emptyState">
          <a class="request-list-card" *ngFor="let request of requests()" [routerLink]="['/app/solicitacoes', request.id]">
            <div>
              <strong>{{ request.title }}</strong>
              <p>{{ request.categoryName || 'Sem categoria' }} · {{ serviceNames(request.services) }}</p>
            </div>
            <div class="request-list-meta">
              <span class="status-badge">{{ request.status }}</span>
              <small>{{ request.createdAt | date: 'dd/MM/yyyy HH:mm' }}</small>
            </div>
          </a>
        </div>

        <ng-template #emptyState>
          <div class="request-empty-state">
            <svg lucideFileText />
            <h2>Nenhuma solicitação publicada</h2>
            <p>Crie sua primeira solicitação para descrever um problema e preparar o fluxo de propostas.</p>
          </div>
        </ng-template>
      </section>
    </section>
  `,
})
export class ServiceRequestsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly requests = signal<ServiceRequestRecord[]>([]);

  ngOnInit() {
    this.api.getMyServiceRequests().subscribe({
      next: (requests) => this.requests.set(requests),
      error: () => this.requests.set([]),
    });
  }

  protected serviceNames(services: ServiceRequestRecord['services']) {
    return services.map((service) => service.name).join(', ');
  }
}

@Component({
  selector: 'service-request-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, AppHeaderComponent, LucideArrowLeft],
  template: `
    <section class="mobile-page service-request-detail-page" *ngIf="request(); else loading">
      <app-header eyebrow="Detalhes da solicitação" [title]="request()!.title" [subtitle]="request()!.categoryName || 'Sem categoria'" />
      <section class="request-page-body">
        <a class="back-link" routerLink="/app/solicitacoes"><svg lucideArrowLeft />Voltar para solicitações</a>

        <article class="request-detail-card">
          <span class="status-badge">{{ request()!.status }}</span>
          <p>{{ request()!.description }}</p>
          <div class="request-summary-list">
            <article><span>Serviços</span><strong>{{ serviceNames(request()!.services) }}</strong></article>
            <article><span>Urgência</span><strong>{{ urgencyLabel(request()!) }}</strong></article>
            <article><span>Data preferida</span><strong>{{ preferredDateLabel(request()!) }}</strong></article>
            <article><span>Período</span><strong>{{ periodLabel(request()!.preferredPeriod) }}</strong></article>
            <article><span>Orçamento</span><strong>{{ budgetLabel(request()!) }}</strong></article>
            <article><span>Local</span><strong>{{ locationLabel(request()!) }}</strong></article>
          </div>
        </article>

        <section class="request-detail-card" *ngIf="request()!.media.length">
          <h2>Mídia anexada</h2>
          <div class="request-media-grid">
            <article class="request-media-card" *ngFor="let item of request()!.media">
              <img *ngIf="item.mediaType === 'IMAGE'; else detailVideo" [src]="api.assetUrl(item.url)" alt="Mídia da solicitação" />
              <ng-template #detailVideo><video [src]="api.assetUrl(item.url)" controls preload="metadata"></video></ng-template>
            </article>
          </div>
        </section>
      </section>
    </section>
    <ng-template #loading><section class="mobile-page service-request-detail-page"><div class="request-page-body"><p>Carregando solicitação...</p></div></section></ng-template>
  `,
})
export class ServiceRequestDetailsPageComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly request = signal<ServiceRequestRecord | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.api.getServiceRequest(id).subscribe({
        next: (request) => this.request.set(request),
        error: () => this.request.set(null),
      });
    });
  }

  protected urgencyLabel(request: ServiceRequestRecord) {
    return {
      EMERGENCY: 'Emergência',
      TODAY: 'Hoje',
      NEXT_DAYS: 'Próximos dias',
      NO_RUSH: 'Sem pressa',
    }[request.urgency];
  }

  protected periodLabel(value: ServiceRequestRecord['preferredPeriod']) {
    return {
      MORNING: 'Manhã',
      AFTERNOON: 'Tarde',
      EVENING: 'Noite',
      ANY: 'Qualquer período',
      '': 'Não definido',
    }[value];
  }

  protected budgetLabel(request: ServiceRequestRecord) {
    if (request.budgetType === 'OPEN' || !request.budgetType) return 'Em aberto';
    if (request.budgetType === 'FIXED') return request.budgetMax ? `R$ ${request.budgetMax}` : 'Valor fechado';
    return [request.budgetMin ? `R$ ${request.budgetMin}` : '', request.budgetMax ? `R$ ${request.budgetMax}` : ''].filter(Boolean).join(' até ');
  }

  protected serviceNames(services: ServiceRequestRecord['services']) {
    return services.map((service) => service.name).join(', ');
  }

  protected preferredDateLabel(request: ServiceRequestRecord) {
    return request.preferredDate ? new Date(request.preferredDate).toLocaleDateString('pt-BR') : 'Não definida';
  }

  protected locationLabel(request: ServiceRequestRecord) {
    return [request.neighborhood, request.city, request.state].filter(Boolean).join(' - ');
  }
}

@Component({
  selector: 'service-request-new-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RequestProblemStepComponent,
    RequestMediaStepComponent,
    RequestPreferencesStepComponent,
    RequestLocationStepComponent,
    RequestConfirmStepComponent,
    LucideArrowLeft,
  ],
  template: `
    <section class="mobile-page service-request-new-page">
      <header class="request-flow-topbar">
        <a class="request-flow-back" routerLink="/app/solicitacoes" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <strong>Quero receber propostas</strong>
        <span aria-hidden="true"></span>
      </header>
      <section class="request-page-body request-flow-body">
        <header class="request-builder-header">
          <div>
            <p>Conte os detalhes para receber propostas mais precisas.</p>
          </div>
          <strong>Passo {{ currentStep() + 1 }} de 5</strong>
        </header>

        <nav class="request-stepper" aria-label="Etapas da solicitação">
          <button type="button" *ngFor="let label of steps; let index = index" [class.active]="index === currentStep()" [class.done]="index < currentStep()" (click)="goToStep(index)">
            <span>{{ index + 1 }}</span><small>{{ label }}</small>
          </button>
        </nav>

        <request-problem-step
          *ngIf="currentStep() === 0"
          [draft]="draft()"
          [categories]="categories()"
          [services]="availableServices()"
          [match]="match()"
          [matching]="matching()"
          (patch)="patchDraft($event)"
          (toggleService)="toggleService($event)"
          (descriptionChanged)="scheduleMatch()"
        />

        <request-media-step *ngIf="currentStep() === 1" [draft]="draft()" (filesSelected)="selectMedia($event)" (remove)="removeMedia($event)" />

        <request-preferences-step *ngIf="currentStep() === 2" [draft]="draft()" (patch)="patchDraft($event)" />

        <p class="request-address-hint" *ngIf="currentStep() === 3 && enderecoDoCadastro()">
          Preenchemos com o endereço do seu cadastro. Ajuste se o serviço for em outro lugar.
        </p>
        <request-location-step *ngIf="currentStep() === 3" [draft]="draft()" (patch)="patchDraft($event)" />

        <request-confirm-step
          *ngIf="currentStep() === 4"
          [draft]="draft()"
          [categoryName]="selectedCategoryName()"
          [serviceNames]="selectedServiceNames()"
        />

        <footer class="request-builder-actions">
          <button type="button" class="secondary-button" [disabled]="currentStep() === 0" (click)="previousStep()">Anterior</button>
          <button type="button" class="primary-button" *ngIf="currentStep() < 4" (click)="nextStep()">Próximo</button>
          <button type="button" class="primary-button" *ngIf="currentStep() === 4" [disabled]="saving()" (click)="publish()">
            {{ saving() ? 'Publicando...' : 'Publicar solicitação' }}
          </button>
        </footer>
      </section>
    </section>
  `,
})
export class ServiceRequestNewPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly store = inject(ServiceRequestDraftStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly steps = STEP_LABELS;
  protected readonly draft = this.store.draft;
  protected readonly categories = signal<Category[]>([]);
  protected readonly currentStep = signal(0);
  protected readonly match = signal<ProblemMatchResult | null>(null);
  protected readonly matching = signal(false);
  /** Sinaliza na tela que o endereço veio do cadastro e pode ser ajustado. */
  protected readonly enderecoDoCadastro = signal(false);
  protected readonly saving = signal(false);
  protected readonly availableServices = computed(() => {
    const category = this.categories().find((item) => item.id === this.draft().categoryId);
    return category?.services.filter((service) => service.active) ?? [];
  });
  protected readonly selectedCategoryName = computed(() => this.categories().find((item) => item.id === this.draft().categoryId)?.name ?? this.match()?.category?.name ?? '');
  protected readonly selectedServiceNames = computed(() => this.availableServices().filter((service) => this.draft().serviceIds.includes(service.id)).map((service) => service.name));
  private matchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.api.getCategories().subscribe((categories) => this.categories.set(categories.filter((category) => category.active)));
    this.carregarEnderecoDaConta();
    this.route.queryParamMap.subscribe((params) => {
      const problem = params.get('problema')?.trim();
      if (!problem || this.draft().description) return;
      this.patchDraft({
        title: this.draft().title || problem.slice(0, 80),
        description: problem,
      });
      // Categoria e serviços já identificados (pela IA ou pelo matcher) evitam refazer a análise aqui.
      const categoryId = params.get('categoria')?.trim();
      const serviceIds = (params.get('servicos') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
      if (categoryId) {
        this.store.patch({ categoryId, serviceIds });
        return;
      }
      this.scheduleMatch();
    });
  }

  ngOnDestroy() {
    if (this.matchTimer) clearTimeout(this.matchTimer);
  }

  /**
   * O endereço do cliente já está cadastrado; repetir a digitação a cada
   * solicitação é trabalho à toa. Só preenche campo vazio, para não
   * sobrescrever o que a pessoa tenha ajustado nesta solicitação.
   */
  private carregarEnderecoDaConta() {
    this.api.getMyAccount().subscribe({
      next: (conta) => {
        const atual = this.draft();
        const doCadastro: Partial<ServiceRequestDraft> = {};
        const campos = ['zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const;
        for (const campo of campos) {
          const valor = (conta[campo] ?? '').trim();
          if (valor && !atual[campo]) doCadastro[campo] = valor;
        }
        if (Object.keys(doCadastro).length) {
          this.store.patch(doCadastro);
          this.enderecoDoCadastro.set(true);
        }
      },
      error: () => undefined,
    });
  }

  protected patchDraft(partial: Partial<ServiceRequestDraft>) {
    const next = { ...partial };
    if (partial.categoryId !== undefined) {
      const allowed = new Set((this.categories().find((item) => item.id === partial.categoryId)?.services ?? []).map((service) => service.id));
      next.serviceIds = this.draft().serviceIds.filter((serviceId) => allowed.has(serviceId));
    }
    this.store.patch(next);
  }

  protected toggleService(serviceId: string) {
    const ids = this.draft().serviceIds;
    this.store.patch({
      serviceIds: ids.includes(serviceId) ? ids.filter((id) => id !== serviceId) : [...ids, serviceId],
    });
  }

  protected scheduleMatch() {
    if (this.matchTimer) clearTimeout(this.matchTimer);
    const query = this.draft().description.trim() || this.draft().title.trim();
    if (query.length < 3) return;
    this.matchTimer = setTimeout(() => {
      this.matching.set(true);
      this.api.matchProblem(query).subscribe({
        next: (match) => {
          this.match.set(match);
          this.matching.set(false);
          if (!this.draft().categoryId && match.category) {
            this.store.patch({ categoryId: match.category.id });
          }
          if (!this.draft().serviceIds.length && match.services.length) {
            this.store.patch({ serviceIds: match.services.map((service) => service.id) });
          }
        },
        error: () => this.matching.set(false),
      });
    }, 350);
  }

  protected selectMedia(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    if (!files.length) return;

    const current = [...this.draft().media];
    const images = current.filter((item) => item.mediaType === 'IMAGE').length;
    const videos = current.filter((item) => item.mediaType === 'VIDEO').length;
    let nextImages = images;
    let nextVideos = videos;

    for (const file of files) {
      const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      if (mediaType === 'IMAGE') {
        nextImages += 1;
        if (nextImages > 10) {
          this.toast.error('A solicitação aceita no máximo 10 imagens.');
          continue;
        }
      } else {
        nextVideos += 1;
        if (nextVideos > 1) {
          this.toast.error('A solicitação aceita apenas 1 vídeo.');
          continue;
        }
      }
      current.push({
        file,
        previewUrl: URL.createObjectURL(file),
        mediaType,
      });
    }

    this.store.patch({ media: current });
    input.value = '';
  }

  protected removeMedia(index: number) {
    const current = [...this.draft().media];
    const [removed] = current.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    this.store.patch({ media: current });
  }

  protected goToStep(index: number) {
    if (index <= this.currentStep() || this.canProceedTo(index)) this.currentStep.set(index);
  }

  protected previousStep() {
    this.currentStep.update((value) => Math.max(0, value - 1));
  }

  protected nextStep() {
    if (!this.validateStep(this.currentStep())) return;
    this.currentStep.update((value) => Math.min(4, value + 1));
  }

  protected publish() {
    if (!this.validateStep(4)) return;
    const draft = this.draft();
    this.saving.set(true);
    this.api.createServiceRequest({
      title: draft.title.trim(),
      description: draft.description.trim(),
      categoryId: draft.categoryId,
      serviceIds: draft.serviceIds,
      urgency: draft.urgency,
      preferredDate: draft.preferredDate,
      preferredPeriod: draft.preferredPeriod,
      budgetType: draft.budgetType,
      budgetMin: this.toNumberOrNull(draft.budgetMin),
      budgetMax: this.toNumberOrNull(draft.budgetMax),
      zipCode: draft.zipCode,
      street: draft.street,
      number: draft.number,
      complement: draft.complement,
      neighborhood: draft.neighborhood,
      city: draft.city,
      state: draft.state,
      latitude: this.toNumberOrNull(draft.latitude),
      longitude: this.toNumberOrNull(draft.longitude),
    }).subscribe({
      next: (request) => {
        const files = draft.media.map((item) => item.file);
        if (!files.length) {
          this.finishPublish(request.id);
          return;
        }
        this.api.uploadServiceRequestMedia(request.id, files).subscribe({
          next: () => this.finishPublish(request.id),
          error: () => {
            this.saving.set(false);
            this.toast.error('A solicitação foi criada, mas houve erro ao enviar as mídias.');
            void this.router.navigate(['/app/solicitacoes', request.id]);
          },
        });
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Não foi possível publicar a solicitação.');
      },
    });
  }

  private finishPublish(id: string) {
    this.saving.set(false);
    this.toast.success('Solicitação publicada com sucesso.');
    this.store.reset();
    void this.router.navigate(['/app/solicitacoes', id]);
  }

  private validateStep(step: number) {
    const draft = this.draft();
    if (step === 0) {
      if (!draft.title.trim() || !draft.description.trim()) {
        this.toast.error('Preencha título e descrição do problema.');
        return false;
      }
      if (!draft.categoryId || !draft.serviceIds.length) {
        this.toast.error('Selecione a categoria e pelo menos um serviço.');
        return false;
      }
    }
    if (step === 3 || step === 4) {
      if (!draft.neighborhood.trim() || !draft.city.trim() || !draft.state.trim()) {
        this.toast.error('Informe ao menos bairro, cidade e estado.');
        return false;
      }
    }
    return true;
  }

  private canProceedTo(index: number) {
    for (let step = 0; step < index; step += 1) {
      if (!this.validateStep(step)) return false;
    }
    return true;
  }

  private toNumberOrNull(value: string) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
