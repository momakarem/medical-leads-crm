import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { LeadEntity } from '../../domain/lead.entity';
import { LeadAccessPolicy } from '../services/lead-access.policy';

@Injectable()
export class GetLeadUseCase {
  constructor(private readonly accessPolicy: LeadAccessPolicy) {}

  execute(id: string, user: AuthenticatedUser, ipAddress?: string): Promise<LeadEntity> {
    return this.accessPolicy.assertCanAccessLead(id, user, 'lead.view', ipAddress);
  }
}