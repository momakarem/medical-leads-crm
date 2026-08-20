import { Injectable } from '@nestjs/common';
import { Prisma, type LeadTransfer } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { CreateLeadTransferData, LeadTransferRepository } from '../application/ports/lead-transfer.repository';
import type { LeadTransferEntity } from '../domain/lead-transfer.entity';

type LeadTransferWithRelations = Prisma.LeadTransferGetPayload<{
  include: {
    previousAgent: { select: { id: true; name: true } };
    newAgent: { select: { id: true; name: true } };
    transferer: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class PrismaLeadTransferRepository implements LeadTransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeadTransferData): Promise<LeadTransferEntity> {
    const transfer = await this.prisma.leadTransfer.create({
      data: {
        leadId: data.leadId,
        previousAgentId: data.previousAgentId,
        newAgentId: data.newAgentId,
        transferredBy: data.transferredBy,
        reason: data.reason ?? null,
      },
      include: this.includeRelations,
    });
    return this.toDomain(transfer);
  }

  async listByLeadId(leadId: string): Promise<LeadTransferEntity[]> {
    const transfers = await this.prisma.leadTransfer.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations,
    });
    return transfers.map((transfer) => this.toDomain(transfer));
  }

  private get includeRelations() {
    return {
      previousAgent: { select: { id: true, name: true } },
      newAgent: { select: { id: true, name: true } },
      transferer: { select: { id: true, name: true } },
    } satisfies Prisma.LeadTransferInclude;
  }

  private toDomain(transfer: LeadTransfer | LeadTransferWithRelations): LeadTransferEntity {
    const related = transfer as LeadTransferWithRelations;
    return {
      ...transfer,
      previousAgent: related.previousAgent ? { id: related.previousAgent.id, name: related.previousAgent.name } : null,
      newAgent: related.newAgent ? { id: related.newAgent.id, name: related.newAgent.name } : undefined,
      transferer: related.transferer ? { id: related.transferer.id, name: related.transferer.name } : undefined,
    };
  }
}