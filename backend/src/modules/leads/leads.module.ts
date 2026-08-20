import { Module } from '@nestjs/common';
import { AssignmentSettingsModule } from '../assignment-settings/assignment-settings.module';
import { TreatmentsModule } from '../treatments/treatments.module';
import { UsersModule } from '../users/users.module';
import { ACTIVITY_REPOSITORY } from './application/ports/activity.repository';
import { LEAD_ASSIGNMENT_REPOSITORY } from './application/ports/lead-assignment.repository';
import { LEAD_STATUS_HISTORY_REPOSITORY } from './application/ports/lead-status-history.repository';
import { LEAD_TRANSFER_REPOSITORY } from './application/ports/lead-transfer.repository';
import { LEAD_REPOSITORY } from './application/ports/lead.repository';
import { SECURITY_LOG_REPOSITORY } from './application/ports/security-log.repository';
import { ActivityDescriptionService } from './application/services/activity-description.service';
import { DuplicateDetectionService } from './application/services/duplicate-detection.service';
import { PhoneNormalizationService } from './application/services/phone-normalization.service';
import { SpeedToContactService } from './application/services/speed-to-contact.service';
import { LeadAccessPolicy } from './application/services/lead-access.policy';
import { ExcelExportService } from './application/services/excel-export.service';
import { LeadWorkflowService } from './application/services/lead-workflow.service';
import { LeadIngestionService } from './application/services/lead-ingestion.service';
import { LeadCallSessionService } from './application/services/lead-call-session.service';
import { RoundRobinAssignmentService } from './application/services/round-robin-assignment.service';
import { TreatmentRoutingAssignmentService } from './application/services/treatment-routing-assignment.service';
import { AssignLeadUseCase } from './application/use-cases/assign-lead.use-case';
import { BulkAssignLeadsUseCase } from './application/use-cases/bulk-assign-leads.use-case';
import { ChangeLeadStatusUseCase } from './application/use-cases/change-lead-status.use-case';
import { CreateLeadUseCase } from './application/use-cases/create-lead.use-case';
import { DeleteLeadUseCase } from './application/use-cases/delete-lead.use-case';
import { ExportLeadsUseCase } from './application/use-cases/export-leads.use-case';
import { GetLeadUseCase } from './application/use-cases/get-lead.use-case';
import { ListLeadActivitiesUseCase } from './application/use-cases/list-lead-activities.use-case';
import { ListLeadStatusHistoryUseCase } from './application/use-cases/list-lead-status-history.use-case';
import { ListLeadTransfersUseCase } from './application/use-cases/list-lead-transfers.use-case';
import { ListLeadsUseCase } from './application/use-cases/list-leads.use-case';
import { ListMyLeadsUseCase } from './application/use-cases/list-my-leads.use-case';
import { ListUnassignedLeadsUseCase } from './application/use-cases/list-unassigned-leads.use-case';
import { TransferLeadUseCase } from './application/use-cases/transfer-lead.use-case';
import { UnassignLeadUseCase } from './application/use-cases/unassign-lead.use-case';
import { UpdateLeadUseCase } from './application/use-cases/update-lead.use-case';
import { PrismaActivityRepository } from './infrastructure/prisma-activity.repository';
import { PrismaLeadAssignmentRepository } from './infrastructure/prisma-lead-assignment.repository';
import { PrismaLeadStatusHistoryRepository } from './infrastructure/prisma-lead-status-history.repository';
import { PrismaLeadTransferRepository } from './infrastructure/prisma-lead-transfer.repository';
import { PrismaLeadRepository } from './infrastructure/prisma-lead.repository';
import { PrismaSecurityLogRepository } from './infrastructure/prisma-security-log.repository';
import { LeadsController } from './presentation/leads.controller';

@Module({
  imports: [AssignmentSettingsModule, TreatmentsModule, UsersModule],
  controllers: [LeadsController],
  providers: [
    PrismaLeadRepository,
    PrismaActivityRepository,
    PrismaLeadStatusHistoryRepository,
    PrismaLeadAssignmentRepository,
    PrismaLeadTransferRepository,
    PrismaSecurityLogRepository,
    { provide: LEAD_REPOSITORY, useExisting: PrismaLeadRepository },
    { provide: ACTIVITY_REPOSITORY, useExisting: PrismaActivityRepository },
    { provide: LEAD_STATUS_HISTORY_REPOSITORY, useExisting: PrismaLeadStatusHistoryRepository },
    { provide: LEAD_ASSIGNMENT_REPOSITORY, useExisting: PrismaLeadAssignmentRepository },
    { provide: LEAD_TRANSFER_REPOSITORY, useExisting: PrismaLeadTransferRepository },
    { provide: SECURITY_LOG_REPOSITORY, useExisting: PrismaSecurityLogRepository },
    LeadWorkflowService,
    LeadIngestionService,
    DuplicateDetectionService,
    PhoneNormalizationService,
    SpeedToContactService,
    ActivityDescriptionService,
    ExcelExportService,
    LeadAccessPolicy,
    RoundRobinAssignmentService,
    TreatmentRoutingAssignmentService,
    LeadCallSessionService,
    ListLeadsUseCase,
    ListMyLeadsUseCase,
    ListUnassignedLeadsUseCase,
    GetLeadUseCase,
    CreateLeadUseCase,
    UpdateLeadUseCase,
    DeleteLeadUseCase,
    ExportLeadsUseCase,
    ChangeLeadStatusUseCase,
    AssignLeadUseCase,
    BulkAssignLeadsUseCase,
    UnassignLeadUseCase,
    TransferLeadUseCase,
    ListLeadStatusHistoryUseCase,
    ListLeadActivitiesUseCase,
    ListLeadTransfersUseCase,
  ],
  exports: [
    LEAD_REPOSITORY,
    ACTIVITY_REPOSITORY,
    LEAD_STATUS_HISTORY_REPOSITORY,
    LEAD_ASSIGNMENT_REPOSITORY,
    LEAD_TRANSFER_REPOSITORY,
    SECURITY_LOG_REPOSITORY,
    LeadWorkflowService,
    LeadIngestionService,
    DuplicateDetectionService,
    PhoneNormalizationService,
    SpeedToContactService,
    ActivityDescriptionService,
    ExcelExportService,
    LeadAccessPolicy,
    RoundRobinAssignmentService,
    TreatmentRoutingAssignmentService,
    LeadCallSessionService,
  ],
})
export class LeadsModule {}






