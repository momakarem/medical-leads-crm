import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { LeadStatus } from '../../domain/lead-status.enum';
import type { ChangeLeadStatusDto } from '../dto/change-lead-status.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import {
  LEAD_STATUS_HISTORY_REPOSITORY,
  type LeadStatusHistoryRepository,
} from '../ports/lead-status-history.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ActivityDescriptionService } from '../services/activity-description.service';
import { LeadAccessPolicy } from '../services/lead-access.policy';
import { LeadWorkflowService } from '../services/lead-workflow.service';
import { SpeedToContactService } from '../services/speed-to-contact.service';

@Injectable()
export class ChangeLeadStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(LEAD_STATUS_HISTORY_REPOSITORY) private readonly statusHistory: LeadStatusHistoryRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    private readonly workflow: LeadWorkflowService,
    private readonly activityDescriptions: ActivityDescriptionService,
    private readonly accessPolicy: LeadAccessPolicy,
    private readonly speedToContact: SpeedToContactService,
  ) {}

  async execute(leadId: string, data: ChangeLeadStatusDto, currentUser: AuthenticatedUser, ipAddress?: string): Promise<LeadEntity> {
    const lead = await this.accessPolicy.assertCanAccessLead(leadId, currentUser, 'lead.status.change', ipAddress);

    this.workflow.assertCanTransition(lead.status, data.status);
    this.validateOutcomeData(data);

    await this.recordFirstActionIfNeeded(lead);

    const updatedLead = await this.leads.updateStatus(leadId, data.status);
    if (!updatedLead) throw new NotFoundException('Lead not found.');

    await this.statusHistory.create({
      leadId,
      oldStatus: lead.status,
      newStatus: data.status,
      changedBy: currentUser.id,
      note: data.note,
    });

    const copy = this.activityDescriptions.statusChanged(currentUser, lead.status, data.status);
    await this.activities.create({
      leadId,
      userId: currentUser.id,
      type: ActivityType.StatusChanged,
      title: copy.title,
      description: copy.description,
      note: data.note,
      metadata: {
        old_status: lead.status,
        new_status: data.status,
        changed_by: currentUser.id,
        follow_up_date: data.followUpDate ?? null,
        follow_up_time: data.followUpTime ?? null,
        appointment_date: data.appointmentDate ?? null,
        appointment_time: data.appointmentTime ?? null,
        appointment_treatment_id: data.appointmentTreatmentId ?? null,
      },
    });

    await this.applyOutcomeSideEffects(leadId, data, currentUser);

    const stcLead = await this.speedToContact.recordIfFirstContact(lead, data.status, currentUser.id);
    return stcLead ?? (await this.leads.findById(leadId)) ?? updatedLead;
  }

  private async recordFirstActionIfNeeded(lead: LeadEntity): Promise<void> {
    if (lead.firstActionAt) return;
    const firstActionAt = new Date();
    const speedToFirstActionSeconds = Math.max(0, Math.floor((firstActionAt.getTime() - lead.arrivalTimestamp.getTime()) / 1000));
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { firstActionAt, speedToFirstActionSeconds },
    });
  }

  private validateOutcomeData(data: ChangeLeadStatusDto): void {
    if (data.status === LeadStatus.NoAnswer && (data.followUpDate || data.followUpTime)) {
      if (!data.followUpDate || !data.followUpTime) throw new BadRequestException('Follow-up date and time must be provided together.');
      this.combineDateAndTime(data.followUpDate, data.followUpTime);
    }

    if (data.status === LeadStatus.Booked && (data.appointmentDate || data.appointmentTime)) {
      if (!data.appointmentDate || !data.appointmentTime) throw new BadRequestException('Appointment date and time must be provided together.');
      this.combineDateAndTime(data.appointmentDate, data.appointmentTime);
    }
  }

  private async applyOutcomeSideEffects(leadId: string, data: ChangeLeadStatusDto, currentUser: AuthenticatedUser): Promise<void> {
    if (data.status === LeadStatus.NoAnswer && data.followUpDate && data.followUpTime) {
      const scheduledAt = this.combineDateAndTime(data.followUpDate, data.followUpTime);
      await this.prisma.followUp.updateMany({ where: { leadId, status: 'pending' }, data: { status: 'cancelled' } });
      await this.prisma.followUp.create({
        data: {
          leadId,
          userId: currentUser.id,
          scheduledDate: new Date(`${data.followUpDate}T00:00:00.000Z`),
          scheduledTime: data.followUpTime,
          scheduledAt,
          status: 'pending',
          note: data.note ?? 'Scheduled after no answer.',
        },
      });
      await this.prisma.activity.create({
        data: {
          leadId,
          userId: currentUser.id,
          type: 'follow_up_created',
          title: 'Follow-Up Created',
          description: `${currentUser.name} scheduled a follow-up after no answer.`,
          note: data.note,
          metadata: { scheduled_at: scheduledAt.toISOString(), source: 'no_answer_outcome' },
        },
      });
    }

    if (data.status === LeadStatus.Booked && data.appointmentDate && data.appointmentTime) {
      const appointmentAt = this.combineDateAndTime(data.appointmentDate, data.appointmentTime);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          appointmentAt,
          appointmentTreatmentId: data.appointmentTreatmentId ?? null,
          appointmentNote: data.note ?? null,
        },
      });
    }
  }

  private combineDateAndTime(date: string, time: string): Date {
    const parsed = new Date(`${date}T${time}:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date or time.');
    return parsed;
  }
}


