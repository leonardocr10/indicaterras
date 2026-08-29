import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';
import {
  LucideArrowRight,
  LucideCheck,
  LucideCircleHelp,
  LucideClipboardList,
  LucideHeadset,
  LucideLink,
  LucideMapPinned,
  LucideMenu,
  LucideMessageCircle,
  LucideMessagesSquare,
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
    LucideHeadset,
    LucideLink,
    LucideMapPinned,
    LucideMenu,
    LucideMessageCircle,
    LucideMessagesSquare,
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
            Quero receber propostas
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
            Quero receber propostas
            <svg lucideArrowRight />
          </a>
        </div>
      </div>

      <section class="landing-hero">
        <div class="landing-hero-copy">
          <span class="landing-kicker">
            <svg lucideShield />
            Milhares de clientes conectados aos melhores profissionais
          </span>

          <h1>Precisou?<br />Indica<span>Fácil.</span></h1>

          <p>
            Encontre profissionais para resolver o que você precisa ou receba propostas de quem
            pode ajudar.
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
            Quero receber propostas
            <svg lucideArrowRight />
          </a>

          <div class="landing-trust" aria-label="Pontos de confiança">
            <span *ngFor="let item of trustItems">
              <ng-container [ngSwitch]="item.icon">
                <svg *ngSwitchCase="'star'" lucideStar></svg>
                <svg *ngSwitchCase="'clipboard-list'" lucideClipboardList></svg>
                <svg *ngSwitchCase="'sparkles'" lucideSparkles></svg>
                <svg *ngSwitchCase="'headset'" lucideHeadset></svg>
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
              Quero receber propostas
              <button>Começar agora</button>
              <small>É rápido e gratuito</small>
            </div>
          </article>

          <article class="phone-mock phone-proposals">
            <i></i>
            <h3>Propostas recebidas</h3>
            <p><b>5 propostas</b> para sua solicitação</p>

            <div class="proposal-card">
              <span class="proposal-avatar first"></span>
              <div>
                <b>Clima Certo</b>
                <small>Instalações</small>
                <em>4,9 (120)</em>
                <strong>R$ 250,00</strong>
              </div>
              <button>Aceitar proposta</button>
            </div>

            <div class="proposal-card muted">
              <span class="proposal-avatar second"></span>
              <div>
                <b>Ar Plus</b>
                <small>Instalações</small>
                <em>4,8 (89)</em>
                <strong>R$ 230,00</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="landing-stats" aria-label="Números da plataforma">
        <article *ngFor="let item of stats">
          <div class="stats-icon">
            <ng-container [ngSwitch]="item.icon">
              <svg *ngSwitchCase="'users-round'" lucideUsersRound></svg>
              <svg *ngSwitchCase="'clipboard-list'" lucideClipboardList></svg>
              <svg *ngSwitchCase="'messages-square'" lucideMessagesSquare></svg>
              <svg *ngSwitchCase="'star'" lucideStar></svg>
            </ng-container>
          </div>
          <div>
            <b>{{ item.value }}</b>
            <span>{{ item.label }}</span>
          </div>
        </article>
      </section>

      <section class="landing-section landing-steps" id="como-funciona">
        <span class="section-eyebrow">Como funciona</span>
        <h2>Resolver ficou <span>mais fácil.</span></h2>
        <p class="section-intro">Em poucos passos você encontra a solução ideal para o seu problema.</p>

        <div class="steps-grid">
          <article *ngFor="let item of steps; let index = index">
            <i [ngSwitch]="item.icon">
              <svg *ngSwitchCase="'message-circle'" lucideMessageCircle></svg>
              <svg *ngSwitchCase="'messages-square'" lucideMessagesSquare></svg>
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
          <p>Compare experiências, avaliações e propostas antes de contratar.</p>

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

          <article class="floating-review">
            <p>“Excelente atendimento, chegou no horário combinado e fez um ótimo serviço.”</p>
            <strong>Mariana S.</strong>
            <small>Uberlândia, MG</small>
          </article>

          <div class="benefits-badges">
            <span>Resposta rápida</span>
            <span>Recomendado por clientes</span>
            <span>Mais de 120 serviços</span>
          </div>
        </div>
      </section>

      <section class="landing-section landing-request-flow">
        <div class="request-flow-copy">
          <span class="section-eyebrow">Receba propostas</span>
          <h2>Não quer procurar profissional por <span>profissional?</span></h2>
          <p>Conte seu problema uma vez e receba propostas de profissionais interessados.</p>

          <div class="request-flow-steps">
            <span *ngFor="let item of requestFlow; let last = last">
              {{ item }}
              <i *ngIf="!last">→</i>
            </span>
          </div>

          <a routerLink="/cadastro" class="landing-cta">
            Quero receber propostas
            <svg lucideArrowRight />
          </a>
        </div>

        <div class="request-flow-visual">
          <article class="proposal-showcase">
            <div class="proposal-showcase-header">
              <strong>Solicitação enviada</strong>
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
                <svg lucideMessagesSquare />
                Receba propostas
              </li>
            </ul>
          </article>

          <article class="request-floating-card">
            <span class="proposal-avatar first"></span>
            <div>
              <b>3 novas propostas</b>
              <small>Compare valores, histórico e avaliações.</small>
            </div>
          </article>
        </div>
      </section>

      <section class="landing-professionals" id="profissionais">
        <div class="landing-professionals-copy">
          <span class="section-eyebrow dark">Para profissionais</span>
          <h2>Mais serviços,<br />mais clientes,<br /><span>mais crescimento.</span></h2>
          <p>Cadastre-se e encontre oportunidades de serviço na sua região.</p>

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
          <h3>Propostas</h3>
          <span>
            Instalação de ar-condicionado
            <small>Uberlândia, MG</small>
            <button>Enviar proposta</button>
          </span>
          <span>
            Limpeza de caixa d'água
            <small>Uberlândia, MG</small>
            <button>Enviar proposta</button>
          </span>
          <span>
            Manutenção elétrica
            <small>Uberlândia, MG</small>
            <button>Enviar proposta</button>
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

      <section class="landing-section testimonials" id="depoimentos">
        <span class="section-eyebrow">O que nossos clientes dizem</span>
        <h2>Histórias <span>reais</span> de quem já resolveu aqui.</h2>

        <div class="testimonial-grid">
          <article *ngFor="let item of testimonials">
            <div class="testimonial-top">
              <span class="testimonial-avatar">{{ item.initials }}</span>
              <div>
                <strong>{{ item.name }}</strong>
                <small>{{ item.location }}</small>
              </div>
            </div>

            <div class="testimonial-stars">★★★★★</div>
            <p>{{ item.quote }}</p>
            <em *ngIf="item.role">{{ item.role }}</em>
          </article>
        </div>

        <div class="testimonial-proof">
          <svg lucideShield />
          Mais de 10.000 avaliações reais de clientes
        </div>
      </section>

      <section class="landing-final">
        <div>
          <h2>Pronto para resolver? Comece agora mesmo!</h2>
          <p>É rápido, gratuito e você recebe propostas em poucos minutos.</p>
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
    { label: 'Depoimentos', href: '#depoimentos' },
  ];

  protected readonly trustItems = [
    { label: 'Avaliações reais de clientes', icon: 'star' },
    { label: 'Propostas comparadas', icon: 'clipboard-list' },
    { label: 'Histórico e recomendações', icon: 'sparkles' },
    { label: 'Atendimento e suporte', icon: 'headset' },
  ];

  protected readonly stats = [
    { icon: 'users-round', value: '+15 mil', label: 'Profissionais cadastrados' },
    { icon: 'clipboard-list', value: '+50 mil', label: 'Serviços solicitados' },
    { icon: 'messages-square', value: '+120 mil', label: 'Propostas enviadas' },
    { icon: 'star', value: '4,8 ★', label: 'Avaliação média' },
  ];

  protected readonly steps = [
    { icon: 'message-circle', title: 'Conte seu problema', description: 'Descreva o que você precisa resolver.' },
    { icon: 'messages-square', title: 'Receba propostas', description: 'Profissionais interessados enviam propostas.' },
    { icon: 'sparkles', title: 'Compare e escolha', description: 'Compare preço, reputação e avaliações.' },
    { icon: 'check', title: 'Problema resolvido', description: 'Acompanhe o serviço e avalie o profissional.' },
  ];

  protected readonly benefits = [
    'Avaliações reais de clientes',
    'Comentários públicos',
    'Recomendações da comunidade',
    'Compare propostas e valores',
    'Consulte o histórico do profissional',
    'Veja serviços e especialidades',
    'Atendimento e suporte pela plataforma',
  ];

  protected readonly requestFlow = [
    'Descreva seu problema',
    'Adicione fotos',
    'Informe sua região',
    'Receba propostas',
    'Compare',
    'Escolha',
  ];

  protected readonly professionalBenefits = [
    'Receba solicitações de clientes próximos',
    'Envie propostas',
    'Converse com clientes',
    'Organize seus serviços',
    'Acompanhe avaliações',
    'Construa sua reputação',
  ];

  protected readonly professionalHighlights = [
    { icon: 'users-round', title: '+ de 15 mil', description: 'Profissionais ativos' },
    { icon: 'waypoints', title: '+ de 50 mil', description: 'Serviços realizados' },
    { icon: 'shield', title: 'Reputação visível', description: 'Avaliações e histórico no perfil' },
  ];

  protected readonly testimonials = [
    {
      initials: 'JP',
      name: 'João P.',
      location: 'Uberlândia, MG',
      quote: 'Encontrei um profissional incrível para instalar meu ar-condicionado. Atendimento rápido, educado e preço justo.',
      role: '',
    },
    {
      initials: 'AL',
      name: 'Ana L.',
      location: 'Uberlândia, MG',
      quote: 'A plataforma é muito fácil de usar e as propostas chegaram rapidinho. Recomendo demais!',
      role: '',
    },
    {
      initials: 'CA',
      name: 'Carlos A.',
      location: 'Uberlândia, MG',
      quote: 'Consigo receber novas oportunidades e organizar melhor meus atendimentos dentro da plataforma.',
      role: 'Profissional',
    },
  ];
}
