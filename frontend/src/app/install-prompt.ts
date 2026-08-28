import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { LucideDownload, LucideShare, LucideX } from '@lucide/angular';
import { brand } from './brand';

/** Evento do Chrome/Edge que permite abrir a instalação a partir de um botão nosso. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHAVE_DISPENSADO = 'indicafacil-instalacao-dispensada';

@Component({
  selector: 'install-prompt',
  standalone: true,
  imports: [CommonModule, LucideDownload, LucideShare, LucideX],
  template: `
    <aside *ngIf="visivel()" class="install-banner" [class.acima-da-navegacao]="comNavegacao()" role="dialog" aria-label="Instalar aplicativo">
      <img [src]="brand.assets.icon" alt="Símbolo IndicaFácil" />
      <div class="install-texto">
        <strong>Instalar o IndicaFácil</strong>
        <p *ngIf="modo() === 'android'">Adicione na tela de início e abra como aplicativo, sem passar pelo navegador.</p>
        <p *ngIf="modo() === 'ios-safari'">Toque em <svg lucideShare /> Compartilhar e escolha <b>Adicionar à Tela de Início</b>.</p>
        <p *ngIf="modo() === 'ios-chrome'">Toque em <b>⋯</b> no canto do Chrome e escolha <b>Adicionar à Tela de Início</b>.</p>
        <p *ngIf="modo() === 'ios-outro'">Abra o menu do navegador e escolha <b>Adicionar à Tela de Início</b>.</p>
      </div>
      <button *ngIf="modo() === 'android'" class="install-acao" type="button" (click)="instalar()"><svg lucideDownload />Instalar</button>
      <button class="install-fechar" type="button" aria-label="Agora não" (click)="dispensar()"><svg lucideX /></button>
    </aside>
  `,
})
export class InstallPromptComponent implements OnInit {
  protected readonly brand = brand;
  protected readonly visivel = signal(false);
  protected readonly modo = signal<'android' | 'ios-safari' | 'ios-chrome' | 'ios-outro'>('android');
  protected readonly comNavegacao = signal(false);
  private evento: BeforeInstallPromptEvent | null = null;

  ngOnInit() {
    if (this.jaInstalado() || this.foiDispensado()) return;
    if (!this.ehIos()) return;
    // No iPhone e no iPad o navegador nunca dispara o evento de instalacao,
    // entao o convite precisa aparecer sozinho e so explicar o caminho.
    this.modo.set(this.navegadorIos());
    setTimeout(() => this.mostrar(), 2000);
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  protected aoPoderInstalar(evento: Event) {
    evento.preventDefault();
    if (this.jaInstalado() || this.foiDispensado()) return;
    this.evento = evento as BeforeInstallPromptEvent;
    this.modo.set('android');
    this.mostrar();
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

  private mostrar() {
    // fora das telas logadas nao existe barra inferior, entao o banner desce
    this.comNavegacao.set(Boolean(document.querySelector('.bottom-nav')));
    this.visivel.set(true);
  }

  /** iPadOS se identifica como Macintosh; o toque na tela é o que o entrega. */
  private ehIos() {
    const agente = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(agente)) return true;
    return /Macintosh/i.test(agente) && navigator.maxTouchPoints > 1;
  }

  /**
   * Desde o iOS 16.4 os outros navegadores também instalam na tela de início,
   * cada um pelo seu próprio menu. Dizer "abra no Safari" mandaria o usuário
   * para um caminho mais longo sem necessidade.
   */
  private navegadorIos(): 'ios-safari' | 'ios-chrome' | 'ios-outro' {
    const agente = navigator.userAgent;
    if (/crios/i.test(agente)) return 'ios-chrome';
    if (/fxios|edgios|opios/i.test(agente)) return 'ios-outro';
    return 'ios-safari';
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
