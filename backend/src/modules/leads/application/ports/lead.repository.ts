import type { UserRole } from '../../../users/domain/user-role.enum';
import type { CreateLeadDto } from '../dto/create-lead.dto';
import type { ListLeadsQueryDto } from '../dto/list-leads-query.dto';
import type { UpdateLeadDto } from '../dto/update-lead.dto';
import type { LeadEntity, PaginatedLeads } from '../../domain/lead.entity';
import type { LeadStatus } from '../../domain/lead-status.enum';

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');

export interface CreateLeadData extends CreateLeadDto {
  createdBy: string;
  normalizedPhone?: string;
  isDuplicate?: boolean;
  duplicateOfLeadId?: string | null;
  arrivalTimestamp?: Date;
}

export interface LeadVisibilityScope {
  userId: string;
  role: UserRole;
}

export interface LeadRepository {
  list(query: ListLeadsQueryDto, scope?: LeadVisibilityScope): Promise<PaginatedLeads>;
  listMyLeads(userId: string, query: ListLeadsQueryDto): Promise<PaginatedLeads>;
  listUnassigned(query: ListLeadsQueryDto): Promise<PaginatedLeads>;
  exportAll(query: ListLeadsQueryDto, scope?: LeadVisibilityScope): Promise<LeadEntity[]>;
  findById(id: string, scope?: LeadVisibilityScope): Promise<LeadEntity | null>;
  existsByIdIncludingDeleted(id: string): Promise<boolean>;
  create(data: CreateLeadData): Promise<LeadEntity>;
  update(id: string, data: UpdateLeadDto): Promise<LeadEntity | null>;
  updateStatus(id: string, status: LeadStatus): Promise<LeadEntity | null>;
  recordFirstContact(id: string, firstContactedAt: Date, speedToContactSeconds: number): Promise<LeadEntity | null>;
  updateOwnerAgent(id: string, ownerAgentId: string | null): Promise<LeadEntity | null>;
  softDelete(id: string): Promise<LeadEntity | null>;
}


