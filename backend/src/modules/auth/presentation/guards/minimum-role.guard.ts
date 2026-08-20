import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ALLOWED_ROLES_KEY } from '../decorators/allowed-roles.decorator';
import { MINIMUM_ROLE_KEY } from '../decorators/minimum-role.decorator';

const roleRanks: Record<UserRole, number> = {
  [UserRole.Marketing]: 0,
  [UserRole.Agent]: 1,
  [UserRole.Manager]: 2,
  [UserRole.Admin]: 3,
};

@Injectable()
export class MinimumRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return false;

    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ALLOWED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowedRoles?.length) return allowedRoles.includes(user.role);

    const requiredRole = this.reflector.getAllAndOverride<UserRole>(MINIMUM_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRole) return true;

    return roleRanks[user.role] >= roleRanks[requiredRole];
  }
}