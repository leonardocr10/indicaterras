import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { LucideDownload, LucideShare, LucideX } from '@lucide/angular';

/** Evento do Chrome/Edge que permite abrir a instalação a partir de um botão nosso. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHAVE_DISPENSADO = 'alphas-indica-instalacao-dispensada';

@Component({
  selector: 'install-prompt',
  standalone: true,
  imports: [CommonModule, LucideDownload, LucideShare, LucideX],
  template: `
    <aside *ngIf="visivel()" class="install-banner" role="dialog" aria-label="Instalar aplicativo">
      <img src="icons/icon-96x96.png" alt="" />
      <div class="install-texto">
        <strong>Instalar o Alphas Indica</strong>
        <p *ngIf="!ehIos()">Adicione na tela de início e abra como aplicativo, sem passar pelo navegador.</p>
        <p *ngIf="ehIos()">Toque em <svg lucideShare /> Compartilhar e escolha <b>Adicionar à Tela de Início</b>.</p>
      </div>
      <button *ngIf="!ehIos()" class="install-acao" type="button" (click)="instalar()"><svg lucideDownload />Instalar</button>
      <button class="install-fechar" type="button" aria-label="Agora não" (click)="dispensar()"><svg lucideX /></button>
    </aside>
  `,
})
export class InstallPromptComponent implements OnInit {
  protected readonly visivel = signal(false);
  protected readonly ehIos = signal(false);
  private evento: BeforeInstallPromptEvent | null = null;

  ngOnInit() {
    if (this.jaInstalado() || this.foiDispensado()) return;
    const agente = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(agente) && !/crios|fxios/i.test(agente);
    this.ehIos.set(ios);
    // No iPhone o navegador não oferece o evento de instalação: resta explicar o caminho.
    if (ios) setTimeout(() => this.visivel.set(true), 2500);
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  protected aoPoderInstalar(evento: Event) {
    evento.preventDefault();
    if (this.jaInstalado() || this.foiDispensado()) return;
    this.evento = evento as BeforeInstallPromptEvent;
    this.visivel.set(true);
  }

  @HostListener('window:appinstalled')
  protected aoInstalar() {
    this.visivel.set(false);
    this.evento = null;
  }

  protected async instalar() {
    if (!this.evento) return;
    await this.evento.prompt();
    const escolha = await this.evento.userChoice;
    this.evento = null;
    this.visivel.set(false);
    if (escolha.outcome === 'dismissed') this.marcarDispensado();
  }

  protected dispensar() {
    this.visivel.set(false);
    this.marcarDispensado();
  }

  private jaInstalado() {
    const iosInstalado = (navigator as unknown as { standalone?: boolean }).standalone === true;
    return iosInstalado || window.matchMedia('(display-mode: standalone)').matches;
  }

  private foiDispensado() {
    try {
      const ate = Number(localStorage.getItem(CHAVE_DISPENSADO) ?? 0);
      return Date.now() < ate;
    } catch {
      return false;
    }
  }

  private marcarDispensado() {
    try {
      // volta a oferecer depois de uma semana
      localStorage.setItem(CHAVE_DISPENSADO, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {
      // navegador sem armazenamento: apenas não insiste nesta sessão
    }
  }
}
