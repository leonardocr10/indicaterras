import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowLeft, LucideBriefcaseBusiness, LucideBuilding2, LucideChevronLeft,
  LucideChevronRight, LucideClock3, LucideEye, LucideGlobe2, LucideImage, LucideInfo, LucideMessageSquare,
  LucideSearch, LucideStar, LucideThumbsUp, LucideUserRound, LucideX,
} from '@lucide/angular';
import { SearchableSelectComponent } from './searchable-select';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';

type ReviewRow = Record<string, string>;
type ReviewHistory = { action: string; status: string; note: string; createdAt: string };
type ReviewDetail = {
  id: string; displayId: string; rating: number; comment: string; createdAt: string; serviceDate: string; status: string;
  recommends: boolean; origin: string; reports: number; condominium: string; images: string[]; adminResponse: string;
  lastModerationAt: string; resident: { name: string; initials: string; verified: boolean };
  professional: { id: string; name: string; avatar: string; category: string; services: string[] }; history: ReviewHistory[];
};

@Component({
  selector: 'admin-reviews-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent, LucideChevronLeft, LucideChevronRight, LucideEye, LucideSearch, LucideStar],
  template: `
    <main class="admin-content admin-reviews-content">
      <header class="admin-topbar admin-reviews-header"><div><h1>Avaliações</h1><p>Modere avaliações publicadas pelos moradores.</p></div></header>
      <section class="admin-reviews-toolbar">
        <label class="admin-search-field"><svg lucideSearch /><input [ngModel]="searchTerm()" (ngModelChange)="setSearch($event)" placeholder="Buscar registros..." /></label>
        <app-searchable-select [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)" [items]="statusOptions" emptyLabel="Todos os status" searchPlaceholder="Pesquisar status..." />
      </section>
      <section class="admin-review-list-card">
        <header><h2>Moderação de avaliações</h2><span>{{ filteredRows().length }} registros</span></header>
        <div class="admin-review-table-wrap">
          <table class="admin-review-table"><thead><tr><th>Morador</th><th>Profissional</th><th>Nota</th><th>Comentário</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            <tr *ngFor="let row of pagedRows()">
              <td><div class="review-person"><span class="review-initials">{{ row['residentInitials'] }}</span><strong>{{ row['resident'] }}</strong></div></td>
              <td><div class="review-person"><img *ngIf="row['professionalAvatar']; else professionalFallback" [src]="api.assetUrl(row['professionalAvatar'])" [alt]="row['professional']" /><ng-template #professionalFallback><span class="review-initials professional"><svg lucideStar /></span></ng-template><div><strong>{{ row['professional'] }}</strong><small>{{ row['category'] }}</small></div></div></td>
              <td><span class="admin-review-rating">★ <b>{{ row['rating'] }}</b></span></td>
              <td><p class="admin-review-comment">{{ row['comment'] }}</p></td>
              <td>{{ row['date'] }}</td>
              <td><span class="review-status" [ngClass]="statusClass(row['status'])">{{ row['status'] }}</span></td>
              <td><div class="review-row-actions"><a [routerLink]="['/admin/avaliacoes', row['id']]"><svg lucideEye />Ver avaliação</a><button type="button" (click)="setStatus(row['id'], 'Publicado')">Publicar</button><button type="button" class="hide" (click)="setStatus(row['id'], 'Oculto')">Ocultar</button></div></td>
            </tr>
            <tr *ngIf="!pagedRows().length"><td colspan="7" class="admin-review-empty">Nenhuma avaliação encontrada.</td></tr>
          </tbody></table>
        </div>
        <footer class="admin-review-pagination"><span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filteredRows().length }}</span><label>Itens por página <app-searchable-select [ngModel]="pageSize()" (ngModelChange)="setPageSize($event)" [items]="pageSizeOptions" searchPlaceholder="Pesquisar..." /></label><div><button type="button" [disabled]="page() === 1" (click)="setPage(page()-1)"><svg lucideChevronLeft /></button><b>{{ page() }}</b><button type="button" [disabled]="page() === totalPages()" (click)="setPage(page()+1)"><svg lucideChevronRight /></button></div></footer>
      </section>
    </main>
  `,
})
export class AdminReviewsPageComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly rows = signal<ReviewRow[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly statusOptions = ['Publicado', 'Oculto', 'Pendente', 'Denunciado'];
  protected readonly pageSizeOptions = [5, 10, 25];
  protected readonly filteredRows = computed(() => {
    const search = this.normalize(this.searchTerm());
    return this.rows().filter((row) => (!search || ['resident', 'professional', 'comment', 'category', 'services'].some((key) => this.normalize(row[key] ?? '').includes(search))) && (!this.statusFilter() || row['status'] === this.statusFilter()));
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  protected readonly pagedRows = computed(() => this.filteredRows().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));
  ngOnInit() { this.load(); }
  setSearch(value: string) { this.searchTerm.set(value); this.page.set(1); }
  setStatusFilter(value: string) { this.statusFilter.set(value); this.page.set(1); }
  setPage(value: number) { this.page.set(Math.min(Math.max(1, Number(value)), this.totalPages())); }
  setPageSize(value: number) { this.pageSize.set(Number(value)); this.page.set(1); }
  pageStart() { return this.filteredRows().length ? (this.page() - 1) * this.pageSize() + 1 : 0; }
  pageEnd() { return Math.min(this.page() * this.pageSize(), this.filteredRows().length); }
  statusClass(status: string) { return `status-${this.normalize(status).replace(/\s+/g, '-')}`; }
  setStatus(id: string, status: string) { this.api.updateAdminSectionStatus('reviews', id, status).subscribe({ next: () => { this.toast.success(`Avaliação ${status.toLowerCase()} com sucesso.`); this.load(); }, error: () => this.toast.error('Não foi possível atualizar a avaliação.') }); }
  private load() { this.api.getAdminSection('reviews').subscribe((rows) => this.rows.set(rows)); }
  private normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}

@Component({
  selector: 'admin-review-details-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideArrowLeft, LucideBriefcaseBusiness, LucideBuilding2, LucideClock3, LucideGlobe2, LucideImage, LucideInfo, LucideMessageSquare, LucideThumbsUp, LucideUserRound, LucideX],
  template: `
    <main class="admin-content admin-review-detail-content" *ngIf="review() as item; else loading">
      <header class="admin-review-detail-header"><div><small>Avaliações&nbsp; / &nbsp;Ver avaliação</small><h1>Detalhes da avaliação</h1><p>Visualize e modere a avaliação enviada pelo morador.</p></div><nav><a routerLink="/admin/avaliacoes"><svg lucideArrowLeft />Voltar</a><button type="button" class="publish" (click)="setStatus('Publicado')">Publicar</button><button type="button" class="hide" (click)="setStatus('Oculto')">Ocultar</button></nav></header>
      <div class="admin-review-detail-grid">
        <div class="admin-review-detail-main">
          <section class="review-detail-card review-overview"><h2>Detalhes da avaliação</h2>
            <div class="review-people-row"><div class="review-detail-person"><span>{{ item.resident.initials }}</span><div><small>Morador</small><strong>{{ item.resident.name }}</strong><em>Morador verificado ✓</em></div></div><div class="review-detail-person professional"><img *ngIf="item.professional.avatar; else detailFallback" [src]="api.assetUrl(item.professional.avatar)" [alt]="item.professional.name" /><ng-template #detailFallback><span><svg lucideBriefcaseBusiness /></span></ng-template><div><small>Profissional avaliado</small><strong>{{ item.professional.name }}</strong><em>{{ item.professional.category }}</em></div></div></div>
            <div class="review-metrics"><div><small>Avaliação</small><strong class="detail-stars">★★★★★ <b>{{ item.rating | number:'1.1-1' }}</b></strong></div><div><small>Status</small><span class="review-status" [ngClass]="statusClass(item.status)">{{ item.status }}</span></div><div><small>Data da avaliação</small><strong>{{ formatDate(item.createdAt) }}</strong></div><div><small>Recomenda</small><span class="review-recommends" [class.no]="!item.recommends"><svg lucideThumbsUp />{{ item.recommends ? 'Recomenda' : 'Não recomenda' }}</span></div></div>
            <div class="review-full-comment"><small>Comentário do morador</small><blockquote>“{{ item.comment }}”</blockquote></div>
            <div class="review-service-facts"><div><svg lucideUserRound /><span>Categoria<strong>{{ item.professional.category }}</strong></span></div><div><svg lucideBriefcaseBusiness /><span>Serviço<strong>{{ servicesLabel(item.professional.services) }}</strong></span></div><div><svg lucideBuilding2 /><span>Condomínio<strong>{{ item.condominium }}</strong></span></div><div><svg lucideGlobe2 /><span>Visibilidade<strong>{{ item.status === 'Publicado' ? 'Pública' : 'Oculta' }}</strong></span></div></div>
          </section>
          <section class="review-detail-card review-images-card"><h2><svg lucideImage />Fotos anexadas</h2><div *ngIf="item.images.length; else noImages" class="review-image-grid"><button *ngFor="let photo of item.images; let index=index" type="button" (click)="openImage(index)"><img [src]="api.assetUrl(photo)" alt="Foto anexada à avaliação" /></button></div><ng-template #noImages><p class="review-no-images">Nenhuma foto foi anexada a esta avaliação.</p></ng-template></section>
        </div>
        <aside class="admin-review-detail-side">
          <section class="review-detail-card review-info-card"><h2><svg lucideInfo />Informações da avaliação</h2><dl><div><dt>ID da avaliação</dt><dd>{{ item.displayId }}</dd></div><div><dt>Origem</dt><dd>{{ item.origin }}</dd></div><div><dt>Última moderação</dt><dd>{{ formatDateTime(item.lastModerationAt) }}</dd></div><div><dt>Denúncias</dt><dd>{{ item.reports }}</dd></div></dl></section>
          <section class="review-detail-card review-response-card"><h2><svg lucideMessageSquare />Resposta do administrador</h2><textarea [(ngModel)]="response" placeholder="Escreva uma resposta pública (opcional)..."></textarea><footer><span>A resposta será visível para todos os usuários.</span><button type="button" (click)="saveResponse()">Salvar resposta</button></footer></section>
          <section class="review-detail-card review-history-card"><h2><svg lucideClock3 />Histórico de moderação</h2><ol><li *ngFor="let history of item.history"><i></i><div><span>{{ formatDateTime(history.createdAt) }} <b>{{ history.action }}</b></span><p>{{ history.note }}</p></div></li></ol></section>
        </aside>
      </div>
      <div class="review-lightbox" *ngIf="lightboxIndex() >= 0" (click)="closeImage()"><button type="button" aria-label="Fechar" (click)="closeImage()"><svg lucideX /></button><button type="button" class="previous" (click)="moveImage(-1);$event.stopPropagation()">‹</button><img [src]="api.assetUrl(item.images[lightboxIndex()])" alt="Foto ampliada da avaliação" (click)="$event.stopPropagation()" /><button type="button" class="next" (click)="moveImage(1);$event.stopPropagation()">›</button></div>
    </main>
    <ng-template #loading><main class="admin-content"><section class="review-detail-load-state"><ng-container *ngIf="loadError(); else waiting"><h1>Não foi possível carregar a avaliação</h1><p>Atualize o servidor da aplicação e tente novamente.</p><a routerLink="/admin/avaliacoes"><svg lucideArrowLeft />Voltar para avaliações</a></ng-container><ng-template #waiting><p>Carregando avaliação...</p></ng-template></section></main></ng-template>
  `,
})
export class AdminReviewDetailsPageComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly review = signal<ReviewDetail | null>(null);
  protected readonly loadError = signal(false);
  protected readonly lightboxIndex = signal(-1);
  protected response = '';
  private id = '';
  ngOnInit() { this.id = this.route.snapshot.paramMap.get('id') ?? ''; this.load(); }
  setStatus(status: string) { this.api.updateAdminSectionStatus('reviews', this.id, status).subscribe({ next: () => { this.toast.success(`Avaliação ${status.toLowerCase()} com sucesso.`); this.load(); }, error: () => this.toast.error('Não foi possível atualizar a avaliação.') }); }
  saveResponse() { this.api.saveAdminReviewResponse(this.id, this.response).subscribe({ next: () => { this.toast.success('Resposta salva com sucesso.'); this.load(); }, error: () => this.toast.error('Não foi possível salvar a resposta.') }); }
  statusClass(status: string) { return `status-${this.normalize(status).replace(/\s+/g, '-')}`; }
  servicesLabel(services: string[]) { return services.length ? services.slice(0, 3).join(', ') : 'Não informado'; }
  formatDate(value: string) { return value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '-'; }
  formatDateTime(value: string) { return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-'; }
  openImage(index: number) { this.lightboxIndex.set(index); }
  closeImage() { this.lightboxIndex.set(-1); }
  moveImage(direction: number) { const count = this.review()?.images.length ?? 0; if (count) this.lightboxIndex.update((index) => (index + direction + count) % count); }
  private load() { this.loadError.set(false); this.api.getAdminReviewDetails(this.id).subscribe({ next: (review) => { const item = review as unknown as ReviewDetail; this.review.set(item); this.response = item.adminResponse; }, error: () => { this.loadError.set(true); this.toast.error('Avaliação não encontrada.'); } }); }
  private normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}
