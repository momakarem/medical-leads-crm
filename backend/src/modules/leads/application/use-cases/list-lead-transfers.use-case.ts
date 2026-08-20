import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { LeadTransferEntity } from '../../domain/lead-transfer.entity';
import { LEAD_TRANSFER_REPOSITORY, type LeadTransferRepository } from '../ports/lead-transfer.repository';
import { LeadAccessPolicy } from '../services/lead-access.policy';

@Injectable()
export class ListLeadTransfersUseCase {
  constructor(
    @Inject(LEAD_TRANSFER_REPOSITORY) private readonly transfers: LeadTransferRepository,
    private readonly accessPolicy: LeadAccessPolicy,
  ) {}

  async execute(leadId: string, currentUser: AuthenticatedUser, ipAddress?: string): Promise<LeadTransferEntity[]> {
    await this.accessPolicy.assertCanAccessLead(leadId, currentUser, 'lead.transfers.view', ipAddress);
    return this.transfers.listByLeadId(leadId);
  }
}