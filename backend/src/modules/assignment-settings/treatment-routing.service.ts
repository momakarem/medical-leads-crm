import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface TreatmentRoutingItem {
  treatment_id: string;
  treatment_name: string;
  agent_ids: string[];
  agents: Array<{ id: string; name: string; email: string }>;
}

@Injectable()
export class TreatmentRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TreatmentRoutingItem[]> {
    const treatments = await this.prisma.treatment.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        agentRoutings: {
          include: { agent: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return treatments.map((treatment) => ({
      treatment_id: treatment.id,
      treatment_name: treatment.name,
      agent_ids: treatment.agentRoutings.map((routing) => routing.agentId),
      agents: treatment.agentRoutings.map((routing) => routing.agent),
    }));
  }

  async update(treatmentId: string, agentIds: string[]): Promise<TreatmentRoutingItem> {
    const treatment = await this.prisma.treatment.findFirst({ where: { id: treatmentId, isActive: true } });
    if (!treatment) throw new NotFoundException('Treatment not found.');

    const uniqueAgentIds = [...new Set(agentIds)];
    if (uniqueAgentIds.length > 0) {
      const validAgents = await this.prisma.user.count({ where: { id: { in: uniqueAgentIds }, role: 'agent', isActive: true, deletedAt: null } });
      if (validAgents !== uniqueAgentIds.length) throw new BadRequestException('All routed users must be active agents.');
    }

    await this.prisma.$transaction([
      this.prisma.treatmentAgentRouting.deleteMany({ where: { treatmentId } }),
      ...(uniqueAgentIds.length
        ? [this.prisma.treatmentAgentRouting.createMany({ data: uniqueAgentIds.map((agentId) => ({ treatmentId, agentId })), skipDuplicates: true })]
        : []),
    ]);

    const item = (await this.list()).find((routing) => routing.treatment_id === treatmentId);
    if (!item) throw new NotFoundException('Treatment not found.');
    return item;
  }

  async findActiveAgentIdsForTreatment(treatmentId: string): Promise<string[]> {
    const routings = await this.prisma.treatmentAgentRouting.findMany({
      where: { treatmentId, agent: { role: 'agent', isActive: true, deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      select: { agentId: true },
    });
    return routings.map((routing) => routing.agentId);
  }
}
