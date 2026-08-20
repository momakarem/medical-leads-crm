import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ActivityType } from '../../domain/activity-type.enum';
import { LeadStatus } from '../../domain/lead-status.enum';
import { UserRole } from '../../../users/domain/user-role.enum';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { RoundRobinAssignmentService } from './round-robin-assignment.service';
import { TreatmentRoutingAssignmentService } from './treatment-routing-assignment.service';
import { AdvancedDistributionRulesService } from '../../../assignment-settings/advanced-distribution-rules.service';

export interface IngestLeadInput {
  name: string;
  phone: string;
  sourceChannel: string;
  campaignName?: string;
  adName?: string;
  arrivalTimestamp?: Date;
  treatmentId?: string;
  createdBy: string;
  activityType: ActivityType;
  activityTitle: string;
  activityDescription: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LeadIngestionService {
  private readonly logger = new Logger(LeadIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly duplicates: DuplicateDetectionService,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    private readonly treatmentRoutingAssignments: TreatmentRoutingAssignmentService,
    private readonly roundRobinAssignments: RoundRobinAssignmentService,
  private readonly advancedDistributionRules: AdvancedDistributionRulesService,
  ) {}

  async ingest(input: IngestLeadInput): Promise<{ leadId: string }> {
    const duplicate = await this.duplicates.evaluate(input.phone);
    const lead = await this.prisma.lead.create({
      data: {
        name: input.name.slice(0, 150),
        phone: input.phone.slice(0, 25),
        normalizedPhone: duplicate.normalizedPhone,
        isDuplicate: duplicate.isDuplicate,
        duplicateOfLeadId: duplicate.duplicateOfLeadId,
        sourceChannel: input.sourceChannel.slice(0, 100),
        campaignName: input.campaignName?.slice(0, 200),
        adName: input.adName?.slice(0, 200),
        arrivalTimestamp: input.arrivalTimestamp ?? new Date(),
        treatmentId: input.treatmentId,
        status: LeadStatus.New,
        ownerAgentId: null,
        createdBy: input.createdBy,
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: input.createdBy,
        type: input.activityType,
        title: input.activityTitle,
        description: input.activityDescription,
        metadata: { ...(input.metadata ?? {}), ad_name: input.adName ?? null, arrival_timestamp: (input.arrivalTimestamp ?? lead.arrivalTimestamp).toISOString() } as Prisma.InputJsonObject,
      },
    });

    await this.duplicates.recordIfDuplicate(lead.id, duplicate, input.createdBy);

    const metadata = input.metadata ?? {};
    const formId = typeof metadata.form_id === 'string'
      ? metadata.form_id
      : typeof metadata.formId === 'string'
        ? metadata.formId
        : null;

    const matchedAdvancedRule = await this.advancedDistributionRules.assignIfMatched({
      leadId: lead.id,
      sourceChannel: input.sourceChannel,
      campaignName: input.campaignName ?? null,
      adName: input.adName ?? null,
      formId,
      assignedBy: input.createdBy,
    });

    if (!matchedAdvancedRule) {
      const leadEntity = await this.leads.findById(lead.id);
      const actor = await this.prisma.user.findUnique({ where: { id: input.createdBy } });
      if (leadEntity && actor) {
        const currentUser: AuthenticatedUser = {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          role: actor.role as UserRole,
          isActive: actor.isActive,
          createdAt: actor.createdAt,
          updatedAt: actor.updatedAt,
        };
        const treatmentRoutedLead = await this.treatmentRoutingAssignments.assignIfEnabled(leadEntity, currentUser);
        await this.roundRobinAssignments.assignIfEnabled(treatmentRoutedLead, currentUser);
      }
    }
this.logger.log(`Lead ingested. source=${input.sourceChannel} lead_id=${lead.id}`);
    return { leadId: lead.id };
  }
}




