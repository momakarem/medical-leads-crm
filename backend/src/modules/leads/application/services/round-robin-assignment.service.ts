import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AssignmentSettingsService } from '../../../assignment-settings/assignment-settings.service';
import { AssignmentMethod } from '../../../assignment-settings/domain/assignment-settings.entity';
import { AgentCapacityService } from '../../../users/application/services/agent-capacity.service';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';

interface LockedRoundRobinState {
  last_agent_id: string | null;
}

interface EligibleAgent {
  id: string;
  name: string;
  maxActiveLeads: number;
}

@Injectable()
export class RoundRobinAssignmentService {
  private readonly logger = new Logger(RoundRobinAssignmentService.name);
  private readonly stateKey = 'default';

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentSettings: AssignmentSettingsService,
    private readonly agentCapacity: AgentCapacityService,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  async assignIfEnabled(lead: LeadEntity, currentUser: AuthenticatedUser): Promise<LeadEntity> {
    if (lead.ownerAgentId) return lead;
    const settings = await this.assignmentSettings.getCurrent();
    if (!settings.isEnabled || settings.assignmentMethod !== AssignmentMethod.RoundRobin) return lead;

    const assignedAgentId = await this.assignInsideLockedTransaction(lead.id, currentUser.id);
    if (!assignedAgentId) return lead;

    return (await this.leads.findById(lead.id)) ?? lead;
  }

  private async assignInsideLockedTransaction(leadId: string, assignedBy: string): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "round_robin_state" ("key")
        VALUES (${this.stateKey})
        ON CONFLICT ("key") DO NOTHING
      `;

      const stateRows = await tx.$queryRaw<LockedRoundRobinState[]>`
        SELECT "last_agent_id"
        FROM "round_robin_state"
        WHERE "key" = ${this.stateKey}
        FOR UPDATE
      `;
      const lastAgentId = stateRows[0]?.last_agent_id ?? null;

      const agents = await tx.user.findMany({
        where: { role: 'agent', isActive: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, maxActiveLeads: true },
      });

      if (agents.length === 0) {
        this.logger.warn(`Round Robin skipped for lead ${leadId}: no active agents found.`);
        await this.recordNoCapacityActivity(tx, leadId, assignedBy, 'no_active_agents');
        return null;
      }

      const counts = await this.agentCapacity.countActiveLeadsForAgents(agents.map((agent) => agent.id), tx);
      const availableAgents = agents.filter((agent) => agent.maxActiveLeads === 0 || (counts.get(agent.id) ?? 0) < agent.maxActiveLeads);

      for (const fullAgent of agents.filter((agent) => agent.maxActiveLeads !== 0 && (counts.get(agent.id) ?? 0) >= agent.maxActiveLeads)) {
        await this.agentCapacity.recordCapacityReached(fullAgent.id, counts.get(fullAgent.id) ?? 0, fullAgent.maxActiveLeads, { lead_id: leadId }, tx);
      }

      if (availableAgents.length === 0) {
        this.logger.warn(`Round Robin skipped for lead ${leadId}: all agents reached capacity.`);
        await this.recordNoCapacityActivity(tx, leadId, assignedBy, 'all_agents_at_capacity');
        return null;
      }

      const selectedAgent = this.pickNextAgent(availableAgents, lastAgentId);

      await tx.lead.update({ where: { id: leadId }, data: { ownerAgentId: selectedAgent.id } });
      await tx.roundRobinState.update({
        where: { key: this.stateKey },
        data: { lastAgentId: selectedAgent.id },
      });
      await tx.leadAssignment.create({
        data: {
          leadId,
          previousAgentId: null,
          newAgentId: selectedAgent.id,
          assignedBy,
          assignmentType: AssignmentMethod.RoundRobin,
        },
      });
      await tx.activity.create({
        data: {
          leadId,
          userId: assignedBy,
          type: ActivityType.LeadAutoAssigned,
          title: 'Lead Auto Assigned',
          description: `Lead automatically assigned to ${selectedAgent.name} using Round Robin.`,
          metadata: {
            assignment_method: AssignmentMethod.RoundRobin,
            agent_id: selectedAgent.id,
            active_leads_before_assignment: counts.get(selectedAgent.id) ?? 0,
            max_active_leads: selectedAgent.maxActiveLeads,
          } as Prisma.InputJsonObject,
        },
      });

      return selectedAgent.id;
    });
  }

  private async recordNoCapacityActivity(tx: Prisma.TransactionClient, leadId: string, userId: string, reason: string): Promise<void> {
    await tx.activity.create({
      data: {
        leadId,
        userId,
        type: ActivityType.LeadUnassignedNoCapacity,
        title: 'Lead Unassigned - No Capacity',
        description: 'Lead was created unassigned because no agents were available for capacity-aware assignment.',
        metadata: { reason } as Prisma.InputJsonObject,
      },
    });
  }

  private pickNextAgent(agents: EligibleAgent[], lastAgentId: string | null): EligibleAgent {
    if (agents.length === 1) return agents[0];
    const lastIndex = lastAgentId ? agents.findIndex((agent) => agent.id === lastAgentId) : -1;
    const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % agents.length;
    return agents[nextIndex];
  }
}