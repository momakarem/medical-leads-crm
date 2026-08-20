import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { LeadAccessPolicy } from '../../../leads/application/services/lead-access.policy';
import type { FollowUpEntity } from '../../domain/follow-up.entity';
import { FOLLOW_UP_REPOSITORY, type FollowUpRepository } from '../ports/follow-up.repository';

@Injectable()
export class ListLeadFollowUpsUseCase {
  constructor(
    @Inject(FOLLOW_UP_REPOSITORY) private readonly followUps: FollowUpRepository,
    private readonly accessPolicy: LeadAccessPolicy,
  ) {}

  async execute(leadId: string, user: AuthenticatedUser, ipAddress?: string): Promise<FollowUpEntity[]> {
    await this.accessPolicy.assertCanAccessLead(leadId, user, 'lead.follow_ups.view', ipAddress);
    return this.followUps.listByLeadId(leadId);
  }
}