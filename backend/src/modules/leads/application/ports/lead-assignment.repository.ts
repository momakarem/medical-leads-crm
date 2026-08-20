import type { LeadAssignmentEntity } from '../../domain/lead-assignment.entity';

export const LEAD_ASSIGNMENT_REPOSITORY = Symbol('LEAD_ASSIGNMENT_REPOSITORY');

export interface CreateLeadAssignmentData {
  leadId: string;
  previousAgentId?: string | null;
  newAgentId?: string | null;
  assignedBy: string;
}

export interface LeadAssignmentRepository {
  create(data: CreateLeadAssignmentData): Promise<LeadAssignmentEntity>;
  listByLeadId(leadId: string): Promise<LeadAssignmentEntity[]>;
}