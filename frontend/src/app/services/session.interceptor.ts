import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * O servidor responde "Sessão inválida" quando não reconhece mais a conta —
 * o que acontece, por exemplo, depois que a API reinicia. Sem isso, a tela
 * apenas dizia que a ação falhou e a pessoa ficava presa em um login fantasma.
 */
export const sessionInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return proximo(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      const mensagem = String((erro.error as { message?: string })?.message ?? '');
      if (/sess[ãa]o inv[áa]lida/i.test(mensagem) && auth.isAuthenticated()) {
        auth.logout();
        toast.error('Sua sessão expirou. Entre novamente para continuar.');
        void router.navigateByUrl('/login');
      }
      return throwError(() => erro);
    }),
  );
};
