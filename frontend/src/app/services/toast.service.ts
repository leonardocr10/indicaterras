import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface AppToast {
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<AppToast | null>(null);
  private timeout?: ReturnType<typeof setTimeout>;

  show(message: string, kind: ToastKind = 'success', duration = 2600): void {
    clearTimeout(this.timeout);
    this.current.set({ message, kind });
    this.timeout = setTimeout(() => this.dismiss(), duration);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 3400); }
  info(message: string): void { this.show(message, 'info'); }
  dismiss(): void { clearTimeout(this.timeout); this.current.set(null); }
}
