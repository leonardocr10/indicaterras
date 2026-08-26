import { SetMetadata } from '@nestjs/common';
import { AppRole } from '../data/demo-data';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
