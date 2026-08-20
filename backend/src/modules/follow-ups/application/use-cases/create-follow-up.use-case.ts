import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../../../leads/application/ports/activity.repository';
import {
  LEAD_STATUS_HISTORY_REPOSITORY,
  type LeadStatusHistoryRepository,
} from '../../../leads/application/ports/lead-status-history.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../../../leads/application/ports/lead.repository';
import { ActivityDescriptionService } from '../../../leads/application/services/activity-description.service';
import { LeadAccessPolicy } from '../../../leads/application/services/lead-access.policy';
import { LeadWorkflowService } from '../../../leads/application/services/lead-workflow.service';
import { ActivityType } from '../../../leads/domain/activity-type.enum';
import { LeadStatus } from '../../../leads/domain/lead-status.enum';
import type { FollowUpEntity } from '../../domain/follow-up.entity';
import type { CreateFollowUpDto } from '../dto/create-follow-up.dto';
import { FOLLOW_UP_REPOSITORY, type FollowUpRepository } from '../ports/follow-up.repository';

@Injectable()
export class CreateFollowUpUseCase {
  constructor(
    @Inject(FOLLOW_UP_REPOSITORY) private readonly followUps: FollowUpRepository,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(LEAD_STATUS_HISTORY_REPOSITORY) private readonly statusHistory: LeadStatusHistoryRepository,
    private readonly workflow: LeadWorkflowService,
    private readonly activityDescriptions: ActivityDescriptionService,
    private readonly accessPolicy: LeadAccessPolicy,
    private readonly prisma: PrismaService,
  ) {}

  async execute(leadId: string, data: CreateFollowUpDto, currentUser: AuthenticatedUser, ipAddress?: string): Promise<FollowUpEntity> {
    const lead = await this.accessPolicy.assertCanAccessLead(leadId, currentUser, 'lead.follow_up.create', ipAddress);

    await this.recordFirstActionIfNeeded(lead);

    const scheduledAt = new Date(`${data.date}T${data.time}:00`);
    const result = await this.followUps.createAndCancelPreviousPending({
      ...data,
      leadId,
      userId: currentUser.id,
      scheduledAt,
    });

    for (const cancelled of result.cancelled) {
      const copy = this.activityDescriptions.followUpCancelled(currentUser);
      await this.activities.create({
        leadId,
        userId: currentUser.id,
        type: ActivityType.FollowUpCancelled,
        title: copy.title,
        description: copy.description,
        metadata: { follow_up_id: cancelled.id, status: 'cancelled' },
      });
    }

    const createdCopy = this.activityDescriptions.followUpCreated(currentUser, scheduledAt);
    await this.activities.create({
      leadId,
      userId: currentUser.id,
      type: ActivityType.FollowUpCreated,
      title: createdCopy.title,
      description: createdCopy.description,
      note: data.note,
      metadata: { follow_up_id: result.created.id, scheduled_at: scheduledAt.toISOString(), status: 'pending' },
    });

    await this.moveLeadToFollowUpIfAllowed(leadId, lead.status, currentUser);

    return result.created;
  }

  private async recordFirstActionIfNeeded(lead: { id: string; arrivalTimestamp: Date; firstActionAt: Date | null }): Promise<void> {
    if (lead.firstActionAt) return;
    const firstActionAt = new Date();
    const speedToFirstActionSeconds = Math.max(0, Math.floor((firstActionAt.getTime() - lead.arrivalTimestamp.getTime()) / 1000));
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { firstActionAt, speedToFirstActionSeconds },
    });
  }

  private async moveLeadToFollowUpIfAllowed(leadId: string, currentStatus: LeadStatus, currentUser: AuthenticatedUser): Promise<void> {
    if (currentStatus === LeadStatus.FollowUp) return;
    if (!this.workflow.getAllowedTransitions(currentStatus).includes(LeadStatus.FollowUp)) return;

    await this.leads.updateStatus(leadId, LeadStatus.FollowUp);
    await this.statusHistory.create({ leadId, oldStatus: currentStatus, newStatus: LeadStatus.FollowUp, changedBy: currentUser.id });
    const copy = this.activityDescriptions.statusChanged(currentUser, currentStatus, LeadStatus.FollowUp);
    await this.activities.create({
      leadId,
      userId: currentUser.id,
      type: ActivityType.StatusChanged,
      title: copy.title,
      description: copy.description,
      metadata: { old_status: currentStatus, new_status: LeadStatus.FollowUp, changed_by: currentUser.id },
    });
  }
}