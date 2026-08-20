import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DashboardRange, type DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';

export interface DashboardOverviewResponse {
  total_leads: number;
  new_leads: number;
  paid_leads: number;
}

interface DashboardOverviewRow {
  total_leads: bigint | number;
  new_leads: bigint | number;
  paid_leads: bigint | number;
}

@Injectable()
export class DashboardOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: DashboardOverviewQueryDto): Promise<DashboardOverviewResponse> {
    const dateRange = this.resolveDateRange(query);
    const rows = dateRange
      ? await this.prisma.$queryRaw<DashboardOverviewRow[]>`
          SELECT
            COUNT(*)::bigint AS total_leads,
            COUNT(*) FILTER (WHERE status = 'new')::bigint AS new_leads,
            COUNT(*) FILTER (WHERE status = 'paid')::bigint AS paid_leads
          FROM leads
          WHERE created_at >= ${dateRange.start} AND created_at <= ${dateRange.end}
        `
      : await this.prisma.$queryRaw<DashboardOverviewRow[]>`
          SELECT
            COUNT(*)::bigint AS total_leads,
            COUNT(*) FILTER (WHERE status = 'new')::bigint AS new_leads,
            COUNT(*) FILTER (WHERE status = 'paid')::bigint AS paid_leads
          FROM leads
        `;
    const row = rows[0] ?? { total_leads: 0, new_leads: 0, paid_leads: 0 };
    return {
      total_leads: this.toNumber(row.total_leads),
      new_leads: this.toNumber(row.new_leads),
      paid_leads: this.toNumber(row.paid_leads),
    };
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

  private toNumber(value: bigint | number): number {
    return typeof value === 'bigint' ? Number(value) : value;
  }
}

