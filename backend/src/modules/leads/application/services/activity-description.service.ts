import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadStatus } from '../../domain/lead-status.enum';

export interface ActivityCopy {
  title: string;
  description: string;
}

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  no_answer: 'No Answer',
  follow_up: 'Follow Up',
  interested: 'Interested',
  not_interested: 'Not Interested',
  wrong_number: 'Wrong Number',
  job_seeker: 'Job Seeker',
  booked: 'Booked',
  showed_up: 'Showed Up',
  no_show: 'No Show',
  paid: 'Paid',
};

@Injectable()
export class ActivityDescriptionService {
  leadCreated(user: AuthenticatedUser): ActivityCopy {
    return { title: 'Lead Created', description: `${user.name} created this lead.` };
  }

  leadUpdated(user: AuthenticatedUser): ActivityCopy {
    return { title: 'Lead Updated', description: `${user.name} updated lead information.` };
  }

  leadDeleted(user: AuthenticatedUser): ActivityCopy {
    return { title: 'Lead Deleted', description: `${user.name} deleted this lead.` };
  }

  statusChanged(user: AuthenticatedUser, oldStatus: LeadStatus, newStatus: LeadStatus): ActivityCopy {
    return {
      title: 'Status Changed',
      description: `${user.name} changed status from ${statusLabels[oldStatus]} to ${statusLabels[newStatus]}.`,
    };
  }

  followUpCreated(user: AuthenticatedUser, scheduledAt: Date): ActivityCopy {
    return {
      title: 'Follow-Up Created',
      description: `${user.name} scheduled a follow-up for ${scheduledAt.toISOString()}.`,
    };
  }

  followUpCompleted(user: AuthenticatedUser): ActivityCopy {
    return { title: 'Follow-Up Completed', description: `${user.name} completed this follow-up.` };
  }

  followUpCancelled(user: AuthenticatedUser): ActivityCopy {
    return { title: 'Follow-Up Cancelled', description: `${user.name} cancelled this follow-up.` };
  }

  leadAssigned(user: AuthenticatedUser, newAgentName: string): ActivityCopy {
    return { title: 'Lead Assigned', description: `${user.name} assigned this lead to ${newAgentName}.` };
  }

  leadReassigned(user: AuthenticatedUser, previousAgentName: string, newAgentName: string): ActivityCopy {
    return { title: 'Lead Reassigned', description: `${user.name} reassigned this lead from ${previousAgentName} to ${newAgentName}.` };
  }

  leadUnassigned(user: AuthenticatedUser): ActivityCopy {
    return { title: 'Lead Unassigned', description: `${user.name} removed assignment from this lead.` };
  }

  leadTransferred(user: AuthenticatedUser, previousAgentName: string, newAgentName: string): ActivityCopy {
    return { title: 'Lead Transferred', description: `${user.name} transferred this lead from ${previousAgentName} to ${newAgentName}.` };
  }

  generic(type: ActivityType, user: AuthenticatedUser): ActivityCopy {
    const titles: Record<ActivityType, string> = {
      [ActivityType.LeadCreated]: 'Lead Created',
      [ActivityType.LeadUpdated]: 'Lead Updated',
      [ActivityType.LeadDeleted]: 'Lead Deleted',
      [ActivityType.StatusChanged]: 'Status Changed',
      [ActivityType.NoteAdded]: 'Note Added',
      [ActivityType.LeadViewed]: 'Lead Viewed',
      [ActivityType.LeadRestored]: 'Lead Restored',
      [ActivityType.LeadAssigned]: 'Lead Assigned',
      [ActivityType.LeadReassigned]: 'Lead Reassigned',
      [ActivityType.LeadUnassigned]: 'Lead Unassigned',
      [ActivityType.LeadTransferred]: 'Lead Transferred',
      [ActivityType.LeadAutoAssigned]: 'Lead Auto Assigned',
      [ActivityType.AgentCapacityReached]: 'Agent Capacity Reached',
      [ActivityType.AgentCapacityUpdated]: 'Agent Capacity Updated',
      [ActivityType.LeadUnassignedNoCapacity]: 'Lead Unassigned - No Capacity',
      [ActivityType.LeadCreatedViaWebhook]: 'Lead Created via Webhook',
      [ActivityType.LeadCreatedViaMeta]: 'Lead Created via Meta',
      [ActivityType.LeadCreatedViaTiktok]: 'Lead Created via TikTok',
      [ActivityType.LeadCreatedViaSnapchat]: 'Lead Created via Snapchat',
      [ActivityType.DuplicateDetected]: 'Duplicate Detected',
      [ActivityType.FirstContactRecorded]: 'First Contact Recorded',
      [ActivityType.LeadsExported]: 'Leads Exported',
      [ActivityType.FollowUpCreated]: 'Follow-Up Created',
      [ActivityType.FollowUpCompleted]: 'Follow-Up Completed',
      [ActivityType.FollowUpCancelled]: 'Follow-Up Cancelled',
      [ActivityType.CallStarted]: 'Call Started',
      [ActivityType.CallEnded]: 'Call Ended',
    };
    return { title: titles[type], description: `${user.name} performed ${titles[type].toLowerCase()}.` };
  }
}





