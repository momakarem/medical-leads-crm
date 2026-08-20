import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { LeadStatusHistoryEntity } from '../../domain/lead-status-history.entity';
import {
  LEAD_STATUS_HISTORY_REPOSITORY,
  type LeadStatusHistoryRepository,
} from '../ports/lead-status-history.repository';
import { LeadAccessPolicy } from '../services/lead-access.policy';

@Injectable()
export class ListLeadStatusHistoryUseCase {
  constructor(
    private readonly accessPolicy: LeadAccessPolicy,
    @Inject(LEAD_STATUS_HISTORY_REPOSITORY) private readonly statusHistory: LeadStatusHistoryRepository,
  ) {}

  async execute(leadId: string, user: AuthenticatedUser, ipAddress?: string): Promise<LeadStatusHistoryEntity[]> {
    await this.accessPolicy.assertCanAccessLead(leadId, user, 'lead.status_history.view', ipAddress);
    return this.statusHistory.listByLeadId(leadId);
  }
}