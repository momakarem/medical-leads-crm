import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { BulkAssignLeadsDto } from '../dto/bulk-assign-leads.dto';
import { AssignLeadUseCase } from './assign-lead.use-case';

export interface BulkAssignLeadsResult {
  success: true;
  assigned_count: number;
  lead_ids: string[];
}

@Injectable()
export class BulkAssignLeadsUseCase {
  constructor(private readonly assignLead: AssignLeadUseCase) {}

  async execute(dto: BulkAssignLeadsDto, currentUser: AuthenticatedUser): Promise<BulkAssignLeadsResult> {
    const uniqueLeadIds = [...new Set(dto.leadIds)];
    for (const leadId of uniqueLeadIds) {
      await this.assignLead.execute(leadId, { agent_id: dto.agentId, agentId: dto.agentId }, currentUser);
    }

    return { success: true, assigned_count: uniqueLeadIds.length, lead_ids: uniqueLeadIds };
  }
}
