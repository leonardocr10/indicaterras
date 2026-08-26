import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const residentGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  const role = auth.user()?.role;
  if (role === 'RESIDENT') return true;
  return router.createUrlTree([role === 'PROFESSIONAL' ? '/profissional/perfil' : '/admin/dashboard']);
};

export const professionalGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.user()?.role === 'PROFESSIONAL' ? true : router.createUrlTree(['/app/home']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/admin/login']);
  const role = auth.user()?.role;
  return role === 'CONDO_ADMIN' || role === 'SUPER_ADMIN' ? true : router.createUrlTree(['/app/home']);
};
