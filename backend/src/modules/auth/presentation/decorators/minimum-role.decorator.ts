import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../../users/domain/user-role.enum';

export const MINIMUM_ROLE_KEY = 'minimumRole';
export const MinimumRole = (role: UserRole) => SetMetadata(MINIMUM_ROLE_KEY, role);
