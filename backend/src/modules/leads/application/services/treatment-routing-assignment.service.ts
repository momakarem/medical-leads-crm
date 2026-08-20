import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AssignmentSettingsService } from '../../../assignment-settings/assignment-settings.service';
import { AssignmentMethod } from '../../../assignment-settings/domain/assignment-settings.entity';
import { TreatmentRoutingService } from '../../../assignment-settings/treatment-routing.service';
import { AgentCapacityService } from '../../../users/application/services/agent-capacity.service';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';

interface LockedRoutingState {
  last_agent_id: string | null;
}

interface RoutedAgent {
  id: string;
  name: string;
  maxActiveLeads: number;
}

@Injectable()
export class TreatmentRoutingAssignmentService {
  private readonly logger = new Logger(TreatmentRoutingAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentSettings: AssignmentSettingsService,
    private readonly treatmentRouting: TreatmentRoutingService,
    private readonly agentCapacity: AgentCapacityService,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  async assignIfEnabled(lead: LeadEntity, currentUser: AuthenticatedUser): Promise<LeadEntity> {
    if (lead.ownerAgentId || !lead.treatmentId) return lead;

    const settings = await this.assignmentSettings.getCurrent();
    if (!settings.isEnabled || settings.assignmentMethod !== AssignmentMethod.TreatmentBased) return lead;

    const assignedAgentId = await this.assignInsideLockedTransaction(lead.id, lead.treatmentId, currentUser.id);
    if (!assignedAgentId) return lead;

    return (await this.leads.findById(lead.id)) ?? lead;
  }

  private async assignInsideLockedTransaction(leadId: string, treatmentId: string, assignedBy: string): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const stateKey = `treatment:${treatmentId}`;
      await tx.$executeRaw`
        INSERT INTO "round_robin_state" ("key")
        VALUES (${stateKey})
        ON CONFLICT ("key") DO NOTHING
      `;

      const stateRows = await tx.$queryRaw<LockedRoutingState[]>`
        SELECT "last_agent_id"
        FROM "round_robin_state"
        WHERE "key" = ${stateKey}
        FOR UPDATE
      `;
      const lastAgentId = stateRows[0]?.last_agent_id ?? null;

      const routedAgentIds = await this.treatmentRouting.findActiveAgentIdsForTreatment(treatmentId);
      if (routedAgentIds.length === 0) {
        this.logger.warn(`Treatment routing skipped for lead ${leadId}: no agents mapped to treatment ${treatmentId}.`);
        await this.recordUnassignedActivity(tx, leadId, assignedBy, 'no_treatment_routing_agents', treatmentId);
        return null;
      }

      const agents = await tx.user.findMany({
        where: { id: { in: routedAgentIds }, role: 'agent', isActive: true, deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, maxActiveLeads: true },
      });

      const counts = await this.agentCapacity.countActiveLeadsForAgents(agents.map((agent) => agent.id), tx);
      const availableAgents = agents.filter((agent) => agent.maxActiveLeads === 0 || (counts.get(agent.id) ?? 0) < agent.maxActiveLeads);

      for (const fullAgent of agents.filter((agent) => agent.maxActiveLeads !== 0 && (counts.get(agent.id) ?? 0) >= agent.maxActiveLeads)) {
        await this.agentCapacity.recordCapacityReached(fullAgent.id, counts.get(fullAgent.id) ?? 0, fullAgent.maxActiveLeads, { lead_id: leadId, treatment_id: treatmentId }, tx);
      }

      if (availableAgents.length === 0) {
        this.logger.warn(`Treatment routing skipped for lead ${leadId}: all routed agents reached capacity.`);
        await this.recordUnassignedActivity(tx, leadId, assignedBy, 'all_treatment_agents_at_capacity', treatmentId);
        return null;
      }

      const selectedAgent = this.pickNextAgent(availableAgents, lastAgentId);
      await tx.lead.update({ where: { id: leadId }, data: { ownerAgentId: selectedAgent.id } });
      await tx.roundRobinState.update({ where: { key: stateKey }, data: { lastAgentId: selectedAgent.id } });
      await tx.leadAssignment.create({
        data: {
          leadId,
          previousAgentId: null,
          newAgentId: selectedAgent.id,
          assignedBy,
          assignmentType: AssignmentMethod.TreatmentBased,
        },
      });
      await tx.activity.create({
        data: {
          leadId,
          userId: assignedBy,
          type: ActivityType.LeadAutoAssigned,
          title: 'Lead Routed by Treatment',
          description: `Lead automatically assigned to ${selectedAgent.name} using treatment-based routing.`,
          metadata: {
            assignment_method: AssignmentMethod.TreatmentBased,
            treatment_id: treatmentId,
            agent_id: selectedAgent.id,
            active_leads_before_assignment: counts.get(selectedAgent.id) ?? 0,
            max_active_leads: selectedAgent.maxActiveLeads,
          } as Prisma.InputJsonObject,
        },
      });

      return selectedAgent.id;
    });
  }

  private async recordUnassignedActivity(tx: Prisma.TransactionClient, leadId: string, userId: string, reason: string, treatmentId: string): Promise<void> {
    await tx.activity.create({
      data: {
        leadId,
        userId,
        type: ActivityType.LeadUnassignedNoCapacity,
        title: 'Lead Unassigned - Treatment Routing',
        description: 'Lead was created unassigned because treatment-based routing could not find an available routed agent.',
        metadata: { reason, treatment_id: treatmentId } as Prisma.InputJsonObject,
      },
    });
  }

  private pickNextAgent(agents: RoutedAgent[], lastAgentId: string | null): RoutedAgent {
    if (agents.length === 1) return agents[0];
    const lastIndex = lastAgentId ? agents.findIndex((agent) => agent.id === lastAgentId) : -1;
    const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % agents.length;
    return agents[nextIndex];
  }
}
