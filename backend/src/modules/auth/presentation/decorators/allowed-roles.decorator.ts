import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../../users/domain/user-role.enum';

export const ALLOWED_ROLES_KEY = 'allowedRoles';
export const AllowedRoles = (...roles: UserRole[]) => SetMetadata(ALLOWED_ROLES_KEY, roles);