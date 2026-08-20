import { Inject, Injectable } from '@nestjs/common';
import { ActivityType } from '../../domain/activity-type.enum';
import { LeadStatus } from '../../domain/lead-status.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';

const CONTACT_STATUSES = new Set<LeadStatus>([
  LeadStatus.Interested,
  LeadStatus.NotInterested,
  LeadStatus.Booked,
  LeadStatus.ShowedUp,
  LeadStatus.NoShow,
  LeadStatus.Paid,
]);

@Injectable()
export class SpeedToContactService {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
  ) {}

  isSuccessfulContactStatus(status: LeadStatus): boolean {
    return CONTACT_STATUSES.has(status);
  }

  async recordIfFirstContact(lead: LeadEntity, newStatus: LeadStatus, changedBy: string): Promise<LeadEntity | null> {
    if (!this.isSuccessfulContactStatus(newStatus)) return null;
    if (lead.firstContactedAt || lead.speedToContactSeconds !== null) return null;

    const firstContactedAt = new Date();
    const speedToContactSeconds = Math.max(0, Math.floor((firstContactedAt.getTime() - lead.createdAt.getTime()) / 1000));
    const updatedLead = await this.leads.recordFirstContact(lead.id, firstContactedAt, speedToContactSeconds);
    const minutes = Math.round((speedToContactSeconds / 60) * 100) / 100;

    await this.activities.create({
      leadId: lead.id,
      userId: changedBy,
      type: ActivityType.FirstContactRecorded,
      title: 'First Contact Recorded',
      description: `First successful contact recorded after ${minutes} minutes.`,
      metadata: {
        first_contacted_at: firstContactedAt.toISOString(),
        speed_to_contact_seconds: speedToContactSeconds,
      },
    });

    return updatedLead;
  }
}
