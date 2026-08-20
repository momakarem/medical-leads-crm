import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { PaginatedLeads } from '../../domain/lead.entity';
import type { ListLeadsQueryDto } from '../dto/list-leads-query.dto';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';

@Injectable()
export class ListMyLeadsUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}
  execute(query: ListLeadsQueryDto, user: AuthenticatedUser): Promise<PaginatedLeads> { return this.leads.listMyLeads(user.id, query); }
}