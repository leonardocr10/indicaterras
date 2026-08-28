import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight, LucideEllipsis, LucideSearch } from '@lucide/angular';
import { ComplaintRow } from './models';
import { SearchableSelectComponent } from './searchable-select';
import { matchesSearch } from './search.util';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'admin-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent, LucideSearch, LucideEllipsis, LucideChevronLeft, LucideChevronRight],
  template: `
    <main class="admin-content admin-crud-content">
      <header class="admin-topbar">
        <div>
          <p class="admin-eyebrow">Gestão Terras Alphas</p>
          <h1>Denúncias</h1>
          <p>Analise ocorrências reportadas.</p>
        </div>
      </header>

      <section class="admin-table-panel admin-data-panel">
        <div class="admin-data-toolbar">
          <label class="admin-search-field"><svg lucideSearch /><input [(ngModel)]="busca" placeholder="Buscar registros..." /></label>
          <app-searchable-select class="admin-toolbar-select" [ngModel]="filtroStatus()" (ngModelChange)="setFiltro($event)" [items]="opcoesStatus" emptyLabel="Todos os status" searchPlaceholder="Pesquisar status..." />
        </div>

        <div class="admin-panel-header"><h2>Denúncias de profissionais</h2></div>

        <div class="admin-table-wrap">
          <table>
            <thead>
              <tr><th>Morador</th><th>Profissional</th><th>Motivo</th><th>Descrição</th><th>Data</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let linha of paginadas()">
                <td>
                  <div class="review-person">
                    <span class="review-initials">{{ linha.residentInitials }}</span>
                    <div><strong>{{ linha.resident }}</strong><small>{{ linha.residentPlace }}</small></div>
                  </div>
                </td>
                <td><strong class="report-professional">{{ linha.professional }}</strong><small>{{ linha.professionalCategory }}</small></td>
                <td>{{ linha.reason }}</td>
                <td><p class="admin-review-comment">{{ linha.description }}</p></td>
                <td><strong>{{ linha.date }}</strong><small>{{ linha.time }}</small></td>
                <td><span class="report-status" [class]="'report-status ' + classeDoStatus(linha.status)">{{ linha.status }}</span></td>
                <td class="admin-actions report-actions">
                  <a [routerLink]="['/admin/denuncias', linha.id]">Ver detalhes</a>
                  <div class="card-menu-wrapper">
                    <button type="button" class="more-button" [attr.aria-expanded]="menuAberto() === linha.id" aria-label="Mais ações" (click)="alternarMenu(linha.id, $event)"><svg lucideEllipsis /></button>
                    <div *ngIf="menuAberto() === linha.id" class="card-menu" role="menu">
                      <button type="button" role="menuitem" (click)="mudarStatus(linha, 'Em análise')">Marcar em análise</button>
                      <button type="button" role="menuitem" (click)="mudarStatus(linha, 'Resolvida')">Resolver denúncia</button>
                      <button type="button" role="menuitem" (click)="mudarStatus(linha, 'Ignorada')">Ignorar denúncia</button>
                      <button type="button" role="menuitem" (click)="aplicar(linha, 'warn')">Advertir profissional</button>
                      <button type="button" role="menuitem" (click)="aplicar(linha, 'suspend7')">Suspender por 7 dias</button>
                      <button type="button" role="menuitem" (click)="aplicar(linha, 'suspend30')">Suspender por 30 dias</button>
                      <button type="button" role="menuitem" class="card-menu-danger" (click)="aplicar(linha, 'block')">Bloquear prestador</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!paginadas().length"><td class="admin-empty-row" colspan="7">Nenhuma denúncia encontrada com os filtros atuais.</td></tr>
            </tbody>
          </table>
        </div>

        <footer class="admin-pagination">
          <span>Mostrando {{ inicio() }}–{{ fim() }} de {{ filtradas().length }} registros</span>
          <label>Itens por página <app-searchable-select class="page-size-select" [ngModel]="porPagina()" (ngModelChange)="setPorPagina($event)" [items]="opcoesPorPagina" searchPlaceholder="Quantidade..." /></label>
          <div>
            <button type="button" [disabled]="pagina() === 1" (click)="setPagina(pagina() - 1)"><svg lucideChevronLeft /></button>
            <b>{{ pagina() }} / {{ totalPaginas() }}</b>
            <button type="button" [disabled]="pagina() === totalPaginas()" (click)="setPagina(pagina() + 1)"><svg lucideChevronRight /></button>
          </div>
        </footer>
      </section>
    </main>
  `,
})
export class AdminReportsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly linhas = signal<ComplaintRow[]>([]);
  protected readonly filtroStatus = signal('');
  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(10);
  protected readonly menuAberto = signal('');
  protected readonly opcoesPorPagina = [5, 10, 25, 50];
  protected readonly opcoesStatus = ['Pendente', 'Em análise', 'Urgente', 'Resolvida', 'Ignorada'];
  protected busca = '';

  protected readonly filtradas = computed(() =>
    this.linhas().filter((linha) => {
      const status = this.filtroStatus();
      const texto = [linha.resident, linha.professional, linha.reason, linha.description, linha.status].join(' ');
      return (!status || linha.status === status) && matchesSearch(texto, this.busca);
    }),
  );
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.porPagina())));
  protected readonly paginadas = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina();
    return this.filtradas().slice(inicio, inicio + this.porPagina());
  });

  ngOnInit() {
    this.carregar();
  }

  protected inicio() {
    return this.filtradas().length ? (this.pagina() - 1) * this.porPagina() + 1 : 0;
  }

  protected fim() {
    return Math.min(this.pagina() * this.porPagina(), this.filtradas().length);
  }

  protected setPagina(valor: number) {
    this.pagina.set(Math.min(Math.max(1, valor), this.totalPaginas()));
  }

  protected setPorPagina(valor: number) {
    this.porPagina.set(Number(valor));
    this.pagina.set(1);
  }

  protected setFiltro(valor: string) {
    this.filtroStatus.set(valor);
    this.pagina.set(1);
  }

  protected classeDoStatus(status: string) {
    return (
      {
        'Em análise': 'status-analise',
        Pendente: 'status-pendente',
        Urgente: 'status-urgente',
        Resolvida: 'status-resolvida',
        Ignorada: 'status-ignorada',
      } as Record<string, string>
    )[status] ?? 'status-pendente';
  }

  protected alternarMenu(id: string, evento: Event) {
    evento.stopPropagation();
    this.menuAberto.set(this.menuAberto() === id ? '' : id);
  }

  @HostListener('document:click')
  protected fecharMenu() {
    if (this.menuAberto()) this.menuAberto.set('');
  }

  protected mudarStatus(linha: ComplaintRow, status: string) {
    this.api.updateComplaintStatus(linha.id, status).subscribe({
      next: () => {
        this.toast.success(`Denúncia marcada como ${status.toLowerCase()}.`);
        this.carregar();
      },
      error: () => this.toast.error('Não foi possível atualizar a denúncia.'),
    });
  }

  protected aplicar(linha: ComplaintRow, acao: string) {
    this.menuAberto.set('');
    this.api.applyComplaintAction(linha.id, acao).subscribe({
      next: (detalhe) => {
        this.toast.success(`${detalhe.professionalSummary.name}: ${detalhe.professionalSummary.status.toLowerCase()}.`);
        this.carregar();
      },
      error: () => this.toast.error('Não foi possível aplicar a ação.'),
    });
  }

  private carregar() {
    this.api.getComplaints().subscribe({
      next: (linhas) => {
        this.linhas.set(linhas);
        this.setPagina(this.pagina());
      },
      error: () => this.toast.error('Não foi possível carregar as denúncias.'),
    });
  }
}
