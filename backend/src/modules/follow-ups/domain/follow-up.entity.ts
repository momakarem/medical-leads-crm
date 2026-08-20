import type { FollowUpStatus } from './follow-up-status.enum';

export interface FollowUpLeadSummary {
  id: string;
  name: string;
  phone: string;
}

export interface FollowUpUserSummary {
  id: string;
  name: string;
}

export interface FollowUpEntity {
  id: string;
  leadId: string;
  userId: string;
  scheduledDate: Date;
  scheduledTime: string;
  scheduledAt: Date;
  status: FollowUpStatus;
  note: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lead?: FollowUpLeadSummary;
  user?: FollowUpUserSummary;
}

export interface PaginatedFollowUps {
  data: FollowUpEntity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}