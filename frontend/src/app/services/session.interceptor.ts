import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService, AuthSession } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

/**
 * Renovação em andamento, compartilhada entre requisições. Sem isso, uma tela
 * que dispara várias chamadas de uma vez (a de IA faz três) pediria vários
 * refreshes em paralelo e só o último valeria — derrubando os outros.
 */
let renovacaoEmAndamento: Observable<AuthSession | null> | null = null;

const comToken = (requisicao: HttpRequest<unknown>, token: string) =>
  requisicao.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * O servidor responde "Sessão inválida" quando não reconhece mais a conta —
 * o que acontece, por exemplo, depois que a API reinicia. Sem isso, a tela
 * apenas dizia que a ação falhou e a pessoa ficava presa em um login fantasma.
 *
 * Também anexa o token de acesso e, quando ele expira (dura 15 minutos), troca
 * o refresh token por um novo par e repete a requisição, de forma transparente.
 */
export const sessionInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  // Enviamos o token somente para a própria API, para não vazar a sessão a terceiros.
  const daApi = requisicao.url.startsWith(environment.apiUrl);
  // As rotas de autenticação não podem tentar renovar: gerariam recursão.
  const deAutenticacao = requisicao.url.includes('/auth/');
  const token = auth.session()?.accessToken;
  const requisicaoAutenticada = token && daApi ? comToken(requisicao, token) : requisicao;

  return proximo(requisicaoAutenticada).pipe(
    catchError((erro: HttpErrorResponse) => {
      const mensagem = String((erro.error as { message?: string })?.message ?? '');
      if (/sess[ãa]o inv[áa]lida/i.test(mensagem) && auth.isAuthenticated()) {
        encerrarSessao(auth, toast, router, 'Sua sessão expirou. Entre novamente para continuar.');
        return throwError(() => erro);
      }

      const podeRenovar = erro.status === 401 && daApi && !deAutenticacao && !!auth.session()?.refreshToken;
      if (!podeRenovar) return throwError(() => erro);

      renovacaoEmAndamento ??= auth.refreshSession().pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        finalize(() => {
          renovacaoEmAndamento = null;
        }),
      );

      return renovacaoEmAndamento.pipe(
        // Este catchError vem ANTES do switchMap de propósito: ele trata apenas a
        // falha da renovação. Depois do switchMap, ele também capturaria erros da
        // requisição repetida (um 500 qualquer) e deslogaria a pessoa sem motivo.
        catchError(() => {
          // O refresh token também venceu (7 dias) ou foi recusado: aí sim é relogar.
          encerrarSessao(auth, toast, router, 'Sua sessão expirou. Entre novamente para continuar.');
          return throwError(() => erro);
        }),
        switchMap((sessao) => {
          if (!sessao) return throwError(() => erro);
          return proximo(comToken(requisicao, sessao.accessToken));
        }),
      );
    }),
  );
};

function encerrarSessao(auth: AuthService, toast: ToastService, router: Router, mensagem: string) {
  const eraAdmin = router.url.startsWith('/admin');
  auth.logout();
  toast.error(mensagem);
  void router.navigateByUrl(eraAdmin ? '/admin/login' : '/login');
}
