import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { PaginatedActivities } from '../../domain/activity.entity';
import type { ListLeadActivitiesQueryDto } from '../dto/list-lead-activities-query.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LeadAccessPolicy } from '../services/lead-access.policy';

@Injectable()
export class ListLeadActivitiesUseCase {
  constructor(
    private readonly accessPolicy: LeadAccessPolicy,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
  ) {}

  async execute(leadId: string, query: ListLeadActivitiesQueryDto, user: AuthenticatedUser, ipAddress?: string): Promise<PaginatedActivities> {
    await this.accessPolicy.assertCanAccessLead(leadId, user, 'lead.activities.view', ipAddress);
    return this.activities.listByLeadId(leadId, query);
  }
}