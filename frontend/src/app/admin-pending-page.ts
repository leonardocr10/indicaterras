import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideTriangleAlert, LucideUserRoundPlus } from '@lucide/angular';
import { PendingItem } from './models';
import { ApiService } from './services/api.service';

@Component({
  selector: 'admin-pending-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideUserRoundPlus, LucideTriangleAlert],
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
        <p *ngIf="!items().length" class="admin-review-empty">Nenhuma pendência no momento. Tudo em dia!</p>
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
