import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { CreateFollowUpDto } from '../dto/create-follow-up.dto';
import type { ListFollowUpsQueryDto } from '../dto/list-follow-ups-query.dto';
import type { FollowUpEntity, PaginatedFollowUps } from '../../domain/follow-up.entity';

export const FOLLOW_UP_REPOSITORY = Symbol('FOLLOW_UP_REPOSITORY');

export interface CreateFollowUpData extends CreateFollowUpDto {
  leadId: string;
  userId: string;
  scheduledAt: Date;
}

export interface FollowUpRepository {
  createAndCancelPreviousPending(data: CreateFollowUpData): Promise<{ created: FollowUpEntity; cancelled: FollowUpEntity[] }>;
  listByLeadId(leadId: string): Promise<FollowUpEntity[]>;
  list(query: ListFollowUpsQueryDto, user?: AuthenticatedUser): Promise<PaginatedFollowUps>;
  listToday(user?: AuthenticatedUser): Promise<FollowUpEntity[]>;
  listOverdue(user?: AuthenticatedUser): Promise<FollowUpEntity[]>;
  findById(id: string): Promise<FollowUpEntity | null>;
  complete(id: string): Promise<FollowUpEntity | null>;
  cancel(id: string): Promise<FollowUpEntity | null>;
}