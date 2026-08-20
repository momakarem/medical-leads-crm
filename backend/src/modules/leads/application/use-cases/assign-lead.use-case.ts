import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import type { AssignLeadDto } from '../dto/assign-lead.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_ASSIGNMENT_REPOSITORY, type LeadAssignmentRepository } from '../ports/lead-assignment.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';

@Injectable()
export class AssignLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(LEAD_ASSIGNMENT_REPOSITORY) private readonly assignments: LeadAssignmentRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
  ) {}

  async execute(leadId: string, dto: AssignLeadDto, currentUser: AuthenticatedUser): Promise<LeadEntity> {
    if (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Manager) {
      throw new ForbiddenException('Only managers and admins can assign leads.');
    }

    const lead = await this.leads.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found.');

    const agent = await this.users.findById(dto.agentId);
    if (!agent) throw new NotFoundException('Agent not found.');
    if (!agent.isActive || agent.role !== UserRole.Agent) throw new BadRequestException('Assigned user must be an active agent.');

    const previousAgentId = lead.ownerAgentId;
    const updated = await this.leads.updateOwnerAgent(leadId, agent.id);
    if (!updated) throw new NotFoundException('Lead not found.');

    await this.assignments.create({ leadId, previousAgentId, newAgentId: agent.id, assignedBy: currentUser.id });

    const type = previousAgentId ? ActivityType.LeadReassigned : ActivityType.LeadAssigned;
    const copy = previousAgentId
      ? this.activityDescriptions.leadReassigned(currentUser, lead.ownerAgent?.name ?? 'previous agent', agent.name)
      : this.activityDescriptions.leadAssigned(currentUser, agent.name);
    await this.activities.create({
      leadId,
      userId: currentUser.id,
      type,
      title: copy.title,
      description: copy.description,
      metadata: { previous_agent_id: previousAgentId, new_agent_id: agent.id, assigned_by: currentUser.id },
    });

    return updated;
  }
}