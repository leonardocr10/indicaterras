import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { matchesSearch } from './search.util';
import { LucideChevronLeft, LucideChevronRight, LucideSearch } from '@lucide/angular';
import { SearchableSelectComponent } from './searchable-select';
import { PhoneMaskDirective } from './phone-mask.directive';

@Component({
  selector: 'admin-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-page admin-login-page">
      <div class="auth-card admin-login-card">
        <img class="auth-logo" src="/assets/logo-terras.png" alt="Terras Alphas Indica" />
        <div><span class="admin-login-eyebrow">ÁREA ADMINISTRATIVA</span><h1>Acessar painel</h1><p>Entre com uma conta de administrador.</p></div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <input type="email" placeholder="E-mail administrativo" formControlName="email" />
          <input type="password" placeholder="Senha" formControlName="password" />
          <button class="primary-button" type="submit">Entrar no painel</button>
          <p *ngIf="feedback()" class="form-feedback error">{{ feedback() }}</p>
        </form>
        <a routerLink="/login" class="text-button">Voltar ao aplicativo do morador</a>
      </div>
    </section>
  `,
})
export class AdminLoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly feedback = signal('');
  protected readonly form = this.fb.nonNullable.group({
    email: ['admin@terrasalphas.com.br', [Validators.required, Validators.email]],
    password: ['123456', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (session) => {
        if (session.user.role === 'RESIDENT') {
          this.auth.logout();
          this.feedback.set('Esta conta não possui acesso administrativo.');
          return;
        }
        void this.router.navigateByUrl('/admin/dashboard');
      },
      error: () => this.feedback.set('E-mail ou senha inválidos.'),
    });
  }
}

@Component({
  selector: 'resident-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="mobile-page resident-profile-page" *ngIf="auth.user() as user">
      <header class="resident-profile-header">
        <img class="resident-avatar" src="/assets/placeholders/default-avatar.svg" [alt]="'Foto padrão de ' + user.name" />
        <h1>{{ user.name }}</h1>
        <p>Morador do Terras Alphas</p>
      </header>
      <section class="resident-profile-card">
        <div><span>Telefone</span><strong>{{ user.phone }}</strong></div>
        <div><span>E-mail</span><strong>{{ user.email }}</strong></div>
        <div><span>Unidade</span><strong>A-101</strong></div>
        <div><span>Condomínio</span><strong>Terras Alphas</strong></div>
      </section>
      <nav class="resident-profile-menu">
        <a routerLink="/app/minhas-indicacoes"><span>Minhas indicações</span><b>›</b></a>
        <a routerLink="/app/favoritos"><span>Meus favoritos</span><b>›</b></a>
        <button type="button"><span>Alterar senha</span><b>›</b></button>
        <button type="button" class="logout-item" (click)="logout()"><span>Sair</span><b>›</b></button>
      </nav>
    </section>
  `,
})
export class ResidentProfilePageComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  initials(name: string) {
    return name.split(' ').slice(0, 2).map((part) => part[0]).join('');
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

type AdminSection = 'reviews' | 'recommendations' | 'reports' | 'settings' | 'reports-dashboard';

@Component({
  selector: 'admin-section-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableSelectComponent, PhoneMaskDirective, LucideChevronLeft, LucideChevronRight, LucideSearch],
  template: `
    <main class="admin-content admin-section-content">
      <header class="admin-topbar"><div><h1>{{ title() }}</h1><p>{{ description() }}</p></div></header>

      <div class="admin-data-toolbar moderation-toolbar" *ngIf="isTableSection()">
        <label class="admin-search-field"><svg lucideSearch /><input [ngModel]="searchTerm()" (ngModelChange)="setSearch($event)" placeholder="Buscar registros..." /></label>
        <app-searchable-select class="admin-toolbar-select" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)" [items]="statusOptions()" emptyLabel="Todos os status" searchPlaceholder="Pesquisar status..." />
      </div>

      <section class="admin-table-panel" *ngIf="section() === 'reviews'">
        <div class="admin-panel-header"><h2>Moderação de avaliações</h2></div>
        <div class="admin-table-wrap"><table><thead><tr><th>Morador</th><th>Profissional</th><th>Nota</th><th>Comentário</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          <tr *ngFor="let row of pagedRows()"><td>{{ row['resident'] }}</td><td>{{ row['professional'] }}</td><td class="rating-cell">★ {{ row['rating'] }}</td><td>{{ row['comment'] }}</td><td>{{ row['date'] }}</td><td><span class="status-badge">{{ row['status'] }}</span></td><td class="admin-actions"><button (click)="setStatus('reviews', row['id'], 'Publicado')">Publicar</button><button class="danger-action" (click)="setStatus('reviews', row['id'], 'Oculto')">Ocultar</button></td></tr>
        </tbody></table></div>
      </section>

      <section class="admin-table-panel" *ngIf="section() === 'recommendations'">
        <div class="admin-panel-header"><h2>Indicações recebidas</h2></div>
        <div class="admin-table-wrap"><table><thead><tr><th>Morador</th><th>Profissional</th><th>Categoria</th><th>Nota</th><th>Condomínio</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          <tr *ngFor="let row of pagedRows()"><td>{{ row['resident'] }}</td><td>{{ row['professional'] }}</td><td>{{ row['category'] }}</td><td class="rating-cell">{{ row['rating'] }}</td><td>Terras Alphas</td><td>{{ row['date'] }}</td><td><span class="status-badge">{{ row['status'] }}</span></td><td class="admin-actions"><button (click)="setStatus('recommendations', row['id'], 'Aprovada')">Aprovar</button><button class="danger-action" (click)="setStatus('recommendations', row['id'], 'Removida')">Remover</button></td></tr>
        </tbody></table></div>
      </section>

      <section class="admin-table-panel" *ngIf="section() === 'reports'">
        <div class="admin-panel-header"><h2>Denúncias de profissionais</h2></div>
        <div class="admin-table-wrap"><table><thead><tr><th>Morador</th><th>Profissional</th><th>Motivo</th><th>Descrição</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          <tr *ngFor="let row of pagedRows()"><td>{{ row['resident'] }}</td><td>{{ row['professional'] }}</td><td>{{ row['reason'] }}</td><td>{{ row['description'] }}</td><td>{{ row['date'] }}</td><td><span class="status-badge">{{ row['status'] }}</span></td><td class="admin-actions"><button (click)="setStatus('reports', row['id'], 'Em análise')">Analisar</button><button (click)="setStatus('reports', row['id'], 'Resolvido')">Resolver</button><button class="danger-action" (click)="setStatus('reports', row['id'], 'Ignorado')">Ignorar</button></td></tr>
        </tbody></table></div>
      </section>

      <footer class="admin-pagination moderation-pagination" *ngIf="isTableSection()"><span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filteredRows().length }}</span><label>Itens por página <app-searchable-select class="page-size-select" [ngModel]="pageSize()" (ngModelChange)="setPageSize($event)" [items]="pageSizeOptions" searchPlaceholder="Pesquisar quantidade..." /></label><div><button type="button" [disabled]="page() === 1" (click)="setPage(page() - 1)"><svg lucideChevronLeft /></button><b>{{ page() }} / {{ totalPages() }}</b><button type="button" [disabled]="page() === totalPages()" (click)="setPage(page() + 1)"><svg lucideChevronRight /></button></div></footer>

      <form class="settings-grid" [formGroup]="settingsForm" *ngIf="section() === 'settings'" (ngSubmit)="saveSettings()">
        <section class="settings-card"><h2>Geral</h2><label>Nome do sistema<input formControlName="systemName" /></label><label>Nome do condomínio<input formControlName="condominiumName" /></label><label>Telefone<input type="tel" inputmode="tel" maxlength="15" formControlName="phone" appPhoneMask /></label><label>E-mail<input formControlName="email" /></label></section>
        <section class="settings-card"><h2>Identidade visual</h2><label>Logo<input type="file" /></label><label>Imagem de capa<input type="file" /></label><div class="color-fields"><label>Cor principal<input type="color" formControlName="primaryColor" /></label><label>Cor secundária<input type="color" formControlName="secondaryColor" /></label></div></section>
        <section class="settings-card"><h2>Usuários e acesso</h2><label class="switch-row"><input type="checkbox" formControlName="selfRegistration" /> Permitir auto cadastro</label><label class="switch-row"><input type="checkbox" formControlName="requireUserApproval" /> Exigir aprovação administrativa após validar o código do e-mail</label><small>Quando ativo, confirmar o e-mail não libera o acesso até um administrador aprovar o usuário.</small><label class="switch-row"><input type="checkbox" formControlName="showBlock" /> Mostrar bloco e unidade</label></section>
        <section class="settings-card"><h2>Cadastro de profissionais</h2><label class="switch-row"><input type="checkbox" formControlName="professionalSelfRegistration" /> Permitir que profissionais criem a própria conta</label><p class="settings-hint">Com a opção ligada, a tela de criar conta passa a oferecer "Sou profissional". O profissional cria o cadastro, confirma o e-mail e passa a editar o próprio perfil no app. Você continua podendo editar ou excluir o perfil dele em Profissionais.</p></section>
        <section class="settings-card"><h2>Indicações e avaliações</h2><label class="switch-row"><input type="checkbox" formControlName="allowRecommendations" /> Permitir indicação</label><label class="switch-row"><input type="checkbox" formControlName="recommendationApproval" /> Exigir aprovação da indicação</label><label class="switch-row"><input type="checkbox" formControlName="allowReviews" /> Permitir avaliações</label><label class="switch-row"><input type="checkbox" formControlName="requireComment" /> Exigir comentário</label></section>
        <section class="settings-card security-card"><h2>Segurança</h2><p>Sessão administrativa: 8 horas</p><p>Perfis ativos: Super Admin e Administrador de condomínio</p><button class="secondary-button" type="button">Gerenciar políticas de acesso</button></section>
        <div class="settings-actions"><span class="form-feedback">{{ feedback() }}</span><button class="primary-button" type="submit">Salvar configurações</button></div>
      </form>

      <section class="reports-dashboard" *ngIf="section() === 'reports-dashboard'">
        <div class="report-summary"><article><span>Novos moradores</span><strong>38</strong><em>+12% no período</em></article><article><span>Indicações aprovadas</span><strong>124</strong><em>+18% no período</em></article><article><span>Avaliação média</span><strong>4,8</strong><em>Excelente</em></article></div>
        <div class="admin-table-panel"><div class="admin-panel-header"><h2>Relatórios disponíveis</h2><button class="primary-button">Exportar relatório</button></div><div class="report-list"><button>Moradores por condomínio <b>Baixar CSV</b></button><button>Profissionais mais indicados <b>Baixar CSV</b></button><button>Avaliações por período <b>Baixar CSV</b></button></div></div>
      </section>
    </main>
  `,
})
export class AdminSectionPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  protected readonly section = signal<AdminSection>('reviews');
  protected readonly feedback = signal('');
  protected readonly reviews = signal<Record<string, string>[]>([]);
  protected readonly recommendations = signal<Record<string, string>[]>([]);
  protected readonly reports = signal<Record<string, string>[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [5, 10, 25];
  protected readonly currentRows = computed(() => this.section() === 'reviews' ? this.reviews() : this.section() === 'recommendations' ? this.recommendations() : this.reports());
  protected readonly filteredRows = computed(() => {
    const search = this.searchTerm();
    return this.currentRows().filter((row) => matchesSearch(Object.values(row).join(' '), search) && (!this.statusFilter() || row['status'] === this.statusFilter()));
  });
  protected readonly statusOptions = computed(() => [...new Set(this.currentRows().map((row) => row['status']).filter(Boolean))].sort());
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  protected readonly pagedRows = computed(() => this.filteredRows().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));
  protected readonly settingsForm = this.fb.nonNullable.group({
    systemName: 'Terras Alphas Indica', condominiumName: 'Terras Alphas', phone: '(34) 99999-0000', email: 'contato@terrasalphas.com.br',
    primaryColor: '#006538', secondaryColor: '#ffad00', selfRegistration: true, residentApproval: true, requireUserApproval: true, showBlock: true,
    allowRecommendations: true, recommendationApproval: true, allowReviews: true, requireComment: true, professionalSelfRegistration: false,
  });
  ngOnInit() {
    this.route.data.subscribe((data) => {
      const section = data['section'] as AdminSection;
      this.section.set(section);
      this.searchTerm.set(''); this.statusFilter.set(''); this.page.set(1);
      if (section === 'reviews' || section === 'recommendations' || section === 'reports') this.loadSection(section);
      if (section === 'settings') this.api.getAdminSettings().subscribe((settings) => this.settingsForm.patchValue(settings));
    });
  }

  isTableSection() { return this.section() === 'reviews' || this.section() === 'recommendations' || this.section() === 'reports'; }
  setSearch(value: string) { this.searchTerm.set(value); this.page.set(1); }
  setStatusFilter(value: string) { this.statusFilter.set(value); this.page.set(1); }
  setPage(value: number) { this.page.set(Math.min(Math.max(1, Number(value)), this.totalPages())); }
  setPageSize(value: number) { this.pageSize.set(Number(value)); this.page.set(1); }
  pageStart() { return this.filteredRows().length ? (this.page() - 1) * this.pageSize() + 1 : 0; }
  pageEnd() { return Math.min(this.page() * this.pageSize(), this.filteredRows().length); }

  title() {
    return ({ reviews: 'Avaliações', recommendations: 'Indicações', reports: 'Denúncias', settings: 'Configurações', 'reports-dashboard': 'Relatórios' } as const)[this.section()];
  }

  description() {
    return ({ reviews: 'Modere avaliações publicadas pelos moradores.', recommendations: 'Acompanhe e aprove indicações.', reports: 'Analise ocorrências reportadas.', settings: 'Configure o condomínio e as regras da plataforma.', 'reports-dashboard': 'Acompanhe indicadores e exporte dados.' } as const)[this.section()];
  }

  setStatus(section: 'reviews' | 'recommendations' | 'reports', id: string, value: string) {
    this.api.updateAdminSectionStatus(section, id, value).subscribe(() => this.loadSection(section));
  }

  saveSettings() {
    this.api.updateAdminSettings(this.settingsForm.getRawValue()).subscribe(() => this.feedback.set('Configurações salvas com sucesso.'));
  }

  private loadSection(section: 'reviews' | 'recommendations' | 'reports') {
    this.api.getAdminSection(section).subscribe((rows) => this[section].set(rows));
  }
  private normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}
