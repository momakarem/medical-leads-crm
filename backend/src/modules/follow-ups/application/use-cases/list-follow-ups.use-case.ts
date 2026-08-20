import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { PaginatedFollowUps } from '../../domain/follow-up.entity';
import type { ListFollowUpsQueryDto } from '../dto/list-follow-ups-query.dto';
import { FOLLOW_UP_REPOSITORY, type FollowUpRepository } from '../ports/follow-up.repository';

@Injectable()
export class ListFollowUpsUseCase {
  constructor(@Inject(FOLLOW_UP_REPOSITORY) private readonly followUps: FollowUpRepository) {}
  execute(query: ListFollowUpsQueryDto, user: AuthenticatedUser): Promise<PaginatedFollowUps> { return this.followUps.list(query, user); }
}