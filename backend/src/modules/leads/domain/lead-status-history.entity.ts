import type { LeadStatus } from './lead-status.enum';

export interface LeadStatusHistoryEntity {
  id: string;
  leadId: string;
  oldStatus: LeadStatus;
  newStatus: LeadStatus;
  changedBy: string;
  note: string | null;
  createdAt: Date;
}