import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../../../treatments/application/ports/treatment.repository';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import type { UpdateLeadDto } from '../dto/update-lead.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';
import { LeadAccessPolicy } from '../services/lead-access.policy';

@Injectable()
export class UpdateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
    private readonly accessPolicy: LeadAccessPolicy,
  ) {}

  async execute(id: string, data: UpdateLeadDto, currentUser: AuthenticatedUser, ipAddress?: string): Promise<LeadEntity> {
    await this.accessPolicy.assertCanAccessLead(id, currentUser, 'lead.update', ipAddress);
    await this.validateReferences(data.treatmentId, data.ownerAgentId);
    const lead = await this.leads.update(id, data);
    if (!lead) throw new NotFoundException('Lead not found.');
    const changedFields = Object.keys(data);
    const copy = this.activityDescriptions.leadUpdated(currentUser);
    await this.activities.create({
      leadId: lead.id,
      userId: currentUser.id,
      type: ActivityType.LeadUpdated,
      title: copy.title,
      description: copy.description,
      metadata: { changed_fields: changedFields },
    });
    return lead;
  }

  private async validateReferences(treatmentId?: string, ownerAgentId?: string): Promise<void> {
    if (treatmentId && !(await this.treatments.existsById(treatmentId))) {
      throw new BadRequestException('Treatment does not exist.');
    }
    if (ownerAgentId && !(await this.users.existsActiveUserByIdAndRole(ownerAgentId, UserRole.Agent))) {
      throw new BadRequestException('Owner agent does not exist.');
    }
  }
}