export interface LeadAssignmentEntity {
  id: string;
  leadId: string;
  previousAgentId: string | null;
  newAgentId: string | null;
  assignedBy: string;
  createdAt: Date;
}