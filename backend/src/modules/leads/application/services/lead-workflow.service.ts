import { BadRequestException, Injectable } from '@nestjs/common';
import { LeadStatus } from '../../domain/lead-status.enum';

const allStatuses = Object.values(LeadStatus) as LeadStatus[];

@Injectable()
export class LeadWorkflowService {
  assertCanTransition(_oldStatus: LeadStatus, newStatus: LeadStatus): void {
    if (!allStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid lead status: ${newStatus}.`);
    }
  }

  getAllowedTransitions(_status: LeadStatus): readonly LeadStatus[] {
    return allStatuses;
  }
}
