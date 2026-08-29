import { AppRole } from '../../data/demo-data';

export interface JwtPayload {
  sub: string;
  /** Presente só no refresh token: mantém a duração escolhida no login. */
  remember?: boolean;
  condominiumId: string;
  role: AppRole;
  email: string;
}
