import { Injectable } from '@nestjs/common';
import { Prisma, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ExcelExportService, type ExcelWorksheetData } from '../../../leads/application/services/excel-export.service';
import type { ReportsExportQueryDto, ReportsQueryDto, ReportExportFormat, ReportExportType } from '../dto/reports-query.dto';

export interface ReportsOverview {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  booked_leads: number;
  paid_leads: number;
  conversion_rate: number;
  average_speed_to_contact_minutes: number | null;
}

export interface AgentPerformanceReportRow {
  agent_id: string | null;
  agent_name: string;
  leads: number;
  leads_handled: number;
  contacted: number;
  booked: number;
  showed_up: number;
  paid: number;
  no_answer: number;
  booking_rate: number;
  show_up_rate: number;
  win_rate: number;
  no_answer_rate: number;
  average_speed_to_contact_minutes: number | null;
  average_speed_to_first_action_minutes: number | null;
  average_follow_ups_per_lead: number;
  activity_volume_today: number;
}

export interface MarketingQualityReportRow {
  source_channel: string;
  leads: number;
  duplicates: number;
  junk_leads: number;
  booked: number;
  paid: number;
  conversion_rate: number;
  duplicate_rate: number;
  junk_rate: number;
  converted_rate: number;
}

export interface SourceBreakdownRow {
  source_channel: string;
  leads: number;
  percentage: number;
}

export interface TreatmentBreakdownRow {
  treatment_id: string | null;
  treatment_name: string;
  leads: number;
  percentage: number;
}

export interface FunnelStageRow {
  stage: string;
  count: number;
  conversion_from_previous: number | null;
}

export interface CallOutcomeDistributionRow {
  status: LeadStatus;
  label: string;
  count: number;
  percentage: number;
}

export interface CampaignPerformanceRow {
  campaign_name: string;
  source_channel: string;
  leads: number;
  booked: number;
  paid: number;
  conversion_rate: number;
}

export interface ReportsResponse {
  overview: ReportsOverview;
  agent_performance: AgentPerformanceReportRow[];
  marketing_quality: MarketingQualityReportRow[];
  source_breakdown: SourceBreakdownRow[];
  treatment_breakdown: TreatmentBreakdownRow[];
  conversion_funnel: FunnelStageRow[];
  call_outcome_distribution: CallOutcomeDistributionRow[];
  campaign_performance: CampaignPerformanceRow[];
  filters: Record<string, string | null>;
}

export interface ReportExportResult {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

const contactedStatuses: LeadStatus[] = [
  LeadStatus.interested,
  LeadStatus.not_interested,
  LeadStatus.wrong_number,
  LeadStatus.job_seeker,
  LeadStatus.booked,
  LeadStatus.showed_up,
  LeadStatus.no_show,
  LeadStatus.paid,
];

const statusLabels: Record<LeadStatus, string> = {
  [LeadStatus.new]: 'New',
  [LeadStatus.no_answer]: 'No Answer',
  [LeadStatus.follow_up]: 'Follow Up',
  [LeadStatus.interested]: 'Interested',
  [LeadStatus.not_interested]: 'Not Interested',
  [LeadStatus.wrong_number]: 'Wrong Number',
  [LeadStatus.job_seeker]: 'Job Seeker',
  [LeadStatus.booked]: 'Booked',
  [LeadStatus.showed_up]: 'Showed Up',
  [LeadStatus.no_show]: 'No Show',
  [LeadStatus.paid]: 'Paid',
};

const junkStatuses: LeadStatus[] = [LeadStatus.job_seeker, LeadStatus.wrong_number];

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly excel: ExcelExportService,
  ) {}

  async getReports(query: ReportsQueryDto): Promise<ReportsResponse> {
    const where = this.buildWhere(query);
    const [total, newLeads, contacted, booked, paid, speedAgg, agentTotals, agentStatuses, agentSpeeds, agentFirstActions, sourceTotals, sourceStatuses, sourceDuplicates, treatmentTotals, statusTotals, campaignTotals, campaignStatuses] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.new } }),
      this.prisma.lead.count({ where: { ...where, status: { in: contactedStatuses } } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.booked } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.paid } }),
      this.prisma.lead.aggregate({ where: { ...where, speedToContactSeconds: { not: null } }, _avg: { speedToContactSeconds: true } }),
      this.prisma.lead.groupBy({ by: ['ownerAgentId'], where, orderBy: { ownerAgentId: 'asc' }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['ownerAgentId', 'status'], where, orderBy: [{ ownerAgentId: 'asc' }, { status: 'asc' }], _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['ownerAgentId'], where: { ...where, speedToContactSeconds: { not: null } }, orderBy: { ownerAgentId: 'asc' }, _avg: { speedToContactSeconds: true } }),
      this.prisma.lead.groupBy({ by: ['ownerAgentId'], where: { ...where, speedToFirstActionSeconds: { not: null } }, orderBy: { ownerAgentId: 'asc' }, _avg: { speedToFirstActionSeconds: true } }),
      this.prisma.lead.groupBy({ by: ['sourceChannel'], where, orderBy: { sourceChannel: 'asc' }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['sourceChannel', 'status'], where, orderBy: [{ sourceChannel: 'asc' }, { status: 'asc' }], _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['sourceChannel'], where: { ...where, isDuplicate: true }, orderBy: { sourceChannel: 'asc' }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['treatmentId'], where, orderBy: { treatmentId: 'asc' }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['status'], where, orderBy: { status: 'asc' }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['campaignName', 'sourceChannel'], where, orderBy: [{ campaignName: 'asc' }, { sourceChannel: 'asc' }], _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['campaignName', 'sourceChannel', 'status'], where, orderBy: [{ campaignName: 'asc' }, { sourceChannel: 'asc' }, { status: 'asc' }], _count: { _all: true } }),
    ]);

    return {
      overview: {
        total_leads: total,
        new_leads: newLeads,
        contacted_leads: contacted,
        booked_leads: booked,
        paid_leads: paid,
        conversion_rate: this.percent(paid, total),
        average_speed_to_contact_minutes: this.minutes(speedAgg._avg.speedToContactSeconds),
      },
      agent_performance: await this.buildAgentRows(agentTotals, agentStatuses, agentSpeeds, agentFirstActions, await this.buildAgentFollowUpTotals(query), await this.buildAgentActivityTodayTotals(query)),
      marketing_quality: this.buildSourceRows(sourceTotals, sourceStatuses, sourceDuplicates),
      source_breakdown: this.buildSourceBreakdown(sourceTotals, total),
      treatment_breakdown: await this.buildTreatmentBreakdown(treatmentTotals, total),
      conversion_funnel: this.buildFunnel(total, statusTotals),
      call_outcome_distribution: this.buildCallOutcomeDistribution(statusTotals, total),
      campaign_performance: this.buildCampaignPerformance(campaignTotals, campaignStatuses),
      filters: {
        start_date: query.start_date ?? null,
        end_date: query.end_date ?? null,
        agent_id: query.agent_id ?? null,
        treatment_id: query.treatment_id ?? null,
        source_channel: query.source_channel ?? null,
      },
    };
  }


  async export(query: ReportsExportQueryDto): Promise<ReportExportResult> {
    const format: ReportExportFormat = query.format ?? 'xlsx';
    const type: ReportExportType = query.type ?? 'all';
    const report = await this.getReports(query);
    const worksheet = this.toWorksheet(report, type);
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '_');
    const filename = `CRM_Reports_${type}_${timestamp}.${format}`;

    if (format === 'csv') {
      return { filename, contentType: 'text/csv; charset=utf-8', buffer: this.toCsv(worksheet) };
    }

    return {
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: this.excel.createWorkbook(worksheet),
    };
  }

  private buildWhere(query: ReportsQueryDto): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (query.agent_id) where.ownerAgentId = query.agent_id;
    if (query.treatment_id) where.treatmentId = query.treatment_id;
    if (query.source_channel) where.sourceChannel = { equals: query.source_channel, mode: 'insensitive' };
    if (query.start_date || query.end_date) {
      where.createdAt = {
        gte: query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : undefined,
        lte: query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : undefined,
      };
    }
    return where;
  }

  private async buildAgentRows(
    totals: Array<{ ownerAgentId: string | null; _count?: { _all?: number } | true }>,
    statuses: Array<{ ownerAgentId: string | null; status: LeadStatus; _count?: { _all?: number } | true }>,
    speeds: Array<{ ownerAgentId: string | null; _avg?: { speedToContactSeconds?: number | null } }>,
    firstActions: Array<{ ownerAgentId: string | null; _avg?: { speedToFirstActionSeconds?: number | null } }>,
    followUpTotals: Map<string, number>,
    activityTodayTotals: Map<string, number>,
  ): Promise<AgentPerformanceReportRow[]> {
    const agentIds = totals.map((row) => row.ownerAgentId).filter((id): id is string => Boolean(id));
    const users = await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } });
    const userNames = new Map(users.map((user) => [user.id, user.name]));
    const statusMap = new Map<string, Map<LeadStatus, number>>();
    const speedMap = new Map<string, number | null>();
    const firstActionMap = new Map<string, number | null>();

    statuses.forEach((row) => {
      const key = row.ownerAgentId ?? 'unassigned';
      if (!statusMap.has(key)) statusMap.set(key, new Map<LeadStatus, number>());
      statusMap.get(key)?.set(row.status, this.count(row._count));
    });
    speeds.forEach((row) => speedMap.set(row.ownerAgentId ?? 'unassigned', row._avg?.speedToContactSeconds ?? null));
    firstActions.forEach((row) => firstActionMap.set(row.ownerAgentId ?? 'unassigned', row._avg?.speedToFirstActionSeconds ?? null));

    return totals.map((row) => {
      const key = row.ownerAgentId ?? 'unassigned';
      const byStatus = statusMap.get(key) ?? new Map<LeadStatus, number>();
      const leads = this.count(row._count);
      const contacted = contactedStatuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0);
      const booked = byStatus.get(LeadStatus.booked) ?? 0;
      const showedUp = byStatus.get(LeadStatus.showed_up) ?? 0;
      const paid = byStatus.get(LeadStatus.paid) ?? 0;
      const noAnswer = byStatus.get(LeadStatus.no_answer) ?? 0;
      const followUps = row.ownerAgentId ? followUpTotals.get(row.ownerAgentId) ?? 0 : 0;
      const activityVolumeToday = row.ownerAgentId ? activityTodayTotals.get(row.ownerAgentId) ?? 0 : 0;
      return {
        agent_id: row.ownerAgentId,
        agent_name: row.ownerAgentId ? userNames.get(row.ownerAgentId) ?? 'Unknown Agent' : 'Unassigned',
        leads,
        leads_handled: leads,
        contacted,
        booked,
        showed_up: showedUp,
        paid,
        no_answer: noAnswer,
        booking_rate: this.percent(booked, leads),
        show_up_rate: this.percent(showedUp, booked),
        win_rate: this.percent(paid, leads),
        no_answer_rate: this.percent(noAnswer, leads),
        conversion_rate: this.percent(paid, leads),
        average_speed_to_contact_minutes: this.minutes(speedMap.get(key) ?? null),
        average_speed_to_first_action_minutes: this.minutes(firstActionMap.get(key) ?? null),
        average_follow_ups_per_lead: leads === 0 ? 0 : Math.round((followUps / leads) * 100) / 100,
        activity_volume_today: activityVolumeToday,
      };
    }).sort((a, b) => b.leads - a.leads);
  }

  private async buildAgentFollowUpTotals(query: ReportsQueryDto): Promise<Map<string, number>> {
    const where: Prisma.FollowUpWhereInput = {};
    if (query.agent_id) where.userId = query.agent_id;
    if (query.start_date || query.end_date) {
      where.createdAt = {
        gte: query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : undefined,
        lte: query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : undefined,
      };
    }
    const leadWhere: Prisma.LeadWhereInput = { deletedAt: null };
    if (query.treatment_id) leadWhere.treatmentId = query.treatment_id;
    if (query.source_channel) leadWhere.sourceChannel = { equals: query.source_channel, mode: 'insensitive' };
    where.lead = leadWhere;
    const rows = await this.prisma.followUp.groupBy({ by: ['userId'], where, orderBy: { userId: 'asc' }, _count: { _all: true } });
    return new Map(rows.map((row) => [row.userId, this.count(row._count)]));
  }

  private async buildAgentActivityTodayTotals(query: ReportsQueryDto): Promise<Map<string, number>> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const where: Prisma.ActivityWhereInput = { createdAt: { gte: start, lte: end } };
    if (query.agent_id) where.userId = query.agent_id;
    const leadWhere: Prisma.LeadWhereInput = { deletedAt: null };
    if (query.treatment_id) leadWhere.treatmentId = query.treatment_id;
    if (query.source_channel) leadWhere.sourceChannel = { equals: query.source_channel, mode: 'insensitive' };
    where.lead = leadWhere;
    const rows = await this.prisma.activity.groupBy({ by: ['userId'], where, orderBy: { userId: 'asc' }, _count: { _all: true } });
    return new Map(rows.map((row) => [row.userId, this.count(row._count)]));
  }

  private buildSourceRows(
    totals: Array<{ sourceChannel: string; _count?: { _all?: number } | true }>,
    statuses: Array<{ sourceChannel: string; status: LeadStatus; _count?: { _all?: number } | true }>,
    duplicates: Array<{ sourceChannel: string; _count?: { _all?: number } | true }>,
  ): MarketingQualityReportRow[] {
    const statusMap = new Map<string, Map<LeadStatus, number>>();
    const duplicateMap = new Map<string, number>();

    statuses.forEach((row) => {
      if (!statusMap.has(row.sourceChannel)) statusMap.set(row.sourceChannel, new Map<LeadStatus, number>());
      statusMap.get(row.sourceChannel)?.set(row.status, this.count(row._count));
    });
    duplicates.forEach((row) => duplicateMap.set(row.sourceChannel, this.count(row._count)));

    return totals.map((row) => {
      const byStatus = statusMap.get(row.sourceChannel) ?? new Map<LeadStatus, number>();
      const leads = this.count(row._count);
      const duplicateCount = duplicateMap.get(row.sourceChannel) ?? 0;
      const junkLeads = junkStatuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0);
      const booked = byStatus.get(LeadStatus.booked) ?? 0;
      const paid = byStatus.get(LeadStatus.paid) ?? 0;
      return {
        source_channel: row.sourceChannel,
        leads,
        duplicates: duplicateCount,
        junk_leads: junkLeads,
        booked,
        paid,
        conversion_rate: this.percent(paid, leads),
        duplicate_rate: this.percent(duplicateCount, leads),
        junk_rate: this.percent(junkLeads, leads),
        converted_rate: this.percent(paid, leads),
      };
    }).sort((a, b) => b.leads - a.leads);
  }

  private buildCampaignPerformance(
    totals: Array<{ campaignName: string | null; sourceChannel: string; _count?: { _all?: number } | true }>,
    statuses: Array<{ campaignName: string | null; sourceChannel: string; status: LeadStatus; _count?: { _all?: number } | true }>,
  ): CampaignPerformanceRow[] {
    const statusMap = new Map<string, Map<LeadStatus, number>>();
    statuses.forEach((row) => {
      const campaignName = row.campaignName ?? 'No Campaign';
      const key = `${campaignName}|${row.sourceChannel}`;
      if (!statusMap.has(key)) statusMap.set(key, new Map<LeadStatus, number>());
      statusMap.get(key)?.set(row.status, this.count(row._count));
    });

    return totals.map((row) => {
      const campaignName = row.campaignName ?? 'No Campaign';
      const key = `${campaignName}|${row.sourceChannel}`;
      const byStatus = statusMap.get(key) ?? new Map<LeadStatus, number>();
      const leads = this.count(row._count);
      const booked = byStatus.get(LeadStatus.booked) ?? 0;
      const paid = byStatus.get(LeadStatus.paid) ?? 0;
      return { campaign_name: campaignName, source_channel: row.sourceChannel, leads, booked, paid, conversion_rate: this.percent(paid, leads) };
    }).sort((a, b) => b.leads - a.leads);
  }

  private buildSourceBreakdown(
    totals: Array<{ sourceChannel: string; _count?: { _all?: number } | true }>,
    total: number,
  ): SourceBreakdownRow[] {
    return totals.map((row) => {
      const leads = this.count(row._count);
      return { source_channel: row.sourceChannel, leads, percentage: this.percent(leads, total) };
    }).sort((a, b) => b.leads - a.leads);
  }

  private async buildTreatmentBreakdown(
    totals: Array<{ treatmentId: string | null; _count?: { _all?: number } | true }>,
    total: number,
  ): Promise<TreatmentBreakdownRow[]> {
    const treatmentIds = totals.map((row) => row.treatmentId).filter((id): id is string => Boolean(id));
    const treatments = await this.prisma.treatment.findMany({ where: { id: { in: treatmentIds } }, select: { id: true, name: true } });
    const treatmentNames = new Map(treatments.map((treatment) => [treatment.id, treatment.name]));
    return totals.map((row) => {
      const leads = this.count(row._count);
      return {
        treatment_id: row.treatmentId,
        treatment_name: row.treatmentId ? treatmentNames.get(row.treatmentId) ?? 'Unknown Treatment' : 'No Treatment',
        leads,
        percentage: this.percent(leads, total),
      };
    }).sort((a, b) => b.leads - a.leads);
  }

  private buildFunnel(total: number, statusTotals: Array<{ status: LeadStatus; _count?: { _all?: number } | true }>): FunnelStageRow[] {
    const byStatus = new Map(statusTotals.map((row) => [row.status, this.count(row._count)]));
    const stages = [
      { stage: 'New', count: total },
      { stage: 'Contacted', count: contactedStatuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0) },
      { stage: 'Interested', count: (byStatus.get(LeadStatus.interested) ?? 0) + (byStatus.get(LeadStatus.booked) ?? 0) + (byStatus.get(LeadStatus.showed_up) ?? 0) + (byStatus.get(LeadStatus.no_show) ?? 0) + (byStatus.get(LeadStatus.paid) ?? 0) },
      { stage: 'Booked', count: (byStatus.get(LeadStatus.booked) ?? 0) + (byStatus.get(LeadStatus.showed_up) ?? 0) + (byStatus.get(LeadStatus.no_show) ?? 0) + (byStatus.get(LeadStatus.paid) ?? 0) },
      { stage: 'Showed Up', count: (byStatus.get(LeadStatus.showed_up) ?? 0) + (byStatus.get(LeadStatus.paid) ?? 0) },
      { stage: 'Paid', count: byStatus.get(LeadStatus.paid) ?? 0 },
    ];
    return stages.map((stage, index) => ({
      ...stage,
      conversion_from_previous: index === 0 ? null : this.percent(stage.count, stages[index - 1].count),
    }));
  }

  private buildCallOutcomeDistribution(statusTotals: Array<{ status: LeadStatus; _count?: { _all?: number } | true }>, total: number): CallOutcomeDistributionRow[] {
    return statusTotals.map((row) => {
      const count = this.count(row._count);
      return { status: row.status, label: statusLabels[row.status], count, percentage: this.percent(count, total) };
    }).sort((a, b) => b.count - a.count);
  }

  private toWorksheet(report: ReportsResponse, type: ReportExportType): ExcelWorksheetData {
    const columns = [
      { header: 'Section', width: 24 },
      { header: 'Name', width: 28 },
      { header: 'Leads', width: 14 },
      { header: 'Contacted', width: 14 },
      { header: 'Booked', width: 14 },
      { header: 'Paid', width: 14 },
      { header: 'Conversion Rate %', width: 18 },
      { header: 'Duplicate Rate %', width: 18 },
      { header: 'Avg STC Minutes', width: 18 },
    ];
    const rows: string[][] = [];
    if (type === 'all' || type === 'management') {
      rows.push(['Overview', 'Total', String(report.overview.total_leads), String(report.overview.contacted_leads), String(report.overview.booked_leads), String(report.overview.paid_leads), String(report.overview.conversion_rate), '-', this.value(report.overview.average_speed_to_contact_minutes)]);
      report.agent_performance.forEach((row) => rows.push(['Agent Performance', row.agent_name, String(row.leads_handled), String(row.contacted), String(row.booked), String(row.paid), String(row.win_rate), String(row.no_answer_rate), this.value(row.average_speed_to_first_action_minutes)]));
    }
    if (type === 'all' || type === 'marketing') {
      report.marketing_quality.forEach((row) => rows.push(['Marketing Quality', row.source_channel, String(row.leads), String(row.junk_leads), String(row.booked), String(row.paid), String(row.converted_rate), String(row.junk_rate), '-']));
      report.treatment_breakdown.forEach((row) => rows.push(['Treatment Breakdown', row.treatment_name, String(row.leads), '-', '-', '-', String(row.percentage), '-', '-']));
      report.conversion_funnel.forEach((row) => rows.push(['Conversion Funnel', row.stage, String(row.count), '-', '-', '-', row.conversion_from_previous === null ? '-' : String(row.conversion_from_previous), '-', '-']));
      report.call_outcome_distribution.forEach((row) => rows.push(['Call Outcome', row.label, String(row.count), '-', '-', '-', String(row.percentage), '-', '-']));
      report.campaign_performance.forEach((row) => rows.push(['Campaign Performance', `${row.campaign_name} (${row.source_channel})`, String(row.leads), '-', String(row.booked), String(row.paid), String(row.conversion_rate), '-', '-']));
    }
    return { sheetName: 'CRM Reports', columns, rows };
  }

  private toCsv(data: ExcelWorksheetData): Buffer {
    const lines = [[...data.columns.map((column) => column.header)], ...data.rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','));
    return Buffer.from(`\uFEFF${lines.join('\n')}`, 'utf8');
  }

  private count(value: { _all?: number } | true | undefined): number {
    return typeof value === 'object' ? value._all ?? 0 : 0;
  }

  private percent(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 10000) / 100;
  }

  private minutes(seconds: number | null): number | null {
    if (seconds === null) return null;
    return Math.round((seconds / 60) * 100) / 100;
  }

  private value(value: number | null): string {
    return value === null ? '-' : String(value);
  }
}
