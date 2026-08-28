import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, of, switchMap } from 'rxjs';
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
  LucideArrowLeft, LucideArrowRight, LucideBell, LucideCalendarDays, LucideCheckCircle2, LucideEllipsis,
  LucideHeart, LucideCamera, LucideMenu, LucideMessageCircle, LucidePhone,
  LucideSearch, LucideShare2, LucideSlidersHorizontal, LucideUsersRound, LucideSparkles,
  LucideBriefcaseBusiness, LucideChevronDown, LucideFileText, LucideThumbsUp,
  LucideStar, LucideUserRoundPlus, LucideCircleAlert,
  LucideMail, LucideLockKeyhole, LucideEye, LucideEyeOff, LucideUserRound, LucideMapPin,
  LucideHouse, LucideHandshake, LucideX,
  LucideDownload, LucidePlus, LucideChevronLeft, LucideChevronRight, LucideShieldCheck,
  LucideBadgeCheck, LucideClipboardList, LucidePencil, LucideTrash2, LucideCheck,
} from '@lucide/angular';
import { AiProblemAnalysisResult, AiPublicConfig, Category, NearbyResult, CategoryService, Condominium, DashboardPayload, HomePayload, ProblemMatchResult, Professional, ProfessionalComment, ProfessionalWork, Review } from './models';
import { SpreadsheetService } from './services/spreadsheet.service';
import { matchesSearch } from './search.util';
import { fetchAddressByZipCode, fetchBrazilianCities, neighborhoodsForCity } from './brazil-locations';
import { buildPhoneLink, buildWhatsappLink } from './contact.util';
import { categoryAvatar, categoryCover } from './category-art.util';
import { SearchableSelectComponent } from './searchable-select';
import { LocationService, RADIUS_OPTIONS } from './services/location.service';
import { PhoneMaskDirective } from './phone-mask.directive';
import { brand } from './brand';

@Component({
  selector: 'login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideMail, LucideLockKeyhole, LucideEye, LucideEyeOff, LucideUserRound, LucideBadgeCheck, LucideClipboardList, LucideShieldCheck, LucideX, LucideCheckCircle2],
  template: `
    <section class="auth-page resident-login-page">
      <aside class="login-showcase" aria-hidden="true">
        <img [src]="brand.assets.logoReverse" [alt]="brand.name" />
        <h2>Encontrar quem resolve<br /><b>ficou fácil.</b></h2>
        <ul>
          <li><svg lucideBadgeCheck /><div><b>Profissionais verificados</b><small>Avaliados por quem já contratou</small></div></li>
          <li><svg lucideClipboardList /><div><b>Compare propostas</b><small>Receba orçamentos e escolha o melhor</small></div></li>
          <li><svg lucideShieldCheck /><div><b>Do começo ao fim</b><small>Acompanhe o serviço com segurança</small></div></li>
        </ul>
      </aside>
      <div class="auth-card resident-login-card">
        <a routerLink="/" class="auth-logo-link" aria-label="Voltar para a página inicial">
          <img class="auth-logo" [src]="brand.assets.logoPrimary" [alt]="brand.name" />
        </a>
        <div class="login-heading">
          <h1>Bem-vindo de volta</h1>
          <p>Entre para continuar resolvendo o que precisa.</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label class="auth-field">E-mail
            <span><svg lucideMail /><input type="email" placeholder="seu@email.com" formControlName="email" /></span>
          </label>
          <label class="auth-field">Senha
            <span><svg lucideLockKeyhole /><input [type]="showPassword() ? 'text' : 'password'" placeholder="Digite sua senha" formControlName="password" /><button type="button" aria-label="Mostrar ou ocultar senha" (click)="togglePassword()"><svg *ngIf="!showPassword()" lucideEye /><svg *ngIf="showPassword()" lucideEyeOff /></button></span>
          </label>
          <div class="auth-row">
            <label><input type="checkbox" formControlName="rememberMe" /> Lembrar-me</label>
            <button type="button" class="text-button" (click)="forgotPassword()">Esqueci minha senha</button>
          </div>
          <button class="primary-button" type="submit">Entrar</button>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
        </form>
        <div class="separator">ou</div>
        <a routerLink="/cadastro" class="secondary-button"><svg lucideUserRound />Criar conta</a>
      </div>

      <div class="auth-modal-backdrop" *ngIf="forgotOpen()" (click)="closeForgot()">
        <section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-title" (click)="$event.stopPropagation()">
          <button type="button" class="auth-modal-close" aria-label="Fechar" (click)="closeForgot()"><svg lucideX /></button>
          <span class="auth-modal-icon"><svg lucideLockKeyhole /></span>
          <h2 id="forgot-title">Recuperar senha</h2>
          <p>Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
          <ng-container *ngIf="!forgotSent(); else forgotDone">
            <label class="auth-field">E-mail
              <span><svg lucideMail /><input type="email" placeholder="seu@email.com" [value]="forgotEmail()" (input)="forgotEmail.set($any($event.target).value)" (keydown.enter)="sendForgot()" /></span>
            </label>
            <p *ngIf="forgotError()" class="form-feedback error">{{ forgotError() }}</p>
            <button type="button" class="primary-button full-width" [disabled]="forgotSending()" (click)="sendForgot()">{{ forgotSending() ? 'Enviando...' : 'Enviar link de recuperação' }}</button>
          </ng-container>
          <ng-template #forgotDone>
            <div class="auth-modal-success">
              <svg lucideCheckCircle2 />
              <p>Se existir uma conta com <b>{{ forgotEmail() }}</b>, o link de recuperação chegará em instantes. Confira também a caixa de spam.</p>
            </div>
            <button type="button" class="secondary-button full-width" (click)="closeForgot()">Fechar</button>
          </ng-template>
        </section>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly brand = brand;

  protected readonly showPassword = signal(false);
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly forgotOpen = signal(false);
  protected readonly forgotEmail = signal('');
  protected readonly forgotSending = signal(false);
  protected readonly forgotSent = signal(false);
  protected readonly forgotError = signal('');
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  togglePassword() {
    this.showPassword.update((value) => !value);
  }

  forgotPassword() {
    this.forgotEmail.set(this.form.controls.email.value ?? '');
    this.forgotError.set('');
    this.forgotSent.set(false);
    this.forgotOpen.set(true);
  }

  closeForgot() {
    this.forgotOpen.set(false);
  }

  sendForgot() {
    const email = this.forgotEmail().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.forgotError.set('Informe um e-mail válido.');
      return;
    }
    this.forgotError.set('');
    this.forgotSending.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.forgotSending.set(false);
        this.forgotSent.set(true);
      },
      error: () => {
        this.forgotSending.set(false);
        this.forgotError.set('Não foi possível enviar agora. Tente novamente em instantes.');
      },
    });
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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, PhoneMaskDirective, LucideArrowLeft, LucideBriefcaseBusiness, LucideChevronLeft, LucideChevronRight, LucideEye, LucideEyeOff, LucideLockKeyhole, LucideMail, LucideMapPin, LucidePhone, LucideSearch, LucideUserRound],
  template: `
    <section class="auth-page register-page">
      <div class="auth-card wide register-card">
        <header class="register-header">
          <a routerLink="/" class="back-link" aria-label="Voltar para o início"><svg lucideArrowLeft /></a>
          <a routerLink="/" class="auth-logo-link" aria-label="Voltar para a página inicial">
            <img class="auth-logo" [src]="brand.assets.logoPrimary" [alt]="brand.name" />
          </a>
          <div>
            <h1>Crie sua conta</h1>
            <p>{{ isProfessional() ? 'Monte seu perfil e receba propostas.' : 'Encontre profissionais para o que precisar.' }}</p>
          </div>
        </header>

        <div *ngIf="professionalSignupEnabled()" class="account-type-switch" role="radiogroup" aria-label="Tipo de conta">
          <button type="button" role="radio" [attr.aria-checked]="!isProfessional()" [class.active]="!isProfessional()" (click)="setAccountType('resident')"><svg lucideSearch />Quero contratar</button>
          <button type="button" role="radio" [attr.aria-checked]="isProfessional()" [class.active]="isProfessional()" (click)="setAccountType('professional')"><svg lucideBriefcaseBusiness />Sou profissional</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="register-progress" aria-label="Progresso do cadastro">
            <span [class.active]="registrationStep() >= 1"></span>
            <span [class.active]="registrationStep() >= 2"></span>
            <span [class.active]="registrationStep() >= 3"></span>
          </div>
          <p class="register-step-label">Etapa {{ registrationStep() }} de 3</p>

          <ng-container *ngIf="registrationStep() === 1">
            <span class="register-legend">Seus dados</span>
            <label class="auth-field">Nome completo
              <span><svg lucideUserRound /><input placeholder="Como você se chama" formControlName="name" autocomplete="name" /></span>
            </label>
            <div class="grid-2">
              <label class="auth-field">E-mail
                <span><svg lucideMail /><input type="email" placeholder="seu@email.com" formControlName="email" autocomplete="email" /></span>
              </label>
              <label class="auth-field">WhatsApp
                <span><svg lucidePhone /><input type="tel" inputmode="tel" maxlength="15" placeholder="(00) 00000-0000" formControlName="phone" autocomplete="tel" appPhoneMask /></span>
              </label>
            </div>
          </ng-container>

          <ng-container *ngIf="registrationStep() === 2 && !isProfessional()">
            <span class="register-legend">Seu endereço</span>
            <label class="auth-field">CEP
              <span><svg lucideMapPin /><input placeholder="00000-000" formControlName="zipCode" inputmode="numeric" maxlength="9" (input)="onZipCodeInput($event)" /></span>
              <small class="field-hint" *ngIf="zipStatus()" [class.error]="zipFailed()">{{ zipStatus() }}</small>
            </label>
            <label class="auth-field">Rua
              <span><input placeholder="Nome da rua" formControlName="street" /></span>
            </label>
            <div class="grid-2">
              <label class="auth-field">Número<span><input placeholder="123" formControlName="number" /></span></label>
              <label class="auth-field">Complemento<span><input placeholder="Apto, bloco (opcional)" formControlName="complement" /></span></label>
            </div>
            <label class="auth-field">Bairro<span><input placeholder="Seu bairro" formControlName="neighborhood" /></span></label>
            <div class="grid-2">
              <label class="auth-field">Cidade<span><input placeholder="Sua cidade" formControlName="city" /></span></label>
              <label class="auth-field">Estado<span><input placeholder="UF" formControlName="state" maxlength="2" /></span></label>
            </div>
          </ng-container>

          <ng-container *ngIf="registrationStep() === 2 && isProfessional()">
            <span class="register-legend">Seu trabalho</span>
            <label class="auth-field">Empresa
              <span><svg lucideBriefcaseBusiness /><input placeholder="Nome da empresa (opcional)" formControlName="companyName" /></span>
            </label>
            <label class="auth-field">Categoria
              <app-searchable-select formControlName="categoryId" [items]="activeCategories()" valueKey="id" labelKey="name" placeholder="Selecione sua categoria" searchPlaceholder="Pesquisar categoria..." />
            </label>
            <div class="grid-2">
              <label class="auth-field">Cidade
                <app-searchable-select formControlName="city" [items]="cities()" valueKey="name" labelKey="label" [placeholder]="loadingCities() ? 'Carregando cidades...' : 'Selecione a cidade'" searchPlaceholder="Pesquisar cidade..." />
              </label>
              <label class="auth-field">Bairro
                <app-searchable-select *ngIf="neighborhoodOptions().length; else bairroLivre" formControlName="neighborhood" [items]="neighborhoodOptions()" placeholder="Selecione o bairro" searchPlaceholder="Pesquisar bairro..." />
                <ng-template #bairroLivre><span><input placeholder="Seu bairro" formControlName="neighborhood" /></span></ng-template>
              </label>
            </div>
            <label class="auth-field">Sobre o seu trabalho
              <textarea placeholder="Conte sua experiência, especialidades e diferenciais (opcional)" formControlName="bio" maxlength="600"></textarea>
            </label>
          </ng-container>

          <ng-container *ngIf="registrationStep() === 3">
            <span class="register-legend">Segurança</span>
            <p class="register-security-copy">Crie uma senha segura para proteger sua conta.</p>
            <label class="auth-field">Senha
              <span><svg lucideLockKeyhole /><input [type]="showPassword() ? 'text' : 'password'" placeholder="Crie uma senha" formControlName="password" autocomplete="new-password" /><button type="button" aria-label="Mostrar ou ocultar senha" (click)="showPassword.set(!showPassword())"><svg *ngIf="!showPassword()" lucideEye /><svg *ngIf="showPassword()" lucideEyeOff /></button></span>
            </label>
            <div class="password-strength" *ngIf="form.controls.password.value" [attr.data-level]="passwordScore()">
              <div class="password-strength-bar" role="progressbar" [attr.aria-valuenow]="passwordScore()" aria-valuemin="0" aria-valuemax="4" [attr.aria-label]="'Força da senha: ' + passwordLabel()">
                <i *ngFor="let step of [1, 2, 3, 4]" [class.on]="passwordScore() >= step"></i>
              </div>
              <small><b>{{ passwordLabel() }}</b>{{ passwordHint() ? ' · ' + passwordHint() : '' }}</small>
            </div>
          </ng-container>

          <div class="register-actions">
            <button *ngIf="registrationStep() > 1" class="secondary-button register-previous" type="button" (click)="previousStep()"><svg lucideChevronLeft />Voltar</button>
            <button *ngIf="registrationStep() < 3" class="primary-button" type="button" (click)="nextStep()">Continuar<svg lucideChevronRight /></button>
            <button *ngIf="registrationStep() === 3" class="primary-button" type="submit">{{ isProfessional() ? 'Criar conta de profissional' : 'Criar conta' }}</button>
          </div>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
        </form>
        <p class="register-login-link">Já tem conta? <a routerLink="/login">Entrar</a></p>
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

  protected readonly brand = brand;
  protected readonly condominiums = signal<Condominium[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly activeCategories = computed(() => this.categories().filter((category) => category.active));
  protected readonly professionalSignupEnabled = signal(false);
  protected readonly isProfessional = signal(false);
  protected readonly registrationStep = signal(1);
  protected readonly showPassword = signal(false);
  protected readonly password = signal('');
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  protected readonly cities = signal<Array<{ name: string; label: string }>>([]);
  protected readonly loadingCities = signal(false);
  protected readonly selectedCity = signal('');
  protected readonly neighborhoodOptions = computed(() => neighborhoodsForCity(this.selectedCity()));
  protected readonly zipStatus = signal('');
  protected readonly zipFailed = signal(false);

  /** Pontua de 0 a 4: comprimento, mistura de maiuscula/minuscula, numero e simbolo. */
  protected readonly passwordScore = computed(() => {
    const value = this.password();
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(4, value.length < 6 ? 1 : Math.max(1, score));
  });
  protected readonly passwordLabel = computed(() => ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][this.passwordScore()]);
  protected readonly passwordHint = computed(() => {
    const value = this.password();
    if (!value || this.passwordScore() >= 4) return '';
    if (value.length < 8) return 'use ao menos 8 caracteres';
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return 'misture maiúsculas e minúsculas';
    if (!/\d/.test(value)) return 'inclua um número';
    if (!/[^A-Za-z0-9]/.test(value)) return 'inclua um símbolo';
    return 'deixe-a mais longa';
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    zipCode: ['', Validators.required],
    street: ['', Validators.required],
    number: ['', Validators.required],
    complement: [''],
    companyName: [''],
    categoryId: [''],
    city: ['', Validators.required],
    neighborhood: ['', Validators.required],
    state: ['', Validators.required],
    bio: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    this.api.getCategories().subscribe((categories) => this.categories.set(categories));
    this.api.getPublicSettings().subscribe({
      next: (settings) => this.professionalSignupEnabled.set(settings.professionalSelfRegistration),
      error: () => this.professionalSignupEnabled.set(false),
    });
    this.form.controls.city.valueChanges.subscribe((city) => {
      this.selectedCity.set(city ?? '');
      // Só o profissional escolhe bairro numa lista por cidade; no morador a cidade
      // vem preenchida pelo CEP junto com o bairro, que não pode ser apagado aqui.
      if (this.isProfessional()) this.form.controls.neighborhood.setValue('');
    });
    this.form.controls.password.valueChanges.subscribe((value) => this.password.set(value ?? ''));
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
    this.registrationStep.set(1);
    this.feedback.set('');
    this.hasError.set(false);
    const { categoryId, zipCode, street, number, state } = this.form.controls;
    // Profissional escolhe cidade/bairro numa lista; morador informa o endereço completo pelo CEP.
    const enderecoCompleto = [zipCode, street, number, state];
    if (professional) {
      categoryId.setValidators(Validators.required);
      enderecoCompleto.forEach((control) => control.clearValidators());
      if (!this.cities().length) this.loadCities();
    } else {
      categoryId.clearValidators();
      enderecoCompleto.forEach((control) => control.setValidators(Validators.required));
    }
    [categoryId, ...enderecoCompleto].forEach((control) => control.updateValueAndValidity());
  }

  protected previousStep() {
    this.feedback.set('');
    this.hasError.set(false);
    this.registrationStep.update((step) => Math.max(1, step - 1));
  }

  protected nextStep() {
    const fields = this.registrationStep() === 1
      ? ['name', 'email', 'phone']
      : this.isProfessional()
        ? ['categoryId', 'city', 'neighborhood']
        : ['zipCode', 'street', 'number', 'neighborhood', 'city', 'state'];
    const controls = fields.map((field) => this.form.controls[field as keyof typeof this.form.controls]);
    controls.forEach((control) => control.markAsTouched());
    if (controls.some((control) => control.invalid)) {
      this.feedback.set('Confira os campos obrigatórios antes de continuar.');
      this.hasError.set(true);
      return;
    }
    this.feedback.set('');
    this.hasError.set(false);
    this.registrationStep.update((step) => Math.min(3, step + 1));
  }

  protected onZipCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    this.form.controls.zipCode.setValue(masked);
    input.value = masked;
    if (digits.length !== 8) {
      this.zipStatus.set('');
      this.zipFailed.set(false);
      return;
    }
    this.zipStatus.set('Buscando endereço...');
    this.zipFailed.set(false);
    fetchAddressByZipCode(this.http, digits).subscribe({
      next: (address) => {
        this.zipStatus.set('Endereço encontrado.');
        this.zipFailed.set(false);
        this.form.patchValue({
          street: address.street || this.form.controls.street.value,
          neighborhood: address.neighborhood || this.form.controls.neighborhood.value,
          city: address.city,
          state: address.state,
        });
      },
      error: () => {
        this.zipStatus.set('Não encontramos esse CEP.');
        this.zipFailed.set(true);
      },
    });
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
          zipCode: values.zipCode,
          street: values.street,
          number: values.number,
          complement: values.complement,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state,
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
    MobileTopbarComponent,
    LucideSearch,
    LucideSlidersHorizontal,
    LucideShieldCheck,
    LucideMessageCircle,
    LucideUsersRound,
    LucideArrowRight,
    LucideSparkles,
    LucideCheck,
  ],
  template: `
      <section class="mobile-page home-page" *ngIf="payload() as home">
      <mobile-topbar />
      <section class="home-surface">
        <ng-container *ngIf="aiEnabled(); else classicHero">
          <div class="home-ai-hero">
            <span class="home-ai-badge"><svg lucideSparkles aria-hidden="true" />Assistente IA</span>
            <h1>{{ aiTexts().title }}</h1>
            <p>{{ aiTexts().subtitle }}</p>
          </div>
          <form class="home-ai-form" (ngSubmit)="analyzeProblem(); $event.preventDefault()">
            <label class="home-ai-field">
              <svg lucideSparkles aria-hidden="true" />
              <input name="aiProblem" type="text" autocomplete="off" [(ngModel)]="searchText" (ngModelChange)="suggestProblem($event)" [placeholder]="aiTexts().placeholder" aria-label="Descreva o problema" />
            </label>
            <small class="home-ai-helper">{{ aiTexts().helperText }}</small>
            <div class="home-ai-examples">
              <span>Exemplos rápidos</span>
              <div>
                <button *ngFor="let example of aiExamples" type="button" (click)="useExample(example)">{{ example }}</button>
              </div>
            </div>
            <button type="submit" class="primary-button home-ai-submit" [disabled]="analyzing()">
              <svg lucideSparkles aria-hidden="true" />{{ analyzing() ? 'Analisando...' : 'Analisar meu problema' }}<svg lucideArrowRight aria-hidden="true" />
            </button>
          </form>
          <aside class="home-ai-progress" *ngIf="analyzing()" aria-live="polite">
            <strong>Entendendo o que você precisa...</strong>
            <ul><li>Analisando problema</li><li>Identificando serviço</li><li>Buscando profissionais</li></ul>
          </aside>
          <aside class="home-ai-clarification" *ngIf="analysis() as result">
            <ng-container *ngIf="result.needsClarification && result.clarificationQuestion">
              <strong>{{ result.message }}</strong>
              <p>{{ result.clarificationQuestion }}</p>
            </ng-container>
          </aside>
          <article class="home-ai-result" *ngIf="analysisCategory() as category">
            <strong>{{ analysis()?.message }}</strong>
            <h2>{{ category.name }}</h2>
            <ul *ngIf="analysis()?.services?.length">
              <li *ngFor="let service of analysis()?.services"><svg lucideCheck aria-hidden="true" />{{ service.name }}</li>
            </ul>
            <div class="home-ai-actions">
              <button type="button" class="primary-button" (click)="viewProfessionalsForAnalysis()">Ver profissionais</button>
              <button type="button" class="secondary-button" (click)="createRequest()">Quero receber propostas</button>
              <button type="button" class="ghost-button" (click)="resetAnalysis()">Ajustar</button>
            </div>
          </article>
        </ng-container>
        <ng-template #classicHero>
          <div class="home-hero">
            <div><h1>Encontre o profissional ideal</h1><p>com confiança e segurança.</p></div>
            <div class="home-hero-proof" aria-label="Profissionais avaliados pela comunidade"><span><svg lucideShieldCheck /></span><i class="hero-avatar avatar-one"></i><i class="hero-avatar avatar-two"></i><i class="hero-avatar avatar-three"></i></div>
          </div>
          <form class="home-search" role="search" (ngSubmit)="searchProfessionals()">
            <svg lucideSearch aria-hidden="true" />
            <input name="homeSearch" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" [(ngModel)]="searchText" (ngModelChange)="suggestProblem($event)" (keydown.enter)="searchProfessionals(); $event.preventDefault()" placeholder="Conte o que aconteceu. Ex.: meu chuveiro queimou" aria-label="Descreva o problema" />
            <a class="home-search-filters" routerLink="/app/profissionais" aria-label="Abrir filtros de busca"><svg lucideSlidersHorizontal /></a>
          </form>
        </ng-template>
        <aside class="home-problem-suggestion" *ngIf="!analysis() && problemSuggestion() as match">
          <p *ngIf="match.category; else noMatch">Parece que você precisa de <b>{{ match.category.name }}</b><span *ngIf="match.services[0]">: {{ match.services[0].name }}</span>.</p>
          <ng-template #noMatch><p>Não identificamos o serviço com segurança. Você pode escolher manualmente.</p></ng-template>
          <div *ngIf="match.category"><button type="button" (click)="searchProfessionals()">Ver profissionais</button><button type="button" (click)="createRequest()">Quero receber propostas</button></div>
        </aside>
        <section class="home-decision-grid">
          <article class="home-decision-card request">
            <span><svg lucideMessageCircle /></span><h2>Descreva seu problema</h2>
            <p>Conte o que precisa resolver. Ex.: Meu chuveiro não esquenta</p>
            <button type="button" class="primary-button" (click)="createRequest()">Quero receber propostas<svg lucideArrowRight /></button>
            <small><svg lucideArrowRight />Receba propostas de profissionais interessados no seu serviço.</small>
          </article>
          <article class="home-decision-card browse">
            <span><svg lucideUsersRound /></span><h2>Ver profissionais</h2>
            <p>{{ aiEnabled() ? 'Prefere escolher manualmente? Navegue por categorias e profissionais.' : 'Navegue e escolha o profissional ideal para o que você precisa.' }}</p>
            <a routerLink="/app/profissionais" class="secondary-button">Ver profissionais<svg lucideArrowRight /></a>
            <small><svg lucideShieldCheck />Compare avaliações, preços e escolha com segurança.</small>
          </article>
        </section>
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
          <div><strong>Profissionais verificados e avaliados</strong><small>Aqui você encontra confiança, qualidade e o melhor atendimento da sua região.</small></div>
          <div class="verified-avatars" aria-hidden="true"><i></i><i></i><i></i><b>+15k</b></div>
        </a>
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
  protected readonly problemSuggestion = signal<ProblemMatchResult | null>(null);
  protected readonly aiConfig = signal<AiPublicConfig | null>(null);
  protected readonly analysis = signal<AiProblemAnalysisResult | null>(null);
  protected readonly analyzing = signal(false);
  protected readonly aiEnabled = computed(() => this.aiConfig()?.enabled === true);
  protected readonly analysisCategory = computed(() => {
    const result = this.analysis();
    return result && !result.needsClarification ? result.category : null;
  });
  protected readonly aiExamples = ['Meu chuveiro queimou', 'Minha pia está vazando', 'Meu ar não gela', 'Preciso de psicóloga', 'Minha internet está caindo'];
  protected searchText = '';
  private suggestionTimer?: ReturnType<typeof setTimeout>;

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
    // Sem a configuração pública a Home simplesmente mantém a experiência clássica, sem IA.
    this.api.getPublicSettings().subscribe({ next: (settings) => this.aiConfig.set(settings.ai ?? null) });
  }

  protected aiTexts() {
    const config = this.aiConfig();
    return {
      title: config?.homeTitle || 'Conte o que aconteceu',
      subtitle: config?.homeSubtitle || 'A IA do IndicaFácil ajuda você a encontrar quem pode resolver.',
      placeholder: config?.homePlaceholder || 'Ex.: meu chuveiro queimou',
      helperText: config?.homeHelperText || 'Descreva o problema com suas palavras. A IA identifica o serviço para você.',
    };
  }

  protected useExample(example: string) {
    this.searchText = example;
    this.analysis.set(null);
    this.problemSuggestion.set(null);
  }

  protected resetAnalysis() {
    this.analysis.set(null);
  }

  /** Só roda por ação explícita do usuário — a digitação continua usando apenas o matcher local. */
  protected analyzeProblem() {
    const text = this.searchText.replace(/\s+/g, ' ').trim();
    if (!text || this.analyzing()) return;
    this.problemSuggestion.set(null);
    this.analysis.set(null);
    this.analyzing.set(true);
    this.api.analyzeProblem(text).subscribe({
      next: (result) => {
        this.analysis.set(result);
        this.analyzing.set(false);
      },
      // O erro técnico fica no log administrativo; aqui o morador segue pelo caminho manual.
      error: () => {
        this.analyzing.set(false);
        this.findProfessionalsForProblem(text);
      },
    });
  }

  protected viewProfessionalsForAnalysis() {
    const result = this.analysis();
    if (!result?.category) {
      this.searchProfessionals();
      return;
    }
    void this.router.navigate(['/app/profissionais'], {
      queryParams: { categoria: result.category.slug, servico: result.services[0]?.slug ?? null },
    });
  }

  protected popularCategories(home: HomePayload) {
    const preferred = ['encanador', 'eletricista', 'diarista', 'ar-condicionado'];
    const actives = home.categories.filter((category) => category.active !== false && category.slug !== 'mais');
    const picked = preferred.map((slug) => actives.find((category) => category.slug === slug)).filter(Boolean) as Category[];
    return picked.length ? picked : actives.slice(0, 4);
  }

  protected searchProfessionals() {
    this.findProfessionalsForProblem(this.searchText);
  }

  protected createRequest() {
    const problem = this.searchText.trim();
    const result = this.analysis();
    if (result?.category && !result.needsClarification) {
      void this.router.navigate(['/app/solicitacoes/nova'], {
        queryParams: {
          problema: result.normalizedProblem || problem,
          categoria: result.category.id,
          servicos: result.services.map((service) => service.id).join(',') || null,
        },
      });
      return;
    }
    void this.router.navigate(['/app/solicitacoes/nova'], { queryParams: problem ? { problema: problem } : {} });
  }

  protected suggestProblem(value: string) {
    if (this.suggestionTimer) clearTimeout(this.suggestionTimer);
    this.problemSuggestion.set(null);
    const query = value.trim();
    if (query.length < 4) return;
    this.suggestionTimer = setTimeout(() => this.api.matchProblem(query).subscribe({ next: (match) => this.problemSuggestion.set(match) }), 280);
  }

  private findProfessionalsForProblem(value: string) {
    const query = value.replace(/\s+/g, ' ').trim();
    if (!query) {
      void this.router.navigate(['/app/profissionais']);
      return;
    }

    this.api.matchProblem(query).subscribe({
      next: (match) => {
        // A categoria reconhecida é mais confiável que procurar toda a frase no perfil.
        // Ex.: "meu chuveiro queimou" deve abrir Eletricistas, não zerar a lista por "queimou".
        void this.router.navigate(['/app/profissionais'], {
          queryParams: match.category ? { categoria: match.category.slug, servico: match.services[0]?.slug ?? null } : { busca: query },
        });
      },
      error: () => void this.router.navigate(['/app/profissionais'], { queryParams: { busca: query } }),
    });
  }
}

@Component({
  selector: 'professionals-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfessionalCardComponent, SearchableSelectComponent, LucideArrowLeft, LucideChevronDown, LucideSearch, LucideSlidersHorizontal, LucideThumbsUp, LucideX, LucideMapPin, LucideSparkles, LucideArrowRight],
  template: `
    <section class="mobile-page professionals-page">
      <div class="professionals-heading">
        <a class="professionals-back" routerLink="/app/home" aria-label="Voltar"><svg lucideArrowLeft /></a>
        <div>
          <h1>{{ pageTitle() }}</h1>
          <p *ngIf="!nearbyMode()">{{ filteredProfessionals().length }} {{ filteredProfessionals().length === 1 ? 'profissional encontrado' : 'profissionais encontrados' }}</p>
          <p *ngIf="nearbyMode()">Veja quem atende próximo da sua localização.</p>
        </div>
      </div>
      <div class="professionals-content">
        <ng-container *ngIf="nearbyMode()">
          <section class="nearby-location-bar">
            <div>
              <svg lucideMapPin aria-hidden="true" />
              <div>
                <strong>Raio de busca: {{ radius() }} km</strong>
                <small>{{ locationLabel() }}</small>
              </div>
            </div>
            <button type="button" (click)="locationSheetOpen.set(true)">Alterar localização</button>
          </section>

          <div class="nearby-radius-row" *ngIf="location()">
            <button *ngFor="let option of radiusOptions" type="button" [class.active]="radius() === option" (click)="setRadius(option)">{{ option }} km</button>
          </div>

          <section class="nearby-no-location" *ngIf="!location()">
            <h2>Para encontrar profissionais perto de você, precisamos da sua localização.</h2>
            <p>Você também pode continuar navegando por categoria, sem informar onde está.</p>
            <div>
              <button type="button" class="primary-button" (click)="useDeviceLocation()" [disabled]="locating()">{{ locating() ? 'Localizando...' : 'Usar minha localização' }}</button>
              <button type="button" class="secondary-button" (click)="locationSheetOpen.set(true)">Informar endereço</button>
            </div>
          </section>

          <div class="nearby-quick-categories">
            <button *ngFor="let category of quickCategories()" type="button" [class.active]="selectedCategory() === category.slug" (click)="toggleQuickCategory(category.slug)">{{ category.name }}</button>
          </div>

          <button class="nearby-ai-cta" type="button" *ngIf="aiEnabled()" (click)="openAiFlow()">
            <svg lucideSparkles aria-hidden="true" />
            <span><strong>Não sabe qual profissional procurar?</strong><small>Conte seu problema para a IA</small></span>
            <svg lucideArrowRight aria-hidden="true" />
          </button>
        </ng-container>

        <div class="filter-row category-filter-row">
          <button class="filter-chip recommended-filter" type="button" [class.active]="sortMode() === 'recommended'" (click)="setSort('recommended')"><svg lucideThumbsUp />Mais indicados</button>
          <div class="sort-menu">
            <button class="filter-chip" type="button" (click)="sortOpen.set(!sortOpen())">Ordenar<svg lucideChevronDown /></button>
            <div *ngIf="sortOpen()" class="sort-menu-options">
              <button *ngFor="let option of sortOptions" type="button" [class.active]="sortMode() === option.value" (click)="setSort(option.value)">{{ option.label }}</button>
            </div>
          </div>
          <button class="filter-chip filter-open-button" type="button" [class.has-filters]="activeFilterCount() > 0" (click)="openFilters()"><svg lucideSlidersHorizontal /><span>Filtros</span><b *ngIf="activeFilterCount()">{{ activeFilterCount() }}</b></button>
        </div>
        <ng-container *ngIf="nearbyMode() && location(); else listaPadrao">
          <section class="other-professionals-section" *ngIf="nearbyItems().length">
            <header>
              <div>
                <h2>Mais próximos</h2>
                <p>Distância aproximada pelo bairro do profissional.</p>
              </div>
            </header>
            <professional-card *ngFor="let professional of nearbyItems()" [professional]="professional" [distanceKm]="professional.distanceKm" />
          </section>

          <div class="professionals-empty" *ngIf="!nearbyItems().length && !loadingNearby()">
            <svg lucideSearch />
            <h2>Não encontramos profissionais neste raio.</h2>
            <p>Aumente a distância para encontrar mais opções.</p>
            <div class="nearby-empty-actions">
              <button type="button" class="secondary-button" (click)="setRadius(10)">Buscar em 10 km</button>
              <button type="button" class="secondary-button" (click)="setRadius(20)">Buscar em 20 km</button>
            </div>
            <button class="primary-button" type="button" (click)="requestProposals()">Quero receber propostas</button>
          </div>

          <p class="nearby-without-location" *ngIf="nearbyWithoutLocation() > 0">
            {{ nearbyWithoutLocation() }} {{ nearbyWithoutLocation() === 1 ? 'profissional ainda não tem' : 'profissionais ainda não têm' }} localização cadastrada e não {{ nearbyWithoutLocation() === 1 ? 'aparece' : 'aparecem' }} na busca por raio.
          </p>
        </ng-container>

        <ng-template #listaPadrao>
          <section class="recommended-professionals-section" *ngIf="recommendedProfessionals().length">
            <header><div><h2>Recomendados para você</h2><p>Os mais bem avaliados e indicados da sua região.</p></div></header>
            <professional-card *ngFor="let professional of recommendedProfessionals()" [professional]="professional" [highlight]="true" />
          </section>
          <section class="other-professionals-section" *ngIf="otherProfessionals().length">
            <header><div><h2>Outros profissionais</h2><p>Confira mais opções disponíveis.</p></div></header>
            <professional-card *ngFor="let professional of otherProfessionals()" [professional]="professional" />
          </section>
          <div class="professionals-empty" *ngIf="!filteredProfessionals().length">
            <svg lucideSearch />
            <h2>Nenhum profissional encontrado</h2>
            <p>Ainda não encontramos profissionais desta categoria na sua região.</p>
            <button class="secondary-button" type="button" (click)="requestProposals()">Quero receber propostas</button>
          </div>
        </ng-template>
      </div>

      <div class="professional-filter-backdrop" *ngIf="locationSheetOpen()" (click)="locationSheetOpen.set(false)">
        <section class="professional-filter-sheet" role="dialog" aria-modal="true" aria-label="Alterar localização" (click)="$event.stopPropagation()">
          <header>
            <div><span>Onde você precisa do serviço</span><h2>Alterar localização</h2></div>
            <button type="button" aria-label="Fechar" (click)="locationSheetOpen.set(false)"><svg lucideX /></button>
          </header>

          <button type="button" class="primary-button full-width" (click)="useDeviceLocation()" [disabled]="locating()">
            <svg lucideMapPin />{{ locating() ? 'Localizando...' : 'Usar minha localização atual' }}
          </button>

          <label>CEP
            <span class="filter-search-field"><svg lucideMapPin /><input [(ngModel)]="zipInput" inputmode="numeric" maxlength="9" placeholder="00000-000" /></span>
          </label>
          <button type="button" class="secondary-button full-width" (click)="useZipCode()" [disabled]="locating()">Usar este CEP</button>

          <p class="location-sheet-hint" *ngIf="locationError()">{{ locationError() }}</p>
          <p class="location-sheet-hint">Guardamos apenas a região aproximada. Seu endereço completo não é exibido aos profissionais.</p>

          <footer>
            <button type="button" class="ghost-button" (click)="clearLocation()">Remover localização</button>
            <button type="button" class="primary-button" (click)="locationSheetOpen.set(false)">Concluir</button>
          </footer>
        </section>
      </div>

      <div class="professional-filter-backdrop" *ngIf="filtersOpen()" (click)="closeFilters()">
        <section class="professional-filter-sheet" role="dialog" aria-modal="true" aria-label="Filtros de profissionais" (click)="$event.stopPropagation()">
          <header>
            <div><span>Refine sua busca</span><h2>Filtros</h2></div>
            <button type="button" aria-label="Fechar filtros" (click)="closeFilters()"><svg lucideX /></button>
          </header>

          <label>Buscar por nome ou serviço
            <span class="filter-search-field"><svg lucideSearch /><input [ngModel]="searchText()" (ngModelChange)="setSearchText($event)" placeholder="Ex.: instalação elétrica" /></span>
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
  private searchMatchTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly sortMode = signal<'recommended' | 'rating' | 'reviews' | 'az'>('recommended');
  protected readonly sortOpen = signal(false);
  protected readonly filtersOpen = signal(false);
  protected readonly selectedCategory = signal('');
  protected readonly searchText = signal('');
  protected readonly problemMatch = signal<ProblemMatchResult | null>(null);
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
  private readonly locationService = inject(LocationService);
  /** A tela "perto de você" é a experiência do botão Buscar da navegação. */
  protected readonly nearbyMode = signal(false);
  protected readonly location = this.locationService.location;
  protected readonly radius = this.locationService.radius;
  protected readonly locating = this.locationService.requesting;
  protected readonly locationSheetOpen = signal(false);
  protected readonly locationError = signal('');
  protected readonly nearby = signal<NearbyResult | null>(null);
  protected readonly loadingNearby = signal(false);
  protected readonly aiEnabled = signal(false);
  protected readonly radiusOptions = RADIUS_OPTIONS;
  protected zipInput = '';
  protected readonly locationLabel = computed(() => {
    const local = this.location();
    if (!local) return 'Localização não definida';
    // Deixa claro de onde veio, para a pessoa saber que pode trocar.
    const origem = { profile: 'do seu cadastro', device: 'do seu aparelho', zip: 'pelo CEP', manual: '' }[local.origin] ?? '';
    return origem ? `${local.label} · ${origem}` : local.label;
  });
  protected readonly nearbyItems = computed(() => this.nearby()?.items ?? []);
  protected readonly nearbyWithoutLocation = computed(() => this.nearby()?.withoutLocation ?? 0);
  protected readonly quickCategories = computed(() => {
    const preferidas = ['eletricista', 'encanador', 'gas', 'diarista', 'ar-condicionado', 'mecanico', 'informatica', 'montador'];
    const ativas = this.categories();
    const escolhidas = preferidas.map((slug) => ativas.find((item) => item.slug === slug)).filter(Boolean) as Category[];
    return escolhidas.length ? escolhidas : ativas.slice(0, 8);
  });
  protected readonly sortOptions: Array<{ value: 'recommended' | 'rating' | 'reviews' | 'az'; label: string }> = [
    { value: 'recommended', label: 'Mais indicados' },
    { value: 'rating', label: 'Melhor avaliados' },
    { value: 'reviews', label: 'Mais avaliações' },
    { value: 'az', label: 'A-Z' },
  ];

  protected readonly pageTitle = computed(() => {
    const slug = this.selectedCategory();
    // Na aba Buscar sem categoria escolhida, o titulo anuncia a proximidade.
    if (!slug) return this.nearbyMode() ? 'Profissionais perto de você' : 'Profissionais';
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
    const problemMatch = this.problemMatch();

    return this.professionals()
      .filter((professional) => {
        const searchable = [professional.name, professional.companyName ?? '', professional.bio, professional.city, professional.neighborhood, ...professional.categories.map((item) => item.name), ...professional.serviceDetails.flatMap((item) => [item.name, ...item.aliases])].join(' ');
        const intelligentSearch = matchesSearch(searchable, search) || this.matchesProblem(professional, problemMatch);
        return (!category || professional.categories.some((item) => item.slug === category))
          && intelligentSearch
          && (!city || professional.city === city)
          && (!neighborhood || professional.neighborhood === neighborhood)
          && (!service || professional.serviceDetails.some((item) => item.slug === service))
          && professional.rating >= minimumRating;
      })
      .sort((first, second) => this.compareProfessionals(first, second));
  });
  protected readonly recommendedProfessionals = computed(() => this.filteredProfessionals()
    .filter((professional) => professional.recommendationCount > 0 || professional.reviewCount > 0)
    .sort((first, second) => second.recommendationCount - first.recommendationCount || second.rating - first.rating || second.reviewCount - first.reviewCount)
    .slice(0, 3));
  protected readonly otherProfessionals = computed(() => {
    const recommendedIds = new Set(this.recommendedProfessionals().map((professional) => professional.id));
    return this.filteredProfessionals().filter((professional) => !recommendedIds.has(professional.id));
  });

  ngOnInit() {
    this.api.getProfessionals().subscribe((professionals) => this.professionals.set(professionals));
    this.api.getCategories().subscribe((categories) => this.categories.set(categories.filter((category) => category.slug !== 'mais')));
    // O item Buscar da navegação abre /app/buscar, que é a central de descoberta.
    this.nearbyMode.set(this.router.url.split('?')[0].endsWith('/buscar'));
    if (this.nearbyMode()) {
      this.api.getPublicSettings().subscribe({ next: (settings) => this.aiEnabled.set(settings.ai?.enabled === true), error: () => undefined });
      void this.useProfileAddress();
    }
    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategory.set(params.get('categoria') ?? '');
      this.setSearchText(params.get('busca') ?? '');
      this.serviceFilter.set(params.get('servico') ?? '');
      const sort = params.get('ordem');
      if (sort && this.sortOptions.some((option) => option.value === sort)) this.sortMode.set(sort as 'recommended' | 'rating' | 'reviews' | 'az');
      if (this.nearbyMode()) this.loadNearby();
    });
  }

  /** Busca por proximidade no servidor: o raio e a distância dependem do banco. */
  protected loadNearby() {
    const local = this.location();
    if (!local) {
      this.nearby.set(null);
      return;
    }
    this.loadingNearby.set(true);
    this.api
      .getNearbyProfessionals({
        lat: local.latitude,
        lng: local.longitude,
        radius: this.radius(),
        categorySlug: this.selectedCategory() || undefined,
        serviceSlug: this.serviceFilter() || undefined,
        minRating: this.minimumRating() || undefined,
        search: this.searchText() || undefined,
        sort: 'distance',
        limit: 50,
      })
      .subscribe({
        next: (resultado) => {
          this.nearby.set(resultado);
          this.loadingNearby.set(false);
        },
        error: () => {
          this.nearby.set(null);
          this.loadingNearby.set(false);
        },
      });
  }

  /**
   * Usa o CEP do cadastro quando ainda não há localização escolhida, para não
   * pedir permissão nem digitação a quem já informou o endereço ao se cadastrar.
   * Silencioso de propósito: falhar aqui só mantém o convite manual na tela.
   */
  private async useProfileAddress() {
    if (this.location()) return;
    this.api.getMyAccount().subscribe({
      next: async (conta) => {
        const cep = (conta.zipCode ?? '').replace(/\D/g, '');
        if (cep.length !== 8 || this.location()) return;
        try {
          await this.locationService.useZipCode(cep, 'profile');
          this.loadNearby();
        } catch {
          // Sem coordenada para o CEP, a pessoa escolhe manualmente.
        }
      },
      error: () => undefined,
    });
  }

  protected setRadius(valor: number) {
    this.locationService.setRadius(valor);
    this.loadNearby();
  }

  protected async useDeviceLocation() {
    this.locationError.set('');
    try {
      await this.locationService.useDeviceLocation();
      this.locationSheetOpen.set(false);
      this.loadNearby();
    } catch (erro) {
      this.locationError.set(erro instanceof Error ? erro.message : 'Não foi possível obter sua localização.');
    }
  }

  protected async useZipCode() {
    this.locationError.set('');
    try {
      await this.locationService.useZipCode(this.zipInput);
      this.locationSheetOpen.set(false);
      this.loadNearby();
    } catch (erro) {
      this.locationError.set(erro instanceof Error ? erro.message : 'Não encontramos esse CEP.');
    }
  }

  protected clearLocation() {
    this.locationService.clear();
    this.nearby.set(null);
    this.locationSheetOpen.set(false);
  }

  protected toggleQuickCategory(slug: string) {
    this.selectedCategory.set(this.selectedCategory() === slug ? '' : slug);
    this.applyFilters();
  }

  /** Leva ao fluxo de IA da Home, que devolve categoria e serviço já filtrados. */
  protected openAiFlow() {
    void this.router.navigate(['/app/home'], { queryParams: { ia: 1 } });
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
        servico: this.serviceFilter() || null,
        ordem: this.sortMode() === 'recommended' ? null : this.sortMode(),
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

  protected setSearchText(value: string) {
    const query = value.replace(/\s+/g, ' ').trim();
    this.searchText.set(value);
    this.problemMatch.set(null);
    if (this.searchMatchTimer) clearTimeout(this.searchMatchTimer);
    if (query.length < 3) return;

    this.searchMatchTimer = setTimeout(() => {
      this.api.matchProblem(query).subscribe({
        next: (match) => {
          // Ignora respostas antigas quando a pessoa continua digitando.
          if (this.searchText().replace(/\s+/g, ' ').trim() === query) this.problemMatch.set(match);
        },
      });
    }, 220);
  }

  protected clearFilters() {
    this.selectedCategory.set('');
    this.setSearchText('');
    this.cityFilter.set('');
    this.neighborhoodFilter.set('');
    this.serviceFilter.set('');
    this.minimumRating.set(0);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected setSort(sort: 'recommended' | 'rating' | 'reviews' | 'az') {
    this.sortMode.set(sort);
    this.sortOpen.set(false);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { ordem: sort === 'recommended' ? null : sort }, queryParamsHandling: 'merge' });
  }

  protected requestProposals() {
    void this.router.navigate(['/app/solicitacoes/nova'], { queryParams: { categoria: this.selectedCategory() || null, servico: this.serviceFilter() || null } });
  }

  @HostListener('window:keydown.escape')
  protected closeFiltersWithEscape() {
    if (this.filtersOpen()) this.closeFilters();
  }

  ngOnDestroy() {
    if (this.searchMatchTimer) clearTimeout(this.searchMatchTimer);
    document.body.classList.remove('mobile-menu-open');
  }

  private uniqueValues(values: string[]) {
    return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  private normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private compareProfessionals(first: Professional, second: Professional) {
    switch (this.sortMode()) {
      case 'rating': return second.rating - first.rating || second.reviewCount - first.reviewCount;
      case 'reviews': return second.reviewCount - first.reviewCount || second.rating - first.rating;
      case 'az': return first.name.localeCompare(second.name, 'pt-BR');
      default: return second.recommendationCount - first.recommendationCount || second.rating - first.rating || second.reviewCount - first.reviewCount;
    }
  }

  private matchesProblem(professional: Professional, match: ProblemMatchResult | null) {
    if (!match?.category) return false;
    if (!professional.categories.some((category) => category.id === match.category!.id)) return false;
    return !match.services.length || professional.serviceDetails.some((service) => match.services.some((matched) => matched.id === service.id));
  }
}

@Component({
  selector: 'professional-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RatingStarsComponent, SearchableSelectComponent, LucideArrowLeft, LucideShare2, LucideHeart, LucideMessageCircle, LucidePhone, LucideStar, LucideUsersRound, LucideCheckCircle2, LucideCircleAlert, LucideCamera, LucideX],
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
          <span>{{ professional.recommendationCount }} pessoas recomendam este profissional</span>
        </div>
        <div class="quick-actions">
          <a [routerLink]="['/app/mensagens', professional.id]"><b><svg lucideMessageCircle /></b>Mensagem</a>
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
        <a [routerLink]="['/app/mensagens', professional.id]" class="primary-button full-width profile-whatsapp"><svg lucideMessageCircle />Enviar mensagem</a>
      </div>

      <div class="professional-filter-backdrop" *ngIf="reportOpen()" (click)="closeReport()">
        <section class="professional-filter-sheet report-form-sheet" role="dialog" aria-modal="true" aria-label="Denunciar profissional" (click)="$event.stopPropagation()">
          <header>
            <div><span>Denúncia</span><h2>Denunciar {{ professional.name }}</h2></div>
            <button type="button" aria-label="Fechar" (click)="closeReport()"><svg lucideX /></button>
          </header>
          <label class="report-form-field">
            <span>Motivo</span>
            <app-searchable-select [(ngModel)]="reportReason" [items]="reportReasons" emptyLabel="Selecione o motivo" searchPlaceholder="Pesquisar motivo..." />
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
      title: `${professional.name} - IndicaFácil`,
      text: `Conheça ${professional.name}, profissional de ${professional.category}, no IndicaFácil.`,
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
            <div><strong>{{ review.userName }}</strong><span>Cliente verificado</span></div>
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
            <p class="admin-eyebrow">Gestão IndicaFácil</p>
            <h1>Dashboard</h1>
          </div>
          <div class="dashboard-controls"><button class="date-filter"><svg lucideCalendarDays /> 01/05/2024 - 31/05/2024 <span>⌄</span></button><div class="admin-user"><img src="/assets/placeholders/default-avatar.svg" alt="Foto do administrador" /><span><b>{{ userName() }}</b><small>{{ roleLabel() }}</small></span></div></div>
        </header>
        <div class="stats-grid">
          <article class="stat-card"><i><svg lucideUsersRound /></i><span>Clientes</span><strong>{{ dashboard.stats.residents }}</strong><em>↑ 8 este mês</em></article>
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
          <section class="admin-bottom-card"><i><svg lucideUserRoundPlus /></i><div><h2>Novos clientes</h2><strong>{{ dashboard.pending.newResidents }}</strong><p>Aguardando aprovação</p></div><a routerLink="/admin/clientes">Ver todos</a></section>
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
type AdminField = { key: string; label: string; type?: 'text' | 'email' | 'tel' | 'password' | 'textarea' | 'checkbox'; select?: 'category' | 'condominium' | 'options' | 'city' | 'neighborhood'; options?: Array<{ value: string; label: string }>; hideForRoles?: string[]; wide?: boolean };

@Component({
  selector: 'admin-crud-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableSelectComponent, PhoneMaskDirective, LucideSearch, LucideDownload, LucidePlus, LucideChevronLeft, LucideChevronRight, LucidePencil, LucideTrash2, LucideX, LucideUserRound, LucideMail, LucidePhone, LucideLockKeyhole, LucideMapPin],
  template: `
    <main class="admin-content admin-crud-content">
        <header class="admin-topbar"><div><p class="admin-eyebrow">Gestão IndicaFácil</p><h1>{{ config.title }}</h1><p>Consulte, filtre, exporte e gerencie os registros.</p></div></header>
        <section class="admin-table-panel admin-data-panel">
          <header class="admin-grid-header">
            <div><h2>{{ config.title }}</h2><span>{{ filteredRecords().length }} registros</span></div>
            <div class="admin-data-toolbar">
              <label class="admin-search-field"><svg lucideSearch /><input [ngModel]="searchTerm()" (ngModelChange)="setSearch($event)" placeholder="Buscar em {{ config.title.toLowerCase() }}..." /></label>
              <app-searchable-select class="admin-toolbar-select" [ngModel]="filterValue()" (ngModelChange)="setFilter($event)" [items]="filterOptions()" emptyLabel="Todos os registros" searchPlaceholder="Pesquisar filtro..." />
              <button class="admin-export-button admin-toolbar-action" type="button" (click)="exportExcel()"><svg lucideDownload /> Exportar Excel</button>
              <button class="primary-button admin-toolbar-action" type="button" (click)="newRecord()"><svg lucidePlus /> Adicionar</button>
            </div>
          </header>
          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
          <div class="admin-table-wrap"><table><thead><tr><th *ngFor="let column of config.columns">{{ column }}</th><th>Ações</th></tr></thead><tbody>
              <tr *ngFor="let record of pagedRecords()"><td *ngFor="let key of config.columnKeys" [class.photo-cell]="isPhotoKey(key)" [class.cover-photo-cell]="key === 'coverImage'">
                <img *ngIf="isPhotoKey(key)" [src]="recordPhoto(record, key)" [alt]="'Foto de ' + value(record, 'name')" (error)="$any($event.target).src=photoPlaceholder(key)" />
                <span *ngIf="!isPhotoKey(key)">{{ value(record, key) }}</span>
              </td><td class="admin-actions"><button type="button" class="icon-action" aria-label="Editar registro" title="Editar" (click)="editRecord(record)"><svg lucidePencil /></button><button type="button" class="icon-action danger-action" aria-label="Excluir registro" title="Excluir" (click)="deleteRecord(record)"><svg lucideTrash2 /></button></td></tr>
              <tr *ngIf="!pagedRecords().length"><td class="admin-empty-row" [attr.colspan]="config.columns.length + 1">Nenhum cadastro encontrado com os filtros atuais.</td></tr>
          </tbody></table></div>
          <footer class="admin-pagination"><span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filteredRecords().length }}</span><label>Itens por página <app-searchable-select class="page-size-select" [ngModel]="pageSize()" (ngModelChange)="setPageSize($event)" [items]="pageSizeOptions" searchPlaceholder="Pesquisar quantidade..." /></label><div><button type="button" [disabled]="page() === 1" (click)="setPage(page() - 1)"><svg lucideChevronLeft /></button><b>{{ page() }} / {{ totalPages() }}</b><button type="button" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)"><svg lucideChevronRight /></button></div></footer>
        </section>

        <div *ngIf="editorOpen()" class="admin-modal-backdrop" (click)="closeEditor()">
          <form class="admin-editor admin-crud-modal" [formGroup]="form" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <header class="admin-modal-header"><div><h2>{{ editingId() ? 'Editar cadastro' : 'Novo cadastro' }}</h2><p>{{ editingId() ? 'Atualize os dados abaixo.' : 'Preencha os dados para criar um registro.' }}</p></div><button type="button" aria-label="Fechar" (click)="closeEditor()"><svg lucideX /></button></header>
            <section *ngIf="resource() === 'residents'" class="admin-client-registration">
              <header><span>Dados da conta</span><p>Informe os dados de acesso do cliente.</p></header>
              <div class="admin-client-fields">
                <label class="field-wide">Nome completo<span class="client-input"><svg lucideUserRound /><input formControlName="name" placeholder="Como o cliente se chama" autocomplete="name" /></span></label>
                <label>E-mail<span class="client-input"><svg lucideMail /><input type="email" formControlName="email" placeholder="cliente@email.com" autocomplete="email" /></span></label>
                <label>Telefone (WhatsApp)<span class="client-input"><svg lucidePhone /><input type="tel" inputmode="tel" maxlength="15" formControlName="phone" placeholder="(00) 00000-0000" appPhoneMask /></span></label>
                <label>Senha<span class="client-input"><svg lucideLockKeyhole /><input type="password" formControlName="password" placeholder="Crie uma senha" autocomplete="new-password" /></span></label>
                <label>Confirmar senha<span class="client-input"><svg lucideLockKeyhole /><input type="password" formControlName="passwordConfirmation" placeholder="Repita a senha" autocomplete="new-password" /></span></label>
              </div>
              <header class="client-address-heading"><span>Endereço</span><p>O CEP preenche rua, bairro, cidade e estado automaticamente.</p></header>
              <div class="admin-client-fields">
                <label class="field-wide">CEP<span class="client-input"><svg lucideMapPin /><input formControlName="zipCode" inputmode="numeric" maxlength="9" placeholder="00000-000" (input)="onAdminZipCodeInput($event)" /></span><small *ngIf="adminZipStatus()" [class.error]="adminZipFailed()">{{ adminZipStatus() }}</small></label>
                <label class="field-wide">Rua<span class="client-input"><svg lucideMapPin /><input formControlName="street" placeholder="Nome da rua" autocomplete="street-address" /></span></label>
                <label>Número<span class="client-input"><input formControlName="number" placeholder="123" /></span></label>
                <label>Complemento<span class="client-input"><input formControlName="complement" placeholder="Apto, bloco (opcional)" /></span></label>
                <label class="field-wide">Bairro<span class="client-input"><input formControlName="neighborhood" placeholder="Bairro" /></span></label>
                <label>Cidade<span class="client-input"><input formControlName="city" placeholder="Cidade" /></span></label>
                <label>Estado<span class="client-input"><input formControlName="state" maxlength="2" placeholder="UF" /></span></label>
              </div>
            </section>
            <div *ngIf="resource() !== 'residents'" class="admin-modal-fields">
            <ng-container *ngFor="let field of visibleFields()">
            <label [class.field-wide]="field.wide">{{ field.label }}
              <textarea *ngIf="field.type === 'textarea'" [formControlName]="field.key"></textarea>
              <app-searchable-select *ngIf="field.select === 'category'" [formControlName]="field.key" [items]="categories()" valueKey="id" labelKey="name" emptyLabel="Selecione" searchPlaceholder="Pesquisar categoria..." />
              <app-searchable-select *ngIf="field.select === 'condominium'" [formControlName]="field.key" [items]="condominiums()" valueKey="id" labelKey="name" emptyLabel="Selecione" searchPlaceholder="Pesquisar condomínio..." />
              <app-searchable-select *ngIf="field.select === 'options'" [formControlName]="field.key" [items]="field.options" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar opção..." />
              <app-searchable-select *ngIf="field.select === 'city'" [formControlName]="field.key" [items]="cities()" valueKey="name" labelKey="label" [emptyLabel]="loadingCities() ? 'Carregando cidades...' : 'Selecione a cidade'" searchPlaceholder="Pesquisar cidade..." />
              <app-searchable-select *ngIf="field.select === 'neighborhood' && neighborhoodOptions().length" [formControlName]="field.key" [items]="neighborhoodOptions()" emptyLabel="Selecione o bairro" searchPlaceholder="Pesquisar bairro..." />
              <input *ngIf="field.select === 'neighborhood' && !neighborhoodOptions().length" [formControlName]="field.key" [placeholder]="form.controls.city.value ? 'Digite o bairro' : 'Selecione a cidade primeiro'" />
              <input *ngIf="field.type !== 'textarea' && field.type !== 'checkbox' && !field.select" [type]="field.type ?? 'text'" [attr.inputmode]="field.type === 'tel' ? 'tel' : null" [attr.maxlength]="field.type === 'tel' ? 15 : null" [formControlName]="field.key" [appPhoneMask]="field.type === 'tel'" />
              <input *ngIf="field.type === 'checkbox'" type="checkbox" [formControlName]="field.key" />
            </label>
            <label *ngIf="field.key === 'phone' && resource() === 'professionals'" class="admin-same-whatsapp">
              <input type="checkbox" [checked]="sameWhatsapp()" (change)="toggleSameWhatsapp()" />
              WhatsApp é o mesmo número
            </label>
            </ng-container>
            </div>
            <section *ngIf="resource() === 'professionals'" class="admin-taxonomy-section">
              <h3>Categorias do profissional</h3>
              <p>Selecione uma ou mais categorias.</p>
              <div class="admin-check-grid"><label *ngFor="let category of categories()"><input type="checkbox" [checked]="selectedCategoryIds().includes(category.id)" (change)="toggleCategory(category.id)" />{{ category.name }}</label></div>
              <h3>Serviços realizados</h3>
              <p>São exibidos somente os serviços compatíveis com as categorias selecionadas.</p>
              <div *ngFor="let category of selectedCategories()" class="admin-service-group"><strong>{{ category.name }}</strong><div class="admin-check-grid"><label *ngFor="let service of category.services"><input type="checkbox" [checked]="selectedServiceIds().includes(service.id)" (change)="toggleService(service.id)" />{{ service.name }}</label></div></div>
            </section>
            <section *ngIf="resource() === 'condominiums'" class="professional-photo-field condominium-photo-field">
              <span>Foto do condomínio</span>
              <div class="professional-photo-preview" [class.empty]="!photoPreview()"><img [src]="photoPreview() || currentPhotoPlaceholder()" alt="Pré-visualização da foto" /></div>
              <label class="photo-upload-button">Selecionar foto<input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectPhoto($event)" /></label>
              <button *ngIf="photoPreview()" type="button" class="photo-remove-button" (click)="removePhoto()">Remover foto</button>
              <small>PNG, JPG ou WebP. Tamanho máximo de 5 MB.</small>
            </section>
            <section *ngIf="resource() === 'professionals'" class="professional-media-fields">
              <div class="professional-photo-field">
                <span>Foto de perfil</span>
                <div class="professional-photo-preview" [class.empty]="!photoPreview()"><img [src]="photoPreview() || photoPlaceholder('avatar')" alt="Pré-visualização da foto de perfil" /></div>
                <label class="photo-upload-button">Selecionar foto<input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectPhoto($event)" /></label>
                <button *ngIf="photoPreview()" type="button" class="photo-remove-button" (click)="removePhoto()">Remover foto</button>
                <small>PNG, JPG ou WebP. Máximo de 5 MB.</small>
              </div>
              <div class="professional-photo-field professional-cover-field">
                <span>Foto de capa do aplicativo</span>
                <div class="professional-photo-preview" [class.empty]="!coverPreview()"><img [src]="coverPreview() || photoPlaceholder('coverImage')" alt="Pré-visualização da foto de capa" /></div>
                <label class="photo-upload-button">Selecionar capa<input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectCover($event)" /></label>
                <button *ngIf="coverPreview()" type="button" class="photo-remove-button" (click)="removeCover()">Remover capa</button>
                <small>Exibida no topo do perfil. PNG, JPG ou WebP, até 5 MB.</small>
              </div>
              <div class="professional-portfolio-field">
                <div><strong>Portfólio de trabalhos</strong><small>Adicione até 10 fotos que serão exibidas no perfil do profissional.</small></div>
                <div *ngIf="portfolioPreviews().length" class="professional-portfolio-previews"><figure *ngFor="let preview of portfolioPreviews(); let index = index"><img [src]="preview" [alt]="'Foto do portfólio ' + (index + 1)" /><button type="button" (click)="removePortfolioPhoto(index)" [attr.aria-label]="'Remover foto ' + (index + 1)"><svg lucideX /></button></figure></div>
                <label class="photo-upload-button">Adicionar fotos<input type="file" multiple accept="image/png,image/jpeg,image/webp" (change)="selectPortfolioPhotos($event)" /></label>
                <small>PNG, JPG ou WebP. Até 10 MB por foto.</small>
              </div>
            </section>
            <div class="admin-editor-actions"><button type="button" class="secondary-button" (click)="closeEditor()">Cancelar</button><button type="submit" class="primary-button" [disabled]="saving()">{{ saving() ? 'Salvando...' : editingId() ? 'Salvar alterações' : 'Criar cadastro' }}</button></div>
          </form>
        </div>
    </main>
  `,
})
export class AdminCrudPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
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
  protected readonly adminZipStatus = signal('');
  protected readonly adminZipFailed = signal(false);
  protected readonly photoPreview = signal('');
  protected readonly coverPreview = signal('');
  protected readonly portfolioPreviews = signal<string[]>([]);
  protected readonly selectedCategoryIds = signal<string[]>([]);
  protected readonly selectedServiceIds = signal<string[]>([]);
  protected readonly categoryServices = signal<CategoryService[]>([]);
  protected readonly serviceEditorOpen = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly cities = signal<Array<{ name: string; label: string }>>([]);
  protected readonly loadingCities = signal(false);
  /** Acompanha a cidade escolhida para filtrar a lista de bairros. */
  protected readonly selectedCity = signal('');
  protected readonly neighborhoodOptions = computed(() => neighborhoodsForCity(this.selectedCity()));
  /** Na prática o WhatsApp do profissional é o mesmo telefone, então evitamos digitar duas vezes. */
  protected readonly sameWhatsapp = signal(true);
  protected readonly searchTerm = signal('');
  protected readonly filterValue = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected serviceAliasesText = '';
  protected serviceDraft: Partial<CategoryService> & { id?: string } = {};
  private selectedPhoto: File | null = null;
  private selectedCover: File | null = null;
  private selectedPortfolioPhotos: File[] = [];
  protected readonly form = this.fb.nonNullable.group({
    name: '', email: '', phone: '', address: '', city: '', state: 'MG', slug: '', icon: 'grid', categoryId: '', condominiumId: '', neighborhood: '', zipCode: '', street: '', number: '', complement: '', passwordConfirmation: '',
    password: '', companyName: '', whatsapp: '', instagram: '', bio: '', avatar: '', coverImage: '', description: '', displayOrder: 0,
    role: 'RESIDENT', approvalStatus: 'APPROVED', emailVerified: true, active: true, block: '', unit: '',
  });
  private readonly configs: Record<AdminResource, { title: string; fields: AdminField[]; columns: string[]; columnKeys: string[] }> = {
    condominiums: { title: 'Condomínios', fields: [{ key: 'name', label: 'Nome' }, { key: 'slug', label: 'Slug' }, { key: 'address', label: 'Endereço' }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'Estado' }, { key: 'neighborhood', label: 'Bairro' }, { key: 'phone', label: 'Telefone', type: 'tel' }, { key: 'email', label: 'E-mail', type: 'email' }], columns: ['Foto', 'Nome', 'Cidade', 'Estado', 'E-mail'], columnKeys: ['coverImage', 'name', 'city', 'state', 'email'] },
    residents: { title: 'Clientes', fields: [
      { key: 'name', label: 'Nome completo' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'Telefone (WhatsApp)', type: 'tel' },
      { key: 'password', label: 'Senha', type: 'password' }, { key: 'passwordConfirmation', label: 'Confirmar senha', type: 'password' },
      { key: 'zipCode', label: 'CEP' }, { key: 'street', label: 'Rua', wide: true }, { key: 'number', label: 'Número' }, { key: 'complement', label: 'Complemento' },
      { key: 'neighborhood', label: 'Bairro', wide: true }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'Estado' },
    ], columns: ['Nome', 'E-mail', 'Telefone', 'Perfil'], columnKeys: ['name', 'email', 'phone', 'role'] },
    users: { title: 'Usuários do sistema', fields: [
      { key: 'name', label: 'Nome completo' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'Telefone', type: 'tel' },
      { key: 'condominiumId', label: 'Condomínio', select: 'condominium' },
      { key: 'block', label: 'Bloco', hideForRoles: ['PROFESSIONAL', 'SUPER_ADMIN'] }, { key: 'unit', label: 'Unidade', hideForRoles: ['PROFESSIONAL', 'SUPER_ADMIN'] },
      { key: 'role', label: 'Perfil de acesso', select: 'options', options: [{ value: 'RESIDENT', label: 'Cliente' }, { value: 'PROFESSIONAL', label: 'Profissional' }, { value: 'CONDO_ADMIN', label: 'Administrador' }, { value: 'SUPER_ADMIN', label: 'Super administrador' }] },
      { key: 'approvalStatus', label: 'Aprovação', select: 'options', options: [{ value: 'PENDING', label: 'Pendente' }, { value: 'APPROVED', label: 'Aprovado' }, { value: 'REJECTED', label: 'Recusado' }] },
      { key: 'emailVerified', label: 'E-mail verificado', type: 'checkbox' }, { key: 'active', label: 'Usuário ativo', type: 'checkbox' },
      { key: 'password', label: 'Senha (deixe em branco para manter)', type: 'password' },
    ], columns: ['Nome', 'E-mail', 'Perfil', 'E-mail verificado', 'Aprovação', 'Ativo'], columnKeys: ['name', 'email', 'role', 'emailVerified', 'approvalStatus', 'active'] },
    professionals: { title: 'Profissionais', fields: [{ key: 'name', label: 'Nome' }, { key: 'companyName', label: 'Empresa' }, { key: 'phone', label: 'Telefone', type: 'tel' }, { key: 'whatsapp', label: 'WhatsApp', type: 'tel' }, { key: 'instagram', label: 'Instagram' }, { key: 'city', label: 'Cidade', select: 'city' }, { key: 'neighborhood', label: 'Bairro', select: 'neighborhood' }, { key: 'bio', label: 'Sobre o profissional', type: 'textarea' }], columns: ['Foto', 'Nome', 'Categoria', 'Cidade', 'WhatsApp'], columnKeys: ['avatar', 'name', 'category', 'city', 'whatsapp'] },
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
    this.loadCities();
    this.watchDependentFields();
    this.route.data.subscribe((data) => {
      const value = (data['resource'] ?? this.route.snapshot.paramMap.get('entity')) as AdminResource;
      this.resource.set(value in this.configs ? value : 'condominiums');
      this.newRecord(false);
      this.load();
    });
  }

  visibleFields(): AdminField[] {
    const role = String(this.form.controls.role.value ?? '');
    const espelhaWhatsapp = this.resource() === 'professionals' && this.sameWhatsapp();
    return this.config.fields.filter(
      (field) => !field.hideForRoles?.includes(role) && !(espelhaWhatsapp && field.key === 'whatsapp'),
    );
  }

  protected toggleSameWhatsapp() {
    const proximo = !this.sameWhatsapp();
    this.sameWhatsapp.set(proximo);
    if (proximo) this.form.controls.whatsapp.setValue(this.form.controls.phone.value ?? '');
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

  /** Mantém WhatsApp e bairro coerentes com o que foi digitado em telefone e cidade. */
  private watchDependentFields() {
    this.form.controls.phone.valueChanges.subscribe((phone) => {
      if (this.sameWhatsapp()) this.form.controls.whatsapp.setValue(phone ?? '', { emitEvent: false });
    });
    this.form.controls.city.valueChanges.subscribe((city) => {
      const cidade = city ?? '';
      if (cidade === this.selectedCity()) return;
      this.selectedCity.set(cidade);
      // Trocar de cidade invalida o bairro anterior, que pertencia a outra lista.
      if (this.form.controls.neighborhood.value) this.form.controls.neighborhood.setValue('', { emitEvent: false });
    });
  }

  value(record: Record<string, unknown>, key: string) {
    const value = record[key];
    if (key === 'role') return ({ RESIDENT: 'Cliente', CONDO_ADMIN: 'Administrador', SUPER_ADMIN: 'Super administrador' } as Record<string, string>)[String(value)] ?? String(value ?? '-');
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
    this.selectedCover = null;
    this.selectedPortfolioPhotos = [];
    this.photoPreview.set('');
    this.coverPreview.set('');
    this.portfolioPreviews.set([]);
    this.selectedCategoryIds.set([]);
    this.selectedServiceIds.set([]);
    this.categoryServices.set([]);
    this.form.reset({
      name: '', email: '', phone: '', address: '', city: '', state: 'MG', slug: '', icon: 'grid', categoryId: '', condominiumId: this.condominiums()[0]?.id ?? '',
      neighborhood: '', zipCode: '', street: '', number: '', complement: '', password: '', passwordConfirmation: '', companyName: '', whatsapp: '', instagram: '', bio: '', avatar: '', coverImage: '', description: '', displayOrder: 0,
      role: 'RESIDENT', approvalStatus: 'APPROVED', emailVerified: true, active: true, block: '', unit: '',
    });
    this.feedback.set('');
    this.hasError.set(false);
    this.adminZipStatus.set('');
    this.adminZipFailed.set(false);
    this.selectedCity.set('');
    this.sameWhatsapp.set(true);
    this.editorOpen.set(openEditor);
  }

  editRecord(record: Record<string, unknown>) {
    this.editingId.set(String(record['id']));
    this.form.patchValue(record as never);
    this.selectedCity.set(String(record['city'] ?? ''));
    // Só desmarca quando o cadastro realmente tem um WhatsApp diferente do telefone.
    const telefone = String(record['phone'] ?? '');
    const whatsapp = String(record['whatsapp'] ?? '');
    this.sameWhatsapp.set(!whatsapp || whatsapp === telefone);
    this.selectedPhoto = null;
    this.selectedCover = null;
    this.selectedPortfolioPhotos = [];
    const photoKey = this.resource() === 'condominiums' ? 'coverImage' : 'avatar';
    this.photoPreview.set(this.api.assetUrl(String(record[photoKey] ?? '')));
    this.coverPreview.set(this.resource() === 'professionals' ? this.api.assetUrl(String(record['coverImage'] ?? '')) : '');
    this.portfolioPreviews.set([]);
    this.adminZipStatus.set('');
    this.adminZipFailed.set(false);
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
    if (this.resource() === 'residents' && raw.password !== raw.passwordConfirmation) {
      this.feedback.set('A confirmação da senha não confere.');
      this.hasError.set(true);
      return;
    }
    if (this.resource() === 'residents' && !this.editingId() && (!raw.password || !raw.zipCode.trim() || !raw.street.trim() || !raw.number.trim() || !raw.neighborhood.trim() || !raw.city.trim() || !raw.state.trim())) {
      this.feedback.set('Preencha senha e todos os dados obrigatórios do endereço.');
      this.hasError.set(true);
      return;
    }
    const payload: Record<string, unknown> = Object.fromEntries(this.visibleFields().map((field) => [field.key, rawRecord[field.key]]));
    if (this.resource() === 'professionals') {
      payload['avatar'] = raw.avatar;
      payload['coverImage'] = raw.coverImage;
      // O campo fica oculto quando espelha o telefone, então não vem por visibleFields().
      if (this.sameWhatsapp()) payload['whatsapp'] = raw.phone;
    }
    if (this.resource() === 'condominiums') payload['coverImage'] = raw.coverImage;
    if (this.resource() === 'professionals') { payload['categoryIds'] = this.selectedCategoryIds(); payload['serviceIds'] = this.selectedServiceIds(); }
    this.saving.set(true);
    if (this.resource() === 'professionals') {
      const avatar$ = this.selectedPhoto ? this.api.uploadProfessionalPhoto(this.selectedPhoto).pipe(map(({ url }) => url)) : of(String(raw.avatar ?? ''));
      const cover$ = this.selectedCover ? this.api.uploadProfessionalPhoto(this.selectedCover).pipe(map(({ url }) => url)) : of(String(raw.coverImage ?? ''));
      const portfolio$ = this.selectedPortfolioPhotos.length ? this.api.uploadWorkPhotos(this.selectedPortfolioPhotos).pipe(map((images) => images)) : of([] as string[]);
      forkJoin({ avatar: avatar$, cover: cover$, portfolio: portfolio$ }).subscribe({
        next: ({ avatar, cover, portfolio }) => { payload['avatar'] = avatar; payload['coverImage'] = cover; payload['portfolioImages'] = portfolio; this.persist(payload); },
        error: () => { this.saving.set(false); this.feedback.set('Não foi possível enviar as imagens. Verifique o formato e o tamanho dos arquivos.'); this.hasError.set(true); },
      });
      return;
    }
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

  selectCover(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.feedback.set('A capa deve ser PNG, JPG ou WebP e ter no máximo 5 MB.');
      this.hasError.set(true);
      return;
    }
    this.selectedCover = file;
    this.coverPreview.set(URL.createObjectURL(file));
    this.feedback.set('');
    this.hasError.set(false);
  }

  removeCover() {
    this.selectedCover = null;
    this.coverPreview.set('');
    this.form.controls.coverImage.setValue('');
  }

  selectPortfolioPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const valid = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024);
    if (!valid.length) {
      this.feedback.set('Selecione fotos PNG, JPG ou WebP de até 10 MB.');
      this.hasError.set(true);
      return;
    }
    this.selectedPortfolioPhotos = [...this.selectedPortfolioPhotos, ...valid].slice(0, 10);
    this.portfolioPreviews.set(this.selectedPortfolioPhotos.map((file) => URL.createObjectURL(file)));
    this.feedback.set('');
    this.hasError.set(false);
  }

  removePortfolioPhoto(index: number) {
    this.selectedPortfolioPhotos = this.selectedPortfolioPhotos.filter((_file, position) => position !== index);
    this.portfolioPreviews.set(this.selectedPortfolioPhotos.map((file) => URL.createObjectURL(file)));
  }

  onAdminZipCodeInput(event: Event) {
    const zipCode = (event.target as HTMLInputElement).value;
    const digits = zipCode.replace(/\D/g, '');
    if (digits.length !== 8) {
      this.adminZipStatus.set('');
      this.adminZipFailed.set(false);
      return;
    }
    this.adminZipStatus.set('Buscando endereço...');
    this.adminZipFailed.set(false);
    fetchAddressByZipCode(this.http, digits).subscribe({
      next: (address) => {
        this.form.patchValue({
          street: address.street || this.form.controls.street.value,
          neighborhood: address.neighborhood || this.form.controls.neighborhood.value,
          city: address.city || this.form.controls.city.value,
          state: address.state || this.form.controls.state.value,
        });
        this.adminZipStatus.set('Endereço preenchido pelo CEP.');
      },
      error: () => {
        this.adminZipStatus.set('CEP não encontrado. Preencha o endereço manualmente.');
        this.adminZipFailed.set(true);
      },
    });
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
            <p class="admin-eyebrow">Gestão IndicaFácil</p>
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
