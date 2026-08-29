import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCamera, LucideImage, LucideSend, LucideSmile, LucideThumbsUp, LucideX } from '@lucide/angular';
import { of, switchMap } from 'rxjs';
import { Professional, ProfessionalComment } from './models';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'comments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideArrowLeft, LucideCamera, LucideImage, LucideSend, LucideSmile, LucideThumbsUp, LucideX],
  template: `
    <section class="mobile-page comments-page">
      <header class="comments-header">
        <a [routerLink]="['/app/profissional', professionalId()]" aria-label="Voltar ao perfil"><svg lucideArrowLeft /></a>
        <div><h1>Comentários</h1><p>{{ comments().length }} comentários públicos</p></div>
      </header>

      <section class="comment-composer">
        <div class="comment-avatar current-user-avatar">{{ currentUserInitials() }}</div>
        <div class="comment-compose-main">
          <textarea #composer class="comment-textarea" [(ngModel)]="draft" (input)="autoGrow($event)" maxlength="700" rows="1" placeholder="Escreva um comentário..." aria-label="Novo comentário"></textarea>
          <div *ngIf="emojiOpen()" class="comment-emoji-picker">
            <button *ngFor="let emoji of emojis" type="button" (click)="addEmoji(emoji)">{{ emoji }}</button>
          </div>
          <div *ngIf="photoPreviews().length" class="comment-selected-photos">
            <figure *ngFor="let preview of photoPreviews(); let index = index"><img [src]="preview" alt="Foto selecionada" /><button type="button" (click)="removePhoto(index)" aria-label="Remover foto"><svg lucideX /></button></figure>
          </div>
          <div class="comment-compose-footer">
            <div class="comment-compose-tools">
              <label class="comment-icon-button" aria-label="Adicionar fotos"><svg lucideCamera /><input type="file" multiple accept="image/png,image/jpeg,image/webp" (change)="selectPhotos($event)" /></label>
              <button class="comment-icon-button" type="button" aria-label="Adicionar emoji" (click)="emojiOpen.set(!emojiOpen())"><svg lucideSmile /></button>
              <div class="comment-rating" aria-label="Nota do comentário">
                <button *ngFor="let star of stars" type="button" [class.active]="star <= rating()" (click)="rating.set(star)" [attr.aria-label]="star + ' estrelas'">★</button>
              </div>
            </div>
            <button class="comment-send-button" type="button" [disabled]="submitting() || (!draft.trim() && !selectedPhotos.length)" (click)="publish()"><svg lucideSend />{{ submitting() ? 'Publicando...' : 'Publicar' }}</button>
          </div>
        </div>
      </section>
      <p class="comments-helper">Compartilhe sua experiência com todos os clientes.</p>

      <div *ngIf="loading()" class="comments-empty">Carregando comentários...</div>
      <div *ngIf="!loading() && !comments().length" class="comments-empty"><svg lucideImage /><h2>Seja o primeiro a comentar</h2><p>Conte como foi sua experiência com este profissional.</p></div>

      <article *ngFor="let comment of comments()" class="comment-feed-item">
        <div class="comment-avatar">
          <img *ngIf="comment.userAvatar" [src]="assetUrl(comment.userAvatar)" [alt]="'Foto de ' + comment.userName" />
          <span *ngIf="!comment.userAvatar">{{ initials(comment.userName) }}</span>
        </div>
        <div class="comment-feed-content">
          <header><strong>{{ comment.userName }}</strong><time>{{ relativeTime(comment.createdAt) }}</time></header>
          <div class="feed-stars"><span *ngFor="let star of stars" [class.muted]="star > comment.rating">★</span></div>
          <p class="comment-text">{{ comment.comment }}</p>
          <div *ngIf="comment.images.length" class="comment-photo-grid" [class.single]="comment.images.length === 1">
            <button *ngFor="let image of comment.images" type="button" (click)="lightboxImage.set(assetUrl(image))"><img [src]="assetUrl(image)" alt="Foto anexada ao comentário" /></button>
          </div>
          <div class="comment-actions">
            <button type="button" [class.active]="comment.liked" (click)="toggleLike(comment)"><svg lucideThumbsUp [attr.fill]="comment.liked ? 'currentColor' : 'none'" />{{ comment.likes || '' }}</button>
            <button type="button" (click)="openReply(comment.id)">Responder</button>
          </div>
          <div *ngIf="comment.replies.length" class="comment-replies">
            <div *ngFor="let reply of comment.replies"><strong>{{ reply.userName }}</strong><p>{{ reply.comment }}</p><time>{{ relativeTime(reply.createdAt) }}</time></div>
          </div>
          <form *ngIf="replyingTo() === comment.id" class="comment-reply-form" (ngSubmit)="sendReply(comment)">
            <input [(ngModel)]="replyDraft" name="reply" maxlength="400" placeholder="Escreva uma resposta..." autofocus />
            <button type="submit" [disabled]="!replyDraft.trim()"><svg lucideSend /></button>
          </form>
        </div>
      </article>
    </section>

    <button *ngIf="lightboxImage()" class="comment-lightbox" type="button" (click)="lightboxImage.set('')" aria-label="Fechar foto ampliada"><img [src]="lightboxImage()" alt="Foto ampliada" /><span><svg lucideX /></span></button>
  `,
})
export class CommentsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly professionalId = signal('');
  protected readonly professional = signal<Professional | null>(null);
  protected readonly comments = signal<ProfessionalComment[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly rating = signal(5);
  protected readonly emojiOpen = signal(false);
  protected readonly photoPreviews = signal<string[]>([]);
  protected readonly replyingTo = signal('');
  protected readonly lightboxImage = signal('');
  protected readonly currentUserInitials = computed(() => this.initials(this.auth.user()?.name ?? 'Cliente'));
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly emojis = ['😊', '👏', '👍', '⭐', '💚', '🙏'];
  protected readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  protected draft = '';
  protected replyDraft = '';
  protected selectedPhotos: File[] = [];

  ngOnDestroy() {
    this.photoPreviews().forEach((preview) => URL.revokeObjectURL(preview));
  }

  ngOnInit() {
    this.professionalId.set(this.route.snapshot.paramMap.get('id') ?? '');
    // quem chega pelo botao "Avaliar" ja encontra o campo pronto para escrever
    if (this.route.snapshot.queryParamMap.get('avaliar')) {
      setTimeout(() => {
        const campo = this.composer()?.nativeElement;
        campo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        campo?.focus();
      }, 250);
    }
    this.api.getProfessional(this.professionalId()).subscribe((professional) => this.professional.set(professional));
    this.loadComments();
  }

  protected assetUrl(path: string) { return this.api.assetUrl(path); }

  protected initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  protected relativeTime(value: string) {
    const elapsed = Math.max(0, Date.now() - Date.parse(value));
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    const weeks = Math.floor(days / 7);
    return `Há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }

  protected selectPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const accepted = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/')).slice(0, 10 - this.selectedPhotos.length);
    const oversized = accepted.find((file) => file.size > 10 * 1024 * 1024);
    if (oversized) {
      this.toast.error('Cada foto pode ter no máximo 10 MB.');
      input.value = '';
      return;
    }
    this.selectedPhotos = [...this.selectedPhotos, ...accepted].slice(0, 10);
    this.refreshPreviews();
    input.value = '';
  }

  protected removePhoto(index: number) {
    this.selectedPhotos = this.selectedPhotos.filter((_file, position) => position !== index);
    this.refreshPreviews();
  }

  protected autoGrow(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  protected addEmoji(emoji: string) {
    this.draft += emoji;
    this.emojiOpen.set(false);
  }

  protected publish() {
    if (!this.draft.trim() && !this.selectedPhotos.length) return;
    this.submitting.set(true);
    const upload$ = this.selectedPhotos.length ? this.api.uploadCommentPhotos(this.selectedPhotos) : of([] as string[]);
    upload$.pipe(switchMap((images) => this.api.createReview({
      professionalId: this.professionalId(),
      rating: this.rating(),
      comment: this.draft.trim() || 'Fotos do serviço realizado.',
      images,
    }))).subscribe({
      next: () => {
        this.draft = '';
        this.selectedPhotos = [];
        this.refreshPreviews();
        this.resetComposerHeight();
        this.rating.set(5);
        this.submitting.set(false);
        this.toast.success('Comentário publicado para os clientes.');
        this.loadComments();
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Não foi possível publicar o comentário.');
      },
    });
  }

  protected toggleLike(comment: ProfessionalComment) {
    this.api.toggleCommentLike(comment.id).subscribe({
      next: (result) => this.comments.update((items) => items.map((item) => item.id === comment.id ? { ...item, liked: result.liked, likes: result.likes } : item)),
      error: () => this.toast.error('Não foi possível curtir o comentário.'),
    });
  }

  protected openReply(commentId: string) {
    this.replyingTo.set(this.replyingTo() === commentId ? '' : commentId);
    this.replyDraft = '';
  }

  protected sendReply(comment: ProfessionalComment) {
    const message = this.replyDraft.trim();
    if (!message) return;
    this.api.replyToComment(comment.id, message).subscribe({
      next: (reply) => {
        this.comments.update((items) => items.map((item) => item.id === comment.id ? { ...item, replies: [...item.replies, reply] } : item));
        this.replyDraft = '';
        this.replyingTo.set('');
      },
      error: () => this.toast.error('Não foi possível enviar a resposta.'),
    });
  }

  private refreshPreviews() {
    this.photoPreviews().forEach((preview) => URL.revokeObjectURL(preview));
    this.photoPreviews.set(this.selectedPhotos.map((file) => URL.createObjectURL(file)));
  }

  private resetComposerHeight() {
    const textarea = this.composer()?.nativeElement;
    if (textarea) textarea.style.height = 'auto';
  }

  private loadComments() {
    this.loading.set(true);
    this.api.getComments(this.professionalId()).subscribe({
      next: (comments) => {
        this.comments.set(comments);
        this.loading.set(false);
      },
      error: () => {
        this.comments.set([]);
        this.loading.set(false);
        this.toast.error('Não foi possível carregar os comentários.');
      },
    });
  }
}
