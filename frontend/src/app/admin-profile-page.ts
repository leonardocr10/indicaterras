import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideKeyRound, LucideSave, LucideUserRound } from '@lucide/angular';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'admin-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideKeyRound, LucideSave, LucideUserRound],
  template: `
    <main class="admin-content admin-profile-content">
      <header class="admin-topbar"><div><h1>Meu perfil</h1><p>Gerencie seus dados de cadastro e a segurança da sua conta.</p></div></header>
      <div class="admin-profile-grid">
        <section class="admin-profile-card">
          <header><span><svg lucideUserRound /></span><div><h2>Dados de cadastro</h2><p>Estas informações identificam seu acesso à plataforma.</p></div></header>
          <form (ngSubmit)="saveProfile()">
            <label>Nome completo<input name="name" [(ngModel)]="profile.name" required /></label>
            <label>E-mail<input name="email" type="email" [(ngModel)]="profile.email" required /></label>
            <label>Telefone<input name="phone" [(ngModel)]="profile.phone" placeholder="(00) 00000-0000" /></label>
            <button class="primary-button" type="submit" [disabled]="savingProfile()"><svg lucideSave />{{ savingProfile() ? 'Salvando...' : 'Salvar dados' }}</button>
          </form>
        </section>
        <section class="admin-profile-card security">
          <header><span><svg lucideKeyRound /></span><div><h2>Alterar senha</h2><p>Use uma senha forte, com pelo menos 6 caracteres.</p></div></header>
          <form (ngSubmit)="changePassword()">
            <label>Senha atual<input name="currentPassword" type="password" [(ngModel)]="password.current" required /></label>
            <label>Nova senha<input name="newPassword" type="password" [(ngModel)]="password.next" minlength="6" required /></label>
            <label>Confirmar nova senha<input name="confirmPassword" type="password" [(ngModel)]="password.confirm" minlength="6" required /></label>
            <p *ngIf="passwordError()" class="admin-profile-error">{{ passwordError() }}</p>
            <button class="secondary-button" type="submit" [disabled]="savingPassword()"><svg lucideKeyRound />{{ savingPassword() ? 'Atualizando...' : 'Atualizar senha' }}</button>
          </form>
        </section>
      </div>
      <p *ngIf="feedback()" class="admin-profile-feedback">{{ feedback() }}</p>
    </main>
  `,
})
export class AdminProfilePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly feedback = signal('');
  protected readonly passwordError = signal('');
  protected profile = { name: '', email: '', phone: '' };
  protected password = { current: '', next: '', confirm: '' };

  ngOnInit() { this.api.getMyAccount().subscribe({ next: (user) => this.profile = { name: user.name, email: user.email, phone: user.phone ?? '' } }); }
  protected saveProfile() {
    this.savingProfile.set(true); this.feedback.set('');
    this.api.updateMyAccount(this.profile).subscribe({ next: (user) => { this.auth.updateSessionUser({ ...user, phone: user.phone ?? '' }); this.savingProfile.set(false); this.feedback.set('Dados atualizados com sucesso.'); }, error: (error) => { this.savingProfile.set(false); this.feedback.set(error.error?.message ?? 'Não foi possível salvar os dados.'); } });
  }
  protected changePassword() {
    this.passwordError.set('');
    if (this.password.next !== this.password.confirm) { this.passwordError.set('A confirmação da nova senha não confere.'); return; }
    this.savingPassword.set(true);
    this.api.changeMyPassword(this.password.current, this.password.next).subscribe({ next: () => { this.savingPassword.set(false); this.password = { current: '', next: '', confirm: '' }; this.feedback.set('Senha atualizada com sucesso.'); }, error: (error) => { this.savingPassword.set(false); this.passwordError.set(error.error?.message ?? 'Não foi possível atualizar a senha.'); } });
  }
}
