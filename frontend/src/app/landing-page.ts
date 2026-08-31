import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';
import {
  LucideArrowRight,
  LucideCheck,
  LucideCircleHelp,
  LucideClipboardList,
  LucideLink,
  LucideMapPinned,
  LucideMenu,
  LucideMessageCircle,
  LucidePhoneCall,
  LucideSearch,
  LucideShield,
  LucideSparkles,
  LucideStar,
  LucideUsersRound,
  LucideWaypoints,
  LucideX,
} from '@lucide/angular';
import { brand } from './brand';

@Component({
  selector: 'landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideArrowRight,
    LucideCheck,
    LucideCircleHelp,
    LucideClipboardList,
    LucideLink,
    LucideMapPinned,
    LucideMenu,
    LucideMessageCircle,
    LucidePhoneCall,
    LucideSearch,
    LucideShield,
    LucideSparkles,
    LucideStar,
    LucideUsersRound,
    LucideWaypoints,
    LucideX,
  ],
  template: `
    <main class="landing-page">
      <header class="landing-nav">
        <a class="landing-brand" routerLink="/" aria-label="IndicaFácil">
          <img [src]="brand.assets.logoPrimary" [alt]="brand.name" />
        </a>

        <nav aria-label="Navegação principal">
          <a *ngFor="let item of navItems" [href]="item.href">{{ item.label }}</a>
        </nav>

        <div class="landing-nav-actions">
          <a routerLink="/login" class="landing-login">Entrar</a>
          <a routerLink="/cadastro" class="landing-cta small">
            Criar minha conta
            <svg lucideArrowRight />
          </a>
        </div>

        <button class="landing-menu" type="button" aria-label="Abrir menu" (click)="mobileMenuOpen = true">
          <svg lucideMenu />
        </button>
      </header>

      <div *ngIf="mobileMenuOpen" class="landing-mobile-menu" (click)="mobileMenuOpen = false">
        <div class="landing-mobile-sheet" (click)="$event.stopPropagation()">
          <button type="button" aria-label="Fechar menu" (click)="mobileMenuOpen = false">
            <svg lucideX />
          </button>
          <a class="landing-brand mobile" routerLink="/" (click)="mobileMenuOpen = false">
            <img [src]="brand.assets.logoPrimary" [alt]="brand.name" />
          </a>
          <a *ngFor="let item of navItems" [href]="item.href" (click)="mobileMenuOpen = false">{{ item.label }}</a>
          <a routerLink="/login" (click)="mobileMenuOpen = false">Entrar</a>
          <a routerLink="/cadastro" class="landing-cta" (click)="mobileMenuOpen = false">
            Criar minha conta
            <svg lucideArrowRight />
          </a>
        </div>
      </div>

      <section class="landing-hero">
        <div class="landing-hero-copy">
          <span class="landing-kicker">
            <svg lucideShield />
            Profissionais avaliados e indicados por quem já contratou
          </span>

          <h1>Precisou?<br />Indica<span>Fácil.</span></h1>

          <p>
            Encontre o profissional certo para o que você precisa e fale direto com ele, pelo
            app ou pelo WhatsApp.
          </p>

          <div class="landing-hero-actions">
            <a routerLink="/cadastro" class="landing-cta">
              Preciso de um serviço
              <svg lucideArrowRight />
            </a>
            <a href="#profissionais" class="landing-outline">
              Sou profissional
              <svg lucideArrowRight />
            </a>
          </div>

          <a routerLink="/cadastro" class="landing-inline-cta">
            Criar minha conta
            <svg lucideArrowRight />
          </a>

          <div class="landing-trust" aria-label="Pontos de confiança">
            <span *ngFor="let item of trustItems">
              <ng-container [ngSwitch]="item.icon">
                <svg *ngSwitchCase="'star'" lucideStar></svg>
                <svg *ngSwitchCase="'clipboard-list'" lucideClipboardList></svg>
                <svg *ngSwitchCase="'sparkles'" lucideSparkles></svg>
                <svg *ngSwitchCase="'map-pinned'" lucideMapPinned></svg>
              </ng-container>
              {{ item.label }}
            </span>
          </div>
        </div>

        <div class="landing-hero-visual" aria-label="Prévia do aplicativo IndicaFácil">
          <div class="landing-orb orb-one"></div>
          <div class="landing-orb orb-two"></div>
          <div class="landing-orb orb-three"></div>

          <article class="phone-mock phone-home">
            <i></i>
            <small>Olá, Leonardo!</small>
            <em>Uberlândia, MG</em>
            <h3>Qual problema você <b>precisa resolver?</b></h3>
            <div class="phone-search">
              <svg lucideSearch />
              Descreva seu problema...
            </div>
            <strong>Categorias populares</strong>
            <div class="phone-categories">
              <span>Casa</span>
              <span>Instalações</span>
              <span>Limpeza</span>
              <span>Mais</span>
            </div>
            <div class="phone-request">
              Não sabe quem chamar?
              <button>Descrever problema</button>
              <small>A IA indica a categoria certa</small>
            </div>
          </article>

          <article class="phone-mock phone-proposals">
            <i></i>
            <h3>Quem atende perto</h3>
            <p><b>Ar-condicionado</b> no seu bairro</p>

            <div class="proposal-card">
              <span class="proposal-avatar first"></span>
              <div>
                <b>Clima Certo</b>
                <small>Ar-condicionado</small>
                <em>4,9 (120)</em>
                <strong>~1,2 km</strong>
              </div>
              <button>Ver perfil</button>
            </div>

            <div class="proposal-card muted">
              <span class="proposal-avatar second"></span>
              <div>
                <b>Ar Plus</b>
                <small>Ar-condicionado</small>
                <em>4,8 (89)</em>
                <strong>~2,4 km</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="landing-section landing-steps" id="como-funciona">
        <span class="section-eyebrow">Como funciona</span>
        <h2>Resolver ficou <span>mais fácil.</span></h2>
        <p class="section-intro">Em poucos passos você encontra a solução ideal para o seu problema.</p>

        <div class="steps-grid">
          <article *ngFor="let item of steps; let index = index">
            <i [ngSwitch]="item.icon">
              <svg *ngSwitchCase="'message-circle'" lucideMessageCircle></svg>
              <svg *ngSwitchCase="'search'" lucideSearch></svg>
              <svg *ngSwitchCase="'sparkles'" lucideSparkles></svg>
              <svg *ngSwitchCase="'check'" lucideCheck></svg>
            </i>
            <b>{{ index + 1 }}</b>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </section>

      <section class="landing-benefits" id="beneficios">
        <div class="benefits-copy">
          <span class="section-eyebrow">Benefícios</span>
          <h2>Mais confiança para escolher o <span>melhor profissional.</span></h2>
          <p>Compare avaliações, comentários e indicações antes de contratar.</p>

          <ul>
            <li *ngFor="let item of benefits">
              <svg lucideCheck />
              {{ item }}
            </li>
          </ul>
        </div>

        <div class="benefits-visual">
          <article class="profile-card">
            <header>
              <span class="profile-avatar"></span>
              <div>
                <b>Clima Certo</b>
                <small>Ar-condicionado</small>
              </div>
            </header>

            <div class="profile-meta">
              <span class="rating-pill">4,9 ★★★★★</span>
              <span>120 avaliações</span>
              <span>98 pessoas recomendam</span>
            </div>

            <div class="profile-details">
              <span><svg lucideMapPinned /> Atende Uberlândia e região</span>
              <span><svg lucideUsersRound /> Membro desde 2021</span>
            </div>

            <div class="profile-section">
              <strong>Sobre o profissional</strong>
              <p>Especialista em instalação e manutenção de ar-condicionado, com atendimento ágil e cuidadoso.</p>
            </div>

            <div class="profile-section">
              <strong>Serviços oferecidos</strong>
              <div class="profile-tags">
                <span>Instalação</span>
                <span>Limpeza</span>
                <span>Manutenção</span>
              </div>
            </div>

            <div class="profile-section">
              <strong>Avaliações dos clientes</strong>
              <div class="profile-score">
                <div>
                  <b>4,9</b>
                  <small>120 avaliações</small>
                </div>
                <div class="score-bars">
                  <span><i style="width: 90%"></i></span>
                  <span><i style="width: 31%"></i></span>
                  <span><i style="width: 12%"></i></span>
                  <span><i style="width: 6%"></i></span>
                </div>
              </div>
            </div>
          </article>

          <div class="benefits-badges">
            <span>Avaliações</span>
            <span>Comentários públicos</span>
            <span>Indicações</span>
          </div>
        </div>
      </section>

      <section class="landing-section landing-request-flow">
        <div class="request-flow-copy">
          <span class="section-eyebrow">Assistente de IA</span>
          <h2>Não sabe qual profissional <span>procurar?</span></h2>
          <p>Conte o que aconteceu com suas palavras. A IA identifica o serviço e mostra quem atende perto de você.</p>

          <div class="request-flow-steps">
            <span *ngFor="let item of requestFlow; let last = last">
              {{ item }}
              <i *ngIf="!last">→</i>
            </span>
          </div>

          <a routerLink="/cadastro" class="landing-cta">
            Criar minha conta
            <svg lucideArrowRight />
          </a>
        </div>

        <div class="request-flow-visual">
          <article class="proposal-showcase">
            <div class="proposal-showcase-header">
              <strong>Solicitação registrada</strong>
              <span>Instalação de ar-condicionado</span>
            </div>

            <ul>
              <li>
                <svg lucideCircleHelp />
                Descreva o problema
              </li>
              <li>
                <svg lucideClipboardList />
                Adicione fotos
              </li>
              <li>
                <svg lucideMapPinned />
                Informe sua região
              </li>
              <li>
                <svg lucideSearch />
                Veja quem atende
              </li>
            </ul>
          </article>

          <article class="request-floating-card">
            <span class="proposal-avatar first"></span>
            <div>
              <b>Eletricista</b>
              <small>Compare avaliações, comentários e indicações.</small>
            </div>
          </article>
        </div>
      </section>

      <section class="landing-professionals" id="profissionais">
        <div class="landing-professionals-copy">
          <span class="section-eyebrow dark">Para profissionais</span>
          <h2>Mais serviços,<br />mais clientes,<br /><span>mais crescimento.</span></h2>
          <p>Cadastre-se para ser encontrado por quem precisa do seu serviço na sua região.</p>

          <ul>
            <li *ngFor="let item of professionalBenefits">
              <svg lucideCheck />
              {{ item }}
            </li>
          </ul>

          <a routerLink="/cadastro" class="landing-white-cta">
            Quero me cadastrar
            <svg lucideArrowRight />
          </a>
        </div>

        <article class="professional-phone">
          <i></i>
          <h3>Mensagens</h3>
          <span>
            Instalação de ar-condicionado
            <small>Uberlândia, MG</small>
            <button>Responder</button>
          </span>
          <span>
            Limpeza de caixa d'água
            <small>Uberlândia, MG</small>
            <button>Responder</button>
          </span>
          <span>
            Manutenção elétrica
            <small>Uberlândia, MG</small>
            <button>Responder</button>
          </span>
        </article>

        <aside>
          <article *ngFor="let item of professionalHighlights">
            <div class="highlight-icon">
              <ng-container [ngSwitch]="item.icon">
                <svg *ngSwitchCase="'users-round'" lucideUsersRound></svg>
                <svg *ngSwitchCase="'waypoints'" lucideWaypoints></svg>
                <svg *ngSwitchCase="'shield'" lucideShield></svg>
              </ng-container>
            </div>
            <div>
              <b>{{ item.title }}</b>
              <span>{{ item.description }}</span>
            </div>
          </article>
        </aside>
      </section>

      <section class="landing-final">
        <div>
          <h2>Pronto para resolver? Comece agora mesmo!</h2>
          <p>Crie sua conta e encontre quem já foi indicado por outros clientes.</p>
        </div>

        <div class="landing-final-actions">
          <a href="#profissionais" class="landing-outline reverse">Sou profissional</a>
          <a routerLink="/cadastro" class="landing-cta">Preciso de um serviço <svg lucideArrowRight /></a>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="footer-brand">
          <img [src]="brand.assets.logoPrimary" [alt]="brand.name" />
          <p>Conectando clientes e profissionais de forma simples, rápida e transparente.</p>
        </div>

        <div>
          <b>Navegação</b>
          <a *ngFor="let item of navItems" [href]="item.href">{{ item.label }}</a>
        </div>

        <div>
          <b>Suporte</b>
          <a href="#">Central de ajuda</a>
          <a href="#">Fale conosco</a>
        </div>

        <div>
          <b>Empresa</b>
          <a href="#">Sobre</a>
          <a href="#">Termos de uso</a>
          <a href="#">Política de privacidade</a>
        </div>

        <div>
          <b>Siga-nos</b>
          <div class="footer-socials">
            <a href="#" aria-label="Instagram"><svg lucideMessageCircle /></a>
            <a href="#" aria-label="Facebook"><svg lucideUsersRound /></a>
            <a href="#" aria-label="WhatsApp"><svg lucidePhoneCall /></a>
            <a href="#" aria-label="LinkedIn"><svg lucideLink /></a>
          </div>
        </div>
      </footer>
    </main>
  `,
})
export class LandingPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly brand = brand;
  protected mobileMenuOpen = false;

  /**
   * A landing e a porta de entrada do site, mas nao do aplicativo instalado.
   * Quem abre o app pelo icone quer usar o produto, nao ler a apresentacao -
   * e se ja tem sessao, nao deve precisar entrar de novo.
   */
  ngOnInit() {
    const instalado =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (!instalado) return;
    const papel = this.auth.user()?.role;
    if (!this.auth.isAuthenticated() || !papel) {
      void this.router.navigateByUrl('/login');
      return;
    }
    void this.router.navigateByUrl(
      papel === 'PROFESSIONAL' ? '/profissional/perfil' : papel === 'RESIDENT' ? '/app/home' : '/admin/dashboard',
    );
  }

  protected readonly navItems = [
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Benefícios', href: '#beneficios' },
    { label: 'Para profissionais', href: '#profissionais' },
  ];

  protected readonly trustItems = [
    { label: 'Avaliações de clientes', icon: 'star' },
    { label: 'Comentários públicos', icon: 'clipboard-list' },
    { label: 'Indicações da comunidade', icon: 'sparkles' },
    { label: 'Busca por bairro e distância', icon: 'map-pinned' },
  ];

  protected readonly steps = [
    { icon: 'message-circle', title: 'Conte seu problema', description: 'Descreva o que você precisa resolver, com suas palavras.' },
    { icon: 'search', title: 'Veja quem atende', description: 'A busca mostra os profissionais da categoria perto de você.' },
    { icon: 'sparkles', title: 'Compare e escolha', description: 'Notas, comentários e indicações de outros clientes.' },
    { icon: 'check', title: 'Fale direto', description: 'Chame pelo WhatsApp, telefone ou mensagem no app.' },
  ];

  protected readonly benefits = [
    'Avaliações de clientes',
    'Comentários públicos',
    'Indicações da comunidade',
    'Distância aproximada até o profissional',
    'Serviços e especialidades no perfil',
    'Conversa pelo app ou pelo WhatsApp',
  ];

  protected readonly requestFlow = [
    'Descreva seu problema',
    'A IA identifica o serviço',
    'Veja quem atende perto',
    'Fale direto',
  ];

  protected readonly professionalBenefits = [
    'Apareça na busca da sua categoria',
    'Seja encontrado por bairro e distância',
    'Converse com clientes pelo app',
    'Organize seus serviços e horários',
    'Acompanhe suas avaliações',
    'Construa sua reputação',
  ];

  protected readonly professionalHighlights = [
    { icon: 'users-round', title: 'Perfil na busca', description: 'Apareça por categoria e proximidade' },
    { icon: 'waypoints', title: 'Conversa direta', description: 'O cliente fala com você pelo app ou WhatsApp' },
    { icon: 'shield', title: 'Reputação visível', description: 'Avaliações e histórico no perfil' },
  ];
}
