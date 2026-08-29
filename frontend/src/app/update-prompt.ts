import { CommonModule } from '@angular/common';
import { ApplicationRef, Component, OnInit, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { LucideRefreshCw } from '@lucide/angular';
import { concat, first, interval } from 'rxjs';

/**
 * Aviso de nova versão. O service worker guarda o app em cache para funcionar
 * offline, e sem isto a pessoa continuaria vendo a versão antiga até o
 * navegador decidir trocar — às vezes por dias.
 *
 * A troca nunca é automática: recarregar sozinho apagaria um formulário pela
 * metade. Quem decide é o usuário.
 */
@Component({
  selector: 'update-prompt',
  standalone: true,
  imports: [CommonModule, LucideRefreshCw],
  template: `
    <div class="update-prompt" *ngIf="disponivel()" role="status">
      <svg lucideRefreshCw />
      <div>
        <strong>Nova versão disponível</strong>
        <small>Atualize para ver as novidades.</small>
      </div>
      <button type="button" (click)="atualizar()" [disabled]="atualizando()">
        {{ atualizando() ? 'Atualizando...' : 'Atualizar' }}
      </button>
      <button type="button" class="depois" aria-label="Agora não" (click)="disponivel.set(false)">Agora não</button>
    </div>
  `,
})
export class UpdatePromptComponent implements OnInit {
  private readonly updates = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  protected readonly disponivel = signal(false);
  protected readonly atualizando = signal(false);

  ngOnInit() {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates.subscribe((evento) => {
      if (evento.type === 'VERSION_READY') this.disponivel.set(true);
      // Cache corrompido: recarregar do servidor é o único caminho de volta.
      if (evento.type === 'VERSION_INSTALLATION_FAILED') document.location.reload();
    });

    // Só depois que o app estabiliza, senão a checagem concorre com a abertura.
    const estavel = this.appRef.isStable.pipe(first((estado) => estado));
    concat(estavel, interval(6 * 60 * 60 * 1000)).subscribe(() => void this.updates.checkForUpdate().catch(() => undefined));
  }

  protected async atualizar() {
    this.atualizando.set(true);
    try {
      await this.updates.activateUpdate();
    } finally {
      // Recarrega mesmo se a ativação falhar: a versão nova está no cache.
      document.location.reload();
    }
  }
}
