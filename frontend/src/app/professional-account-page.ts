import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  LucideAtSign,
  LucideBriefcaseBusiness,
  LucideCalendarCheck,
  LucideCamera,
  LucideCheckCircle2,
  LucideChevronDown,
  LucideChevronRight,
  LucideEllipsisVertical,
  LucideClock,
  LucideEye,
  LucideFileCheck,
  LucideFileText,
  LucideHeart,
  LucideImagePlus,
  LucideInfo,
  LucideKeyRound,
  LucideLayoutGrid,
  LucideLogOut,
  LucideMail,
  LucideMapPin,
  LucideMessageCircle,
  LucideMessageSquare,
  LucidePencil,
  LucideShare2,
  LucideStar,
  LucideTrash2,
  LucideUserRound,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { Category, CategoryService, Professional, ProfessionalDashboard, ProfessionalWork } from './models';
import { PhoneMaskDirective } from './phone-mask.directive';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'professional-account-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PhoneMaskDirective,
    LucideAtSign,
    LucideBriefcaseBusiness,
    LucideCalendarCheck,
    LucideCamera,
    LucideCheckCircle2,
    LucideChevronDown,
    LucideChevronRight,
    LucideEllipsisVertical,
    LucideClock,
    LucideEye,
    LucideFileCheck,
    LucideFileText,
    LucideHeart,
    LucideImagePlus,
    LucideInfo,
    LucideKeyRound,
    LucideLayoutGrid,
    LucideLogOut,
    LucideMail,
    LucideMapPin,
    LucideMessageCircle,
    LucideMessageSquare,
    LucidePencil,
    LucideShare2,
    LucideStar,
    LucideTrash2,
    LucideUserRound,
    LucideUsers,
    LucideX,
  ],
  template: `
    <section class="mobile-page provider-page">
      <header class="provider-topbar">
        <div class="provider-topbar-identity"><small>Área do profissional</small><h1>{{ professional()?.name || 'Meu perfil' }}</h1></div>
        <div class="provider-topbar-menu">
          <button type="button" aria-label="Opções da conta" [attr.aria-expanded]="menuAberto()" (click)="menuAberto.set(!menuAberto())"><svg lucideEllipsisVertical /></button>
          <div class="provider-menu" *ngIf="menuAberto()">
            <button type="button" (click)="abrirTrocaDeSenha()"><svg lucideKeyRound />Alterar senha</button>
            <button type="button" class="sair" (click)="logout()"><svg lucideLogOut />Sair</button>
          </div>
        </div>
      </header>

      <div *ngIf="loading()" class="provider-loading">Carregando seu perfil...</div>

      <div *ngIf="!loading() && loadError()" class="provider-loading">
        <p>{{ loadError() }}</p>
      </div>

      <ng-container *ngIf="!loading() && !loadError() && professional() as profile">
        <!-- Enquanto aguarda liberação, o profissional precisa saber em que pé
             está e o que falta, em vez de estranhar não aparecer nas buscas. -->
        <!-- Estado do cadastro: dinamico, com icone, indicador e seta. -->
        <button type="button" class="provider-status" [class]="'provider-status ' + statusTone()" (click)="mostrarPendencias()">
          <span class="provider-status-icon"><svg lucideFileCheck /><i></i></span>
          <span class="provider-status-text">
            <strong>{{ statusTitle() }}</strong>
            <small>{{ statusDescription() }}</small>
          </span>
          <svg lucideChevronRight />
        </button>

        <!-- Identidade: capa, foto sobreposta, nome, especialidade e local. -->
        <section class="provider-identity">
          <div class="provider-identity-cover" [style.background-image]="coverBackground()">
            <label class="provider-cover-button"><svg lucideImagePlus />{{ coverPreview() || profile.coverImage ? 'Trocar capa' : 'Adicionar capa' }}<input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectCover($event)" /></label>
          </div>
          <div class="provider-identity-body">
            <div class="provider-photo">
              <img *ngIf="photoPreview() || profile.avatar" [src]="photoPreview() || assetUrl(profile.avatar)" alt="Foto do perfil" />
              <span *ngIf="!photoPreview() && !profile.avatar">{{ initials() }}</span>
              <label aria-label="Trocar foto"><svg lucideCamera /><input type="file" accept="image/png,image/jpeg,image/webp" (change)="selectPhoto($event)" /></label>
            </div>
            <div class="provider-identity-text">
              <h2>{{ profile.name }}</h2>
              <p *ngIf="specialty()"><svg lucideBriefcaseBusiness />{{ specialty() }}</p>
              <p *ngIf="localizacao()"><svg lucideMapPin />{{ localizacao() }}</p>
            </div>
            <button type="button" class="provider-edit-button" (click)="scrollToForm()"><svg lucidePencil />Editar perfil</button>
          </div>
        </section>

        <!-- Metricas reais do banco. Sem dado, aparece 0. -->
        <section class="provider-metrics-strip" *ngIf="dashboard() as painel">
          <div><svg lucideStar class="metric-star" /><strong>{{ painel.metrics.rating | number: '1.1-1' }}</strong><small>Nota</small></div>
          <div><svg lucideMessageSquare /><strong>{{ painel.metrics.reviews }}</strong><small>Avaliações</small></div>
          <div><svg lucideUsers /><strong>{{ painel.metrics.recommendations }}</strong><small>Indicações</small></div>
          <div><svg lucideHeart class="metric-heart" /><strong>{{ painel.metrics.favorites }}</strong><small>Favoritos</small></div>
          <div><svg lucideEye class="metric-eye" /><strong>{{ painel.metrics.views }}</strong><small>Visualizações</small></div>
        </section>

        <section class="provider-block" *ngIf="dashboard() as painel">
          <header class="provider-block-header">
            <h2>Visão geral</h2>
            <button type="button" class="provider-block-link" (click)="mostrarPendencias()">{{ pendenciasVisiveis() ? 'Ocultar' : 'Ver tudo' }}<svg lucideChevronRight /></button>
          </header>
          <div class="provider-overview-grid">
            <button type="button" class="provider-overview-card mensagens" (click)="abrirMensagens()">
              <span class="provider-overview-badge" *ngIf="painel.overview.unreadMessages">{{ painel.overview.unreadMessages }}</span>
              <svg lucideMail />
              <strong>Novas mensagens</strong>
              <small>{{ painel.overview.unreadMessages ? painel.overview.unreadMessages + ' não lidas' : 'Nenhuma não lida' }}</small>
            </button>
            <button type="button" class="provider-overview-card solicitacoes" (click)="abrirSolicitacoes()">
              <span class="provider-overview-badge alerta" *ngIf="painel.overview.pendingRequests">{{ painel.overview.pendingRequests }}</span>
              <svg lucideFileText />
              <strong>Solicitações abertas</strong>
              <small>{{ painel.overview.pendingRequests ? 'Nas suas categorias' : 'Nenhuma no momento' }}</small>
            </button>
            <button type="button" class="provider-overview-card completude" (click)="mostrarPendencias()">
              <span class="provider-progress">{{ painel.overview.profileCompletion }}%</span>
              <strong>Perfil completo</strong>
              <small>{{ textoDaCompletude(painel.overview) }}</small>
            </button>
            <button type="button" class="provider-overview-card disponibilidade" (click)="scrollToHours()">
              <svg lucideCalendarCheck />
              <strong>{{ painel.overview.availableToday ? 'Disponível hoje' : 'Atendimento hoje' }}</strong>
              <small>{{ painel.overview.availabilityText }}</small>
            </button>
          </div>
          <div class="provider-pending" *ngIf="pendenciasVisiveis()">
            <div *ngIf="painel.overview.missingProfileItems.length; else perfilCompleto">
              <strong>Falta preencher para chegar a 100%</strong>
              <ul>
                <li *ngFor="let item of painel.overview.missingProfileItems">{{ item }}</li>
              </ul>
              <button type="button" (click)="scrollToForm()">Completar agora</button>
            </div>
            <ng-template #perfilCompleto>
              <strong>Seu perfil está completo.</strong>
              <p>Mantenha suas fotos e horários atualizados para continuar aparecendo bem nas buscas.</p>
            </ng-template>
          </div>
        </section>

        <section class="provider-block provider-works">
          <header class="provider-block-header">
            <h2>Meus trabalhos</h2>
            <a *ngIf="professional() as perfil" [routerLink]="['/app/profissional', perfil.id]">Ver tudo</a>
          </header>
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

        <!-- So quantidade e iniciais: o app nao guarda foto de cliente, e nome
             completo, telefone ou e-mail nao tem por que aparecer aqui. -->
        <div class="provider-summary-pair" *ngIf="dashboard() as painel">
          <section class="provider-block provider-mini">
            <header class="provider-block-header">
              <h2><svg lucideHeart />Clientes que favoritaram você</h2>
              <a *ngIf="painel.favoriteClients.total" routerLink="/profissional/favoritos">Ver todos</a>
            </header>
            <div class="provider-favorites" *ngIf="painel.favoriteClients.total; else semFavoritos">
              <div class="provider-favorite-avatars">
                <span *ngFor="let cliente of painel.favoriteClients.preview">{{ cliente.initial }}</span>
                <span class="mais" *ngIf="painel.favoriteClients.total > painel.favoriteClients.preview.length">+{{ painel.favoriteClients.total - painel.favoriteClients.preview.length }}</span>
              </div>
              <div>
                <strong>{{ painel.favoriteClients.total }} {{ painel.favoriteClients.total === 1 ? 'cliente salvou' : 'clientes salvaram' }} seu perfil</strong>
                <p>Mostre seu trabalho e conquiste ainda mais clientes.</p>
              </div>
            </div>
            <ng-template #semFavoritos>
              <p class="provider-empty">Ninguém favoritou seu perfil ainda. Publique fotos dos seus trabalhos para aparecer melhor.</p>
            </ng-template>
          </section>

          <section class="provider-block provider-mini">
            <header class="provider-block-header">
              <h2><svg lucideStar />Avaliações recentes</h2>
              <a *ngIf="painel.recentReviews.length" routerLink="/profissional/avaliacoes">Ver todas</a>
            </header>
            <div class="provider-reviews" *ngIf="painel.recentReviews.length; else semAvaliacoes">
              <article *ngFor="let review of painel.recentReviews">
                <header>
                  <span class="provider-review-avatar">{{ review.author.charAt(0) }}</span>
                  <div>
                    <strong>{{ review.author }}</strong>
                    <div class="provider-review-stars"><svg lucideStar *ngFor="let estrela of estrelasDe(review.rating)" /></div>
                  </div>
                  <b>{{ review.rating | number: '1.1-1' }}</b>
                </header>
                <p>{{ review.comment }}</p>
                <time>{{ review.createdAt | date: 'dd/MM/yyyy' }}</time>
              </article>
            </div>
            <ng-template #semAvaliacoes>
              <p class="provider-empty">Ainda não há avaliações. As avaliações dos seus clientes aparecerão aqui depois dos serviços realizados.</p>
            </ng-template>
          </section>
        </div>

        <section class="provider-shortcuts">
          <button type="button" (click)="compartilharPerfil()">
            <svg lucideShare2 /><strong>Compartilhar perfil</strong><small>Divulgue para mais clientes</small>
          </button>
          <button type="button" (click)="abrirWhatsapp()">
            <svg lucideMessageCircle /><strong>WhatsApp</strong><small>{{ form.controls.whatsapp.value ? 'Fale com clientes' : 'Configurar número' }}</small>
          </button>
          <button type="button" (click)="scrollToHours()">
            <svg lucideCalendarCheck /><strong>Disponibilidade</strong><small>Gerencie seus horários</small>
          </button>
        </section>

        <form [formGroup]="form" class="provider-sections" (ngSubmit)="save()">
          <!-- Cada bloco abre e fecha: a tela abre no painel, nao num formulario longo. -->
          <section class="provider-accordion" [class.open]="secaoAberta() === 'dados'">
            <button type="button" class="provider-accordion-head" [attr.aria-expanded]="secaoAberta() === 'dados'" (click)="alternarSecao('dados')">
              <span class="provider-accordion-icon"><svg lucideUserRound /></span>
              <span class="provider-accordion-title">
                <strong #formAnchor>Dados do perfil</strong>
                <small>Nome, empresa, contato e localização</small>
              </span>
              <svg lucideChevronDown class="provider-accordion-chevron" />
            </button>
            <div class="provider-accordion-body" *ngIf="secaoAberta() === 'dados'">
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
            </div>
          </section>

          <section class="provider-accordion" [class.open]="secaoAberta() === 'categorias'">
            <button type="button" class="provider-accordion-head" [attr.aria-expanded]="secaoAberta() === 'categorias'" (click)="alternarSecao('categorias')">
              <span class="provider-accordion-icon"><svg lucideLayoutGrid /></span>
              <span class="provider-accordion-title">
                <strong>Categorias e serviços</strong>
                <small>{{ resumoCategorias() }}</small>
              </span>
              <svg lucideChevronDown class="provider-accordion-chevron" />
            </button>
            <div class="provider-accordion-body" *ngIf="secaoAberta() === 'categorias'">
              <p class="provider-hint">Escolha em quais categorias você quer aparecer.</p>
              <div class="provider-chips">
                <button *ngFor="let category of categories()" type="button" [class.active]="selectedCategoryIds().includes(category.id)" (click)="toggleCategory(category.id)">
                  <svg *ngIf="selectedCategoryIds().includes(category.id)" lucideCheckCircle2 />{{ category.name }}
                </button>
              </div>
              <ng-container *ngIf="availableServices().length">
                <p class="provider-hint provider-hint-spaced">Serviços que você faz.</p>
                <div class="provider-chips">
                  <button *ngFor="let service of availableServices()" type="button" [class.active]="selectedServiceIds().includes(service.id)" (click)="toggleService(service.id)">
                    <svg *ngIf="selectedServiceIds().includes(service.id)" lucideCheckCircle2 />{{ service.name }}
                  </button>
                </div>
              </ng-container>
            </div>
          </section>

          <section class="provider-accordion" [class.open]="secaoAberta() === 'jornada'">
            <button type="button" class="provider-accordion-head" [attr.aria-expanded]="secaoAberta() === 'jornada'" (click)="alternarSecao('jornada')">
              <span class="provider-accordion-icon"><svg lucideClock /></span>
              <span class="provider-accordion-title">
                <strong #jornadaAnchor>Disponibilidade</strong>
                <small>{{ resumoJornada() }}</small>
              </span>
              <svg lucideChevronDown class="provider-accordion-chevron" />
            </button>
            <div class="provider-accordion-body" *ngIf="secaoAberta() === 'jornada'">
              <p class="provider-hint">Os horários em que você atende. É o que aparece como "Atendimento hoje" no seu painel.</p>
              <div class="provider-hours" *ngFor="let bloco of workingHours(); let indice = index">
                <div class="provider-hours-days">
                  <button *ngFor="let dia of diasDaSemana" type="button" [class.active]="bloco.days.includes(dia.value)" (click)="toggleDia(indice, dia.value)">{{ dia.label }}</button>
                </div>
                <div class="provider-hours-range">
                  <label><span>Início</span><input type="time" [value]="bloco.start" (change)="setHora(indice, 'start', $event)" /></label>
                  <label><span>Fim</span><input type="time" [value]="bloco.end" (change)="setHora(indice, 'end', $event)" /></label>
                  <button *ngIf="workingHours().length > 1" type="button" class="provider-hours-remove" aria-label="Remover horário" (click)="removerBloco(indice)"><svg lucideTrash2 /></button>
                </div>
              </div>
              <button type="button" class="provider-hours-add" (click)="adicionarBloco()">Adicionar outro horário</button>
            </div>
          </section>

          <section class="provider-accordion" [class.open]="secaoAberta() === 'sobre'">
            <button type="button" class="provider-accordion-head" [attr.aria-expanded]="secaoAberta() === 'sobre'" (click)="alternarSecao('sobre')">
              <span class="provider-accordion-icon"><svg lucideInfo /></span>
              <span class="provider-accordion-title">
                <strong>Sobre o trabalho</strong>
                <small>Experiência, especialidades e diferenciais</small>
              </span>
              <svg lucideChevronDown class="provider-accordion-chevron" />
            </button>
            <div class="provider-accordion-body" *ngIf="secaoAberta() === 'sobre'">
              <label><span>Sobre o seu trabalho</span><textarea formControlName="bio" maxlength="600" placeholder="Conte sua experiência, especialidades e diferenciais"></textarea></label>
            </div>
          </section>

          <section class="provider-accordion" [class.open]="secaoAberta() === 'redes'">
            <button type="button" class="provider-accordion-head" [attr.aria-expanded]="secaoAberta() === 'redes'" (click)="alternarSecao('redes')">
              <span class="provider-accordion-icon"><svg lucideAtSign /></span>
              <span class="provider-accordion-title">
                <strong>Redes sociais</strong>
                <small>{{ resumoRedes() }}</small>
              </span>
              <svg lucideChevronDown class="provider-accordion-chevron" />
            </button>
            <div class="provider-accordion-body" *ngIf="secaoAberta() === 'redes'">
              <label><span>Instagram</span><input formControlName="instagram" placeholder="@seuperfil" /></label>
            </div>
          </section>

          <p *ngIf="feedback()" class="form-feedback" [class.error]="hasError()">{{ feedback() }}</p>
          <button class="primary-button full-width" type="submit" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar perfil' }}</button>
        </form>
      </ng-container>

      <!-- Reaproveita o endpoint de troca de senha que ja existe no sistema. -->
      <div class="provider-modal-backdrop" *ngIf="senhaAberta()" (click)="fecharTrocaDeSenha()">
        <form class="provider-modal" (click)="$event.stopPropagation()" (ngSubmit)="trocarSenha()">
          <header>
            <div><h2>Alterar senha</h2><p>Use uma senha com pelo menos 6 caracteres.</p></div>
            <button type="button" aria-label="Fechar" (click)="fecharTrocaDeSenha()"><svg lucideX /></button>
          </header>
          <label><span>Senha atual</span><input type="password" autocomplete="current-password" [(ngModel)]="senhaAtual" name="senhaAtual" /></label>
          <label><span>Nova senha</span><input type="password" autocomplete="new-password" [(ngModel)]="senhaNova" name="senhaNova" /></label>
          <label><span>Confirmar nova senha</span><input type="password" autocomplete="new-password" [(ngModel)]="senhaConfirmacao" name="senhaConfirmacao" /></label>
          <p class="form-feedback error" *ngIf="senhaErro()">{{ senhaErro() }}</p>
          <button class="primary-button full-width" type="submit" [disabled]="salvandoSenha()">{{ salvandoSenha() ? 'Atualizando...' : 'Atualizar senha' }}</button>
        </form>
      </div>
    </section>
  `,
})
export class ProfessionalAccountPageComponent implements OnInit {
  /** Sem isto o menu ficaria aberto ao tocar em qualquer outro lugar da tela. */
  @HostListener('document:click', ['$event'])
  protected fecharMenuAoClicarFora(evento: Event) {
    const alvo = evento.target as HTMLElement | null;
    if (this.menuAberto() && !alvo?.closest('.provider-topbar-menu')) this.menuAberto.set(false);
  }

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly professional = signal<Professional | null>(null);
  protected readonly dashboard = signal<ProfessionalDashboard | null>(null);
  protected readonly pendenciasVisiveis = signal(false);
  /** Vazio = tudo recolhido. Só uma seção fica aberta por vez. */
  protected readonly secaoAberta = signal('');
  protected readonly menuAberto = signal(false);
  protected readonly senhaAberta = signal(false);
  protected readonly salvandoSenha = signal(false);
  protected readonly senhaErro = signal('');
  protected senhaAtual = '';
  protected senhaNova = '';
  protected senhaConfirmacao = '';
  protected readonly workingHours = signal<Array<{ days: number[]; start: string; end: string }>>([]);
  @ViewChild('formAnchor') private formAnchor?: ElementRef<HTMLElement>;
  @ViewChild('jornadaAnchor') private jornadaAnchor?: ElementRef<HTMLElement>;
  protected readonly diasDaSemana = [
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' },
  ];
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

  protected readonly specialty = computed(() => this.dashboard()?.profile.specialty ?? '');
  protected readonly localizacao = computed(() => {
    const perfil = this.dashboard()?.profile ?? this.professional();
    if (!perfil) return '';
    return [perfil.neighborhood, perfil.city].filter(Boolean).join(', ');
  });

  /** Estado do cadastro em uma frase, sempre a partir do que está no banco. */
  protected readonly statusTitle = computed(() => {
    const perfil = this.professional();
    if (!perfil) return '';
    if (perfil.approvalStatus === 'REJECTED') return 'Cadastro não aprovado';
    if (perfil.approvalStatus === 'PENDING') return 'Seu cadastro está em análise';
    if (perfil.active === false) return 'Seu perfil está suspenso';
    return 'Seu perfil está ativo';
  });
  protected readonly statusDescription = computed(() => {
    const perfil = this.professional();
    if (!perfil) return '';
    if (perfil.approvalStatus === 'REJECTED') return 'A administração não liberou este cadastro. Fale com o suporte para entender o motivo.';
    if (perfil.approvalStatus === 'PENDING') {
      return perfil.profileComplete
        ? 'Enviamos para a administração aprovar. Assim que for liberado, você passa a aparecer nas buscas do aplicativo.'
        : 'Para entrar na fila de aprovação, complete os serviços que você realiza e a sua jornada de atendimento.';
    }
    if (perfil.active === false) return 'Seu perfil não aparece nas buscas no momento. Fale com a administração.';
    return 'Você aparece nas buscas do aplicativo. Mantenha suas fotos e horários em dia.';
  });
  protected readonly statusTone = computed(() => {
    const perfil = this.professional();
    if (!perfil) return 'neutro';
    if (perfil.approvalStatus === 'REJECTED' || perfil.active === false) return 'recusado';
    if (perfil.approvalStatus === 'PENDING') return 'analise';
    return 'ativo';
  });

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

  /** Evita "Falta pouco!" quando ainda falta muito. */
  protected textoDaCompletude(overview: { profileCompletion: number; missingProfileItems: string[] }) {
    if (overview.profileCompletion === 100) return 'Tudo preenchido';
    const faltam = overview.missingProfileItems.length;
    if (overview.profileCompletion >= 80) return 'Falta pouco!';
    return faltam === 1 ? '1 item pendente' : `${faltam} itens pendentes`;
  }

  protected alternarSecao(secao: string) {
    this.secaoAberta.update((atual) => (atual === secao ? '' : secao));
  }

  /** Resumos do cabeçalho fechado: dizem o que há dentro sem precisar abrir. */
  protected resumoCategorias() {
    const nomes = this.categories()
      .filter((categoria) => this.selectedCategoryIds().includes(categoria.id))
      .map((categoria) => categoria.name);
    if (!nomes.length) return 'Nenhuma categoria selecionada';
    const servicos = this.selectedServiceIds().length;
    const rotulo = servicos === 1 ? '1 serviço selecionado' : `${servicos} serviços selecionados`;
    return `${nomes.join(', ')} • ${servicos ? rotulo : 'nenhum serviço selecionado'}`;
  }

  protected resumoJornada() {
    const blocos = this.workingHours().filter((bloco) => bloco.days.length && bloco.start && bloco.end);
    if (!blocos.length) return 'Sem horário definido';
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return blocos
      .map((bloco) => {
        const dias = [...bloco.days].sort((esquerda, direita) => ((esquerda + 6) % 7) - ((direita + 6) % 7));
        // Dias seguidos viram intervalo ("Seg a Sex"); o resto fica listado.
        const seguidos = dias.every((dia, indice) => indice === 0 || (dia + 6) % 7 === (dias[indice - 1] + 6) % 7 + 1);
        const rotuloDias = seguidos && dias.length > 2 ? `${nomes[dias[0]]} a ${nomes[dias[dias.length - 1]]}` : dias.map((dia) => nomes[dia]).join(', ');
        return `${rotuloDias} • ${bloco.start} às ${bloco.end}`;
      })
      .join(' | ');
  }

  protected resumoRedes() {
    const instagram = (this.form.controls.instagram.value ?? '').trim();
    return instagram ? `Instagram • ${instagram.startsWith('@') ? instagram : '@' + instagram}` : 'Nenhuma rede cadastrada';
  }

  protected estrelasDe(nota: number) {
    return Array.from({ length: Math.max(0, Math.min(5, Math.round(nota))) });
  }

  protected mostrarPendencias() {
    this.pendenciasVisiveis.update((visivel) => !visivel);
  }

  /** Abre a seção antes de rolar: fechada, não haveria o que mostrar. */
  protected scrollToForm() {
    this.secaoAberta.set('dados');
    setTimeout(() => this.formAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  protected scrollToHours() {
    this.secaoAberta.set('jornada');
    setTimeout(() => this.jornadaAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  protected abrirMensagens() {
    const total = this.dashboard()?.overview.unreadMessages ?? 0;
    this.toast.info(
      total
        ? `Você tem ${total} ${total === 1 ? 'mensagem não lida' : 'mensagens não lidas'}. Elas chegam pela conversa que o cliente abre no seu perfil.`
        : 'Nenhuma mensagem não lida no momento.',
    );
  }

  /**
   * O contador é real (pedidos abertos nas categorias dele), mas o envio da
   * solicitação ao profissional ainda não existe. O texto diz isso em vez de
   * sugerir que há orçamento esperando resposta.
   */
  protected abrirSolicitacoes() {
    const total = this.dashboard()?.overview.pendingRequests ?? 0;
    this.toast.info(
      total
        ? `${total} ${total === 1 ? 'cliente descreveu' : 'clientes descreveram'} um problema nas suas categorias. As solicitações ainda não são enviadas aos profissionais: os clientes chegam até você pelo seu perfil, WhatsApp ou mensagem no app.`
        : 'Nenhuma solicitação aberta nas suas categorias agora.',
    );
  }

  /** Compartilha pelo app quando o navegador permite; senão copia o link. */
  protected async compartilharPerfil() {
    const id = this.professional()?.id;
    if (!id) return;
    const url = `${window.location.origin}/app/profissional/${id}`;
    const dados = { title: this.professional()?.name ?? 'Meu perfil', text: 'Veja meu perfil no IndicaFácil', url };
    try {
      if (navigator.share) {
        await navigator.share(dados);
        return;
      }
      await navigator.clipboard.writeText(url);
      this.toast.success('Link do seu perfil copiado.');
    } catch {
      // Cancelar o compartilhamento não é erro; só avisamos quando nada funcionou.
      if (!navigator.share) this.toast.error('Não foi possível copiar o link.');
    }
  }

  protected abrirWhatsapp() {
    const numero = (this.form.controls.whatsapp.value ?? '').replace(/\D/g, '');
    if (!numero) {
      this.toast.info('Cadastre seu WhatsApp nos dados do perfil.');
      this.scrollToForm();
      return;
    }
    window.open(`https://wa.me/55${numero}`, '_blank', 'noopener');
  }

  protected toggleDia(indice: number, dia: number) {
    this.workingHours.update((blocos) =>
      blocos.map((bloco, posicao) =>
        posicao === indice
          ? { ...bloco, days: bloco.days.includes(dia) ? bloco.days.filter((item) => item !== dia) : [...bloco.days, dia].sort() }
          : bloco,
      ),
    );
  }

  protected setHora(indice: number, campo: 'start' | 'end', evento: Event) {
    const valor = (evento.target as HTMLInputElement).value;
    this.workingHours.update((blocos) => blocos.map((bloco, posicao) => (posicao === indice ? { ...bloco, [campo]: valor } : bloco)));
  }

  protected adicionarBloco() {
    this.workingHours.update((blocos) => [...blocos, { days: [6], start: '08:00', end: '12:00' }]);
  }

  protected removerBloco(indice: number) {
    this.workingHours.update((blocos) => blocos.filter((_, posicao) => posicao !== indice));
  }

  protected abrirTrocaDeSenha() {
    this.menuAberto.set(false);
    this.senhaErro.set('');
    this.senhaAtual = '';
    this.senhaNova = '';
    this.senhaConfirmacao = '';
    this.senhaAberta.set(true);
  }

  protected fecharTrocaDeSenha() {
    this.senhaAberta.set(false);
  }

  protected trocarSenha() {
    if (this.senhaNova.length < 6) {
      this.senhaErro.set('A nova senha precisa de pelo menos 6 caracteres.');
      return;
    }
    if (this.senhaNova !== this.senhaConfirmacao) {
      this.senhaErro.set('A confirmação da nova senha não confere.');
      return;
    }
    this.senhaErro.set('');
    this.salvandoSenha.set(true);
    this.api.changeMyPassword(this.senhaAtual, this.senhaNova).subscribe({
      next: () => {
        this.salvandoSenha.set(false);
        this.senhaAberta.set(false);
        this.toast.success('Senha atualizada.');
      },
      error: (erro: { error?: { message?: string } }) => {
        this.salvandoSenha.set(false);
        this.senhaErro.set(erro.error?.message ?? 'Não foi possível atualizar a senha.');
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
      // Blocos incompletos não vão para o banco: sem dia ou com fim antes do
      // início, o horário não diz nada útil para o cliente.
      workingHours: this.workingHours().filter((bloco) => bloco.days.length && bloco.start && bloco.end && bloco.start < bloco.end),
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
        this.carregarPainel();
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.loadError.set(error.error?.message ?? 'Não encontramos um perfil profissional para esta conta.');
      },
    });
  }

  /** O painel é complementar: se falhar, a tela de edição continua inteira. */
  private carregarPainel() {
    this.api.getProfessionalDashboard().subscribe({
      next: (painel) => this.dashboard.set(painel),
      error: () => this.dashboard.set(null),
    });
  }

  private applyProfile(professional: Professional) {
    this.professional.set(professional);
    const jornada = professional.workingHours ?? [];
    this.workingHours.set(jornada.length ? jornada.map((bloco) => ({ ...bloco })) : [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }]);
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
