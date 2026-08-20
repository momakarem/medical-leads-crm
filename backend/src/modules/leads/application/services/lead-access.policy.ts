import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { UserRole } from '../../../users/domain/user-role.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { SECURITY_LOG_REPOSITORY, type SecurityLogRepository } from '../ports/security-log.repository';

@Injectable()
export class LeadAccessPolicy {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(SECURITY_LOG_REPOSITORY) private readonly securityLogs: SecurityLogRepository,
  ) {}

  async assertCanAccessLead(leadId: string, user: AuthenticatedUser, action: string, ipAddress?: string): Promise<LeadEntity> {
    const lead = await this.leads.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found.');

    if (user.role === UserRole.Admin || user.role === UserRole.Manager) return lead;
    if (lead.ownerAgentId === user.id) return lead;

    await this.securityLogs.create({ userId: user.id, leadId: lead.id, action, ipAddress });
    throw new ForbiddenException('You do not have access to this lead.');
  }
}