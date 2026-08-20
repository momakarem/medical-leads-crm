import type { ActivityType } from './activity-type.enum';

export interface ActivityUser {
  id: string;
  name: string;
}

export interface ActivityEntity {
  id: string;
  leadId: string;
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  note: string | null;
  outcome: string | null;
  newStatus: string | null;
  scheduledFor: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user?: ActivityUser;
}

export interface PaginatedActivities {
  data: ActivityEntity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}