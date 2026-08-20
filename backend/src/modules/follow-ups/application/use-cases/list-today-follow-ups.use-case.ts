import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { FollowUpEntity } from '../../domain/follow-up.entity';
import { FOLLOW_UP_REPOSITORY, type FollowUpRepository } from '../ports/follow-up.repository';

@Injectable()
export class ListTodayFollowUpsUseCase {
  constructor(@Inject(FOLLOW_UP_REPOSITORY) private readonly followUps: FollowUpRepository) {}
  execute(user: AuthenticatedUser): Promise<FollowUpEntity[]> { return this.followUps.listToday(user); }
}