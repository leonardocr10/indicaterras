import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheckCircle2, LucideTriangleAlert, LucideUserRoundPlus } from '@lucide/angular';
import { PendingItem } from './models';
import { ApiService } from './services/api.service';

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
            <svg *ngIf="item.type === 'NEW_RESIDENT'" lucideUserRoundPlus />
            <svg *ngIf="item.type === 'REPORT'" lucideTriangleAlert />
          </div>
          <div class="pending-row-body">
            <strong>{{ item.title }}</strong>
            <span>{{ item.subtitle }}</span>
          </div>
          <a [routerLink]="item.link">Ver</a>
        </div>
        <div *ngIf="!items().length" class="pending-empty-state"><svg lucideCheckCircle2 /><strong>Tudo em dia</strong><p>Não há pendências que precisem da sua atenção agora.</p></div>
      </section>
    </main>
  `,
})
export class AdminPendingPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<PendingItem[]>([]);

  ngOnInit() {
    this.api.getPendingItems().subscribe((items) => this.items.set(items));
  }
}
