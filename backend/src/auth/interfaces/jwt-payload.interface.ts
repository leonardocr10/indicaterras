import { AppRole } from '../../data/demo-data';

export interface JwtPayload {
  sub: string;
  condominiumId: string;
  role: AppRole;
  email: string;
}
