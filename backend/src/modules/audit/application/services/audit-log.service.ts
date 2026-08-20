import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';
import type { AuditLogEntity, PaginatedAuditLogs } from './audit-log.types';

export interface CreateAuditLogData {
  userId?: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  endpoint?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        module: data.module,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        requestMethod: data.requestMethod ?? null,
        endpoint: data.endpoint ?? null,
        oldValues: this.jsonOrNull(data.oldValues),
        newValues: this.jsonOrNull(data.newValues),
        metadata: this.jsonOrNull(data.metadata),
      },
    });
  }

  async list(query: ListAuditLogsQueryDto): Promise<PaginatedAuditLogs> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const userIds = [...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    return {
      data: rows.map((row) => ({ ...row, user: row.userId ? userMap.get(row.userId) ?? null : null })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string): Promise<AuditLogEntity | null> {
    const row = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!row) return null;
    const user = row.userId
      ? await this.prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, email: true } })
      : null;
    return { ...row, user };
  }

  maskSensitive(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.maskSensitive(item));
    if (!value || typeof value !== 'object') return value;
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/(password|token|secret|authorization|cookie|access_token|refresh_token|session)/i.test(key)) result[key] = '[REDACTED]';
      else result[key] = this.maskSensitive(nested);
    }
    return result;
  }

  private buildWhere(query: ListAuditLogsQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.module) where.module = { equals: query.module, mode: 'insensitive' };
    if (query.action) where.action = { equals: query.action, mode: 'insensitive' };
    if (query.user_id) where.userId = query.user_id;
    if (query.entity_type) where.entityType = { equals: query.entity_type, mode: 'insensitive' };
    if (query.entity_id) where.entityId = { equals: query.entity_id };
    if (query.start_date || query.end_date) {
      where.createdAt = {
        gte: query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : undefined,
        lte: query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : undefined,
      };
    }
    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) return Prisma.JsonNull;
    return this.maskSensitive(value) as Prisma.InputJsonValue;
  }
}
