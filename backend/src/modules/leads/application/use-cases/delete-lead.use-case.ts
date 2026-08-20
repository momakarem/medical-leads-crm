import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { LeadAccessPolicy } from '../services/lead-access.policy';

@Injectable()
export class DeleteLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
    private readonly accessPolicy: LeadAccessPolicy,
    private readonly duplicates: DuplicateDetectionService,
  ) {}

  async execute(id: string, currentUser: AuthenticatedUser, ipAddress?: string): Promise<LeadEntity> {
    await this.accessPolicy.assertCanAccessLead(id, currentUser, 'lead.delete', ipAddress);
    const lead = await this.leads.softDelete(id);
    if (!lead) throw new NotFoundException('Lead not found.');
    if (lead.normalizedPhone) await this.duplicates.reconcileAfterDelete(lead.normalizedPhone);
    const copy = this.activityDescriptions.leadDeleted(currentUser);
    await this.activities.create({
      leadId: lead.id,
      userId: currentUser.id,
      type: ActivityType.LeadDeleted,
      title: copy.title,
      description: copy.description,
    });
    return lead;
  }
}
