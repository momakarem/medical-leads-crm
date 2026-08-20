import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import { LeadAccessPolicy } from './lead-access.policy';

export interface ActiveCallSessionDto {
  id: string;
  lead_id: string;
  agent_id: string;
  agent_name: string;
  started_at: Date;
}

@Injectable()
export class LeadCallSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: LeadAccessPolicy,
  ) {}

  async start(leadId: string, user: AuthenticatedUser, ipAddress?: string): Promise<ActiveCallSessionDto> {
    const lead = await this.accessPolicy.assertCanAccessLead(leadId, user, 'start_call', ipAddress);
    const agentId = user.role === UserRole.Agent ? user.id : lead.ownerAgentId;
    if (!agentId) throw new BadRequestException('Lead must be assigned to an agent before starting a call.');

    const agent = await this.prisma.user.findFirst({ where: { id: agentId, role: 'agent', isActive: true, deletedAt: null }, select: { id: true, name: true } });
    if (!agent) throw new BadRequestException('Assigned agent is not active.');

    const session = await this.prisma.$transaction(async (tx) => {
      const startedAt = new Date();
      await tx.leadCallSession.updateMany({ where: { leadId, endedAt: null }, data: { endedAt: startedAt, note: 'Auto-ended by new contact attempt.' } });

      if (!lead.firstActionAt) {
        const speedToFirstActionSeconds = Math.max(0, Math.floor((startedAt.getTime() - lead.arrivalTimestamp.getTime()) / 1000));
        await tx.lead.update({
          where: { id: leadId },
          data: { firstActionAt: startedAt, speedToFirstActionSeconds },
        });
      }

      const created = await tx.leadCallSession.create({ data: { leadId, agentId, startedAt }, include: { agent: { select: { id: true, name: true } } } });
      await tx.activity.create({
        data: {
          leadId,
          userId: agentId,
          type: ActivityType.CallStarted,
          title: 'Call Started',
          description: `${agent.name} started calling this lead.`,
          metadata: { session_id: created.id, started_at: created.startedAt.toISOString() } as Prisma.InputJsonObject,
        },
      });
      return created;
    });

    return this.toDto(session);
  }

  async end(leadId: string, user: AuthenticatedUser, note?: string, ipAddress?: string): Promise<{ success: true }> {
    await this.accessPolicy.assertCanAccessLead(leadId, user, 'end_call', ipAddress);
    const session = await this.prisma.leadCallSession.findFirst({ where: { leadId, endedAt: null }, include: { agent: { select: { id: true, name: true } } }, orderBy: { startedAt: 'desc' } });
    if (!session) throw new NotFoundException('No active call session found for this lead.');
    if (user.role === UserRole.Agent && session.agentId !== user.id) throw new BadRequestException('You can only end your own active call.');

    const endedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.leadCallSession.update({ where: { id: session.id }, data: { endedAt, note: note?.trim() || null } });
      await tx.activity.create({
        data: {
          leadId,
          userId: session.agentId,
          type: ActivityType.CallEnded,
          title: 'Call Ended',
          description: `${session.agent.name} ended the active call.`,
          note: note?.trim() || null,
          metadata: { session_id: session.id, started_at: session.startedAt.toISOString(), ended_at: endedAt.toISOString() } as Prisma.InputJsonObject,
        },
      });
    });
    return { success: true };
  }

  private toDto(session: any): ActiveCallSessionDto {
    return {
      id: session.id,
      lead_id: session.leadId,
      agent_id: session.agentId,
      agent_name: session.agent?.name ?? '-',
      started_at: session.startedAt,
    };
  }
}

