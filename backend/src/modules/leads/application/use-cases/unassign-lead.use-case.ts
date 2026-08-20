import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_ASSIGNMENT_REPOSITORY, type LeadAssignmentRepository } from '../ports/lead-assignment.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';

@Injectable()
export class UnassignLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(LEAD_ASSIGNMENT_REPOSITORY) private readonly assignments: LeadAssignmentRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
  ) {}

  async execute(leadId: string, currentUser: AuthenticatedUser): Promise<LeadEntity> {
    const lead = await this.leads.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found.');
    if (!lead.ownerAgentId) throw new BadRequestException('Lead is already unassigned.');
    const previousAgentId = lead.ownerAgentId;
    const updated = await this.leads.updateOwnerAgent(leadId, null);
    if (!updated) throw new NotFoundException('Lead not found.');
    await this.assignments.create({ leadId, previousAgentId, newAgentId: null, assignedBy: currentUser.id });
    const copy = this.activityDescriptions.leadUnassigned(currentUser);
    await this.activities.create({
      leadId,
      userId: currentUser.id,
      type: ActivityType.LeadUnassigned,
      title: copy.title,
      description: copy.description,
      metadata: { previous_agent_id: previousAgentId, new_agent_id: null, assigned_by: currentUser.id },
    });
    return updated;
  }
}