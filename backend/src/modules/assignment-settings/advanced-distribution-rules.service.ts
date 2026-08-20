import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AgentCapacityService } from '../users/application/services/agent-capacity.service';
import { SaveDistributionRuleDto } from './application/dto/save-distribution-rule.dto';

export interface DistributionAllocationItem {
  id: string;
  agent_id: string;
  agent_name: string;
  weight: number;
  assigned_count: number;
}

export interface DistributionRuleItem {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  source_channel: string | null;
  campaign_name: string | null;
  ad_name: string | null;
  form_id: string | null;
  allocations: DistributionAllocationItem[];
  created_at: Date;
  updated_at: Date;
}

export interface DistributionMatchInput {
  leadId: string;
  sourceChannel: string;
  campaignName?: string | null;
  adName?: string | null;
  formId?: string | null;
  assignedBy: string;
}

@Injectable()
export class AdvancedDistributionRulesService {
  private readonly logger = new Logger(AdvancedDistributionRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentCapacity: AgentCapacityService,
  ) {}

  async list(): Promise<DistributionRuleItem[]> {
    const rules = await this.prisma.assignmentDistributionRule.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      include: { allocations: { include: { agent: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    return rules.map((rule) => this.toItem(rule));
  }

  async create(dto: SaveDistributionRuleDto, user: AuthenticatedUser): Promise<DistributionRuleItem> {
    await this.validateAllocations(dto.allocations);
    const rule = await this.prisma.assignmentDistributionRule.create({
      data: {
        name: dto.name.trim(),
        isActive: dto.is_active ?? true,
        priority: dto.priority ?? 100,
        sourceChannel: this.clean(dto.source_channel),
        campaignName: this.clean(dto.campaign_name),
        adName: this.clean(dto.ad_name),
        formId: this.clean(dto.form_id),
        createdBy: user.id,
        allocations: { create: dto.allocations.map((item) => ({ agentId: item.agent_id, weight: item.weight })) },
      },
      include: { allocations: { include: { agent: { select: { id: true, name: true } } } } },
    });
    return this.toItem(rule);
  }

  async update(id: string, dto: SaveDistributionRuleDto): Promise<DistributionRuleItem> {
    const exists = await this.prisma.assignmentDistributionRule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Distribution rule not found.');
    await this.validateAllocations(dto.allocations);
    const rule = await this.prisma.$transaction(async (tx) => {
      await tx.assignmentDistributionAllocation.deleteMany({ where: { ruleId: id } });
      return tx.assignmentDistributionRule.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          isActive: dto.is_active ?? true,
          priority: dto.priority ?? 100,
          sourceChannel: this.clean(dto.source_channel),
          campaignName: this.clean(dto.campaign_name),
          adName: this.clean(dto.ad_name),
          formId: this.clean(dto.form_id),
          allocations: { create: dto.allocations.map((item) => ({ agentId: item.agent_id, weight: item.weight })) },
        },
        include: { allocations: { include: { agent: { select: { id: true, name: true } } } } },
      });
    });
    return this.toItem(rule);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.prisma.assignmentDistributionRule.delete({ where: { id } });
    return { success: true };
  }

  async assignIfMatched(input: DistributionMatchInput): Promise<boolean> {
    const rule = await this.findMatchingRule(input);
    if (!rule) return false;

    const assignedAgentId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "assignment_distribution_rules" WHERE "id" = ${rule.id} FOR UPDATE`;
      const lockedRule = await tx.assignmentDistributionRule.findFirst({
        where: { id: rule.id, isActive: true },
        include: { allocations: { include: { agent: { select: { id: true, name: true, isActive: true, role: true, maxActiveLeads: true } } } } },
      });
      if (!lockedRule) return null;

      const allocations = lockedRule.allocations.filter((allocation) => allocation.weight > 0 && allocation.agent.role === 'agent' && allocation.agent.isActive);
      if (allocations.length === 0) return null;

      const availableIds = await this.agentCapacity.getAvailableAgentIds(allocations.map((allocation) => allocation.agentId), tx);
      const available = allocations.filter((allocation) => availableIds.has(allocation.agentId));
      if (available.length === 0) {
        this.logger.warn(`Advanced distribution skipped for lead ${input.leadId}: all matched agents are full.`);
        return null;
      }

      const selected = available.sort((a, b) => {
        const aScore = a.assignedCount / a.weight;
        const bScore = b.assignedCount / b.weight;
        if (aScore !== bScore) return aScore - bScore;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })[0];

      await tx.lead.update({ where: { id: input.leadId }, data: { ownerAgentId: selected.agentId, isPrivate: true } });
      await tx.assignmentDistributionAllocation.update({ where: { id: selected.id }, data: { assignedCount: { increment: 1 } } });
      await tx.leadAssignment.create({
        data: {
          leadId: input.leadId,
          previousAgentId: null,
          newAgentId: selected.agentId,
          assignedBy: input.assignedBy,
          assignmentType: 'weighted_distribution',
        },
      });
      await tx.activity.create({
        data: {
          leadId: input.leadId,
          userId: input.assignedBy,
          type: 'lead_auto_assigned' as never,
          title: 'Lead Auto Assigned',
          description: `Lead automatically assigned to ${selected.agent.name} using advanced distribution rule ${lockedRule.name}.`,
          metadata: {
            assignment_method: 'weighted_distribution',
            rule_id: lockedRule.id,
            rule_name: lockedRule.name,
            agent_id: selected.agentId,
            weight: selected.weight,
            source_channel: input.sourceChannel,
            campaign_name: input.campaignName ?? null,
            ad_name: input.adName ?? null,
            form_id: input.formId ?? null,
          } as Prisma.InputJsonObject,
        },
      });
      return selected.agentId;
    });

    return Boolean(assignedAgentId);
  }

  private async findMatchingRule(input: DistributionMatchInput) {
    const rules = await this.prisma.assignmentDistributionRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return rules.find((rule) => this.matches(rule.sourceChannel, input.sourceChannel)
      && this.matches(rule.campaignName, input.campaignName)
      && this.matches(rule.adName, input.adName)
      && this.matches(rule.formId, input.formId));
  }

  private matches(ruleValue: string | null, inputValue?: string | null): boolean {
    if (!ruleValue) return true;
    return (inputValue ?? '').trim().toLowerCase() === ruleValue.trim().toLowerCase();
  }

  private async validateAllocations(allocations: SaveDistributionRuleDto['allocations']): Promise<void> {
    if (!allocations?.length) throw new BadRequestException('At least one agent allocation is required.');
    const agentIds = [...new Set(allocations.map((item) => item.agent_id))];
    if (agentIds.length !== allocations.length) throw new BadRequestException('Agent allocations must be unique.');
    const agentsCount = await this.prisma.user.count({ where: { id: { in: agentIds }, role: 'agent', isActive: true, deletedAt: null } });
    if (agentsCount !== agentIds.length) throw new BadRequestException('All distribution users must be active agents.');
  }

  private clean(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toItem(rule: any): DistributionRuleItem {
    return {
      id: rule.id,
      name: rule.name,
      is_active: rule.isActive,
      priority: rule.priority,
      source_channel: rule.sourceChannel,
      campaign_name: rule.campaignName,
      ad_name: rule.adName,
      form_id: rule.formId,
      allocations: rule.allocations.map((allocation: any) => ({
        id: allocation.id,
        agent_id: allocation.agentId,
        agent_name: allocation.agent?.name ?? '-',
        weight: allocation.weight,
        assigned_count: allocation.assignedCount,
      })),
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
  }
}
