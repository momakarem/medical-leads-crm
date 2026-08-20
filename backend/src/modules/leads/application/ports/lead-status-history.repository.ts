import type { LeadStatusHistoryEntity } from '../../domain/lead-status-history.entity';
import type { LeadStatus } from '../../domain/lead-status.enum';

export const LEAD_STATUS_HISTORY_REPOSITORY = Symbol('LEAD_STATUS_HISTORY_REPOSITORY');

export interface CreateLeadStatusHistoryData {
  leadId: string;
  oldStatus: LeadStatus;
  newStatus: LeadStatus;
  changedBy: string;
  note?: string;
}

export interface LeadStatusHistoryRepository {
  create(data: CreateLeadStatusHistoryData): Promise<LeadStatusHistoryEntity>;
  listByLeadId(leadId: string): Promise<LeadStatusHistoryEntity[]>;
}