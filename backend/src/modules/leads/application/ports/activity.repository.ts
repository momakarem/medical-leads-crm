import type { ActivityType } from '../../domain/activity-type.enum';
import type { ActivityEntity, PaginatedActivities } from '../../domain/activity.entity';
import type { ListLeadActivitiesQueryDto } from '../dto/list-lead-activities-query.dto';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

export interface CreateActivityData {
  leadId: string;
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  note?: string;
  outcome?: string;
  newStatus?: string;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

export interface ActivityRepository {
  create(data: CreateActivityData): Promise<ActivityEntity>;
  listByLeadId(leadId: string, query: ListLeadActivitiesQueryDto): Promise<PaginatedActivities>;
  countByLeadId(leadId: string): Promise<number>;
}