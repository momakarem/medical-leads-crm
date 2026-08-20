export interface LeadTransferUser {
  id: string;
  name: string;
}

export interface LeadTransferEntity {
  id: string;
  leadId: string;
  previousAgentId: string | null;
  newAgentId: string;
  transferredBy: string;
  reason: string | null;
  createdAt: Date;
  previousAgent?: LeadTransferUser | null;
  newAgent?: LeadTransferUser;
  transferer?: LeadTransferUser;
}