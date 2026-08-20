import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../../../leads/application/ports/activity.repository';
import { ActivityDescriptionService } from '../../../leads/application/services/activity-description.service';
import { LeadAccessPolicy } from '../../../leads/application/services/lead-access.policy';
import { ActivityType } from '../../../leads/domain/activity-type.enum';
import type { FollowUpEntity } from '../../domain/follow-up.entity';
import { FOLLOW_UP_REPOSITORY, type FollowUpRepository } from '../ports/follow-up.repository';

@Injectable()
export class CancelFollowUpUseCase {
  constructor(
    @Inject(FOLLOW_UP_REPOSITORY) private readonly followUps: FollowUpRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
    private readonly accessPolicy: LeadAccessPolicy,
  ) {}

  async execute(id: string, currentUser: AuthenticatedUser, ipAddress?: string): Promise<FollowUpEntity> {
    const existing = await this.followUps.findById(id);
    if (!existing) throw new NotFoundException('Follow-up not found.');
    await this.accessPolicy.assertCanAccessLead(existing.leadId, currentUser, 'follow_up.cancel', ipAddress);

    const followUp = await this.followUps.cancel(id);
    if (!followUp) throw new NotFoundException('Follow-up not found.');
    const copy = this.activityDescriptions.followUpCancelled(currentUser);
    await this.activities.create({
      leadId: followUp.leadId,
      userId: currentUser.id,
      type: ActivityType.FollowUpCancelled,
      title: copy.title,
      description: copy.description,
      metadata: { follow_up_id: followUp.id, status: 'cancelled' },
    });
    return followUp;
  }
}