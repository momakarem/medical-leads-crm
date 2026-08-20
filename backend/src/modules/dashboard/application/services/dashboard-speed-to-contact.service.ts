import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserRole } from '../../../users/domain/user-role.enum';
import type { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { DashboardRange } from '../dto/dashboard-overview-query.dto';

export interface SpeedToContactOverviewResponse {
  average_speed_to_contact_minutes: number | null;
  median_speed_to_contact_minutes: number | null;
  minimum_speed_to_contact_minutes: number | null;
  maximum_speed_to_contact_minutes: number | null;
}

export interface AgentSpeedToContactResponse {
  agent_id: string;
  agent_name: string;
  average_speed_to_contact_minutes: number | null;
  contacted_leads: number;
}

interface SpeedToContactRow {
  average_seconds: number | null;
  median_seconds: number | null;
  minimum_seconds: number | null;
  maximum_seconds: number | null;
}

interface AgentSpeedToContactRow {
  agent_id: string;
  agent_name: string;
  average_seconds: number | null;
  contacted_leads: bigint | number;
}

@Injectable()
export class DashboardSpeedToContactService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: DashboardOverviewQueryDto): Promise<SpeedToContactOverviewResponse> {
    const dateRange = this.resolveDateRange(query);
    const dateFilter = dateRange
      ? Prisma.sql`AND created_at >= ${dateRange.start} AND created_at <= ${dateRange.end}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<SpeedToContactRow[]>(Prisma.sql`
      SELECT
        AVG(speed_to_contact_seconds)::float AS average_seconds,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY speed_to_contact_seconds)::float AS median_seconds,
        MIN(speed_to_contact_seconds)::float AS minimum_seconds,
        MAX(speed_to_contact_seconds)::float AS maximum_seconds
      FROM leads
      WHERE deleted_at IS NULL
        AND speed_to_contact_seconds IS NOT NULL
        ${dateFilter}
    `);

    const row = rows[0] ?? { average_seconds: null, median_seconds: null, minimum_seconds: null, maximum_seconds: null };
    return {
      average_speed_to_contact_minutes: this.secondsToMinutes(row.average_seconds),
      median_speed_to_contact_minutes: this.secondsToMinutes(row.median_seconds),
      minimum_speed_to_contact_minutes: this.secondsToMinutes(row.minimum_seconds),
      maximum_speed_to_contact_minutes: this.secondsToMinutes(row.maximum_seconds),
    };
  }

  async getAgentStats(query: DashboardOverviewQueryDto, currentUser: AuthenticatedUser): Promise<AgentSpeedToContactResponse[]> {
    const dateRange = this.resolveDateRange(query);
    const dateFilter = dateRange
      ? Prisma.sql`AND l.created_at >= ${dateRange.start} AND l.created_at <= ${dateRange.end}`
      : Prisma.empty;
    const agentFilter = currentUser.role === UserRole.Agent ? Prisma.sql`AND u.id = ${currentUser.id}::uuid` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<AgentSpeedToContactRow[]>(Prisma.sql`
      SELECT
        u.id::text AS agent_id,
        u.name AS agent_name,
        AVG(l.speed_to_contact_seconds)::float AS average_seconds,
        COUNT(l.id)::bigint AS contacted_leads
      FROM users u
      LEFT JOIN leads l
        ON l.owner_agent_id = u.id
        AND l.deleted_at IS NULL
        AND l.speed_to_contact_seconds IS NOT NULL
        ${dateFilter}
      WHERE u.role = 'agent'
        ${agentFilter}
      GROUP BY u.id, u.name
      ORDER BY average_seconds ASC NULLS LAST, agent_name ASC
    `);

    return rows.map((row) => ({
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      average_speed_to_contact_minutes: this.secondsToMinutes(row.average_seconds),
      contacted_leads: this.toNumber(row.contacted_leads),
    }));
  }

  private resolveDateRange(query: DashboardOverviewQueryDto): { start: Date; end: Date } | null {
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

  private secondsToMinutes(seconds: number | null): number | null {
    if (seconds === null || Number.isNaN(seconds)) return null;
    return Math.round((seconds / 60) * 100) / 100;
  }

  private toNumber(value: bigint | number): number {
    return typeof value === 'bigint' ? Number(value) : value;
  }
}
