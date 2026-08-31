import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Identidade vinda do token, nunca da URL.
 *
 * Antes cada rota recebia `?userId=` e confiava no que o cliente mandasse:
 * trocar o id na barra de endereços era o bastante para ler os dados de outra
 * pessoa. Estes decoradores leem o `sub` que o JwtStrategy validou, então a
 * identidade passa a ser assinada pelo servidor.
 */
export const CurrentUser = createParamDecorator((_dado: unknown, contexto: ExecutionContext): JwtPayload | undefined => {
  return contexto.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
});

/** Id do usuário autenticado. Só use em rota protegida por JwtAuthGuard. */
export const UserId = createParamDecorator((_dado: unknown, contexto: ExecutionContext): string => {
  return contexto.switchToHttp().getRequest<{ user?: JwtPayload }>().user?.sub ?? '';
});

/**
 * Id do usuário quando existe sessão, vazio quando não existe. Para rota
 * pública que personaliza o retorno de quem está logado — o perfil do
 * profissional, por exemplo, que marca se você já favoritou.
 */
export const OptionalUserId = createParamDecorator((_dado: unknown, contexto: ExecutionContext): string | undefined => {
  return contexto.switchToHttp().getRequest<{ user?: JwtPayload }>().user?.sub;
});
