import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedLeads } from '../../domain/lead.entity';
import type { ListLeadsQueryDto } from '../dto/list-leads-query.dto';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';

@Injectable()
export class ListUnassignedLeadsUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}
  execute(query: ListLeadsQueryDto): Promise<PaginatedLeads> { return this.leads.listUnassigned(query); }
}