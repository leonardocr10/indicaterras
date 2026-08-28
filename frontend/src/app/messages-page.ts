import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideArrowLeft, LucideMessageCircle, LucideSend } from '@lucide/angular';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { Conversation } from './models';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'messages-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideArrowLeft, LucideMessageCircle, LucideSend],
  template: `
    <section class="mobile-page messages-page">
      <header class="messages-header">
        <a routerLink="/app/profissionais" aria-label="Voltar para profissionais"><svg lucideArrowLeft /></a>
        <div><small>Conversa com</small><h1>{{ conversation()?.professional?.name || 'Prestador' }}</h1></div>
      </header>
      <main class="messages-body">
        <div *ngIf="loading()" class="messages-empty">Carregando conversa...</div>
        <div *ngIf="!loading() && !conversation()?.messages?.length" class="messages-empty"><svg lucideMessageCircle />Envie uma mensagem para iniciar a conversa. O prestador será notificado.</div>
        <article *ngFor="let message of conversation()?.messages" class="message-bubble" [class.mine]="message.sender.id === userId()"><p>{{ message.content }}</p><small>{{ message.createdAt | date:'HH:mm' }}</small></article>
      </main>
      <form class="message-composer" (ngSubmit)="send()"><textarea [(ngModel)]="draft" name="message" maxlength="1200" rows="1" placeholder="Escreva sua mensagem..."></textarea><button type="submit" [disabled]="sending() || !draft.trim()" aria-label="Enviar mensagem"><svg lucideSend /></button></form>
    </section>
  `,
})
export class MessagesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly conversation = signal<Conversation | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly userId = computed(() => this.auth.user()?.id ?? '');
  protected draft = '';
  private professionalId = '';

  ngOnInit() {
    this.professionalId = this.route.snapshot.paramMap.get('professionalId') ?? '';
    this.load();
  }

  protected send() {
    const content = this.draft.trim();
    if (!content || this.sending()) return;
    this.sending.set(true);
    this.api.sendConversationMessage(this.professionalId, content).subscribe({
      next: (conversation) => { this.conversation.set(conversation); this.draft = ''; this.sending.set(false); },
      error: () => { this.sending.set(false); this.toast.error('Não foi possível enviar a mensagem.'); },
    });
  }

  private load() {
    this.api.getConversation(this.professionalId).subscribe({
      next: (conversation) => { this.conversation.set(conversation); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Não foi possível abrir a conversa.'); },
    });
  }
}
