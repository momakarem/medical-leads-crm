import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../../../treatments/application/ports/treatment.repository';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import type { CreateLeadDto } from '../dto/create-lead.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { RoundRobinAssignmentService } from '../services/round-robin-assignment.service';
import { TreatmentRoutingAssignmentService } from '../services/treatment-routing-assignment.service';
import { AdvancedDistributionRulesService } from '../../../assignment-settings/advanced-distribution-rules.service';

@Injectable()
export class CreateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly activityDescriptions: ActivityDescriptionService,
    private readonly duplicates: DuplicateDetectionService,
    private readonly treatmentRoutingAssignments: TreatmentRoutingAssignmentService,
    private readonly roundRobinAssignments: RoundRobinAssignmentService,
  private readonly advancedDistributionRules: AdvancedDistributionRulesService,
  ) {}

  async execute(data: CreateLeadDto, currentUser: AuthenticatedUser): Promise<LeadEntity> {
    const resolvedOwnerAgentId = data.ownerAgentId ?? (currentUser.role === UserRole.Agent ? currentUser.id : undefined);
    await this.validateReferences(data.treatmentId, resolvedOwnerAgentId);
    const duplicate = await this.duplicates.evaluate(data.phone);
    const lead = await this.leads.create({
      ...data,
      ownerAgentId: resolvedOwnerAgentId,
      createdBy: currentUser.id,
      normalizedPhone: duplicate.normalizedPhone,
      isDuplicate: duplicate.isDuplicate,
      duplicateOfLeadId: duplicate.duplicateOfLeadId,
    });
    const copy = this.activityDescriptions.leadCreated(currentUser);
    await this.activities.create({
      leadId: lead.id,
      userId: currentUser.id,
      type: ActivityType.LeadCreated,
      title: copy.title,
      description: copy.description,
      metadata: { status: lead.status },
    });
    if (data.note?.trim()) {
      await this.activities.create({
        leadId: lead.id,
        userId: currentUser.id,
        type: ActivityType.NoteAdded,
        title: 'Note Added',
        description: `${currentUser.name} added a note while creating this lead.`,
        metadata: { note: data.note.trim(), source: 'quick_add_lead' },
      });
    }
    await this.duplicates.recordIfDuplicate(lead.id, duplicate, currentUser.id);

    if (!resolvedOwnerAgentId) {
      const matchedAdvancedRule = await this.advancedDistributionRules.assignIfMatched({
        leadId: lead.id,
        sourceChannel: lead.sourceChannel,
        campaignName: lead.campaignName,
        adName: lead.adName,
        formId: null,
        assignedBy: currentUser.id,
      });

      if (matchedAdvancedRule) {
        return (await this.leads.findById(lead.id)) ?? lead;
      }
    }

    const treatmentRoutedLead = await this.treatmentRoutingAssignments.assignIfEnabled(lead, currentUser);
    return this.roundRobinAssignments.assignIfEnabled(treatmentRoutedLead, currentUser);
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


