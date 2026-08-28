import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AppNotification, Category, Professional } from './models';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';
import { AuthService } from './services/auth.service';
import { buildPhoneLink, buildWhatsappLink } from './contact.util';
import { categoryAvatar } from './category-art.util';
import { brand } from './brand';
import {
  LucideBell,
  LucideBadgeCheck,
  LucideBriefcaseBusiness,
  LucideCirclePlus,
  LucideClipboardCheck,
  LucideEllipsis,
  LucideHeart,
  LucideHouse,
  LucideLayoutDashboard,
  LucideMapPin,
  LucideMenu,
  LucideMessageCircle,
  LucidePhone,
  LucideThumbsUp,
  LucideSearch,
  LucideSettings,
  LucideStar,
  LucideTag,
  LucideTriangleAlert,
  LucideUserRound,
  LucideUsersRound,
  LucideHandshake,
  LucideChartNoAxesColumn,
  LucideSparkles,
  LucideChevronDown,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideBell],
  template: `
    <header class="app-header" [class.compact]="compact">
      <button *ngIf="compact" class="header-back" type="button" aria-label="Voltar">‹</button>
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p *ngIf="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
      <button *ngIf="actionLabel" class="header-icon" type="button"><svg lucideBell /></button>
    </header>
  `,
})
export class AppHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actionLabel = '';
  @Input() compact = false;
}

@Component({
  selector: 'rating-stars',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="stars"><i *ngFor="let star of positions" [class.empty]="star > rating + 0.25" [class.half]="star > rating && star <= rating + 0.75">★</i></span>`,
})
export class RatingStarsComponent {
  @Input() rating = 5;
  protected readonly positions = [1, 2, 3, 4, 5];
}

@Component({
  selector: 'recommendation-badge',
  standalone: true,
  template: `<div class="badge">{{ text }}</div>`,
})
export class RecommendationBadgeComponent {
  @Input() text = '';
}

@Component({
  selector: 'category-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="category-card" [class.more]="category.slug === 'mais'" routerLink="/app/profissionais" [queryParams]="category.slug === 'mais' ? null : { categoria: category.slug }">
      <div class="category-icon">
        <img [src]="iconUrl" [alt]="category.name" />
      </div>
      <span>{{ category.name }}</span>
    </a>
  `,
})
export class CategoryCardComponent {
  @Input({ required: true }) category!: Category;

  private static readonly iconBySlug: Record<string, string> = {
    eletricista: '/assets/categories/electrician.png',
    encanador: '/assets/categories/handyman.png',
    pedreiro: '/assets/categories/plumber.png',
    pintor: '/assets/categories/painter.png',
    diarista: '/assets/categories/cleaner.png',
    'ar-condicionado': '/assets/categories/air-conditioner.png',
    jardineiro: '/assets/categories/gardening-flower.png',
    montador: '/assets/categories/furniture-assembly.svg',
    'montador-de-moveis': '/assets/categories/furniture-assembly.svg',
    chaveiro: '/assets/categories/locksmith.svg',
    informatica: '/assets/categories/computer.svg',
    mecanico: '/assets/categories/mechanic.svg',
    'marido-de-aluguel': '/assets/categories/handyman-tools.svg',
    piscineiro: '/assets/categories/pool.svg',
    dedetizacao: '/assets/categories/pest-control.svg',
    'energia-solar': '/assets/categories/solar-energy.svg',
    'cameras-seguranca': '/assets/categories/security-camera.svg',
    seguranca: '/assets/categories/security-camera.svg',
    outros: '/assets/categories/more.png',
    mais: '/assets/categories/more.png',
  };

  get iconUrl(): string {
    const mapped = CategoryCardComponent.iconBySlug[this.category.slug];
    if (mapped) return mapped;
    // categories created later fall back to the icon chosen in the admin
    const icon = (this.category.icon ?? '').trim();
    if (icon.startsWith('data:image/') || icon.startsWith('http') || icon.startsWith('/')) return icon;
    if (icon && icon !== 'grid') return `/assets/taxonomy-icons/${icon === 'sparkles' ? 'broom' : icon}.svg`;
    return CategoryCardComponent.iconBySlug['mais'];
  }
}

@Component({
  selector: 'professional-card',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingStarsComponent, LucideBadgeCheck, LucideHeart, LucideEllipsis, LucideMessageCircle, LucideMapPin, LucidePhone, LucideThumbsUp, LucideUsersRound],
  template: `
    <article class="professional-card" [class.highlight-professional-card]="highlight" [class.compact-card]="compact" [class.favorite-card]="mode === 'favorite'">
      <span *ngIf="highlight" class="recommended-badge"><svg lucideBadgeCheck />Recomendado</span>
      <div class="avatar" [class]="avatarClass">
        <img *ngIf="avatarUrl; else initialsTemplate" [src]="avatarUrl" [alt]="'Foto de ' + professional.name" (error)="$any($event.target).src='/assets/placeholders/default-avatar.svg'" />
        <ng-template #initialsTemplate>{{ initials }}</ng-template>
      </div>
      <div class="card-main">
        <div class="card-top">
          <h3><a *ngIf="mode === 'favorite'" [routerLink]="['/app/profissional', professional.id]">{{ professional.name }}</a><ng-container *ngIf="mode !== 'favorite'">{{ professional.name }}</ng-container></h3>
          <p>{{ professional.category }}</p>
        </div>
        <span *ngIf="distanceLabel" class="location-badge distance-badge"><svg lucideMapPin />{{ distanceLabel }}</span>
        <span *ngIf="!distanceLabel && professional.matchesLocation" class="location-badge"><svg lucideMapPin />Atende sua região</span>
        <div *ngIf="professional.rating > 0 && professional.reviewCount > 0; else noReviews" class="rating-line">
          <rating-stars [rating]="professional.rating" />
          <strong>{{ professional.rating | number: '1.1-1' }}</strong>
          <span>({{ professional.reviewCount }})</span>
        </div>
        <ng-template #noReviews><p class="professional-no-reviews">Ainda sem avaliações</p></ng-template>
        <div class="professional-social-proof" *ngIf="displayedRecommendationCount || professional.reviewCount; else firstRecommendation">
          <span *ngIf="displayedRecommendationCount"><svg lucideUsersRound />{{ displayedRecommendationCount }} pessoas recomendam</span>
          <a *ngIf="mode !== 'favorite' && professional.reviewCount" [routerLink]="['/app/profissional', professional.id, 'comentarios']"><svg lucideMessageCircle />{{ professional.reviewCount }} comentários públicos</a>
        </div>
        <ng-template #firstRecommendation><p class="professional-first-recommendation">Seja o primeiro a recomendar</p></ng-template>
      </div>
      <div class="professional-card-side">
        <div class="professional-card-icon-actions">
          <button *ngIf="compact" class="card-recommend-button" [class.active]="recommended()" type="button" [attr.aria-pressed]="recommended()" [attr.aria-label]="'Recomendar ' + professional.name" (click)="toggleRecommendation()"><svg lucideThumbsUp [attr.fill]="recommended() ? 'currentColor' : 'none'" /></button>
          <button *ngIf="!compact && mode !== 'favorite'" class="favorite-button" type="button" (click)="toggleFavorite()" [attr.aria-label]="'Favoritar ' + professional.name"><svg lucideHeart [attr.fill]="favorite() ? 'currentColor' : 'none'" /></button>
          <a [routerLink]="['/app/mensagens', professional.id]" class="card-whatsapp" [attr.aria-label]="'Enviar mensagem para ' + professional.name"><svg lucideMessageCircle /></a>
          <a [href]="phoneLink" class="card-phone" [attr.aria-label]="'Ligar para ' + professional.name"><svg lucidePhone /></a>
          <div *ngIf="mode === 'favorite'" class="card-menu-wrapper">
            <button class="more-button" type="button" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="'Mais opções para ' + professional.name" (click)="menuOpen.set(!menuOpen())"><svg lucideEllipsis /></button>
            <div *ngIf="menuOpen()" class="card-menu" role="menu">
              <a [routerLink]="['/app/profissional', professional.id]" role="menuitem">Ver perfil</a>
              <a [routerLink]="['/app/profissional', professional.id, 'comentarios']" role="menuitem">Ver comentários</a>
              <button type="button" role="menuitem" class="card-menu-danger" (click)="removeFromFavorites()">Remover dos favoritos</button>
            </div>
          </div>
        </div>
        <a *ngIf="mode !== 'favorite'" [routerLink]="['/app/profissional', professional.id]" class="card-profile-button">Ver perfil</a>
      </div>
    </article>
  `,
})
export class ProfessionalCardComponent {
  @Input({ required: true }) professional!: Professional;
  @Input() compact = false;
  @Input() highlight = false;
  @Input() mode: 'default' | 'favorite' = 'default';
  @Input() condominiumName = '';
  /** Distância aproximada em km; null quando o profissional não tem coordenada. */
  @Input() distanceKm: number | null = null;
  @Output() removed = new EventEmitter<string>();
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly favorite = signal(false);
  protected readonly recommended = signal(false);
  protected readonly menuOpen = signal(false);

  /**
   * A coordenada do profissional é o centro do bairro, não o endereço dele.
   * Por isso o "~": prometer "450 m" seria uma precisão que não temos.
   */
  protected get distanceLabel(): string {
    if (this.distanceKm === null || this.distanceKm === undefined) return '';
    if (this.distanceKm < 1) return `~${Math.round(this.distanceKm * 1000)} m`;
    return `~${this.distanceKm.toFixed(1).replace('.', ',')} km`;
  }
  private readonly recommendationCount = signal<number | null>(null);

  get initials(): string {
    return this.professional.name
      .split(' ')
      .slice(0, 2)
      .map((item) => item[0])
      .join('');
  }

  get avatarClass(): string {
    return `avatar avatar-${this.professional.id.replace(/[^a-z0-9]/gi, '')}`;
  }

  get avatarUrl(): string {
    return this.api.assetUrl(this.professional.avatar) || categoryAvatar(this.professional);
  }

  get displayedRecommendationCount(): number { return this.recommendationCount() ?? this.professional.recommendationCount; }

  get whatsappLink(): string {
    return buildWhatsappLink(this.professional, this.auth.user()?.name ?? '', this.condominiumName);
  }

  get phoneLink(): string {
    return buildPhoneLink(this.professional);
  }

  removeFromFavorites() {
    this.menuOpen.set(false);
    this.api.toggleFavorite(this.professional.id).subscribe({
      next: (result) => {
        if (!result.active) this.removed.emit(this.professional.id);
        this.toast.success('Profissional removido dos favoritos.');
      },
      error: () => this.toast.error('Não foi possível remover dos favoritos.'),
    });
  }

  toggleFavorite() {
    this.api.toggleFavorite(this.professional.id).subscribe({
      next: (result) => {
        this.favorite.set(result.active);
        this.toast.success(result.active ? 'Profissional adicionado aos favoritos.' : 'Profissional removido dos favoritos.');
      },
      error: () => this.toast.error('Não foi possível atualizar os favoritos.'),
    });
  }

  toggleRecommendation() {
    this.api.toggleRecommendation(this.professional.id).subscribe({
      next: (result) => {
        this.recommended.set(result.active);
        this.recommendationCount.set(result.recommendationCount);
        this.toast.success(result.active ? 'Sua recomendação foi registrada.' : 'Sua recomendação foi removida.');
      },
      error: () => this.toast.error('Não foi possível atualizar sua recomendação.'),
    });
  }
}

@Component({
  selector: 'mobile-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideMenu, LucideBell, LucideMapPin, LucideX, LucideHouse, LucideSearch, LucideHandshake, LucideHeart, LucideBriefcaseBusiness, LucideUserRound],
  template: `
    <div class="home-topbar">
      <button type="button" aria-label="Menu" [attr.aria-expanded]="menuOpen()" (click)="openMenu()"><svg lucideMenu /></button>
      <div class="home-topbar-title"><strong>Olá, {{ userName() }}! <span>👋</span></strong><small *ngIf="placeName()"><svg lucideMapPin />{{ placeName() }}</small></div>
      <button type="button" class="home-topbar-bell" aria-label="Notificações" [attr.aria-expanded]="notificationsOpen()" (click)="toggleNotifications()"><svg lucideBell /><i *ngIf="notifications()">{{ notifications() }}</i></button>
      <section *ngIf="notificationsOpen()" class="mobile-notifications" aria-label="Notificações">
        <header><strong>Notificações</strong><button type="button" aria-label="Fechar notificações" (click)="notificationsOpen.set(false)"><svg lucideX /></button></header>
        <p *ngIf="!notificationItems().length">Você não tem novas notificações.</p>
        <article *ngFor="let item of notificationItems()" [class.unread]="!item.readAt"><b>{{ item.title }}</b><span>{{ item.body }}</span><small>{{ item.createdAt | date:'dd/MM, HH:mm' }}</small></article>
      </section>
    </div>

    <div class="mobile-menu-backdrop" *ngIf="menuOpen()" (click)="closeMenu()">
      <aside class="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu principal" (click)="$event.stopPropagation()">
        <header class="mobile-drawer-header">
          <div class="mobile-drawer-brand">
            <img [src]="brand.assets.logoReverse" [alt]="brand.name" />
          </div>
          <button type="button" aria-label="Fechar menu" (click)="closeMenu()"><svg lucideX /></button>
        </header>

        <nav class="mobile-drawer-nav" aria-label="Navegação principal">
          <a routerLink="/app/home" (click)="closeMenu()"><svg lucideHouse /><span>Início</span></a>
          <a routerLink="/app/buscar" (click)="closeMenu()"><svg lucideSearch /><span>Buscar profissionais</span></a>
          <a routerLink="/app/solicitacoes" (click)="closeMenu()"><svg lucideClipboardCheck /><span>Minhas solicitações</span></a>
          <a routerLink="/app/indicar" (click)="closeMenu()"><svg lucideHandshake /><span>Indicar profissional</span></a>
          <a routerLink="/app/favoritos" (click)="closeMenu()"><svg lucideHeart /><span>Meus favoritos</span></a>
          <a routerLink="/app/minhas-indicacoes" (click)="closeMenu()"><svg lucideBriefcaseBusiness /><span>Minhas indicações</span></a>
          <a routerLink="/app/perfil" (click)="closeMenu()"><svg lucideUserRound /><span>Meu perfil</span></a>
        </nav>

        <button class="mobile-drawer-logout" type="button" (click)="logout()">Sair da conta</button>
      </aside>
    </div>
  `,
})
export class MobileTopbarComponent implements OnDestroy, OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Morador');
  protected readonly placeName = signal('');
  protected readonly notifications = signal(0);
  protected readonly notificationsOpen = signal(false);
  protected readonly notificationItems = signal<AppNotification[]>([]);
  protected readonly brand = brand;

  ngOnInit() {
    this.api.getCondominiums().subscribe({
      next: (condominiums) => {
        const mine = condominiums.find((item) => item.id === this.auth.user()?.condominiumId);
        this.placeName.set(mine?.name ?? condominiums[0]?.name ?? '');
      },
      error: () => this.placeName.set(''),
    });
    this.loadNotifications();
  }

  protected openMenu() {
    this.menuOpen.set(true);
    document.body.classList.add('mobile-menu-open');
  }

  protected closeMenu() {
    this.menuOpen.set(false);
    document.body.classList.remove('mobile-menu-open');
  }

  protected logout() {
    this.closeMenu();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  protected toggleNotifications() {
    const open = !this.notificationsOpen();
    this.notificationsOpen.set(open);
    if (!open) return;
    this.api.markNotificationsRead().subscribe({ next: (payload) => this.applyNotifications(payload) });
  }

  private loadNotifications() {
    this.api.getNotifications().subscribe({ next: (payload) => this.applyNotifications(payload) });
  }

  private applyNotifications(payload: { unreadCount: number; items: AppNotification[] }) {
    this.notifications.set(payload.unreadCount);
    this.notificationItems.set(payload.items);
  }

  @HostListener('window:keydown.escape')
  protected closeMenuWithEscape() {
    if (this.menuOpen()) this.closeMenu();
  }

  ngOnDestroy() {
    document.body.classList.remove('mobile-menu-open');
  }
}

@Component({
  selector: 'bottom-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideHouse, LucideSearch, LucideHeart, LucideUserRound],
  template: `
    <nav class="bottom-nav">
      <img class="desktop-brand-logo" [src]="brand.assets.logoPrimary" [alt]="brand.name" />
      <a routerLink="/app/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><b><svg lucideHouse /></b><span>Início</span></a>
      <a routerLink="/app/buscar" routerLinkActive="active"><b><svg lucideSearch /></b><span>Buscar</span></a>
      <a routerLink="/app/indicar" routerLinkActive="active" class="center-action"><b><img [src]="brand.assets.iconReverse" alt="" /></b><span>Indicar</span></a>
      <a routerLink="/app/favoritos" routerLinkActive="active"><b><svg lucideHeart /></b><span>Favoritos</span></a>
      <a routerLink="/app/perfil" routerLinkActive="active"><b><svg lucideUserRound /></b><span>Perfil</span></a>
    </nav>
  `,
})
export class BottomNavigationComponent { protected readonly brand = brand; }

@Component({
  selector: 'admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideLayoutDashboard, LucideClipboardCheck, LucideUserRound, LucideUsersRound, LucideBriefcaseBusiness, LucideTag, LucideStar, LucideHandshake, LucideTriangleAlert, LucideSettings, LucideChartNoAxesColumn, LucideSparkles],
  template: `
    <aside class="admin-sidebar">
      <div class="brand-card">
        <img class="admin-brand-logo" [src]="brand.assets.logoReverse" [alt]="brand.name" />
      </div>
      <span class="sidebar-group-label">Operação</span>
      <a routerLink="/admin/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><svg lucideLayoutDashboard /><span>Dashboard</span></a>
      <a *ngIf="isVisible('pendencias')" routerLink="/admin/pendencias" routerLinkActive="active"><svg lucideClipboardCheck /><span>Central de pendências</span><b *ngIf="totalNotificacoes() > 0" class="sidebar-count">{{ totalNotificacoes() }}</b></a>

      <span class="sidebar-group-label">Cadastros</span>
      <a *ngIf="isVisible('moradores')" routerLink="/admin/clientes" routerLinkActive="active"><svg lucideUserRound /><span>Clientes</span><b *ngIf="pendentes().newResidents > 0" class="sidebar-count">{{ pendentes().newResidents }}</b></a>
      <a *ngIf="isVisible('usuarios')" routerLink="/admin/usuarios" routerLinkActive="active"><svg lucideUsersRound /><span>Usuários</span></a>
      <a *ngIf="isVisible('profissionais')" routerLink="/admin/profissionais" routerLinkActive="active"><svg lucideBriefcaseBusiness /><span>Profissionais</span></a>
      <a *ngIf="isVisible('categorias')" routerLink="/admin/categorias" routerLinkActive="active"><svg lucideTag /><span>Categorias</span></a>

      <span class="sidebar-group-label">Moderação</span>
      <a *ngIf="isVisible('avaliacoes')" routerLink="/admin/avaliacoes" routerLinkActive="active"><svg lucideStar /><span>Avaliações</span></a>
      <a *ngIf="isVisible('indicacoes')" routerLink="/admin/indicacoes" routerLinkActive="active"><svg lucideHandshake /><span>Indicações</span></a>
      <a *ngIf="isVisible('denuncias')" routerLink="/admin/denuncias" routerLinkActive="active"><svg lucideTriangleAlert /><span>Denúncias</span><b *ngIf="pendentes().reports > 0" class="sidebar-count">{{ pendentes().reports }}</b></a>

      <span class="sidebar-group-label">Sistema</span>
      <a *ngIf="isVisible('configuracoes')" routerLink="/admin/configuracoes" routerLinkActive="active"><svg lucideSettings /><span>Configurações</span></a>
      <a *ngIf="isVisible('inteligencia-artificial')" routerLink="/admin/inteligencia-artificial" routerLinkActive="active"><svg lucideSparkles /><span>Inteligência Artificial</span></a>
      <a *ngIf="isVisible('relatorios')" routerLink="/admin/relatorios" routerLinkActive="active"><svg lucideChartNoAxesColumn /><span>Relatórios</span></a>

    </aside>
  `,
})
export class AdminSidebarComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Administrador');
  protected readonly roleLabel = computed(() => (this.auth.user()?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrador do condomínio'));

  protected readonly pendentes = signal<{ newResidents: number; reports: number }>({ newResidents: 0, reports: 0 });
  protected readonly totalNotificacoes = computed(() => this.pendentes().newResidents + this.pendentes().reports);
  protected readonly modulosRestritos = signal<string[]>([]);
  protected readonly brand = brand;
  private intervalo?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.carregarPendencias();
    this.intervalo = setInterval(() => this.carregarPendencias(), 60_000);
    if (this.auth.user()?.role !== 'SUPER_ADMIN') {
      this.api.getAdminSettings().subscribe({
        next: (settings) => this.modulosRestritos.set(Array.isArray(settings['restrictedModules']) ? (settings['restrictedModules'] as string[]) : []),
        error: () => undefined,
      });
    }
  }

  protected isVisible(chave: string): boolean {
    return chave === 'dashboard' || !this.modulosRestritos().includes(chave);
  }

  ngOnDestroy() {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  private carregarPendencias() {
    this.api.getDashboard().subscribe({
      next: (dashboard) => this.pendentes.set(dashboard.pending),
      error: () => undefined,
    });
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}

@Component({
  selector: 'admin-top-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideBell, LucideChevronDown],
  template: `
    <header class="admin-global-topbar">
      <div class="admin-global-topbar-spacer"></div>
      <div class="admin-top-notifications">
        <button type="button" class="admin-top-bell" aria-label="Notificações" [attr.aria-expanded]="open()" (click)="toggle($event)"><svg lucideBell /><i *ngIf="total()">{{ total() }}</i></button>
        <section *ngIf="open()" class="admin-top-notification-panel" (click)="$event.stopPropagation()">
          <header><strong>Notificações</strong><span *ngIf="total()">{{ total() }} pendente{{ total() === 1 ? '' : 's' }}</span></header>
          <a *ngIf="pending().newResidents" routerLink="/admin/clientes" (click)="open.set(false)"><b>{{ pending().newResidents }}</b><span>{{ pending().newResidents === 1 ? 'cliente aguardando aprovação' : 'clientes aguardando aprovação' }}</span></a>
          <a *ngIf="pending().reports" routerLink="/admin/denuncias" (click)="open.set(false)"><b>{{ pending().reports }}</b><span>{{ pending().reports === 1 ? 'denúncia pendente' : 'denúncias pendentes' }}</span></a>
          <p *ngIf="!total()">Nenhuma pendência no momento.</p>
          <a routerLink="/admin/pendencias" class="admin-top-notification-footer" (click)="open.set(false)">Ver central de pendências</a>
        </section>
      </div>
      <button type="button" class="admin-top-user" [attr.aria-expanded]="userMenuOpen()" (click)="toggleUserMenu($event)"><img src="/assets/placeholders/default-avatar.svg" alt="" /><span><b>{{ userName() }}</b><small>{{ roleLabel() }}</small></span><svg lucideChevronDown /></button>
      <section *ngIf="userMenuOpen()" class="admin-user-menu" (click)="$event.stopPropagation()"><a routerLink="/admin/perfil" (click)="userMenuOpen.set(false)">Perfil</a><button type="button" (click)="logout()">Sair</button></section>
    </header>
  `,
})
export class AdminTopMenuComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Administrador');
  protected readonly roleLabel = computed(() => this.auth.user()?.role === 'SUPER_ADMIN' ? 'Super admin' : 'Administrador');
  protected readonly pending = signal<{ newResidents: number; reports: number }>({ newResidents: 0, reports: 0 });
  protected readonly total = computed(() => this.pending().newResidents + this.pending().reports);
  protected readonly open = signal(false);
  protected readonly userMenuOpen = signal(false);
  private interval?: ReturnType<typeof setInterval>;

  ngOnInit() { this.load(); this.interval = setInterval(() => this.load(), 60_000); }
  ngOnDestroy() { if (this.interval) clearInterval(this.interval); }
  protected toggle(event: Event) { event.stopPropagation(); this.userMenuOpen.set(false); this.open.set(!this.open()); }
  protected toggleUserMenu(event: Event) { event.stopPropagation(); this.open.set(false); this.userMenuOpen.set(!this.userMenuOpen()); }
  protected logout() { this.auth.logout(); void this.router.navigateByUrl('/admin/login'); }
  @HostListener('document:click') protected close() { this.open.set(false); this.userMenuOpen.set(false); }
  private load() { this.api.getDashboard().subscribe({ next: (dashboard) => this.pending.set(dashboard.pending), error: () => undefined }); }
}
