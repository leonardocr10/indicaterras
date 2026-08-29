import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { LucideCamera, LucideCheckCircle2, LucideImagePlus, LucideLogOut, LucideStar, LucideTrash2, LucideTriangleAlert } from '@lucide/angular';
import { Category, CategoryService, Professional, ProfessionalWork } from './models';
import { PhoneMaskDirective } from './phone-mask.directive';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'professional-account-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneMaskDirective, LucideCamera, LucideCheckCircle2, LucideImagePlus, LucideLogOut, LucideStar, LucideTrash2, LucideTriangleAlert],
  template: `
    <section class="mobile-page provider-page">
      <header class="provider-topbar">
        <div><small>Área do profissional</small><h1>{{ professional()?.name || 'Meu perfil' }}</h1></div>
        <button type="button" aria-label="Sair da conta" (click)="logout()"><svg lucideLogOut /></button>
      </header>

      <div *ngIf="loading()" class="provider-loading">Carregando seu perfil...</div>

      <div *ngIf="!loading() && loadError()" class="provider-loading">
        <p>{{ loadError() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !loadError() && professional() as profile">
        <!-- Enquanto aguarda liberação, o profissional precisa saber em que pé
             está e o que falta, em vez de estranhar não aparecer nas buscas. -->
        <div *ngIf="profile.approvalStatus === 'PENDING'" class="provider-approval">
          <strong>Seu cadastro está em análise</strong>
          <p *ngIf="profile.profileComplete">Enviamos para a administração aprovar. Assim que for liberado, você passa a aparecer nas buscas do aplicativo.</p>
          <p *ngIf="!profile.profileComplete">Para entrar na fila de aprovação, complete os serviços que você realiza e a sua jornada de atendimento abaixo.</p>
        </div>
        <div *ngIf="profile.approvalStatus === 'REJECTED'" class="provider-approval rejected">
          <strong>Cadastro não aprovado</strong>
          <p>A administração não liberou este cadastro. Fale com o suporte para entender o motivo.</p>
        </div>

        <div *ngIf="missingMedia().length" class="provider-onboarding">
          <svg lucideTriangleAlert />
          <div>
            <strong>Complete seu perfil</strong>
            <p>Falta {{ missingMedia().join(' e ') }}. Perfis completos aparecem melhor para os clientes.</p>
          </div>
        </div>

        <section class="provider-cover" [style.background-image]="coverBackground()">
          <label class="provider-cover-button"><svg lucideImagePlus />{{ coverPreview() || profile.coverImage ? 'Trocar capa' : 'Adicionar capa' }}<input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectCover($event)" /></label>
        </section>

        <section class="provider-summary">
          <div class="provider-photo">
            <img *ngIf="photoPreview() || profile.avatar" [src]="photoPreview() || assetUrl(profile.avatar)" alt="Foto do perfil" />
            <span *ngIf="!photoPreview() && !profile.avatar">{{ initials() }}</span>
            <label aria-label="Trocar foto"><svg lucideCamera /><input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectPhoto($event)" /></label>
          </div>
          <div class="provider-metrics">
            <div><svg lucideStar /><strong>{{ profile.rating | number: '1.1-1' }}</strong><small>Nota</small></div>
            <div><strong>{{ profile.reviewCount }}</strong><small>Avaliações</small></div>
            <div><strong>{{ profile.recommendationCount }}</strong><small>Indicações</small></div>
          </div>
        </section>

        <section class="provider-form provider-works">
          <h2>Meus trabalhos</h2>
          <p class="provider-hint">Publique fotos dos serviços que você já fez. Elas aparecem no seu perfil para os clientes.</p>
          <div *ngIf="works().length" class="provider-work-grid">
            <figure *ngFor="let work of works()">
              <img [src]="assetUrl(work.image)" [alt]="work.title || 'Trabalho publicado'" />
              <button type="button" [attr.aria-label]="'Remover trabalho'" (click)="removeWork(work)"><svg lucideTrash2 /></button>
            </figure>
          </div>
          <p *ngIf="!works().length" class="provider-empty">Você ainda não publicou nenhum trabalho.</p>
          <label class="provider-work-button" [class.disabled]="uploadingWorks()">
            <svg lucideImagePlus />{{ uploadingWorks() ? 'Enviando...' : 'Publicar fotos de trabalhos' }}
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" [disabled]="uploadingWorks()" (change)="publishWorks($event)" />
          </label>
        </section>

        <form [formGroup]="form" class="stack-form provider-form" (ngSubmit)="save()">
          <h2>Dados do perfil</h2>
          <label><span>Nome <i>*</i></span><input formControlName="name" placeholder="Como você aparece no app" /></label>
          <label><span>Empresa</span><input formControlName="companyName" placeholder="Nome da empresa (opcional)" /></label>
          <div class="grid-2">
            <label><span>Telefone <i>*</i></span><input type="tel" inputmode="tel" maxlength="15" formControlName="phone" appPhoneMask /></label>
            <label><span>WhatsApp</span><input type="tel" inputmode="tel" maxlength="15" formControlName="whatsapp" appPhoneMask /></label>
          </div>
          <div class="grid-2">
            <label><span>Cidade <i>*</i></span><input formControlName="city" /></label>
            <label><span>Bairro</span><input formControlName="neighborhood" /></label>
          </div>
          <label><span>Instagram</span><input formControlName="instagram" placeholder="@seuperfil" /></label>
          <label><span>Sobre o seu trabalho</span><textarea formControlName="bio" maxlength="600" placeholder="Conte sua experiência, especialidades e diferenciais"></textarea></label>

          <h2>Categorias</h2>
          <p class="provider-hint">Escolha em quais categorias você quer aparecer.</p>
          <div class="provider-chips">
            <button *ngFor="let category of categories()" type="button" [class.active]="selectedCategoryIds().includes(category.id)" (click)="toggleCategory(category.id)">
              <svg *ngIf="selectedCategoryIds().includes(category.id)" lucideCheckCircle2 />{{ category.name }}
            </button>
          </div>

          <ng-container *ngIf="availableServices().length">
            <h2>Serviços que você faz</h2>
            <div class="provider-chips">
              <button *ngFor="let service of availableServices()" type="button" [class.active]="selectedServiceIds().includes(service.id)" (click)="toggleService(service.id)">
                <svg *ngIf="selectedServiceIds().includes(service.id)" lucideCheckCircle2 />{{ service.name }}
              </button>
            </div>
          </ng-container>

          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
          <button class="primary-button full-width" type="submit" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar perfil' }}</button>
        </form>
      </ng-container>
    </section>
  `,
})
export class ProfessionalAccountPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly professional = signal<Professional | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryIds = signal<string[]>([]);
  protected readonly selectedServiceIds = signal<string[]>([]);
  protected readonly photoPreview = signal('');
  protected readonly coverPreview = signal('');
  protected readonly works = signal<ProfessionalWork[]>([]);
  protected readonly uploadingWorks = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly feedback = signal('');
  protected readonly hasError = signal(false);
  private selectedPhoto: File | null = null;
  private selectedCover: File | null = null;

  protected readonly availableServices = computed<CategoryService[]>(() =>
    this.categories()
      .filter((category) => this.selectedCategoryIds().includes(category.id))
      .flatMap((category) => category.services ?? []),
  );
  protected readonly missingMedia = computed(() => {
    const profile = this.professional();
    const missing: string[] = [];
    if (!profile?.avatar && !this.photoPreview()) missing.push('sua foto de perfil');
    if (!profile?.coverImage && !this.coverPreview()) missing.push('a foto de capa');
    return missing;
  });
  protected readonly initials = computed(() =>
    (this.professional()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    companyName: [''],
    phone: ['', Validators.required],
    whatsapp: [''],
    city: ['', Validators.required],
    neighborhood: [''],
    instagram: [''],
    bio: [''],
  });

  ngOnInit() {
    this.api.getCategories().subscribe((categories) => this.categories.set(categories));
    this.load();
  }

  protected assetUrl(path: string) {
    return this.api.assetUrl(path);
  }

  protected toggleCategory(id: string) {
    this.selectedCategoryIds.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
    const allowed = new Set(this.availableServices().map((service) => service.id));
    this.selectedServiceIds.update((ids) => ids.filter((serviceId) => allowed.has(serviceId)));
  }

  protected toggleService(id: string) {
    this.selectedServiceIds.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  protected selectPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.feedback.set('A foto deve ser PNG, JPG ou WebP e ter no máximo 5 MB.');
      this.hasError.set(true);
      return;
    }
    if (this.photoPreview()) URL.revokeObjectURL(this.photoPreview());
    this.selectedPhoto = file;
    this.photoPreview.set(URL.createObjectURL(file));
    this.feedback.set('');
    this.hasError.set(false);
  }

  protected coverBackground() {
    const cover = this.coverPreview() || this.assetUrl(this.professional()?.coverImage ?? '');
    return cover ? `linear-gradient(180deg, rgba(4,32,22,.12), rgba(4,32,22,.42)), url(${cover})` : '';
  }

  protected selectCover(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.feedback.set('A capa deve ser PNG, JPG ou WebP e ter no máximo 5 MB.');
      this.hasError.set(true);
      return;
    }
    if (this.coverPreview()) URL.revokeObjectURL(this.coverPreview());
    this.selectedCover = file;
    this.coverPreview.set(URL.createObjectURL(file));
    this.feedback.set('Capa selecionada. Toque em salvar para publicar.');
    this.hasError.set(false);
  }

  protected publishWorks(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    input.value = '';
    if (!files.length) return;
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      this.feedback.set('Cada foto pode ter no máximo 10 MB.');
      this.hasError.set(true);
      return;
    }
    this.uploadingWorks.set(true);
    this.api.uploadWorkPhotos(files.slice(0, 10)).pipe(switchMap((images) => this.api.addOwnProfessionalWorks(images))).subscribe({
      next: (works) => {
        this.works.set(works);
        this.uploadingWorks.set(false);
        this.feedback.set('Trabalhos publicados.');
        this.hasError.set(false);
        this.toast.success('Trabalhos publicados no seu perfil.');
      },
      error: () => {
        this.uploadingWorks.set(false);
        this.feedback.set('Não foi possível publicar as fotos.');
        this.hasError.set(true);
      },
    });
  }

  protected removeWork(work: ProfessionalWork) {
    this.api.removeOwnProfessionalWork(work.id).subscribe({
      next: (works) => this.works.set(works),
      error: () => this.toast.error('Não foi possível remover este trabalho.'),
    });
  }

  protected save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Preencha nome, telefone e cidade.');
      this.hasError.set(true);
      return;
    }
    if (!this.selectedCategoryIds().length) {
      this.feedback.set('Escolha ao menos uma categoria.');
      this.hasError.set(true);
      return;
    }
    this.saving.set(true);
    const photo$ = this.selectedPhoto ? this.api.uploadProfessionalPhoto(this.selectedPhoto).pipe(map((result) => result.url)) : of('');
    const cover$ = this.selectedCover ? this.api.uploadProfessionalPhoto(this.selectedCover).pipe(map((result) => result.url)) : of('');
    forkJoin([photo$, cover$]).subscribe({
      next: ([avatar, cover]) => this.persist(avatar, cover),
      error: () => {
        this.saving.set(false);
        this.feedback.set('Não foi possível enviar as imagens. Tente outro arquivo.');
        this.hasError.set(true);
      },
    });
  }

  protected logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private persist(avatar?: string, cover?: string) {
    const payload: Record<string, unknown> = {
      ...this.form.getRawValue(),
      categoryIds: this.selectedCategoryIds(),
      serviceIds: this.selectedServiceIds(),
    };
    if (avatar) payload['avatar'] = avatar;
    if (cover) payload['coverImage'] = cover;
    this.api.updateOwnProfessional(payload).subscribe({
      next: (professional) => {
        this.saving.set(false);
        this.selectedPhoto = null;
        this.selectedCover = null;
        this.applyProfile(professional);
        this.feedback.set('Perfil atualizado.');
        this.hasError.set(false);
        this.toast.success('Perfil atualizado com sucesso.');
      },
      error: (error: { error?: { message?: string | string[] } }) => {
        this.saving.set(false);
        const message = error.error?.message;
        const text = Array.isArray(message) ? message.join(', ') : message ?? 'Não foi possível salvar o perfil.';
        this.feedback.set(text);
        this.hasError.set(true);
        this.toast.error(text);
      },
    });
  }

  private load() {
    this.loading.set(true);
    this.api.getOwnProfessional().subscribe({
      next: (professional) => {
        this.applyProfile(professional);
        this.loadError.set('');
        this.loading.set(false);
        this.api.getProfessionalWorks(professional.id).subscribe({
          next: (works) => this.works.set(works),
          error: () => this.works.set([]),
        });
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.loadError.set(error.error?.message ?? 'Não encontramos um perfil profissional para esta conta.');
      },
    });
  }

  private applyProfile(professional: Professional) {
    this.professional.set(professional);
    this.form.patchValue({
      name: professional.name ?? '',
      companyName: professional.companyName ?? '',
      phone: professional.phone ?? '',
      whatsapp: professional.whatsapp ?? '',
      city: professional.city ?? '',
      neighborhood: professional.neighborhood ?? '',
      instagram: professional.instagram ?? '',
      bio: professional.bio ?? '',
    });
    this.selectedCategoryIds.set(professional.categoryIds ?? []);
    this.selectedServiceIds.set(professional.serviceIds ?? []);
    if (this.photoPreview()) {
      URL.revokeObjectURL(this.photoPreview());
      this.photoPreview.set('');
    }
    if (this.coverPreview()) {
      URL.revokeObjectURL(this.coverPreview());
      this.coverPreview.set('');
    }
  }
}
