import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendarDays,
  LucideCheckCircle2,
  LucideClock,
  LucideEye,
  LucideEyeOff,
  LucideLockKeyhole,
  LucideMessageCircle,
  LucidePhone,
  LucideStar,
  LucideTriangleAlert,
} from '@lucide/angular';
import { ComplaintDetails } from './models';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';
import { SearchableSelectComponent } from './searchable-select';

@Component({
  selector: 'admin-report-details-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, SearchableSelectComponent,
    LucideArrowLeft, LucideCalendarDays, LucideCheckCircle2, LucideClock, LucideEye, LucideEyeOff,
    LucideLockKeyhole, LucideMessageCircle, LucidePhone, LucideStar, LucideTriangleAlert,
  ],
  template: `
    <main class="admin-content admin-detail-content" *ngIf="detalhe() as denuncia; else carregando">
      <header class="admin-topbar report-detail-topbar">
        <div>
          <p class="admin-eyebrow">Gestão IndicaFácil</p>
          <nav class="report-breadcrumb"><a routerLink="/admin/denuncias">Denúncias</a><span>/</span><b>Detalhes da denúncia</b></nav>
          <h1>Detalhes da denúncia</h1>
          <p>Analise a ocorrência, as evidências e aplique ações contra o prestador.</p>
        </div>
        <div class="report-detail-actions">
          <a class="secondary-button" routerLink="/admin/denuncias"><svg lucideArrowLeft />Voltar</a>
          <button type="button" class="secondary-button report-button-analise" (click)="mudarStatus('Em análise')"><svg lucideClock />Marcar em análise</button>
          <button type="button" class="primary-button" (click)="mudarStatus('Resolvida')"><svg lucideCheckCircle2 />Resolver denúncia</button>
        </div>
      </header>

      <div class="report-detail-grid">
        <div class="report-detail-main">
          <section class="review-detail-card report-detail-summary">
            <h2>Resumo da denúncia</h2>
            <div class="report-people">
              <div class="report-person">
                <span class="review-initials">{{ denuncia.residentInitials }}</span>
                <div><small>Denunciante</small><strong>{{ denuncia.resident }}</strong><em>{{ denuncia.residentPlace }}</em></div>
              </div>
              <div class="report-person">
                <img *ngIf="fotoDoPrestador(denuncia); else semFoto" [src]="fotoDoPrestador(denuncia)" [alt]="'Foto de ' + denuncia.professional" />
                <ng-template #semFoto><span class="review-initials professional">{{ iniciais(denuncia.professional) }}</span></ng-template>
                <div><small>Prestador denunciado</small><strong>{{ denuncia.professional }}</strong><em>{{ denuncia.professionalCategory }}</em></div>
              </div>
            </div>
            <div class="report-facts">
              <div><small>Motivo</small><strong>{{ denuncia.reason }}</strong></div>
              <div><small>Data</small><strong>{{ denuncia.date }}</strong></div>
              <div><small>Hora</small><strong>{{ denuncia.time }}</strong></div>
              <div><small>Status</small><span class="report-status" [class]="'report-status ' + classeDoStatus(denuncia.status)">{{ denuncia.status }}</span></div>
              <div><small>Canal</small><strong>{{ denuncia.channel }}</strong></div>
            </div>
          </section>

          <section class="review-detail-card report-block">
            <h2>Descrição do morador</h2>
            <blockquote>{{ denuncia.description }}</blockquote>
          </section>

          <section class="review-detail-card report-block">
            <h2>Evidências anexadas</h2>
            <div *ngIf="denuncia.images.length; else semEvidencia" class="report-evidences">
              <figure *ngFor="let foto of denuncia.images; let i = index">
                <button type="button" (click)="lightbox.set(assetUrl(foto))"><img [src]="assetUrl(foto)" [alt]="'Evidência ' + (i + 1)" /></button>
                <figcaption>Foto {{ i + 1 }}</figcaption>
              </figure>
              <button *ngIf="denuncia.images.length > 4" type="button" class="secondary-button report-ver-todas" (click)="lightbox.set(assetUrl(denuncia.images[0]))">Ver todas</button>
            </div>
            <ng-template #semEvidencia><p class="review-no-images">O morador não anexou fotos a esta denúncia.</p></ng-template>
          </section>

          <section class="review-detail-card report-block">
            <h2>Histórico da denúncia</h2>
            <ol class="report-timeline">
              <li *ngFor="let evento of denuncia.history">
                <span [class]="'report-timeline-dot ' + evento.kind">
                  <svg *ngIf="evento.kind === 'view'" lucideEye />
                  <svg *ngIf="evento.kind === 'action'" lucideTriangleAlert />
                  <svg *ngIf="evento.kind === 'status'" lucideCheckCircle2 />
                </span>
                <div>
                  <time>{{ evento.at | date: 'dd/MM/yyyy HH:mm' }}</time>
                  <strong>{{ evento.label }}</strong>
                  <small *ngIf="evento.detail">{{ evento.detail }}</small>
                </div>
              </li>
            </ol>
          </section>
        </div>

        <aside class="report-detail-side">
          <section class="review-detail-card report-block">
            <h2>Ações contra o prestador</h2>
            <div class="report-action-list">
              <button type="button" class="report-action warn" (click)="aplicar('warn')"><svg lucideTriangleAlert />Advertir profissional</button>
              <button type="button" class="report-action hide" (click)="aplicar('hide')"><svg lucideEyeOff />Ocultar do app</button>
              <div class="report-action-suspend">
                <app-searchable-select [(ngModel)]="diasSuspensao" [items]="suspensionOptions" valueKey="value" labelKey="label" searchPlaceholder="Pesquisar duração..." />
                <button type="button" class="report-action suspend" (click)="suspender()"><svg lucideCalendarDays />Suspender prestador</button>
              </div>
              <button type="button" class="report-action block" (click)="aplicar('block')"><svg lucideLockKeyhole />Bloquear permanentemente</button>
              <button *ngIf="denuncia.professionalSummary.status !== 'Ativo no condomínio'" type="button" class="report-action restore" (click)="aplicar('restore')"><svg lucideCheckCircle2 />Reativar prestador no app</button>
            </div>
            <small class="report-action-note">As ações serão registradas no histórico do prestador.</small>
          </section>

          <section class="review-detail-card report-block">
            <h2>Informações do prestador</h2>
            <div class="report-person">
              <img *ngIf="fotoDoPrestador(denuncia); else semFoto2" [src]="fotoDoPrestador(denuncia)" [alt]="'Foto de ' + denuncia.professional" />
              <ng-template #semFoto2><span class="review-initials professional">{{ iniciais(denuncia.professional) }}</span></ng-template>
              <div><strong>{{ denuncia.professionalSummary.name }}</strong><em>{{ denuncia.professionalSummary.category }}</em></div>
            </div>
            <div class="report-professional-stats">
              <span><svg lucideStar /><b>{{ denuncia.professionalSummary.rating | number: '1.1-1' }}</b></span>
              <span>{{ denuncia.professionalSummary.reviewCount }} avaliações públicas</span>
              <span><svg lucideTriangleAlert />{{ denuncia.professionalSummary.complaintCount }} denúncias registradas</span>
            </div>
            <div class="report-professional-row"><small>Status</small><span class="report-professional-status">{{ denuncia.professionalSummary.status }}</span></div>
            <div class="report-professional-row"><small>Contato</small>
              <span class="report-contact">
                <a [href]="'tel:' + denuncia.professionalSummary.phone"><svg lucidePhone />{{ denuncia.professionalSummary.phone || 'Não informado' }}</a>
                <a *ngIf="denuncia.professionalSummary.whatsapp" [href]="'https://wa.me/' + denuncia.professionalSummary.whatsapp" target="_blank" rel="noopener" aria-label="WhatsApp"><svg lucideMessageCircle /></a>
              </span>
            </div>
          </section>

          <section class="review-detail-card report-block">
            <h2>Parecer administrativo</h2>
            <textarea [(ngModel)]="parecer" rows="5" placeholder="Registre seu parecer sobre esta denúncia. Descreva as análises, conclusões e providências adotadas."></textarea>
            <label class="report-notify"><input type="checkbox" [(ngModel)]="notificar" /> Notificar morador e prestador</label>
            <button type="button" class="primary-button full-width" [disabled]="salvando()" (click)="salvarParecer()"><svg lucideCheckCircle2 />{{ salvando() ? 'Salvando...' : 'Salvar parecer' }}</button>
          </section>
        </aside>
      </div>

      <button *ngIf="lightbox()" class="comment-lightbox" type="button" (click)="lightbox.set('')" aria-label="Fechar imagem"><img [src]="lightbox()" alt="Evidência ampliada" /></button>
    </main>

    <ng-template #carregando>
      <main class="admin-content">
        <div class="review-detail-load-state">
          <h1>{{ erro() || 'Carregando denúncia...' }}</h1>
          <a routerLink="/admin/denuncias"><svg lucideArrowLeft />Voltar para denúncias</a>
        </div>
      </main>
    </ng-template>
  `,
})
export class AdminReportDetailsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly detalhe = signal<ComplaintDetails | null>(null);
  protected readonly erro = signal('');
  protected readonly salvando = signal(false);
  protected readonly lightbox = signal('');
  protected parecer = '';
  protected notificar = true;
  protected diasSuspensao = 7;
  protected readonly suspensionOptions = [{ value: 7, label: '7 dias' }, { value: 30, label: '30 dias' }];

  ngOnInit() {
    this.carregar();
  }

  protected assetUrl(caminho: string) {
    return this.api.assetUrl(caminho);
  }

  protected fotoDoPrestador(denuncia: ComplaintDetails) {
    return this.api.assetUrl(denuncia.professionalSummary.avatar);
  }

  protected iniciais(nome: string) {
    return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
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

  protected mudarStatus(status: string) {
    const id = this.detalhe()?.id;
    if (!id) return;
    this.api.updateComplaintStatus(id, status).subscribe({
      next: (detalhe) => {
        this.aplicarDetalhe(detalhe);
        this.toast.success(`Denúncia marcada como ${status.toLowerCase()}.`);
      },
      error: () => this.toast.error('Não foi possível atualizar a denúncia.'),
    });
  }

  protected suspender() {
    this.aplicar(this.diasSuspensao === 30 ? 'suspend30' : 'suspend7');
  }

  protected aplicar(acao: string) {
    const id = this.detalhe()?.id;
    if (!id) return;
    this.api.applyComplaintAction(id, acao).subscribe({
      next: (detalhe) => {
        this.aplicarDetalhe(detalhe);
        this.toast.success(`Ação registrada: ${detalhe.professionalSummary.status.toLowerCase()}.`);
      },
      error: () => this.toast.error('Não foi possível aplicar a ação.'),
    });
  }

  protected salvarParecer() {
    const id = this.detalhe()?.id;
    if (!id) return;
    this.salvando.set(true);
    this.api.saveComplaintNote(id, this.parecer, this.notificar).subscribe({
      next: (detalhe) => {
        this.salvando.set(false);
        this.aplicarDetalhe(detalhe);
        this.toast.success('Parecer registrado no histórico.');
      },
      error: () => {
        this.salvando.set(false);
        this.toast.error('Não foi possível salvar o parecer.');
      },
    });
  }

  private carregar() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.getComplaintDetails(id).subscribe({
      next: (detalhe) => this.aplicarDetalhe(detalhe),
      error: () => this.erro.set('Denúncia não encontrada.'),
    });
  }

  private aplicarDetalhe(detalhe: ComplaintDetails) {
    this.detalhe.set(detalhe);
    this.parecer = detalhe.adminNote ?? '';
    this.notificar = detalhe.notifyParties !== false;
  }
}
