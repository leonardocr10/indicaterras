import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideCheckCircle2, LucideCircleAlert, LucideInfo, LucideX } from '@lucide/angular';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'toast-outlet',
  standalone: true,
  imports: [CommonModule, LucideCheckCircle2, LucideCircleAlert, LucideInfo, LucideX],
  template: `
    <div *ngIf="toast.current() as item" class="app-toast-layer" aria-live="polite" aria-atomic="true">
      <article class="app-toast" [class.error]="item.kind === 'error'" [class.info]="item.kind === 'info'" role="status">
        <span class="app-toast-icon"><svg *ngIf="item.kind === 'success'" lucideCheckCircle2 /><svg *ngIf="item.kind === 'error'" lucideCircleAlert /><svg *ngIf="item.kind === 'info'" lucideInfo /></span>
        <p>{{ item.message }}</p>
        <button type="button" aria-label="Fechar aviso" (click)="toast.dismiss()"><svg lucideX /></button>
      </article>
    </div>
  `,
})
export class ToastOutletComponent {
  protected readonly toast = inject(ToastService);
}
