import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheckCircle2, LucideTriangleAlert, LucideUserRoundPlus } from '@lucide/angular';
import { PendingItem } from './models';
import { ApiService } from './services/api.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'admin-pending-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideUserRoundPlus, LucideTriangleAlert, LucideCheckCircle2],
  template: `
    <main class="admin-content admin-crud-content">
      <header class="admin-topbar">
        <div>
          <p class="admin-eyebrow">Gestão IndicaFácil</p>
          <h1>Central de pendências</h1>
          <p>Tudo que precisa da sua atenção, reunido em um só lugar.</p>
        </div>
      </header>

      <section class="admin-table-panel pending-list-panel">
        <div class="pending-row" *ngFor="let item of items()">
          <div class="pending-row-icon" [class.danger]="item.type === 'REPORT'">
            <svg *ngIf="item.type === 'NEW_RESIDENT' || item.type === 'NEW_PROFESSIONAL'" lucideUserRoundPlus />
            <svg *ngIf="item.type === 'REPORT'" lucideTriangleAlert />
          </div>
          <div class="pending-row-body">
            <strong>{{ item.title }}</strong>
            <span>{{ item.subtitle }}</span>
          </div>
          <div class="pending-row-actions">
            <!-- Aprovar e recusar direto daqui: abrir o cadastro só para mudar
                 um status transformava a fila em um vaivém de telas. -->
            <ng-container *ngIf="(item.type === 'NEW_RESIDENT' || item.type === 'NEW_PROFESSIONAL') && item.targetId">
              <button type="button" class="pending-approve" [disabled]="processing() === item.targetId" (click)="decidir(item, 'APPROVED')">Aprovar</button>
              <button type="button" class="pending-reject" [disabled]="processing() === item.targetId" (click)="decidir(item, 'REJECTED')">Recusar</button>
            </ng-container>
            <a [routerLink]="item.link">Ver</a>
          </div>
        </div>
        <div *ngIf="!items().length" class="pending-empty-state"><svg lucideCheckCircle2 /><strong>Tudo em dia</strong><p>Não há pendências que precisem da sua atenção agora.</p></div>
      </section>
    </main>
  `,
})
export class AdminPendingPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly items = signal<PendingItem[]>([]);
  protected readonly processing = signal('');

  ngOnInit() {
    this.carregar();
  }

  protected decidir(item: PendingItem, status: 'APPROVED' | 'REJECTED') {
    if (!item.targetId) return;
    this.processing.set(item.targetId);
    const recurso = item.type === 'NEW_PROFESSIONAL' ? 'professionals' : 'users';
    this.api.updateAdminRecord(recurso, item.targetId, { approvalStatus: status }).subscribe({
      next: () => {
        this.processing.set('');
        // Sai da fila: o item deixa de ser pendência assim que uma decisão é tomada.
        this.items.update((atuais) => atuais.filter((atual) => atual.id !== item.id));
        const alvo = item.type === 'NEW_PROFESSIONAL' ? 'Profissional aprovado. Ele já aparece nas buscas.' : 'Cliente aprovado. Ele já pode entrar no aplicativo.';
        this.toast.success(status === 'APPROVED' ? alvo : 'Cadastro recusado.');
      },
      error: () => {
        this.processing.set('');
        this.toast.error('Não foi possível registrar a decisão.');
      },
    });
  }

  private carregar() {
    this.api.getPendingItems().subscribe((items) => this.items.set(items));
  }
}
