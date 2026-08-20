import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserRole } from '../../../users/domain/user-role.enum';
import { AgentStatsSort, type DashboardAgentsQueryDto } from '../dto/dashboard-agents-query.dto';
import { DashboardRange } from '../dto/dashboard-overview-query.dto';

export interface AgentStatsResponse {
  agent_id: string;
  agent_name: string;
  leads: number;
  bookings: number;
  payments: number;
}

interface AgentStatsRow {
  agent_id: string;
  agent_name: string;
  leads: bigint | number;
  bookings: bigint | number;
  payments: bigint | number;
}

@Injectable()
export class DashboardAgentStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: DashboardAgentsQueryDto, currentUser: AuthenticatedUser): Promise<AgentStatsResponse[]> {
    const agentId = currentUser.role === UserRole.Agent ? currentUser.id : undefined;
    return this.queryStats(query, agentId);
  }

  async getOne(agentId: string, query: DashboardAgentsQueryDto, currentUser: AuthenticatedUser): Promise<AgentStatsResponse> {
    if (currentUser.role === UserRole.Agent && currentUser.id !== agentId) {
      throw new ForbiddenException('Agents can view only their own statistics.');
    }

    const rows = await this.queryStats(query, agentId);
    const row = rows[0];
    if (!row) throw new NotFoundException('Agent not found.');
    return row;
  }

  private async queryStats(query: DashboardAgentsQueryDto, agentId?: string): Promise<AgentStatsResponse[]> {
    const dateRange = this.resolveDateRange(query);
    const dateFilter = dateRange
      ? Prisma.sql`AND l.created_at >= ${dateRange.start} AND l.created_at <= ${dateRange.end}`
      : Prisma.empty;
    const agentFilter = agentId ? Prisma.sql`AND u.id = ${agentId}::uuid` : Prisma.empty;
    const orderBy = this.resolveOrderBy(query.sort);

    const rows = await this.prisma.$queryRaw<AgentStatsRow[]>(Prisma.sql`
      SELECT
        u.id::text AS agent_id,
        u.name AS agent_name,
        COUNT(l.id)::bigint AS leads,
        COUNT(l.id) FILTER (WHERE l.status = 'booked')::bigint AS bookings,
        COUNT(l.id) FILTER (WHERE l.status = 'paid')::bigint AS payments
      FROM users u
      LEFT JOIN leads l
        ON l.owner_agent_id = u.id
        AND l.deleted_at IS NULL
        ${dateFilter}
      WHERE u.role = 'agent'
        ${agentFilter}
      GROUP BY u.id, u.name
      ${orderBy}
    `);

    return rows.map((row) => ({
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      leads: this.toNumber(row.leads),
      bookings: this.toNumber(row.bookings),
      payments: this.toNumber(row.payments),
    }));
  }

  private resolveOrderBy(sort?: AgentStatsSort): Prisma.Sql {
    if (sort === AgentStatsSort.BookingsDesc) return Prisma.sql`ORDER BY bookings DESC, agent_name ASC`;
    if (sort === AgentStatsSort.PaymentsDesc) return Prisma.sql`ORDER BY payments DESC, agent_name ASC`;
    if (sort === AgentStatsSort.AgentNameAsc) return Prisma.sql`ORDER BY agent_name ASC`;
    return Prisma.sql`ORDER BY leads DESC, agent_name ASC`;
  }

  private resolveDateRange(query: DashboardAgentsQueryDto): { start: Date; end: Date } | null {
    if (query.start_date || query.end_date) {
      const start = query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : new Date(0);
      const end = query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : new Date();
      return { start, end };
    }

    if (!query.range) return null;
    const now = new Date();
    if (query.range === DashboardRange.Today) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      return { start, end };
    }

    const days = query.range === DashboardRange.Last7Days ? 7 : 30;
    return { start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), end: now };
  }

  private toNumber(value: bigint | number): number {
    return typeof value === 'bigint' ? Number(value) : value;
  }
}
