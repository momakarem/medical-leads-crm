import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { CreateSecurityLogData, SecurityLogRepository } from '../application/ports/security-log.repository';

@Injectable()
export class PrismaSecurityLogRepository implements SecurityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSecurityLogData): Promise<void> {
    await this.prisma.securityLog.create({
      data: {
        userId: data.userId,
        leadId: data.leadId ?? null,
        action: data.action,
        ipAddress: data.ipAddress ?? null,
      },
    });
  }
}