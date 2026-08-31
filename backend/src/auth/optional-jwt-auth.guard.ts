import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Autentica quando há token e deixa passar quando não há.
 *
 * Serve às rotas públicas que mudam de cara para quem está logado — o perfil do
 * profissional marca se você já favoritou, a lista de comentários marca os que
 * você curtiu. Sem este guard o `req.user` nunca seria preenchido nelas, porque
 * o Passport só roda dentro de um guard.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(contexto);
    } catch {
      // Token ausente, expirado ou inválido: segue como visitante.
    }
    return true;
  }

  handleRequest<TUser>(_erro: unknown, usuario: TUser): TUser {
    return usuario;
  }
}
