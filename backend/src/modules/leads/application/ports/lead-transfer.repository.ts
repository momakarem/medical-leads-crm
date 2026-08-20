import type { LeadTransferEntity } from '../../domain/lead-transfer.entity';

export const LEAD_TRANSFER_REPOSITORY = Symbol('LEAD_TRANSFER_REPOSITORY');

export interface CreateLeadTransferData {
  leadId: string;
  previousAgentId: string | null;
  newAgentId: string;
  transferredBy: string;
  reason?: string | null;
}

export interface LeadTransferRepository {
  create(data: CreateLeadTransferData): Promise<LeadTransferEntity>;
  listByLeadId(leadId: string): Promise<LeadTransferEntity[]>;
}