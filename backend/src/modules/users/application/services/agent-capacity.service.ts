import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { AgentCapacitySummary } from '../../domain/agent-capacity.entity';

const closedStatuses = [LeadStatus.paid, LeadStatus.not_interested, LeadStatus.wrong_number, LeadStatus.job_seeker];

@Injectable()
export class AgentCapacityService {
  constructor(private readonly prisma: PrismaService) {}

  async getCapacity(agentId: string): Promise<AgentCapacitySummary> {
    const agent = await this.prisma.user.findFirst({ where: { id: agentId, role: 'agent', deletedAt: null } });
    if (!agent) throw new NotFoundException('Agent not found.');
    const activeLeads = await this.countActiveLeads(agentId);
    return this.toSummary(agent.id, activeLeads, agent.maxActiveLeads);
  }

  async updateCapacity(agentId: string, maxActiveLeads: number, currentUser: AuthenticatedUser): Promise<AgentCapacitySummary> {
    const agent = await this.prisma.user.findFirst({ where: { id: agentId, role: 'agent', deletedAt: null } });
    if (!agent) throw new NotFoundException('Agent not found.');
    if (maxActiveLeads < 0) throw new BadRequestException('Maximum active leads must be zero or greater.');

    const updated = await this.prisma.user.update({ where: { id: agentId }, data: { maxActiveLeads } });
    const activeLeads = await this.countActiveLeads(agentId);
    await this.prisma.agentCapacityHistory.create({
      data: {
        agentId,
        changedBy: currentUser.id,
        type: 'agent_capacity_updated',
        oldMaxActiveLeads: agent.maxActiveLeads,
        newMaxActiveLeads: updated.maxActiveLeads,
        activeLeads,
      },
    });
    return this.toSummary(agentId, activeLeads, updated.maxActiveLeads);
  }

  async getAvailableAgentIds(agentIds: string[], tx: Prisma.TransactionClient = this.prisma): Promise<Set<string>> {
    if (agentIds.length === 0) return new Set();
    const agents = await tx.user.findMany({ where: { id: { in: agentIds }, role: 'agent', isActive: true, deletedAt: null }, select: { id: true, maxActiveLeads: true } });
    const counts = await this.countActiveLeadsForAgents(agentIds, tx);
    return new Set(agents.filter((agent) => agent.maxActiveLeads === 0 || (counts.get(agent.id) ?? 0) < agent.maxActiveLeads).map((agent) => agent.id));
  }

  async recordCapacityReached(agentId: string, activeLeads: number, maxActiveLeads: number, metadata?: Record<string, unknown>, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    await tx.agentCapacityHistory.create({
      data: {
        agentId,
        type: 'agent_capacity_reached',
        activeLeads,
        newMaxActiveLeads: maxActiveLeads,
        metadata: metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async countActiveLeads(agentId: string, tx: Prisma.TransactionClient = this.prisma): Promise<number> {
    return tx.lead.count({ where: { ownerAgentId: agentId, deletedAt: null, status: { notIn: [...closedStatuses] } } });
  }

  async countActiveLeadsForAgents(agentIds: string[], tx: Prisma.TransactionClient = this.prisma): Promise<Map<string, number>> {
    if (agentIds.length === 0) return new Map();
    const grouped = await tx.lead.groupBy({
      by: ['ownerAgentId'],
      where: { ownerAgentId: { in: agentIds }, deletedAt: null, status: { notIn: [...closedStatuses] } },
      _count: { _all: true },
    });
    return new Map(grouped.filter((row) => row.ownerAgentId).map((row) => [row.ownerAgentId as string, row._count._all]));
  }

  private toSummary(agentId: string, activeLeads: number, maxActiveLeads: number): AgentCapacitySummary {
    const remaining = maxActiveLeads === 0 ? 999999 : Math.max(maxActiveLeads - activeLeads, 0);
    return {
      agent_id: agentId,
      active_leads: activeLeads,
      max_active_leads: maxActiveLeads,
      remaining_capacity: remaining,
      is_full: maxActiveLeads !== 0 && activeLeads >= maxActiveLeads,
    };
  }
}
