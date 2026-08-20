import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { toSafeUser } from '../../../users/domain/user.entity';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive || user.deletedAt) throw new UnauthorizedException('User is not authenticated.');
    return toSafeUser(user);
  }
}

