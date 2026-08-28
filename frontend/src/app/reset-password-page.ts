import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCheckCircle2, LucideEye, LucideEyeOff, LucideLockKeyhole, LucideTriangleAlert } from '@lucide/angular';
import { brand } from './brand';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideCheckCircle2, LucideEye, LucideEyeOff, LucideLockKeyhole, LucideTriangleAlert],
  template: `
    <section class="auth-page">
      <div class="auth-card reset-card">
        <img class="auth-logo" [src]="brand.assets.logoPrimary" [alt]="brand.name" />

        <ng-container *ngIf="!token; else comToken">
          <div class="reset-state error"><svg lucideTriangleAlert /><h1>Link inválido</h1><p>Este endereço não tem um código de redefinição. Peça um novo link na tela de login.</p></div>
          <a routerLink="/login" class="primary-button full-width">Voltar ao login</a>
        </ng-container>

        <ng-template #comToken>
          <ng-container *ngIf="!done(); else pronto">
            <div class="login-heading"><h1>Criar nova senha</h1><p>Escolha uma senha para voltar a acessar sua conta.</p></div>
            <label class="auth-field">Nova senha
              <span><svg lucideLockKeyhole /><input [type]="show() ? 'text' : 'password'" placeholder="Digite a nova senha" [(ngModel)]="password" (ngModelChange)="passwordValue.set($event)" /><button type="button" aria-label="Mostrar ou ocultar senha" (click)="show.set(!show())"><svg *ngIf="!show()" lucideEye /><svg *ngIf="show()" lucideEyeOff /></button></span>
            </label>
            <div class="password-strength" *ngIf="passwordValue()" [attr.data-level]="score()">
              <div class="password-strength-bar"><i *ngFor="let step of [1, 2, 3, 4]" [class.on]="score() >= step"></i></div>
              <small><b>{{ label() }}</b></small>
            </div>
            <label class="auth-field">Confirmar senha
              <span><svg lucideLockKeyhole /><input type="password" placeholder="Repita a nova senha" [(ngModel)]="confirm" (ngModelChange)="confirmValue.set($event)" /></span>
            </label>
            <p *ngIf="error()" class="form-feedback error">{{ error() }}</p>
            <button type="button" class="primary-button full-width" [disabled]="saving()" (click)="submit()">{{ saving() ? 'Salvando...' : 'Salvar nova senha' }}</button>
          </ng-container>
          <ng-template #pronto>
            <div class="reset-state"><svg lucideCheckCircle2 /><h1>Senha alterada</h1><p>Tudo certo! Agora você já pode entrar com a nova senha.</p></div>
            <a routerLink="/login" class="primary-button full-width">Ir para o login</a>
          </ng-template>
        </ng-template>
      </div>
    </section>
  `,
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly brand = brand;
  protected token = '';
  protected password = '';
  protected confirm = '';
  protected readonly passwordValue = signal('');
  protected readonly confirmValue = signal('');
  protected readonly show = signal(false);
  protected readonly saving = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal('');

  protected readonly score = computed(() => {
    const value = this.passwordValue();
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(4, value.length < 6 ? 1 : Math.max(1, score));
  });
  protected readonly label = computed(() => ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][this.score()]);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit() {
    if (this.password.length < 6) {
      this.error.set('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('As duas senhas não são iguais.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.saving.set(false);
        this.done.set(true);
      },
      error: (erro: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.error.set(erro.error?.message ?? 'Não foi possível alterar a senha. Peça um novo link.');
      },
    });
  }
}
