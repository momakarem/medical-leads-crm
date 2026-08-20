import { Injectable } from '@nestjs/common';
import type { LeadStatusHistory } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type {
  CreateLeadStatusHistoryData,
  LeadStatusHistoryRepository,
} from '../application/ports/lead-status-history.repository';
import type { LeadStatusHistoryEntity } from '../domain/lead-status-history.entity';
import { LeadStatus } from '../domain/lead-status.enum';

@Injectable()
export class PrismaLeadStatusHistoryRepository implements LeadStatusHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeadStatusHistoryData): Promise<LeadStatusHistoryEntity> {
    const history = await this.prisma.leadStatusHistory.create({ data });
    return this.toDomain(history);
  }

  async listByLeadId(leadId: string): Promise<LeadStatusHistoryEntity[]> {
    const history = await this.prisma.leadStatusHistory.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
    return history.map((item) => this.toDomain(item));
  }

  private toDomain(history: LeadStatusHistory): LeadStatusHistoryEntity {
    return {
      ...history,
      oldStatus: history.oldStatus as LeadStatus,
      newStatus: history.newStatus as LeadStatus,
    };
  }
}