import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import type { TransferLeadDto } from '../dto/transfer-lead.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { LEAD_TRANSFER_REPOSITORY, type LeadTransferRepository } from '../ports/lead-transfer.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';

@Injectable()
export class TransferLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LEAD_TRANSFER_REPOSITORY) private readonly transfers: LeadTransferRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
  ) {}

  async execute(leadId: string, dto: TransferLeadDto, currentUser: AuthenticatedUser): Promise<LeadEntity> {
    if (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Manager) {
      throw new ForbiddenException('Only managers and admins can transfer leads.');
    }

    const lead = await this.leads.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found.');

    if (lead.ownerAgentId === dto.newAgentId) {
      throw new BadRequestException('Lead is already owned by this agent.');
    }

    const newAgent = await this.users.findActiveAgentById(dto.newAgentId);
    if (!newAgent) throw new BadRequestException('New agent does not exist or is inactive.');

    const previousAgentName = lead.ownerAgent?.name ?? 'Unassigned';
    const updatedLead = await this.leads.updateOwnerAgent(leadId, newAgent.id);
    if (!updatedLead) throw new NotFoundException('Lead not found.');

    await this.transfers.create({
      leadId,
      previousAgentId: lead.ownerAgentId,
      newAgentId: newAgent.id,
      transferredBy: currentUser.id,
      reason: dto.reason,
    });

    const copy = this.activityDescriptions.leadTransferred(currentUser, previousAgentName, newAgent.name);
    await this.activities.create({
      leadId,
      userId: currentUser.id,
      type: ActivityType.LeadTransferred,
      title: copy.title,
      description: copy.description,
      metadata: {
        previous_agent_id: lead.ownerAgentId,
        new_agent_id: newAgent.id,
        reason: dto.reason ?? null,
      },
    });

    return updatedLead;
  }
}