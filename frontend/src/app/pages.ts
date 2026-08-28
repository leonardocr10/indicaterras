import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { of, switchMap } from 'rxjs';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  AppHeaderComponent,
  CategoryCardComponent,
  MobileTopbarComponent,
  ProfessionalCardComponent,
  RatingStarsComponent,
  RecommendationBadgeComponent,
} from './components';
import { ApiService } from './services/api.service';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import {
  LucideArrowLeft, LucideBell, LucideCalendarDays, LucideCheckCircle2, LucideEllipsis,
  LucideHeart, LucideCamera, LucideMenu, LucideMessageCircle, LucidePhone,
  LucideSearch, LucideShare2, LucideSlidersHorizontal, LucideUsersRound, LucideSparkles,
  LucideBriefcaseBusiness, LucideChevronDown, LucideFileText, LucideThumbsUp,
  LucideStar, LucideUserRoundPlus, LucideCircleAlert,
  LucideMail, LucideLockKeyhole, LucideEye, LucideEyeOff, LucideUserRound,
  LucideHouse, LucideHandshake, LucideX,
  LucideDownload, LucidePlus, LucideChevronLeft, LucideChevronRight, LucideShieldCheck,
} from '@lucide/angular';
import { Category, CategoryService, Condominium, DashboardPayload, HomePayload, Professional, ProfessionalComment, ProfessionalWork, Review } from './models';
import { SpreadsheetService } from './services/spreadsheet.service';
import { matchesSearch } from './search.util';
import { fetchBrazilianCities, neighborhoodsForCity } from './brazil-locations';
import { buildPhoneLink, buildWhatsappLink } from './contact.util';
import { categoryAvatar, categoryCover } from './category-art.util';
import { SearchableSelectComponent } from './searchable-select';
import { PhoneMaskDirective } from './phone-mask.directive';

@Component({
  selector: 'login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideMail, LucideLockKeyhole, LucideEye, LucideEyeOff, LucideUserRound],
  template: `
    <section class="auth-page resident-login-page">
      <div class="auth-card resident-login-card">
        <img class="auth-logo" src="/assets/logo-terras-original.png" alt="Terras Alphas Indica" />
        <p>Profissionais recomendados por quem mora perto de você.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label class="auth-field">E-mail
            <span><svg lucideMail /><input type="email" placeholder="seu@email.com" formControlName="email" /></span>
          </label>
          <label class="auth-field">Senha
            <span><svg lucideLockKeyhole /><input [type]="showPassword() ? 'text' : 'password'" placeholder="Digite sua senha" formControlName="password" /><button type="button" aria-label="Mostrar ou ocultar senha" (click)="togglePassword()"><svg *ngIf="!showPassword()" lucideEye /><svg *ngIf="showPassword()" lucideEyeOff /></button></span>
          </label>
          <div class="auth-row">
            <label><input type="checkbox" formControlName="rememberMe" /> Lembrar-me</label>
            <button type="button" class="text-button">Esqueci minha senha</button>
          </div>
          <button class="primary-button" type="submit">Entrar</button>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
        </form>
        <div class="separator">ou</div>
        <a routerLink="/cadastro" class="secondary-button"><svg lucideUserRound />Criar conta</a>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['leonardo@terrasalphas.com.br', [Validators.required, Validators.email]],
    password: ['123456', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  togglePassword() {
    this.showPassword.update((value) => !value);
  }

  private connectionMessage(status?: number) {
    if (!status || status === 0 || status === 405 || status === 504) {
      return 'Não conseguimos falar com o servidor. Verifique se a API está no ar.';
    }
    return 'Não foi possível entrar. Tente novamente.';
  }

  private homeForRole(role: string) {
    if (role === 'RESIDENT') return '/app/home';
    if (role === 'PROFESSIONAL') return '/profissional/perfil';
    return '/admin/dashboard';
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Preencha e-mail e senha corretamente.');
      this.hasError.set(true);
      return;
    }
    this.feedback.set('Entrando...');
    this.hasError.set(false);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (session) => void this.router.navigateByUrl(this.homeForRole(session.user.role)),
      error: (error: { status?: number; error?: { message?: string | string[] } }) => {
        const message = error.error?.message;
        const text = Array.isArray(message) ? message.join(', ') : message;
        this.feedback.set(text || this.connectionMessage(error.status));
        this.hasError.set(true);
      },
    });
  }
}

@Component({
  selector: 'register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, PhoneMaskDirective],
  template: `
    <section class="auth-page register-page">
      <div class="auth-card wide">
        <a routerLink="/" class="back-link">←</a>
        <h1>Criar conta</h1>
        <p>{{ isProfessional() ? 'Cadastre seu perfil profissional para aparecer no aplicativo.' : 'Preencha seus dados para criar sua conta.' }}</p>
        <div *ngIf="professionalSignupEnabled()" class="account-type-switch" role="radiogroup" aria-label="Tipo de conta">
          <button type="button" role="radio" [attr.aria-checked]="!isProfessional()" [class.active]="!isProfessional()" (click)="setAccountType('resident')">Sou morador</button>
          <button type="button" role="radio" [attr.aria-checked]="isProfessional()" [class.active]="isProfessional()" (click)="setAccountType('professional')">Sou profissional</button>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <input placeholder="Nome completo" formControlName="name" />
          <input type="email" placeholder="E-mail" formControlName="email" />
          <input type="tel" inputmode="tel" maxlength="15" placeholder="Telefone (WhatsApp)" formControlName="phone" appPhoneMask />

          <ng-container *ngIf="!isProfessional()">
            <input placeholder="CPF (opcional)" formControlName="cpf" />
            <app-searchable-select formControlName="condominiumId" [items]="condominiums()" valueKey="id" labelKey="name" placeholder="Selecione o condomínio" searchPlaceholder="Pesquisar condomínio..." />
            <div class="grid-2">
              <input placeholder="Bloco" formControlName="block" />
              <input placeholder="Unidade" formControlName="unit" />
            </div>
          </ng-container>

          <ng-container *ngIf="isProfessional()">
            <input placeholder="Empresa (opcional)" formControlName="companyName" />
            <app-searchable-select formControlName="categoryId" [items]="activeCategories()" valueKey="id" labelKey="name" placeholder="Selecione sua categoria" searchPlaceholder="Pesquisar categoria..." />
            <app-searchable-select formControlName="city" [items]="cities()" valueKey="name" labelKey="label" [placeholder]="loadingCities() ? 'Carregando cidades...' : 'Selecione a cidade'" searchPlaceholder="Pesquisar cidade..." />
            <app-searchable-select *ngIf="neighborhoodOptions().length; else bairroLivre" formControlName="neighborhood" [items]="neighborhoodOptions()" placeholder="Selecione o bairro" searchPlaceholder="Pesquisar bairro..." />
            <ng-template #bairroLivre><input placeholder="Bairro" formControlName="neighborhood" /></ng-template>
            <textarea placeholder="Conte sobre o seu trabalho (opcional)" formControlName="bio" maxlength="600"></textarea>
          </ng-container>

          <input type="password" placeholder="Senha" formControlName="password" />
          <button class="primary-button" type="submit">{{ isProfessional() ? 'Criar conta de profissional' : 'Criar conta' }}</button>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
        </form>
      </div>
    </section>
  `,
})
export class RegisterPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly condominiums = signal<Condominium[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly activeCategories = computed(() => this.categories().filter((category) => category.active));
  protected readonly professionalSignupEnabled = signal(false);
  protected readonly isProfessional = signal(false);
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly cities = signal<Array<{ name: string; label: string }>>([]);
  protected readonly loadingCities = signal(false);
  protected readonly selectedCity = signal('');
  protected readonly neighborhoodOptions = computed(() => neighborhoodsForCity(this.selectedCity()));
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    cpf: [''],
    condominiumId: ['', Validators.required],
    block: [''],
    unit: [''],
    companyName: [''],
    categoryId: [''],
    city: [''],
    neighborhood: [''],
    bio: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    this.api.getCondominiums().subscribe((condominiums) => {
      this.condominiums.set(condominiums);
      if (!this.isProfessional() && !this.form.controls.condominiumId.value) {
        this.form.controls.condominiumId.setValue(condominiums[0]?.id ?? '');
      }
    });
    this.api.getCategories().subscribe((categories) => this.categories.set(categories));
    this.api.getPublicSettings().subscribe({
      next: (settings) => this.professionalSignupEnabled.set(settings.professionalSelfRegistration),
      error: () => this.professionalSignupEnabled.set(false),
    });
    this.form.controls.city.valueChanges.subscribe((city) => {
      this.selectedCity.set(city ?? '');
      this.form.controls.neighborhood.setValue('');
    });
  }

  private loadCities() {
    this.loadingCities.set(true);
    fetchBrazilianCities(this.http).subscribe({
      next: (cities) => {
        this.cities.set(cities.map((city) => ({ name: city.name, label: city.uf ? `${city.name} - ${city.uf}` : city.name })));
        this.loadingCities.set(false);
      },
      error: () => this.loadingCities.set(false),
    });
  }

  setAccountType(type: 'resident' | 'professional') {
    const professional = type === 'professional';
    this.isProfessional.set(professional);
    this.feedback.set('');
    this.hasError.set(false);
    const { condominiumId, categoryId, city, neighborhood } = this.form.controls;
    if (professional) {
      condominiumId.clearValidators();
      categoryId.setValidators(Validators.required);
      city.setValidators(Validators.required);
      neighborhood.setValidators(Validators.required);
      if (!this.cities().length) this.loadCities();
    } else {
      condominiumId.setValidators(Validators.required);
      if (!condominiumId.value) condominiumId.setValue(this.condominiums()[0]?.id ?? '');
      categoryId.clearValidators();
      city.clearValidators();
      neighborhood.clearValidators();
    }
    [condominiumId, categoryId, city, neighborhood].forEach((control) => control.updateValueAndValidity());
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Confira os campos obrigatórios.');
      this.hasError.set(true);
      return;
    }
    const values = this.form.getRawValue();
    const request = this.isProfessional()
      ? this.auth.registerProfessional({
          name: values.name,
          email: values.email,
          phone: values.phone,
          categoryId: values.categoryId,
          city: values.city,
          companyName: values.companyName,
          neighborhood: values.neighborhood,
          bio: values.bio,
          password: values.password,
        })
      : this.auth.register({
          name: values.name,
          email: values.email,
          phone: values.phone,
          condominiumId: values.condominiumId,
          block: values.block,
          unit: values.unit,
          password: values.password,
        });
    request.subscribe({
      next: (result) => {
        if (result.session) {
          const role = result.session.user.role;
          void this.router.navigateByUrl(role === 'PROFESSIONAL' ? '/profissional/perfil' : role === 'RESIDENT' ? '/app/home' : '/admin/dashboard');
          return;
        }
        this.feedback.set('Cadastro criado e aguardando aprovação da administração.');
        this.hasError.set(false);
      },
      error: (error: { error?: { message?: string | string[] } }) => {
        const message = error.error?.message;
        this.feedback.set(Array.isArray(message) ? message.join(', ') : message ?? 'Não foi possível criar sua conta.');
        this.hasError.set(true);
      },
    });
  }
}

@Component({
  selector: 'home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CategoryCardComponent,
    ProfessionalCardComponent,
    MobileTopbarComponent,
    LucideSearch,
    LucideSlidersHorizontal,
    LucideShieldCheck,
    LucideChevronRight,
  ],
  template: `
    <section class="mobile-page home-page" *ngIf="payload() as home">
      <mobile-topbar />
      <section class="home-surface">
        <h1>O que você precisa hoje?</h1>
        <p class="home-subtitle">Encontre profissionais e serviços de confiança.</p>
        <form class="home-search" role="search" (ngSubmit)="searchProfessionals()">
          <svg lucideSearch aria-hidden="true" />
          <input name="homeSearch" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" [(ngModel)]="searchText" (keydown.enter)="searchProfessionals(); $event.preventDefault()" placeholder="Buscar profissional ou serviço..." aria-label="Buscar profissional ou serviço" />
          <a class="home-search-filters" routerLink="/app/profissionais" aria-label="Abrir filtros de busca"><svg lucideSlidersHorizontal /></a>
        </form>
        <div class="home-popular" *ngIf="popularCategories(home).length">
          <span>Mais buscados:</span>
          <a *ngFor="let category of popularCategories(home)" routerLink="/app/profissionais" [queryParams]="{ categoria: category.slug }">{{ category.name }}</a>
        </div>
      </section>
      <section class="home-content">
        <div class="section-title">
          <h2>Categorias</h2>
          <a routerLink="/app/profissionais">Ver todas</a>
        </div>
        <div class="category-grid">
          <category-card *ngFor="let category of home.categories" [category]="category" />
        </div>
        <a class="home-verified" routerLink="/app/profissionais">
          <span><svg lucideShieldCheck /></span>
          <div><strong>Profissionais verificados</strong><small>Mais segurança para você e sua família.</small></div>
          <svg lucideChevronRight />
        </a>
      </section>

      <section class="home-content recommended-section">
        <div class="section-title">
          <h2>Mais recomendados do {{ home.condominium.name }}</h2>
          <a routerLink="/app/profissionais">Ver todos</a>
        </div>
        <div class="recommended-strip">
          <professional-card *ngFor="let professional of home.featuredProfessionals" [professional]="professional" [compact]="true" [condominiumName]="home.condominium.name" />
        </div>
      </section>

    </section>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly payload = signal<HomePayload | null>(null);
  protected searchText = '';

  ngOnInit() {
    // The administrative desktop experience is a separate dashboard, not the resident directory.
    if (this.auth.user()?.role !== 'RESIDENT') {
      void this.router.navigateByUrl('/admin/dashboard');
      return;
    }
    this.api.getHome().subscribe((payload) => {
      this.payload.set(payload);
      this.theme.applyCondominiumTheme(payload.condominium);
    });
  }

  protected popularCategories(home: HomePayload) {
    const preferred = ['encanador', 'eletricista', 'diarista', 'ar-condicionado'];
    const actives = home.categories.filter((category) => category.active !== false && category.slug !== 'mais');
    const picked = preferred.map((slug) => actives.find((category) => category.slug === slug)).filter(Boolean) as Category[];
    return picked.length ? picked : actives.slice(0, 4);
  }

  protected searchProfessionals() {
    const search = this.searchText.replace(/\s+/g, ' ').trim();
    void this.router.navigate(['/app/profissionais'], { queryParams: search ? { busca: search } : {} });
  }
}

@Component({
  selector: 'professionals-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfessionalCardComponent, SearchableSelectComponent, LucideArrowLeft, LucideSearch, LucideSlidersHorizontal, LucideThumbsUp, LucideStar, LucideX],
  template: `
    <section class="mobile-page professionals-page">
      <div class="professionals-heading">
        <a class="professionals-back" routerLink="/app/home" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <div><h1>{{ pageTitle() }}</h1><p>{{ filteredProfessionals().length }} {{ filteredProfessionals().length === 1 ? 'profissional encontrado' : 'profissionais encontrados' }}</p></div>
      </div>
      <div class="professionals-content">
        <div class="filter-row">
          <button class="filter-chip icon-only" type="button" [class.active]="sortMode() === 'recommended'" (click)="sortMode.set('recommended')" aria-label="Mais recomendados" title="Mais recomendados"><svg lucideThumbsUp /></button>
          <button class="filter-chip icon-only" type="button" [class.active]="sortMode() === 'rating'" (click)="sortMode.set('rating')" aria-label="Melhor avaliados" title="Melhor avaliados"><svg lucideStar /></button>
          <button class="filter-chip filter-open-button icon-only" type="button" [class.has-filters]="activeFilterCount() > 0" (click)="openFilters()" aria-label="Filtros" title="Filtros"><span *ngIf="activeFilterCount()">{{ activeFilterCount() }}</span><svg lucideSlidersHorizontal /></button>
        </div>
        <professional-card *ngFor="let professional of filteredProfessionals()" [professional]="professional" />
        <div class="professionals-empty" *ngIf="filteredProfessionals().length === 0">
          <svg lucideSearch />
          <h2>Nenhum profissional encontrado</h2>
          <p>Ajuste ou limpe os filtros para ver outras opções.</p>
          <button class="secondary-button" type="button" (click)="clearFilters()">Limpar filtros</button>
        </div>
      </div>

      <div class="professional-filter-backdrop" *ngIf="filtersOpen()" (click)="closeFilters()">
        <section class="professional-filter-sheet" role="dialog" aria-modal="true" aria-label="Filtros de profissionais" (click)="$event.stopPropagation()">
          <header>
            <div><span>Refine sua busca</span><h2>Filtros</h2></div>
            <button type="button" aria-label="Fechar filtros" (click)="closeFilters()"><svg lucideX /></button>
          </header>

          <label>Buscar por nome ou serviço
            <span class="filter-search-field"><svg lucideSearch /><input [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" placeholder="Ex.: instalação elétrica" /></span>
          </label>

          <label>Categoria
            <app-searchable-select [ngModel]="selectedCategory()" (ngModelChange)="selectedCategory.set($event)" [items]="categories()" valueKey="slug" labelKey="name" emptyLabel="Todas as categorias" searchPlaceholder="Pesquisar categoria..." />
          </label>

          <div class="professional-filter-grid">
            <label>Cidade
              <app-searchable-select [ngModel]="cityFilter()" (ngModelChange)="setCityFilter($event)" [items]="availableCities()" emptyLabel="Todas" searchPlaceholder="Pesquisar cidade..." />
            </label>
            <label>Bairro
              <app-searchable-select [ngModel]="neighborhoodFilter()" (ngModelChange)="neighborhoodFilter.set($event)" [items]="availableNeighborhoods()" emptyLabel="Todos" searchPlaceholder="Pesquisar bairro..." />
            </label>
          </div>

          <label>Serviço
            <app-searchable-select [ngModel]="serviceFilter()" (ngModelChange)="serviceFilter.set($event)" [items]="availableServices()" valueKey="slug" labelKey="name" emptyLabel="Todos os serviços" searchPlaceholder="Pesquisar serviço..." />
          </label>

          <label>Avaliação mínima
            <app-searchable-select [ngModel]="minimumRating()" (ngModelChange)="minimumRating.set(+$event)" [items]="ratingOptions" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar avaliação..." />
          </label>

          <footer>
            <button class="secondary-button" type="button" (click)="clearFilters()">Limpar</button>
            <button class="primary-button" type="button" (click)="applyFilters()">Ver {{ filteredProfessionals().length }} {{ filteredProfessionals().length === 1 ? 'profissional' : 'profissionais' }}</button>
          </footer>
        </section>
      </div>
    </section>
  `,
})
export class ProfessionalsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly sortMode = signal<'recommended' | 'rating'>('recommended');
  protected readonly filtersOpen = signal(false);
  protected readonly selectedCategory = signal('');
  protected readonly searchText = signal('');
  protected readonly cityFilter = signal('');
  protected readonly neighborhoodFilter = signal('');
  protected readonly serviceFilter = signal('');
  protected readonly minimumRating = signal(0);
  protected readonly ratingOptions = [
    { value: 0, label: 'Qualquer avaliação' },
    { value: 4, label: '4,0 ou mais' },
    { value: 4.5, label: '4,5 ou mais' },
    { value: 4.8, label: '4,8 ou mais' },
  ];

  protected readonly pageTitle = computed(() => {
    const slug = this.selectedCategory();
    if (!slug) return 'Profissionais';
    const category = this.categories().find((item) => item.slug === slug);
    if (!category) return 'Profissionais';
    const titles: Record<string, string> = {
      eletricista: 'Eletricistas',
      encanador: 'Encanadores',
      pedreiro: 'Pedreiros',
      pintor: 'Pintores',
      diarista: 'Diaristas',
      'ar-condicionado': 'Ar-condicionado',
      jardineiro: 'Jardineiros',
      montador: 'Montadores',
    };
    return titles[slug] ?? category.name;
  });

  protected readonly availableCities = computed(() => this.uniqueValues(this.professionals().map((item) => item.city)));
  protected readonly availableNeighborhoods = computed(() => {
    const city = this.cityFilter();
    return this.uniqueValues(this.professionals().filter((item) => !city || item.city === city).map((item) => item.neighborhood));
  });
  protected readonly availableServices = computed(() => {
    const category = this.selectedCategory();
    const categoryServices = this.categories().filter((item) => !category || item.slug === category).flatMap((item) => item.services ?? []);
    return [...new Map(categoryServices.filter((service) => service.active).map((service) => [service.id, service])).values()].sort((left, right) => left.displayOrder - right.displayOrder);
  });

  protected readonly activeFilterCount = computed(() => [
    this.selectedCategory(),
    this.searchText(),
    this.cityFilter(),
    this.neighborhoodFilter(),
    this.serviceFilter(),
    this.minimumRating() > 0 ? String(this.minimumRating()) : '',
  ].filter(Boolean).length);

  protected readonly filteredProfessionals = computed(() => {
    const category = this.selectedCategory();
    const search = this.searchText();
    const city = this.cityFilter();
    const neighborhood = this.neighborhoodFilter();
    const service = this.serviceFilter();
    const minimumRating = this.minimumRating();

    return this.professionals()
      .filter((professional) => {
        const searchable = [professional.name, professional.companyName ?? '', professional.bio, professional.city, professional.neighborhood, ...professional.categories.map((item) => item.name), ...professional.serviceDetails.flatMap((item) => [item.name, ...item.aliases])].join(' ');
        const intelligentSearch = matchesSearch(searchable, search);
        return (!category || professional.categories.some((item) => item.slug === category))
          && intelligentSearch
          && (!city || professional.city === city)
          && (!neighborhood || professional.neighborhood === neighborhood)
          && (!service || professional.serviceDetails.some((item) => item.slug === service))
          && professional.rating >= minimumRating;
      })
      .sort((first, second) => this.sortMode() === 'rating'
        ? second.rating - first.rating || second.reviewCount - first.reviewCount
        : second.recommendationCount - first.recommendationCount || second.rating - first.rating);
  });

  ngOnInit() {
    this.api.getProfessionals().subscribe((professionals) => this.professionals.set(professionals));
    this.api.getCategories().subscribe((categories) => this.categories.set(categories.filter((category) => category.slug !== 'mais')));
    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategory.set(params.get('categoria') ?? '');
      this.searchText.set(params.get('busca') ?? '');
    });
  }

  protected openFilters() {
    this.filtersOpen.set(true);
    document.body.classList.add('mobile-menu-open');
  }

  protected closeFilters() {
    this.filtersOpen.set(false);
    document.body.classList.remove('mobile-menu-open');
  }

  protected applyFilters() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoria: this.selectedCategory() || null,
        busca: this.searchText() || null,
      },
      queryParamsHandling: 'merge',
    });
    this.closeFilters();
  }

  protected setCityFilter(city: string) {
    this.cityFilter.set(city);
    if (this.neighborhoodFilter() && !this.availableNeighborhoods().includes(this.neighborhoodFilter())) {
      this.neighborhoodFilter.set('');
    }
  }

  protected clearFilters() {
    this.selectedCategory.set('');
    this.searchText.set('');
    this.cityFilter.set('');
    this.neighborhoodFilter.set('');
    this.serviceFilter.set('');
    this.minimumRating.set(0);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  @HostListener('window:keydown.escape')
  protected closeFiltersWithEscape() {
    if (this.filtersOpen()) this.closeFilters();
  }

  ngOnDestroy() {
    document.body.classList.remove('mobile-menu-open');
  }

  private uniqueValues(values: string[]) {
    return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  private normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}

@Component({
  selector: 'professional-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RatingStarsComponent, LucideArrowLeft, LucideShare2, LucideHeart, LucideMessageCircle, LucidePhone, LucideStar, LucideUsersRound, LucideCheckCircle2, LucideCircleAlert, LucideCamera, LucideX],
  template: `
    <section class="mobile-page profile-page" *ngIf="professional() as professional">
      <header class="profile-topbar">
        <a routerLink="/app/profissionais" aria-label="Voltar para a busca"><svg lucideArrowLeft /></a>
        <div>
          <button type="button" aria-label="Compartilhar profissional" (click)="shareProfessional(professional)"><svg lucideShare2 /></button>
          <button type="button" class="favorite-toggle" [class.active]="favorite()" aria-label="Salvar profissional" (click)="toggleFavorite(professional.id)"><svg lucideHeart [attr.fill]="favorite() ? 'currentColor' : 'none'" /></button>
        </div>
      </header>
      <div class="profile-cover" [style.background-image]="'url(' + profileCoverUrl() + ')'"></div>
      <div class="profile-card">
        <div class="profile-avatar">
          <img *ngIf="avatarUrl(); else profileInitials" [src]="avatarUrl()" [alt]="'Foto de ' + professional.name" (error)="$any($event.target).src='/assets/placeholders/default-avatar.svg'" />
          <ng-template #profileInitials>{{ initials() }}</ng-template>
        </div>
        <h1>{{ professional.name }}</h1>
        <div class="profile-meta">
          <span>{{ professional.category }}</span>
          <div class="rating-line centered">
            <rating-stars [rating]="professional.rating" />
            <strong>{{ professional.rating | number: '1.1-1' }}</strong>
            <a [routerLink]="['/app/profissional', professional.id, 'comentarios']">({{ professional.reviewCount }} avaliações)</a>
          </div>
        </div>
        <div class="profile-recommendation" *ngIf="professional.recommendationCount">
          <svg lucideUsersRound />
          <span>{{ professional.recommendationCount }} moradores do Terras Alphas recomendam este profissional</span>
        </div>
        <div class="quick-actions">
          <a [href]="whatsappLink(professional)" target="_blank" rel="noopener"><b><svg lucideMessageCircle /></b>WhatsApp</a>
          <a [href]="phoneLink(professional)"><b><svg lucidePhone /></b>Ligar</a>
          <a [routerLink]="['/app/profissional', professional.id, 'comentarios']" [queryParams]="{ avaliar: 1 }"><b><svg lucideStar /></b>Avaliar</a>
          <button type="button" (click)="shareProfessional(professional)"><b><svg lucideShare2 /></b>Compartilhar</button>
        </div>
        <section class="detail-section" *ngIf="professional.bio">
          <h2>Sobre</h2>
          <p>{{ professional.bio }}</p>
        </section>
        <section class="detail-section" *ngIf="professional.services.length">
          <h2>Serviços</h2>
          <ul>
            <li *ngFor="let service of visibleServices()"><svg lucideCheckCircle2 />{{ service }}</li>
          </ul>
          <button *ngIf="professional.services.length > serviceLimit" class="section-link" type="button" (click)="showAllServices.set(!showAllServices())">{{ showAllServices() ? 'Ver menos serviços' : 'Ver todos os serviços' }}</button>
        </section>
        <section class="detail-section profile-works" *ngIf="works().length">
          <h2>Trabalhos publicados</h2>
          <div class="profile-work-strip">
            <button *ngFor="let work of works()" type="button" (click)="workLightbox.set(assetUrl(work.image))" [attr.aria-label]="work.title || 'Ampliar foto do trabalho'">
              <img [src]="assetUrl(work.image)" [alt]="work.title || 'Trabalho publicado pelo profissional'" />
            </button>
          </div>
        </section>
        <section class="detail-section profile-comments">
          <header><h2>Comentários ({{ commentCount() }})</h2><a [routerLink]="['/app/profissional', professional.id, 'comentarios']">Ver todos</a></header>
          <div *ngIf="visiblePhotos().length; else noCommentPhotos" class="profile-comment-thumbs">
            <a *ngFor="let photo of visiblePhotos(); let index = index" [routerLink]="['/app/profissional', professional.id, 'comentarios']" aria-label="Ver comentários com fotos">
              <img [src]="photo" alt="Foto de trabalho realizado" />
              <span *ngIf="index === thumbLimit - 1 && extraPhotos()">+{{ extraPhotos() }}</span>
            </a>
          </div>
          <ng-template #noCommentPhotos><p class="profile-comments-empty">{{ commentCount() ? 'Os comentários deste profissional ainda não têm fotos.' : 'Este profissional ainda não recebeu comentários.' }}</p></ng-template>
          <a class="profile-rate-button" [routerLink]="['/app/profissional', professional.id, 'comentarios']" [queryParams]="{ avaliar: 1 }"><svg lucideStar />{{ commentCount() ? 'Avaliar este profissional' : 'Seja o primeiro a avaliar' }}</a>
        </section>
        <button type="button" class="profile-report-link" (click)="openReport()"><svg lucideCircleAlert />Denunciar este profissional</button>
      </div>
      <button *ngIf="workLightbox()" class="comment-lightbox" type="button" (click)="workLightbox.set('')" aria-label="Fechar foto ampliada"><img [src]="workLightbox()" alt="Foto do trabalho ampliada" /></button>
      <div class="profile-cta-bar">
        <a [href]="'https://wa.me/' + professional.whatsapp" class="primary-button full-width profile-whatsapp"><svg lucideMessageCircle />Chamar no WhatsApp</a>
      </div>

      <div class="professional-filter-backdrop" *ngIf="reportOpen()" (click)="closeReport()">
        <section class="professional-filter-sheet report-form-sheet" role="dialog" aria-modal="true" aria-label="Denunciar profissional" (click)="$event.stopPropagation()">
          <header>
            <div><span>Denúncia</span><h2>Denunciar {{ professional.name }}</h2></div>
            <button type="button" aria-label="Fechar" (click)="closeReport()"><svg lucideX /></button>
          </header>
          <label class="report-form-field">
            <span>Motivo</span>
            <select [(ngModel)]="reportReason">
              <option value="" disabled>Selecione o motivo</option>
              <option *ngFor="let motivo of reportReasons" [value]="motivo">{{ motivo }}</option>
            </select>
          </label>
          <label class="report-form-field">
            <span>Descreva o que aconteceu</span>
            <textarea [(ngModel)]="reportDescription" rows="4" maxlength="700" placeholder="Conte com detalhes o que aconteceu..."></textarea>
          </label>
          <label class="report-photo-button" aria-label="Anexar fotos">
            <svg lucideCamera />Anexar fotos (opcional)
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" (change)="selectReportPhotos($event)" />
          </label>
          <div *ngIf="reportPhotoPreviews().length" class="comment-selected-photos">
            <figure *ngFor="let preview of reportPhotoPreviews(); let index = index"><img [src]="preview" alt="Foto selecionada" /><button type="button" (click)="removeReportPhoto(index)" aria-label="Remover foto"><svg lucideX /></button></figure>
          </div>
          <button type="button" class="primary-button full-width" [disabled]="reportSubmitting() || !reportReason || !reportDescription.trim()" (click)="submitReport(professional.id)">{{ reportSubmitting() ? 'Enviando...' : 'Enviar denúncia' }}</button>
          <p class="report-form-note">A administração do condomínio vai analisar sua denúncia. Ela não é pública.</p>
        </section>
      </div>
    </section>
  `,
})
export class ProfessionalProfilePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly condominiumName = signal('');
  protected readonly professional = signal<Professional | null>(null);
  protected readonly initials = computed(() =>
    this.professional()
      ?.name.split(' ')
      .slice(0, 2)
      .map((item) => item[0])
      .join('') ?? '',
  );
  protected readonly favorite = signal(false);
  protected readonly comments = signal<ProfessionalComment[]>([]);
  protected readonly works = signal<ProfessionalWork[]>([]);
  protected readonly workLightbox = signal('');
  protected readonly showAllServices = signal(false);
  protected readonly serviceLimit = 6;
  protected readonly thumbLimit = 4;
  protected readonly commentCount = computed(() => this.comments().length);
  protected readonly commentPhotos = computed(() =>
    this.comments()
      .flatMap((comment) => comment.images)
      .map((image) => this.api.assetUrl(image))
      .filter(Boolean),
  );
  protected readonly visiblePhotos = computed(() => this.commentPhotos().slice(0, this.thumbLimit));
  protected readonly extraPhotos = computed(() => Math.max(0, this.commentPhotos().length - this.thumbLimit));
  protected readonly visibleServices = computed(() => {
    const services = this.professional()?.services ?? [];
    return this.showAllServices() ? services : services.slice(0, this.serviceLimit);
  });

  protected readonly reportOpen = signal(false);
  protected readonly reportSubmitting = signal(false);
  protected readonly reportPhotoPreviews = signal<string[]>([]);
  protected reportReason = '';
  protected reportDescription = '';
  protected reportReasons = ['Atraso', 'Não compareceu', 'Serviço mal executado', 'Orçamento', 'Má conduta', 'Outro'];
  private reportPhotos: File[] = [];

  protected assetUrl(path: string) {
    return this.api.assetUrl(path);
  }

  protected whatsappLink(professional: Professional) {
    return buildWhatsappLink(professional, this.auth.user()?.name ?? '', this.condominiumName());
  }

  protected phoneLink(professional: Professional) {
    return buildPhoneLink(professional);
  }

  protected avatarUrl() {
    const professional = this.professional();
    if (!professional) return '/assets/placeholders/default-avatar.svg';
    return this.api.assetUrl(professional.avatar) || categoryAvatar(professional);
  }

  protected profileCoverUrl() {
    const professional = this.professional();
    if (!professional) return '/assets/placeholders/default-cover.svg';
    return this.api.assetUrl(professional.coverImage) || categoryCover(professional);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? 'pro-1';
    this.api.getProfessional(id).subscribe((professional) => this.professional.set(professional));
    this.api.getComments(id).subscribe({
      next: (comments) => this.comments.set(comments),
      error: () => this.comments.set([]),
    });
    this.api.getFavorites().subscribe({
      next: (favorites) => this.favorite.set(favorites.some((item) => item.id === id)),
      error: () => this.favorite.set(false),
    });
    this.api.getProfessionalWorks(id).subscribe({
      next: (works) => this.works.set(works),
      error: () => this.works.set([]),
    });
    this.api.getCondominiums().subscribe({
      next: (condominiums) => {
        const mine = condominiums.find((item) => item.id === this.auth.user()?.condominiumId);
        this.condominiumName.set(mine?.name ?? condominiums[0]?.name ?? '');
      },
      error: () => this.condominiumName.set(''),
    });
  }

  toggleFavorite(professionalId: string) {
    this.api.toggleFavorite(professionalId).subscribe({
      next: (result) => {
        this.favorite.set(result.active);
        this.toast.success(result.active ? 'Profissional adicionado aos favoritos.' : 'Profissional removido dos favoritos.');
      },
      error: () => this.toast.error('Não foi possível atualizar os favoritos.'),
    });
  }

  protected openReport() {
    this.reportReason = '';
    this.reportDescription = '';
    this.reportPhotos = [];
    this.reportPhotoPreviews.set([]);
    this.reportOpen.set(true);
  }

  protected closeReport() {
    this.reportOpen.set(false);
  }

  protected selectReportPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const accepted = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/')).slice(0, 6 - this.reportPhotos.length);
    this.reportPhotos = [...this.reportPhotos, ...accepted].slice(0, 6);
    this.reportPhotoPreviews.set(this.reportPhotos.map((file) => URL.createObjectURL(file)));
    input.value = '';
  }

  protected removeReportPhoto(index: number) {
    this.reportPhotos = this.reportPhotos.filter((_file, position) => position !== index);
    this.reportPhotoPreviews.set(this.reportPhotos.map((file) => URL.createObjectURL(file)));
  }

  protected submitReport(professionalId: string) {
    if (!this.reportReason || !this.reportDescription.trim()) return;
    this.reportSubmitting.set(true);
    const upload$ = this.reportPhotos.length ? this.api.uploadReportPhotos(this.reportPhotos) : of([] as string[]);
    upload$
      .pipe(switchMap((images) => this.api.submitReport(professionalId, { reason: this.reportReason, description: this.reportDescription.trim(), images })))
      .subscribe({
        next: () => {
          this.reportSubmitting.set(false);
          this.reportOpen.set(false);
          this.toast.success('Denúncia enviada para a administração do condomínio.');
        },
        error: () => {
          this.reportSubmitting.set(false);
          this.toast.error('Não foi possível enviar a denúncia. Tente novamente.');
        },
      });
  }

  async shareProfessional(professional: Professional): Promise<void> {
    const shareData = {
      title: `${professional.name} - Terras Alphas Indica`,
      text: `Conheça ${professional.name}, profissional de ${professional.category}, no Terras Alphas Indica.`,
      url: `${window.location.origin}/app/profissional/${professional.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        this.toast.success('Profissional compartilhado com sucesso.');
        return;
      }
      await this.copyShareUrl(shareData.url);
      this.toast.info('Link do profissional copiado.');
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') this.toast.error('Não foi possível compartilhar este profissional.');
    }
  }

  private async copyShareUrl(url: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    const input = document.createElement('textarea');
    input.value = url;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}

@Component({
  selector: 'indicate-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PhoneMaskDirective, LucideArrowLeft, LucideCamera, LucideChevronDown, LucideChevronRight, LucideSearch, LucidePlus, LucideX],
  template: `
    <section class="mobile-page indicate-page">
      <div class="indicate-shell" [class.services-step]="currentStep() === 2">
        <header class="indicate-heading"><a routerLink="/app/home" class="back-link" aria-label="Voltar para o início"><svg lucideArrowLeft /></a><h1>Indicar profissional</h1><span></span></header>
        <div class="indicate-stepper">
          <span *ngFor="let label of stepLabels; let index = index" [class.active]="currentStep() === index + 1" [class.done]="currentStep() > index + 1"><b>{{ index + 1 }}</b><small>{{ label }}</small></span>
        </div>
        <form [formGroup]="form" class="stack-form" (ngSubmit)="submit()">
          <section *ngIf="currentStep() === 1" class="indicate-step-content">
            <h2>Dados do profissional</h2>
            <label><span>Nome do profissional <i>*</i></span><input placeholder="Ex.: João Carlos" formControlName="name" /></label>
            <label><span>Categoria <i>*</i></span>
              <div class="indicate-category-combobox" (focusout)="closeCategorySearch($event)">
                <div class="indicate-category-input" [class.invalid]="form.controls.category.touched && form.controls.category.invalid">
                  <svg lucideSearch />
                  <input type="search" autocomplete="off" [value]="categorySearch()" (focus)="categorySearchOpen.set(true)" (input)="searchCategory($event)" placeholder="Buscar categoria" aria-label="Buscar categoria" />
                  <button type="button" aria-label="Abrir categorias" (click)="toggleCategorySearch()"><svg lucideChevronDown /></button>
                </div>
                <div *ngIf="categorySearchOpen()" class="indicate-category-options" role="listbox">
                  <button *ngFor="let category of filteredCategories()" type="button" role="option" [class.selected]="form.controls.category.value === category.id" (click)="selectCategory(category)">{{ category.name }}</button>
                  <p *ngIf="filteredCategories().length === 0">Nenhuma categoria encontrada.</p>
                </div>
              </div>
            </label>
            <label><span>Telefone (WhatsApp) <i>*</i></span><input type="tel" inputmode="tel" autocomplete="tel" maxlength="15" placeholder="(34) 99999-9999" formControlName="phone" appPhoneMask /></label>
            <label><span>Empresa (opcional)</span><input placeholder="Ex.: JC Elétrica" formControlName="company" /></label>
            <label><span>Cidade <i>*</i></span><input placeholder="Uberlândia" formControlName="city" /></label>
            <button type="button" class="primary-button full-width" (click)="next()">Próximo</button>
          </section>
          <section *ngIf="currentStep() === 2" class="indicate-step-content indicate-services-step">
            <div class="indicate-category-summary" *ngIf="selectedCategory() as category">
              <span><img [src]="categoryIcon(category)" alt="" (error)="useIconFallback($event, 'grid')" /></span>
              <small>Categoria: <strong>{{ category.name }}</strong></small>
            </div>
            <div class="indicate-services-title"><h2>Serviços realizados</h2><p>Selecione os serviços que este profissional oferece.</p></div>
            <label class="indicate-service-search">
              <svg lucideSearch />
              <input type="search" autocomplete="off" [value]="serviceSearch()" (input)="searchService($event)" placeholder="Buscar serviço" aria-label="Buscar serviço" />
            </label>
            <div class="indicate-service-grid" formArrayName="services">
              <label *ngFor="let item of filteredServices()" class="indicate-service-card" [class.selected]="services.at(item.index).value">
                <img [src]="serviceIcon(item.service)" [alt]="'Ícone de ' + item.service.name" (error)="useIconFallback($event, 'wrench')" />
                <span>{{ item.service.name }}</span>
                <input type="checkbox" [formControlName]="item.index" [attr.aria-label]="item.service.name" />
                <i aria-hidden="true">✓</i>
              </label>
              <label *ngFor="let service of customServices(); let index = index" class="indicate-service-card selected custom">
                <img src="/assets/taxonomy-icons/wrench.svg" alt="" />
                <span>{{ service }}</span>
                <input type="checkbox" checked disabled [attr.aria-label]="service" />
                <i aria-hidden="true">✓</i>
                <button type="button" [attr.aria-label]="'Remover ' + service" (click)="removeCustomService(index)"><svg lucideX /></button>
              </label>
            </div>
            <p class="indicate-services-empty" *ngIf="!filteredServices().length && !customServices().length">{{ availableServices().length ? 'Nenhum serviço encontrado para esta busca.' : 'Esta categoria ainda não possui serviços ativos cadastrados.' }}</p>
            <button type="button" class="indicate-add-service" (click)="openCustomServiceModal()"><svg lucidePlus /> Adicionar serviço</button>
            <div class="indicate-step-actions"><button type="button" class="secondary-button" (click)="back()">Voltar</button><button type="button" class="primary-button" [disabled]="!hasSelectedService()" (click)="next()">Próximo <svg lucideChevronRight /></button></div>
          </section>
          <section *ngIf="currentStep() === 3" class="indicate-step-content">
            <h2>Como foi a experiência?</h2>
            <div class="indicate-rating">
              <span>Sua nota para este profissional</span>
              <div class="indicate-stars" role="radiogroup" aria-label="Nota do profissional">
                <button *ngFor="let star of stars" type="button" role="radio" [attr.aria-checked]="rating() === star" [attr.aria-label]="star + (star === 1 ? ' estrela' : ' estrelas')" [class.active]="star <= rating()" (click)="rating.set(star)">★</button>
              </div>
              <small>{{ ratingLabel() }}</small>
            </div>
            <textarea placeholder="Conte como foi sua experiência" formControlName="comment"></textarea>
            <section class="indicate-photos">
              <div class="indicate-photos-header"><span>Fotos do trabalho</span><small>Opcional · até {{ photoLimit }} fotos</small></div>
              <div *ngIf="photoPreviews().length" class="indicate-photo-grid">
                <figure *ngFor="let preview of photoPreviews(); let index = index">
                  <img [src]="preview" alt="Foto do trabalho selecionada" />
                  <button type="button" [attr.aria-label]="'Remover foto ' + (index + 1)" (click)="removePhoto(index)"><svg lucideX /></button>
                </figure>
              </div>
              <label class="indicate-photo-button" [class.disabled]="photoPreviews().length >= photoLimit">
                <svg lucideCamera />{{ photoPreviews().length ? 'Adicionar mais fotos' : 'Adicionar fotos do trabalho' }}
                <input type="file" multiple accept="image/png,image/jpeg,image/webp" [disabled]="photoPreviews().length >= photoLimit" (change)="selectPhotos($event)" />
              </label>
            </section>
            <div class="button-row"><button type="button" class="secondary-button" [disabled]="!rating()" (click)="recommended.set(false); next()">Não recomendo</button><button type="button" class="primary-button" [disabled]="!rating()" (click)="recommended.set(true); next()">Sim, recomendo</button></div>
          </section>
          <section *ngIf="currentStep() === 4" class="indicate-step-content">
            <h2>Confirmar indicação</h2>
            <p>Confira os dados e confirme sua indicação.</p>
            <div class="indicate-confirm"><strong>{{ form.value.name }}</strong><span>{{ selectedCategoryName() }}</span><span>{{ form.value.phone }}</span><span class="indicate-confirm-rating"><b *ngFor="let star of stars" [class.active]="star <= rating()">★</b>{{ ratingLabel() }}</span><span *ngIf="photoPreviews().length">{{ photoPreviews().length }} {{ photoPreviews().length === 1 ? 'foto anexada' : 'fotos anexadas' }}</span><span>{{ recommended() ? 'Você recomenda este profissional' : 'Você não recomenda este profissional' }}</span></div>
            <button class="primary-button full-width" type="submit">Confirmar indicação</button>
          </section>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
        </form>
      </div>
    </section>
    <div *ngIf="customServiceModalOpen()" class="indicate-service-modal-backdrop" (click)="closeCustomServiceModal()">
      <section class="indicate-service-modal" role="dialog" aria-modal="true" aria-labelledby="custom-service-title" (click)="$event.stopPropagation()">
        <header><div><h2 id="custom-service-title">Adicionar serviço</h2><p>O serviço será enviado como sugestão para análise administrativa.</p></div><button type="button" aria-label="Fechar" (click)="closeCustomServiceModal()"><svg lucideX /></button></header>
        <label>Nome do serviço<input #customServiceInput type="text" maxlength="80" [value]="customServiceName()" (input)="updateCustomServiceName($event)" (keydown.enter)="addCustomService(); $event.preventDefault()" placeholder="Ex.: Instalação de bancada" /></label>
        <footer><button type="button" class="secondary-button" (click)="closeCustomServiceModal()">Cancelar</button><button type="button" class="primary-button" [disabled]="!customServiceName().trim()" (click)="addCustomService()">Adicionar</button></footer>
      </section>
    </div>
  `,
})
export class IndicatePageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly categories = signal<Category[]>([]);
  protected readonly categorySearch = signal('');
  protected readonly categorySearchOpen = signal(false);
  protected readonly availableServices = signal<CategoryService[]>([]);
  protected readonly serviceSearch = signal('');
  protected readonly customServices = signal<string[]>([]);
  protected readonly customServiceModalOpen = signal(false);
  protected readonly customServiceName = signal('');
  protected readonly stepLabels = ['Dados', 'Serviços', 'Experiência', 'Confirmar'];
  protected readonly currentStep = signal(1);
  protected readonly recommended = signal(true);
  protected readonly rating = signal(0);
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly photoLimit = 10;
  protected readonly photoPreviews = signal<string[]>([]);
  private selectedPhotos: File[] = [];
  protected readonly ratingLabels = ['Selecione uma nota', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];
  protected readonly ratingLabel = computed(() => this.ratingLabels[this.rating()]);
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]],
    company: [''],
    city: ['Uberlândia', Validators.required],
    comment: [''],
    services: this.fb.array([]),
  });

  protected readonly filteredCategories = computed(() => {
    const query = this.categorySearch();
    const categories = this.categories().filter((category) => category.active);
    return categories.filter((category) => matchesSearch(category.name, query));
  });
  protected readonly filteredServices = computed(() => {
    const query = this.serviceSearch();
    return this.availableServices()
      .map((service, index) => ({ service, index }))
      .filter(({ service }) => matchesSearch([service.name, ...(service.aliases ?? [])].join(' '), query));
  });

  get services(): FormArray {
    return this.form.get('services') as FormArray;
  }

  ngOnInit() {
    this.api.getCategories().subscribe((categories) => this.categories.set(categories));
    this.form.controls.category.valueChanges.subscribe((categoryId) => {
      if (!categoryId) return this.setAvailableServices([]);
      this.api.getCategoryServices(categoryId).subscribe((services) => this.setAvailableServices(services));
    });
  }

  selectedCategory() { return this.categories().find((category) => category.id === this.form.controls.category.value); }
  selectedCategoryName() { return this.selectedCategory()?.name ?? ''; }

  taxonomyIcon(icon: string | undefined, fallback: string) {
    if (!icon) return `/assets/taxonomy-icons/${fallback}.svg`;
    if (icon.startsWith('data:image/') || icon.startsWith('http') || icon.startsWith('/')) return icon;
    return `/assets/taxonomy-icons/${icon === 'sparkles' ? 'broom' : icon}.svg`;
  }

  categoryIcon(category: Category) {
    if (category.icon && (category.icon.startsWith('data:image/') || category.icon.startsWith('http') || category.icon.startsWith('/') || /^[a-z0-9-]+$/i.test(category.icon))) {
      return this.taxonomyIcon(category.icon, 'grid');
    }
    const slug = this.normalize(category.slug || category.name).replace(/\s+/g, '-');
    const icon = Object.entries({
      eletricista: 'bolt', encanador: 'droplets', pedreiro: 'hard-hat', pintor: 'paintbrush', diarista: 'broom',
      'ar-condicionado': 'air-vent', jardineiro: 'leaf', montador: 'package', 'montador-de-moveis': 'package',
      chaveiro: 'key', informatica: 'laptop', mecanico: 'wrench', 'marido-de-aluguel': 'tool-case',
      piscineiro: 'pool', dedetizacao: 'bug', 'energia-solar': 'bolt', 'cameras-seguranca': 'camera',
    }).find(([key]) => slug.includes(key))?.[1] ?? 'grid';
    return this.taxonomyIcon(icon, 'grid');
  }

  serviceIcon(service: CategoryService) {
    if (service.icon && (service.icon.startsWith('data:image/') || service.icon.startsWith('http') || service.icon.startsWith('/') || /^[a-z0-9-]+$/i.test(service.icon))) {
      return this.taxonomyIcon(service.icon, 'wrench');
    }
    const name = this.normalize(service.name);
    const mappings: Array<[string[], string]> = [
      [['tomada', 'plug'], 'plug'], [['chuveiro', 'ducha'], 'shower'], [['lampada'], 'lightbulb'], [['iluminacao', 'luz'], 'lamp'],
      [['disjuntor', 'quadro eletrico'], 'circuit-board'], [['fiacao', 'fio', 'cabo'], 'cable'], [['limpeza', 'faxina'], 'broom'],
      [['pintura', 'massa corrida', 'textura'], 'paintbrush'], [['alvenaria', 'reboco', 'muro'], 'brick-wall'],
      [['piso', 'revestimento', 'contrapiso'], 'construction'], [['vazamento', 'torneira', 'hidraulica'], 'droplets'],
      [['jardim', 'poda', 'grama', 'plantio'], 'leaf'], [['montagem', 'movel', 'prateleira'], 'package'],
    ];
    return this.taxonomyIcon(mappings.find(([terms]) => terms.some((term) => name.includes(term)))?.[1] ?? 'wrench', 'wrench');
  }

  useIconFallback(event: Event, fallback: string) {
    (event.target as HTMLImageElement).src = `/assets/taxonomy-icons/${fallback}.svg`;
  }

  searchCategory(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.categorySearch.set(value);
    this.categorySearchOpen.set(true);
    if (this.selectedCategoryName() !== value) this.form.controls.category.setValue('');
  }

  selectCategory(category: Category) {
    this.form.controls.category.setValue(category.id);
    this.form.controls.category.markAsTouched();
    this.categorySearch.set(category.name);
    this.categorySearchOpen.set(false);
  }

  toggleCategorySearch() {
    this.categorySearchOpen.update((open) => !open);
  }

  closeCategorySearch(event: FocusEvent) {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget && container.contains(event.relatedTarget as Node)) return;
    this.categorySearchOpen.set(false);
  }

  formatPhone(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      const local = digits.slice(2);
      const prefixLength = digits.length === 11 ? 5 : 4;
      formatted = `(${digits.slice(0, 2)}) ${local.slice(0, prefixLength)}${local.length > prefixLength ? `-${local.slice(prefixLength)}` : ''}`;
    } else if (digits.length) {
      formatted = `(${digits}`;
    }
    input.value = formatted;
    this.form.controls.phone.setValue(formatted, { emitEvent: false });
  }

  private setAvailableServices(items: CategoryService[]) {
    this.availableServices.set(items.filter((service) => service.active));
    this.services.clear();
    this.availableServices().forEach(() => this.services.push(this.fb.control(false)));
    this.serviceSearch.set('');
    this.customServices.set([]);
  }

  searchService(event: Event) { this.serviceSearch.set((event.target as HTMLInputElement).value); }

  hasSelectedService() {
    return this.services.controls.some((control) => control.value === true) || this.customServices().length > 0;
  }

  openCustomServiceModal() {
    this.customServiceName.set('');
    this.customServiceModalOpen.set(true);
  }

  closeCustomServiceModal() {
    this.customServiceModalOpen.set(false);
    this.customServiceName.set('');
  }

  updateCustomServiceName(event: Event) { this.customServiceName.set((event.target as HTMLInputElement).value); }

  selectPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const chosen = Array.from(input.files ?? []).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    input.value = '';
    if (!chosen.length) return;
    if (chosen.some((file) => file.size > 10 * 1024 * 1024)) {
      this.feedback.set('Cada foto pode ter no máximo 10 MB.');
      this.hasError.set(true);
      return;
    }
    this.selectedPhotos = [...this.selectedPhotos, ...chosen].slice(0, this.photoLimit);
    this.refreshPhotoPreviews();
    this.feedback.set('');
    this.hasError.set(false);
  }

  removePhoto(index: number) {
    this.selectedPhotos = this.selectedPhotos.filter((_file, position) => position !== index);
    this.refreshPhotoPreviews();
  }

  private refreshPhotoPreviews() {
    this.photoPreviews().forEach((preview) => URL.revokeObjectURL(preview));
    this.photoPreviews.set(this.selectedPhotos.map((file) => URL.createObjectURL(file)));
  }

  ngOnDestroy() {
    this.photoPreviews().forEach((preview) => URL.revokeObjectURL(preview));
  }

  addCustomService() {
    const name = this.customServiceName().trim();
    if (!name) return;
    const normalized = this.normalize(name);
    const alreadyExists = this.availableServices().some((service) => this.normalize(service.name) === normalized)
      || this.customServices().some((service) => this.normalize(service) === normalized);
    if (alreadyExists) {
      this.feedback.set('Este serviço já está disponível ou foi adicionado.');
      this.hasError.set(true);
      return;
    }
    this.customServices.update((services) => [...services, name]);
    this.feedback.set('');
    this.hasError.set(false);
    this.closeCustomServiceModal();
  }

  removeCustomService(index: number) {
    this.customServices.update((services) => services.filter((_, currentIndex) => currentIndex !== index));
  }

  back() { this.currentStep.update((step) => Math.max(1, step - 1)); }

  next() {
    if (this.currentStep() === 1) {
      for (const field of ['name', 'category', 'phone', 'city']) this.form.get(field)?.markAsTouched();
      if (['name', 'category', 'phone', 'city'].some((field) => this.form.get(field)?.invalid)) {
        this.feedback.set('Preencha os campos obrigatórios para continuar.');
        this.hasError.set(true);
        return;
      }
    }
    if (this.currentStep() === 2 && !this.hasSelectedService()) {
      this.feedback.set('Selecione pelo menos um serviço para continuar.');
      this.hasError.set(true);
      return;
    }
    this.feedback.set('');
    this.hasError.set(false);
    this.currentStep.update((step) => Math.min(4, step + 1));
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Preencha os dados obrigatórios do profissional.');
      this.hasError.set(true);
      return;
    }
    const values = this.form.getRawValue();
    const selectedServices = this.availableServices().filter((_, index) => values.services[index]);
    const customServiceSuggestions = this.customServices();
    const upload = this.selectedPhotos.length ? this.api.uploadCommentPhotos(this.selectedPhotos) : of([] as string[]);
    this.feedback.set(this.selectedPhotos.length ? 'Enviando fotos...' : 'Enviando indicação...');
    this.hasError.set(false);
    upload
      .pipe(switchMap((images) => this.api.createRecommendation({
        ...values,
        neighborhood: '',
        category: this.selectedCategoryName(),
        categoryIds: [values.category],
        services: [...selectedServices.map((service) => service.name), ...customServiceSuggestions],
        serviceIds: selectedServices.map((service) => service.id),
        customServiceSuggestions,
        recommended: this.recommended(),
        rating: this.rating(),
        images,
      })))
      .subscribe({
        next: () => {
          this.toast.success('Indicação enviada com sucesso.');
          void this.router.navigateByUrl('/app/minhas-indicacoes');
        },
        error: (error: { error?: { message?: string | string[] } }) => {
          const message = error.error?.message;
          const feedback = Array.isArray(message) ? message.join(', ') : message ?? 'Não foi possível enviar a indicação.';
          this.feedback.set(feedback);
          this.toast.error(feedback);
          this.hasError.set(true);
        },
      });
  }

  private normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
}

@Component({
  selector: 'reviews-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RatingStarsComponent, LucideArrowLeft, LucideChevronDown, LucideFileText],
  template: `
    <section class="mobile-page reviews-page">
      <div class="content-section top-space reviews-content">
        <header class="reviews-heading">
          <a routerLink="/app/profissional/pro-1" class="back-link"><svg lucideArrowLeft /></a>
          <div><h1>Avaliações</h1><p>{{ reviewCount() }} avaliações</p></div>
        </header>
        <div class="review-overview">
          <div class="review-summary">
            <strong>{{ average() | number: '1.1-1' }}</strong>
            <rating-stars />
            <span>Excelente</span>
          </div>
          <div class="distribution">
            <div *ngFor="let item of distributionRows">
              <span>{{ item.star }} <b>★</b></span>
              <div class="distribution-bar"><div class="distribution-fill" [style.width.%]="item.percent"></div></div>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </div>
        <button type="button" class="review-sort">Mais recentes <svg lucideChevronDown /></button>
        <article *ngFor="let review of reviews().slice(0, 2)" class="review-card">
          <div class="review-card-heading">
            <b class="reviewer-avatar">{{ initials(review.userName) }}</b>
            <div><strong>{{ review.userName }}</strong><span>Morador verificado do Terras Alphas</span></div>
          </div>
          <div class="review-rating-row"><rating-stars /><strong>{{ review.rating | number: '1.1-1' }}</strong><time>{{ review.createdAt | date: 'dd/MM/yyyy' }}</time></div>
          <p>{{ review.comment }}</p>
          <div class="review-tags"><span *ngFor="let tag of reviewTags(review.id)">{{ tag }}</span></div>
        </article>
        <a routerLink="/app/avaliacoes/{{ professionalId() }}" class="secondary-button full-width reviews-all"><svg lucideFileText />Ver todas as avaliações</a>
      </div>
    </section>
  `,
})
export class ReviewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly professionalId = signal('');
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly form = this.fb.nonNullable.group({ rating: [5], comment: ['', [Validators.required, Validators.minLength(10)]] });
  protected readonly reviews = signal<Review[]>([]);
  protected readonly average = signal(4.9);
  protected readonly reviewCount = signal(23);
  protected readonly distributionRows = [
    { star: 5, count: 20, percent: 100 },
    { star: 4, count: 2, percent: 20 },
    { star: 3, count: 1, percent: 10 },
    { star: 2, count: 0, percent: 0 },
    { star: 1, count: 0, percent: 0 },
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? 'pro-1';
    this.professionalId.set(id);
    this.api.getProfessional(id).subscribe((professional) => {
      this.average.set(professional.rating);
      this.reviewCount.set(professional.reviewCount);
    });
    this.loadReviews();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Escreva um comentário de pelo menos 10 caracteres.');
      this.hasError.set(true);
      return;
    }
    this.api.createReview({ professionalId: this.professionalId(), ...this.form.getRawValue() }).subscribe({
      next: () => {
        this.feedback.set('Avaliação enviada com sucesso.');
        this.toast.success('Avaliação enviada com sucesso.');
        this.hasError.set(false);
        this.form.reset({ rating: 5, comment: '' });
        this.loadReviews();
      },
      error: () => {
        this.feedback.set('Não foi possível enviar sua avaliação.');
        this.toast.error('Não foi possível enviar sua avaliação.');
        this.hasError.set(true);
      },
    });
  }

  private loadReviews() {
    this.api.getReviews(this.professionalId()).subscribe((reviews) => this.reviews.set(reviews));
  }

  initials(name: string) {
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
  }

  reviewTags(id: string) {
    return id === 'rev-1' ? ['Instalação elétrica', 'Tomadas', 'Chuveiro'] : ['Manutenção', 'Disjuntores'];
  }
}

@Component({
  selector: 'favorites-page',
  standalone: true,
  imports: [CommonModule, MobileTopbarComponent, ProfessionalCardComponent, LucideUsersRound, LucideChevronDown],
  template: `
    <section class="mobile-page favorites-page">
      <mobile-topbar />
      <div class="content-section top-space favorites-content">
        <h1>Meus favoritos</h1>
        <div class="favorite-category-filters" role="group" aria-label="Filtrar favoritos por categoria">
          <button type="button" [class.active]="selectedCategory() === ''" (click)="selectFilter('')">Todos</button>
          <button *ngFor="let category of visibleCategories()" type="button" [class.active]="selectedCategory() === category" (click)="selectFilter(category)">{{ category }}</button>
          <div *ngIf="extraCategories().length" class="favorite-filter-more">
            <button type="button" class="more-chip" [class.active]="moreOpen() || isExtraSelected()" [attr.aria-expanded]="moreOpen()" (click)="moreOpen.set(!moreOpen())">{{ isExtraSelected() ? selectedCategory() : 'Mais' }}<svg lucideChevronDown /></button>
            <div *ngIf="moreOpen()" class="favorite-filter-dropdown">
              <button *ngFor="let category of extraCategories()" type="button" [class.active]="selectedCategory() === category" (click)="selectFilter(category)">{{ category }}</button>
            </div>
          </div>
        </div>
        <p class="favorites-helper"><svg lucideUsersRound />Aqui estão os profissionais que você marcou como favoritos.</p>
        <professional-card *ngFor="let professional of filteredFavorites()" [professional]="professional" mode="favorite" (removed)="removeFavorite($event)" />
        <p *ngIf="filteredFavorites().length === 0" class="favorites-empty">{{ favorites().length ? 'Nenhum profissional favorito nesta categoria.' : 'Você ainda não marcou nenhum profissional como favorito.' }}</p>
      </div>
    </section>
  `,
})
export class FavoritesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly chipLimit = 3;
  protected readonly favorites = signal<Professional[]>([]);
  protected readonly selectedCategory = signal('');
  protected readonly moreOpen = signal(false);
  protected readonly favoriteCategories = computed(() => [...new Set(this.favorites().map((professional) => professional.category))].filter(Boolean));
  protected readonly visibleCategories = computed(() => this.favoriteCategories().slice(0, this.chipLimit));
  protected readonly extraCategories = computed(() => this.favoriteCategories().slice(this.chipLimit));
  protected readonly filteredFavorites = computed(() => {
    const category = this.selectedCategory();
    return category ? this.favorites().filter((professional) => professional.category === category) : this.favorites();
  });

  protected isExtraSelected() {
    return this.extraCategories().includes(this.selectedCategory());
  }

  protected selectFilter(category: string) {
    this.selectedCategory.set(category);
    this.moreOpen.set(false);
  }

  protected removeFavorite(professionalId: string) {
    this.favorites.update((items) => items.filter((professional) => professional.id !== professionalId));
    if (this.selectedCategory() && !this.favoriteCategories().includes(this.selectedCategory())) this.selectedCategory.set('');
  }

  ngOnInit() {
    this.api.getFavorites().subscribe((favorites) => this.favorites.set(favorites));
  }
}

@Component({
  selector: 'indications-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowLeft, LucideCalendarDays, LucideUsersRound, LucideCheckCircle2, LucideMessageCircle, LucideEllipsis, LucideSparkles, LucideBriefcaseBusiness],
  template: `
    <section class="mobile-page indications-page">
      <div class="content-section top-space indications-content">
        <div class="screen-title indications-title"><a routerLink="/app/home" class="back-link"><svg lucideArrowLeft /></a><h1>Minhas indicações</h1><span></span></div>
        <div class="filter-row">
          <button class="filter-chip" [class.active]="activeTab() === 'ACTIVE'" (click)="setTab('ACTIVE')">Ativas</button>
          <button class="filter-chip" [class.active]="activeTab() === 'REMOVED'" (click)="setTab('REMOVED')">Removidas</button>
        </div>
        <article class="indication-card" *ngFor="let item of filteredRecommendations()">
          <div class="indication-symbol" [ngSwitch]="item.professionalId">
            <svg *ngSwitchCase="'pro-1'" lucideUsersRound />
            <svg *ngSwitchCase="'pro-4'" lucideSparkles />
            <svg *ngSwitchDefault lucideBriefcaseBusiness />
          </div>
          <div>
            <strong>{{ professionalName(item.professionalId) }}</strong>
            <p>{{ professionalDetails(item.professionalId).category }}</p>
            <p><svg lucideCalendarDays />Indicado em {{ item.createdAt | date: 'dd/MM/yyyy' }}</p>
            <p><svg lucideUsersRound />{{ professionalDetails(item.professionalId).recommendations }} moradores recomendam</p>
            <span><svg lucideCheckCircle2 />Você indicou</span>
          </div>
          <div class="indication-actions"><a><svg lucideMessageCircle /></a><button class="favorite-button"><svg lucideEllipsis /></button></div>
        </article>
        <a routerLink="/app/indicar" class="secondary-button full-width indication-new">＋ Indicar novo profissional</a>
      </div>
    </section>
  `,
})
export class IndicationsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly recommendations = signal<Array<{ professionalId: string; createdAt: string; status: string }>>([]);
  protected readonly activeTab = signal<'ACTIVE' | 'REMOVED'>('ACTIVE');
  protected readonly filteredRecommendations = computed(() => this.recommendations().filter((item) => item.status === this.activeTab()));
  private readonly names: Record<string, string> = {
    'pro-1': 'João Carlos',
    'pro-4': 'Luciana Diarista',
    'pro-6': 'Marido de Aluguel Max',
  };
  private readonly details: Record<string, { category: string; recommendations: number }> = {
    'pro-1': { category: 'Eletricista', recommendations: 28 },
    'pro-4': { category: 'Diarista', recommendations: 16 },
    'pro-6': { category: 'Marido de aluguel', recommendations: 34 },
  };

  ngOnInit() {
    this.api.getRecommendations().subscribe((recommendations) => this.recommendations.set(recommendations));
  }

  professionalName(id: string) {
    return this.names[id] ?? 'Profissional';
  }

  professionalDetails(id: string) {
    return this.details[id] ?? { category: 'Profissional', recommendations: 0 };
  }

  setTab(tab: 'ACTIVE' | 'REMOVED') {
    this.activeTab.set(tab);
  }
}

@Component({
  selector: 'admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideUsersRound, LucideBriefcaseBusiness, LucideThumbsUp, LucideStar, LucideUserRoundPlus, LucideCircleAlert, LucideCalendarDays],
  template: `
    <main class="admin-content" *ngIf="dashboard() as dashboard">
        <header class="admin-topbar">
          <div>
            <h1>Dashboard</h1>
          </div>
          <div class="dashboard-controls"><button class="date-filter"><svg lucideCalendarDays /> 01/05/2024 - 31/05/2024 <span>⌄</span></button><div class="admin-user"><img src="/assets/placeholders/default-avatar.svg" alt="Foto do administrador" /><span><b>{{ userName() }}</b><small>{{ roleLabel() }}</small></span></div></div>
        </header>
        <div class="stats-grid">
          <article class="stat-card"><i><svg lucideUsersRound /></i><span>Moradores</span><strong>{{ dashboard.stats.residents }}</strong><em>↑ 8 este mês</em></article>
          <article class="stat-card"><i><svg lucideBriefcaseBusiness /></i><span>Profissionais</span><strong>{{ dashboard.stats.professionals }}</strong><em>↑ 8 este mês</em></article>
          <article class="stat-card"><i><svg lucideThumbsUp /></i><span>Indicações</span><strong>{{ dashboard.stats.recommendations }}</strong><em>↑ 23 este mês</em></article>
          <article class="stat-card"><i><svg lucideStar /></i><span>Avaliações</span><strong>{{ dashboard.stats.reviews }}</strong><em>↑ 19 este mês</em></article>
        </div>
        <div class="admin-panels">
          <section class="panel chart-panel">
            <h2>Indicações por dia</h2>
            <div class="line-chart">
              <div class="chart-y-axis"><span *ngFor="let tick of chartTicks()">{{ tick }}</span></div>
              <div class="chart-canvas">
                <svg viewBox="0 0 600 250" preserveAspectRatio="none" aria-label="Gráfico de indicações por dia">
                  <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#168356" stop-opacity=".22"/><stop offset="1" stop-color="#168356" stop-opacity="0"/></linearGradient></defs>
                  <polygon [attr.points]="chartArea(dashboard.indicationsByDay)" fill="url(#chartFill)" />
                  <polyline [attr.points]="chartPoints(dashboard.indicationsByDay)" fill="none" stroke="#08754a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                  <circle *ngFor="let value of dashboard.indicationsByDay; let index = index" [attr.cx]="chartX(index, dashboard.indicationsByDay.length)" [attr.cy]="chartY(value)" r="5" fill="#08754a" stroke="#fff" stroke-width="2" />
                </svg>
                <div class="chart-x-axis"><span>01</span><span>05</span><span>10</span><span>15</span><span>20</span><span>25</span><span>31</span></div>
              </div>
            </div>
          </section>
          <section class="panel">
            <h2>Profissionais mais indicados</h2>
            <div class="ranking-item" *ngFor="let item of dashboard.topProfessionals; let index = index">
              <span>{{ index + 1 }}</span>
              <img class="ranking-avatar" src="/assets/placeholders/default-avatar.svg" [alt]="'Foto padrão de ' + item.name" />
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.category }}</p>
              </div>
              <strong>{{ item.total }}</strong>
            </div>
          </section>
        </div>
        <div class="admin-bottom-cards">
          <section class="admin-bottom-card"><i><svg lucideUserRoundPlus /></i><div><h2>Novos moradores</h2><strong>{{ dashboard.pending.newResidents }}</strong><p>Aguardando aprovação</p></div><a routerLink="/admin/moradores">Ver todos</a></section>
          <section class="admin-bottom-card danger"><i><svg lucideCircleAlert /></i><div><h2>Denúncias</h2><strong>{{ dashboard.pending.reports }}</strong><p>Aguardando análise</p></div><a routerLink="/admin/denuncias">Ver todos</a></section>
        </div>
    </main>
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly dashboard = signal<DashboardPayload | null>(null);
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Administrador');
  protected readonly roleLabel = computed(() => (this.auth.user()?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrador do condomínio'));
  protected readonly chartStep = computed(() => {
    const values = this.dashboard()?.indicationsByDay ?? [];
    const highest = Math.max(1, ...values);
    const rough = Math.ceil(highest / 5);
    const rounded = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((option) => option >= rough);
    return rounded ?? Math.ceil(rough / 100) * 100;
  });
  protected readonly chartTop = computed(() => this.chartStep() * 5);
  protected readonly chartTicks = computed(() => [5, 4, 3, 2, 1, 0].map((position) => position * this.chartStep()));

  ngOnInit() {
    this.api.getDashboard().subscribe((dashboard) => this.dashboard.set(dashboard));
  }

  protected chartX(index: number, total: number) {
    return total <= 1 ? 300 : 18 + (index * 564) / (total - 1);
  }

  protected chartY(value: number) {
    const top = this.chartTop();
    return 232 - (Math.min(value, top) / top) * 212;
  }

  protected chartPoints(values: number[]) {
    return values.map((value, index) => `${this.chartX(index, values.length)},${this.chartY(value)}`).join(' ');
  }

  protected chartArea(values: number[]) {
    return `18,232 ${this.chartPoints(values)} 582,232`;
  }
}

type AdminResource = 'condominiums' | 'residents' | 'users' | 'professionals' | 'categories';
type AdminField = { key: string; label: string; type?: 'text' | 'email' | 'tel' | 'password' | 'textarea' | 'checkbox'; select?: 'category' | 'condominium' | 'options'; options?: Array<{ value: string; label: string }>; hideForRoles?: string[] };

@Component({
  selector: 'admin-crud-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableSelectComponent, PhoneMaskDirective, LucideSearch, LucideDownload, LucidePlus, LucideChevronLeft, LucideChevronRight, LucideX],
  template: `
    <main class="admin-content admin-crud-content">
        <header class="admin-topbar"><div><h1>{{ config.title }}</h1><p>Consulte, filtre, exporte e gerencie os registros.</p></div></header>
        <section class="admin-table-panel admin-data-panel">
          <div class="admin-data-toolbar">
            <label class="admin-search-field"><svg lucideSearch /><input [ngModel]="searchTerm()" (ngModelChange)="setSearch($event)" placeholder="Buscar em {{ config.title.toLowerCase() }}..." /></label>
            <app-searchable-select class="admin-toolbar-select" [ngModel]="filterValue()" (ngModelChange)="setFilter($event)" [items]="filterOptions()" emptyLabel="Todos os registros" searchPlaceholder="Pesquisar filtro..." />
            <span class="toolbar-spacer"></span>
            <button class="admin-export-button admin-toolbar-action" type="button" (click)="exportExcel()"><svg lucideDownload /> Exportar Excel</button>
            <button class="primary-button admin-toolbar-action" type="button" (click)="newRecord()"><svg lucidePlus /> Adicionar</button>
          </div>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
          <div class="admin-table-wrap"><table><thead><tr><th *ngFor="let column of config.columns">{{ column }}</th><th>Ações</th></tr></thead><tbody>
              <tr *ngFor="let record of pagedRecords()"><td *ngFor="let key of config.columnKeys" [class.photo-cell]="isPhotoKey(key)" [class.cover-photo-cell]="key === 'coverImage'">
                <img *ngIf="isPhotoKey(key)" [src]="recordPhoto(record, key)" [alt]="'Foto de ' + value(record, 'name')" (error)="$any($event.target).src=photoPlaceholder(key)" />
                <span *ngIf="!isPhotoKey(key)">{{ value(record, key) }}</span>
              </td><td class="admin-actions"><button type="button" (click)="editRecord(record)">Editar</button><button type="button" class="danger-action" (click)="deleteRecord(record)">Excluir</button></td></tr>
              <tr *ngIf="!pagedRecords().length"><td class="admin-empty-row" [attr.colspan]="config.columns.length + 1">Nenhum cadastro encontrado com os filtros atuais.</td></tr>
          </tbody></table></div>
          <footer class="admin-pagination"><span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filteredRecords().length }}</span><label>Itens por página <app-searchable-select class="page-size-select" [ngModel]="pageSize()" (ngModelChange)="setPageSize($event)" [items]="pageSizeOptions" searchPlaceholder="Pesquisar quantidade..." /></label><div><button type="button" [disabled]="page() === 1" (click)="setPage(page() - 1)"><svg lucideChevronLeft /></button><b>{{ page() }} / {{ totalPages() }}</b><button type="button" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)"><svg lucideChevronRight /></button></div></footer>
        </section>

        <div *ngIf="editorOpen()" class="admin-modal-backdrop" (click)="closeEditor()">
          <form class="admin-editor admin-crud-modal" [formGroup]="form" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <header class="admin-modal-header"><div><h2>{{ editingId() ? 'Editar cadastro' : 'Novo cadastro' }}</h2><p>{{ editingId() ? 'Atualize os dados abaixo.' : 'Preencha os dados para criar um registro.' }}</p></div><button type="button" aria-label="Fechar" (click)="closeEditor()"><svg lucideX /></button></header>
            <div class="admin-modal-fields">
            <label *ngFor="let field of visibleFields()">{{ field.label }}
              <textarea *ngIf="field.type === 'textarea'" [formControlName]="field.key"></textarea>
              <app-searchable-select *ngIf="field.select === 'category'" [formControlName]="field.key" [items]="categories()" valueKey="id" labelKey="name" emptyLabel="Selecione" searchPlaceholder="Pesquisar categoria..." />
              <app-searchable-select *ngIf="field.select === 'condominium'" [formControlName]="field.key" [items]="condominiums()" valueKey="id" labelKey="name" emptyLabel="Selecione" searchPlaceholder="Pesquisar condomínio..." />
              <app-searchable-select *ngIf="field.select === 'options'" [formControlName]="field.key" [items]="field.options" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar opção..." />
              <input *ngIf="field.type !== 'textarea' && field.type !== 'checkbox' && !field.select" [type]="field.type ?? 'text'" [attr.inputmode]="field.type === 'tel' ? 'tel' : null" [attr.maxlength]="field.type === 'tel' ? 15 : null" [formControlName]="field.key" [appPhoneMask]="field.type === 'tel'" />
              <input *ngIf="field.type === 'checkbox'" type="checkbox" [formControlName]="field.key" />
            </label>
            </div>
            <section *ngIf="resource() === 'professionals'" class="admin-taxonomy-section">
              <h3>Categorias do profissional</h3>
              <p>Selecione uma ou mais categorias.</p>
              <div class="admin-check-grid"><label *ngFor="let category of categories()"><input type="checkbox" [checked]="selectedCategoryIds().includes(category.id)" (change)="toggleCategory(category.id)" />{{ category.name }}</label></div>
              <h3>Serviços realizados</h3>
              <p>São exibidos somente os serviços compatíveis com as categorias selecionadas.</p>
              <div *ngFor="let category of selectedCategories()" class="admin-service-group"><strong>{{ category.name }}</strong><div class="admin-check-grid"><label *ngFor="let service of category.services"><input type="checkbox" [checked]="selectedServiceIds().includes(service.id)" (change)="toggleService(service.id)" />{{ service.name }}</label></div></div>
            </section>
            <section *ngIf="resource() === 'professionals' || resource() === 'condominiums'" class="professional-photo-field" [class.condominium-photo-field]="resource() === 'condominiums'">
              <span>{{ resource() === 'condominiums' ? 'Foto do condomínio' : 'Foto do profissional' }}</span>
              <div class="professional-photo-preview" [class.empty]="!photoPreview()"><img [src]="photoPreview() || currentPhotoPlaceholder()" alt="Pré-visualização da foto" /></div>
              <label class="photo-upload-button">Selecionar foto<input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectPhoto($event)" /></label>
              <button *ngIf="photoPreview()" type="button" class="photo-remove-button" (click)="removePhoto()">Remover foto</button>
              <small>PNG, JPG ou WebP. Tamanho máximo de 5 MB.</small>
            </section>
            <div class="admin-editor-actions"><button type="button" class="secondary-button" (click)="closeEditor()">Cancelar</button><button type="submit" class="primary-button" [disabled]="saving()">{{ saving() ? 'Salvando...' : editingId() ? 'Salvar alterações' : 'Criar cadastro' }}</button></div>
          </form>
        </div>
    </main>
  `,
})
export class AdminCrudPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly spreadsheet = inject(SpreadsheetService);
  protected readonly records = signal<Record<string, unknown>[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly condominiums = signal<Condominium[]>([]);
  protected readonly resource = signal<AdminResource>('condominiums');
  protected readonly editingId = signal('');
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly saving = signal(false);
  protected readonly photoPreview = signal('');
  protected readonly selectedCategoryIds = signal<string[]>([]);
  protected readonly selectedServiceIds = signal<string[]>([]);
  protected readonly categoryServices = signal<CategoryService[]>([]);
  protected readonly serviceEditorOpen = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly filterValue = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected serviceAliasesText = '';
  protected serviceDraft: Partial<CategoryService> & { id?: string } = {};
  private selectedPhoto: File | null = null;
  protected readonly form = this.fb.nonNullable.group({
    name: '', email: '', phone: '', address: '', city: '', state: 'MG', slug: '', icon: 'grid', categoryId: '', condominiumId: '', neighborhood: '',
    password: '', companyName: '', whatsapp: '', instagram: '', bio: '', avatar: '', coverImage: '', description: '', displayOrder: 0,
    role: 'RESIDENT', approvalStatus: 'APPROVED', emailVerified: true, active: true, block: '', unit: '',
  });
  private readonly configs: Record<AdminResource, { title: string; fields: AdminField[]; columns: string[]; columnKeys: string[] }> = {
    condominiums: { title: 'Condomínios', fields: [{ key: 'name', label: 'Nome' }, { key: 'slug', label: 'Slug' }, { key: 'address', label: 'Endereço' }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'Estado' }, { key: 'neighborhood', label: 'Bairro' }, { key: 'phone', label: 'Telefone', type: 'tel' }, { key: 'email', label: 'E-mail', type: 'email' }], columns: ['Foto', 'Nome', 'Cidade', 'Estado', 'E-mail'], columnKeys: ['coverImage', 'name', 'city', 'state', 'email'] },
    residents: { title: 'Moradores', fields: [{ key: 'name', label: 'Nome' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'Telefone', type: 'tel' }, { key: 'condominiumId', label: 'Condomínio', select: 'condominium' }, { key: 'password', label: 'Senha', type: 'password' }], columns: ['Nome', 'E-mail', 'Telefone', 'Perfil'], columnKeys: ['name', 'email', 'phone', 'role'] },
    users: { title: 'Usuários do sistema', fields: [
      { key: 'name', label: 'Nome completo' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'Telefone', type: 'tel' },
      { key: 'condominiumId', label: 'Condomínio', select: 'condominium' },
      { key: 'block', label: 'Bloco', hideForRoles: ['PROFESSIONAL', 'SUPER_ADMIN'] }, { key: 'unit', label: 'Unidade', hideForRoles: ['PROFESSIONAL', 'SUPER_ADMIN'] },
      { key: 'role', label: 'Perfil de acesso', select: 'options', options: [{ value: 'RESIDENT', label: 'Morador' }, { value: 'PROFESSIONAL', label: 'Profissional' }, { value: 'CONDO_ADMIN', label: 'Administrador do condomínio' }, { value: 'SUPER_ADMIN', label: 'Super administrador' }] },
      { key: 'approvalStatus', label: 'Aprovação', select: 'options', options: [{ value: 'PENDING', label: 'Pendente' }, { value: 'APPROVED', label: 'Aprovado' }, { value: 'REJECTED', label: 'Recusado' }] },
      { key: 'emailVerified', label: 'E-mail verificado', type: 'checkbox' }, { key: 'active', label: 'Usuário ativo', type: 'checkbox' },
      { key: 'password', label: 'Senha (deixe em branco para manter)', type: 'password' },
    ], columns: ['Nome', 'E-mail', 'Perfil', 'E-mail verificado', 'Aprovação', 'Ativo'], columnKeys: ['name', 'email', 'role', 'emailVerified', 'approvalStatus', 'active'] },
    professionals: { title: 'Profissionais', fields: [{ key: 'name', label: 'Nome' }, { key: 'companyName', label: 'Empresa' }, { key: 'phone', label: 'Telefone', type: 'tel' }, { key: 'whatsapp', label: 'WhatsApp', type: 'tel' }, { key: 'instagram', label: 'Instagram' }, { key: 'city', label: 'Cidade' }, { key: 'neighborhood', label: 'Bairro' }, { key: 'bio', label: 'Sobre o profissional', type: 'textarea' }], columns: ['Foto', 'Nome', 'Categoria', 'Cidade', 'WhatsApp'], columnKeys: ['avatar', 'name', 'category', 'city', 'whatsapp'] },
    categories: { title: 'Categorias', fields: [{ key: 'name', label: 'Nome' }, { key: 'slug', label: 'Slug' }, { key: 'icon', label: 'Ícone' }, { key: 'description', label: 'Descrição curta', type: 'textarea' }, { key: 'displayOrder', label: 'Ordem' }], columns: ['Nome', 'Slug', 'Ícone'], columnKeys: ['name', 'slug', 'icon'] },
  };

  get config() { return this.configs[this.resource()]; }
  selectedCategories() { return this.categories().filter((category) => this.selectedCategoryIds().includes(category.id)); }
  protected readonly filteredRecords = computed(() => {
    const search = this.searchTerm();
    const filter = this.normalize(this.filterValue());
    const filterKey = this.filterKey();
    return this.records().filter((record) => {
      const searchable = Object.values(record).map((entry) => (Array.isArray(entry) ? entry.join(' ') : String(entry ?? ''))).join(' ');
      const matchesFilter = !filter || this.normalize(String(record[filterKey] ?? '')).includes(filter);
      return matchesSearch(searchable, search) && matchesFilter;
    });
  });
  protected readonly filterOptions = computed(() => {
    const key = this.filterKey();
    return [...new Set(this.records().map((record) => String(record[key] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRecords().length / this.pageSize())));
  protected readonly pagedRecords = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredRecords().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.api.getCategories().subscribe((categories) => this.categories.set(categories));
    this.api.getCondominiums().subscribe((condominiums) => this.condominiums.set(condominiums));
    this.route.data.subscribe((data) => {
      const value = (data['resource'] ?? this.route.snapshot.paramMap.get('entity')) as AdminResource;
      this.resource.set(value in this.configs ? value : 'condominiums');
      this.newRecord(false);
      this.load();
    });
  }

  visibleFields(): AdminField[] {
    const role = String(this.form.controls.role.value ?? '');
    return this.config.fields.filter((field) => !field.hideForRoles?.includes(role));
  }

  value(record: Record<string, unknown>, key: string) {
    const value = record[key];
    if (key === 'role') return ({ RESIDENT: 'Morador', CONDO_ADMIN: 'Administrador', SUPER_ADMIN: 'Super administrador' } as Record<string, string>)[String(value)] ?? String(value ?? '-');
    if (key === 'approvalStatus') return ({ PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Recusado' } as Record<string, string>)[String(value)] ?? String(value ?? '-');
    if (key === 'emailVerified' || key === 'active') return value ? 'Sim' : 'Não';
    return String(value ?? '-');
  }

  assetUrl(path: string) { return this.api.assetUrl(path); }
  isPhotoKey(key: string) { return key === 'avatar' || key === 'coverImage'; }
  recordPhoto(record: Record<string, unknown>, key: string) {
    const source = String(record[key] ?? '').trim();
    return source ? this.assetUrl(source) : this.photoPlaceholder(key);
  }
  photoPlaceholder(key: string) { return key === 'coverImage' ? '/assets/placeholders/default-cover.svg' : '/assets/placeholders/default-avatar.svg'; }
  currentPhotoPlaceholder() { return this.photoPlaceholder(this.resource() === 'condominiums' ? 'coverImage' : 'avatar'); }

  newRecord(openEditor = true) {
    this.editingId.set('');
    this.selectedPhoto = null;
    this.photoPreview.set('');
    this.selectedCategoryIds.set([]);
    this.selectedServiceIds.set([]);
    this.categoryServices.set([]);
    this.form.reset({
      name: '', email: '', phone: '', address: '', city: '', state: 'MG', slug: '', icon: 'grid', categoryId: '', condominiumId: this.condominiums()[0]?.id ?? '',
      neighborhood: '', password: '', companyName: '', whatsapp: '', instagram: '', bio: '', avatar: '', coverImage: '', description: '', displayOrder: 0,
      role: 'RESIDENT', approvalStatus: 'APPROVED', emailVerified: true, active: true, block: '', unit: '',
    });
    this.feedback.set('');
    this.hasError.set(false);
    this.editorOpen.set(openEditor);
  }

  editRecord(record: Record<string, unknown>) {
    this.editingId.set(String(record['id']));
    this.form.patchValue(record as never);
    this.selectedPhoto = null;
    const photoKey = this.resource() === 'condominiums' ? 'coverImage' : 'avatar';
    this.photoPreview.set(this.api.assetUrl(String(record[photoKey] ?? '')));
    const categoryIds = Array.isArray(record['categoryIds']) ? record['categoryIds'].map(String) : record['categoryId'] ? [String(record['categoryId'])] : [];
    const serviceIds = Array.isArray(record['serviceIds']) ? record['serviceIds'].map(String) : [];
    this.selectedCategoryIds.set(categoryIds);
    this.selectedServiceIds.set(serviceIds);
    this.editorOpen.set(true);
  }

  closeEditor() { this.editorOpen.set(false); }

  setSearch(value: string) { this.searchTerm.set(value); this.page.set(1); }
  setFilter(value: string) { this.filterValue.set(value); this.page.set(1); }
  setPage(value: number) { this.page.set(Math.min(Math.max(1, Number(value)), this.totalPages())); }
  setPageSize(value: number) { this.pageSize.set(Number(value)); this.page.set(1); }
  pageStart() { return this.filteredRecords().length ? (this.page() - 1) * this.pageSize() + 1 : 0; }
  pageEnd() { return Math.min(this.page() * this.pageSize(), this.filteredRecords().length); }

  async exportExcel() {
    const rows = this.filteredRecords().map((record) => Object.fromEntries(
      this.config.columnKeys.map((key, index) => [this.config.columns[index], this.value(record, key)]),
    ));
    await this.spreadsheet.export(this.normalize(this.config.title).replace(/\s+/g, '-'), this.config.title, rows);
  }

  save() {
    const raw = this.form.getRawValue();
    const rawRecord = raw as unknown as Record<string, unknown>;
    if (!raw.name.trim() || (this.resource() === 'professionals' && !this.selectedCategoryIds().length) || ((this.resource() === 'residents' || this.resource() === 'users') && !raw.email.trim())) {
      this.feedback.set('Preencha os campos obrigatórios antes de salvar.');
      this.hasError.set(true);
      return;
    }
    const payload: Record<string, unknown> = Object.fromEntries(this.visibleFields().map((field) => [field.key, rawRecord[field.key]]));
    if (this.resource() === 'professionals') payload['avatar'] = raw.avatar;
    if (this.resource() === 'condominiums') payload['coverImage'] = raw.coverImage;
    if (this.resource() === 'professionals') { payload['categoryIds'] = this.selectedCategoryIds(); payload['serviceIds'] = this.selectedServiceIds(); }
    this.saving.set(true);
    if (this.selectedPhoto) {
      const upload = this.resource() === 'condominiums' ? this.api.uploadCondominiumPhoto(this.selectedPhoto) : this.api.uploadProfessionalPhoto(this.selectedPhoto);
      upload.subscribe({
        next: ({ url }) => { payload[this.resource() === 'condominiums' ? 'coverImage' : 'avatar'] = url; this.persist(payload); },
        error: () => { this.saving.set(false); this.feedback.set('Não foi possível enviar a foto. Verifique o formato e o tamanho.'); this.hasError.set(true); },
      });
      return;
    }
    this.persist(payload);
  }

  selectPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.feedback.set('A foto deve ser PNG, JPG ou WebP e ter no máximo 5 MB.');
      this.hasError.set(true);
      input.value = '';
      return;
    }
    this.selectedPhoto = file;
    this.photoPreview.set(URL.createObjectURL(file));
    this.feedback.set('');
    this.hasError.set(false);
  }

  removePhoto() {
    this.selectedPhoto = null;
    this.photoPreview.set('');
    if (this.resource() === 'condominiums') this.form.controls.coverImage.setValue('');
    else this.form.controls.avatar.setValue('');
  }

  toggleCategory(id: string) {
    this.selectedCategoryIds.update((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
    const allowed = new Set(this.selectedCategories().flatMap((category) => (category.services ?? []).map((service) => service.id)));
    this.selectedServiceIds.update((ids) => ids.filter((serviceId) => allowed.has(serviceId)));
  }

  toggleService(id: string) { this.selectedServiceIds.update((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); }

  openServiceEditor(service?: CategoryService) {
    this.serviceDraft = service ? { ...service } : { name: '', icon: 'wrench', displayOrder: this.categoryServices().length + 1, active: true };
    this.serviceAliasesText = service?.aliases.join(', ') ?? '';
    this.serviceEditorOpen.set(true);
  }

  closeServiceEditor() { this.serviceEditorOpen.set(false); }

  saveService() {
    if (!String(this.serviceDraft.name ?? '').trim()) return;
    const payload = { ...this.serviceDraft, aliases: this.serviceAliasesText.split(',').map((alias) => alias.trim()).filter(Boolean) };
    const request = this.serviceDraft.id ? this.api.updateCategoryService(this.serviceDraft.id, payload) : this.api.createCategoryService(this.editingId(), payload);
    request.subscribe({ next: () => { this.closeServiceEditor(); this.loadCategoryServices(); this.refreshCategories(); }, error: () => { this.feedback.set('Não foi possível salvar o serviço.'); this.hasError.set(true); } });
  }

  removeService(service: CategoryService) {
    if (!confirm(`Excluir o serviço ${service.name}?`)) return;
    this.api.deleteCategoryService(service.id).subscribe({ next: () => { this.loadCategoryServices(); this.refreshCategories(); }, error: () => { this.feedback.set('Não foi possível excluir o serviço.'); this.hasError.set(true); } });
  }

  private loadCategoryServices() { this.api.getCategoryServices(this.editingId(), true).subscribe((services) => this.categoryServices.set(services)); }
  private refreshCategories() { this.api.getCategories().subscribe((categories) => this.categories.set(categories)); }

  private persist(payload: Record<string, unknown>) {
    const request = this.editingId() ? this.api.updateAdminRecord(this.resource(), this.editingId(), payload) : this.api.createAdminRecord(this.resource(), payload);
    request.subscribe({
      next: () => { this.saving.set(false); this.feedback.set('Cadastro salvo com sucesso.'); this.hasError.set(false); this.newRecord(false); this.load(); },
      error: (error: unknown) => { this.saving.set(false); this.feedback.set(this.errorMessage(error, 'Não foi possível salvar o cadastro. Verifique os dados informados.')); this.hasError.set(true); },
    });
  }

  private errorMessage(error: unknown, fallback: string) {
    const message = (error as { error?: { message?: string | string[] } })?.error?.message;
    const text = Array.isArray(message) ? message.join(' ') : message;
    return text ? String(text) : fallback;
  }

  deleteRecord(record: Record<string, unknown>) {
    if (!confirm(`Excluir ${record['name'] ?? 'este cadastro'}?`)) return;
    this.api.deleteAdminRecord(this.resource(), String(record['id'])).subscribe({ next: () => { this.feedback.set('Cadastro excluído.'); this.hasError.set(false); this.load(); }, error: (error: unknown) => { this.feedback.set(this.errorMessage(error, 'Não foi possível excluir o cadastro.')); this.hasError.set(true); } });
  }

  private load() { this.api.getAdminRecords(this.resource()).subscribe({ next: (records) => { this.records.set(records); this.setPage(this.page()); }, error: () => { this.feedback.set('Não foi possível carregar os cadastros.'); this.hasError.set(true); } }); }

  private filterKey() { return ({ condominiums: 'state', residents: 'role', users: 'approvalStatus', professionals: 'category', categories: 'active' } as const)[this.resource()]; }
  private normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}

@Component({
  selector: 'admin-condominium-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneMaskDirective],
  template: `
    <main class="admin-content admin-detail-content">
        <header class="admin-topbar">
          <div>
            <h1>Cadastro de condomínio</h1>
            <p>Stepper 1 Dados • 2 Identidade visual • 3 Confirmar</p>
          </div>
        </header>
        <form [formGroup]="form" class="admin-form">
          <div class="grid-2">
            <input placeholder="Nome" formControlName="name" />
            <input placeholder="Endereço" formControlName="address" />
            <input placeholder="Cidade" formControlName="city" />
            <input placeholder="Estado" formControlName="state" />
            <input placeholder="Bairro" formControlName="neighborhood" />
            <input type="tel" inputmode="tel" maxlength="15" placeholder="Telefone" formControlName="phone" appPhoneMask />
            <input placeholder="E-mail" formControlName="email" />
          </div>
          <div class="grid-2">
            <label class="upload-box">
              Logo do condomínio
              <input type="file" />
            </label>
            <label class="upload-box">
              Imagem de capa
              <input type="file" />
            </label>
          </div>
          <div class="grid-2">
            <label>Cor principal <input type="color" formControlName="primaryColor" /></label>
            <label>Cor secundária <input type="color" formControlName="secondaryColor" /></label>
          </div>
          <div class="preview-card" [style.--preview-primary]="form.value.primaryColor" [style.--preview-secondary]="form.value.secondaryColor">
            <strong>{{ form.value.name }}</strong>
            <p>Preview em tempo real do condomínio</p>
          </div>
          <button class="primary-button" type="button">Salvar condomínio</button>
        </form>
    </main>
  `,
})
export class AdminCondominiumPageComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    name: ['Terras Alphas'],
    address: ['Av. das Palmeiras, 1000'],
    city: ['Uberlândia'],
    state: ['MG'],
    neighborhood: [''],
    phone: ['(34) 99999-0000'],
    email: ['contato@terrasalphas.com.br'],
    primaryColor: ['#0F5A3C'],
    secondaryColor: ['#F4C542'],
  });
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppShellComponent {}
