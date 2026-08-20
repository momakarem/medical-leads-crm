import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { UserRole } from '../../../users/domain/user-role.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import type { LeadEntity } from '../../domain/lead.entity';
import type { ListLeadsQueryDto } from '../dto/list-leads-query.dto';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from '../ports/activity.repository';
import { LEAD_REPOSITORY, type LeadRepository } from '../ports/lead.repository';
import { ExcelExportService } from '../services/excel-export.service';

export interface ExportLeadsResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
  recordsCount: number;
}

@Injectable()
export class ExportLeadsUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    private readonly excel: ExcelExportService,
  ) {}

  async execute(query: ListLeadsQueryDto, currentUser: AuthenticatedUser): Promise<ExportLeadsResult> {
    const scope = { userId: currentUser.id, role: currentUser.role };
    const leads = await this.leads.exportAll(query, scope);
    const worksheet = {
      sheetName: query.export_type === 'raw' ? 'Raw Leads' : 'Leads',
      columns: query.export_type === 'raw' ? this.rawColumns() : [
        { header: 'Lead ID', width: 38 },
        { header: 'Patient Name', width: 24 },
        { header: 'Phone Number', width: 18 },
        { header: 'Source Channel', width: 18 },
        { header: 'Campaign Name', width: 28 },
        { header: 'Ad Name', width: 28 },
        { header: 'Treatment', width: 22 },
        { header: 'Current Status', width: 18 },
        { header: 'Assigned Agent', width: 24 },
        { header: 'Arrival Time', width: 24 },
        { header: 'Created Date', width: 24 },
        { header: 'First Contact Date', width: 24 },
        { header: 'Speed To Contact', width: 20 },
        { header: 'Duplicate Status', width: 18 },
      ],
      rows: query.export_type === 'raw' ? leads.map((lead) => this.toRawRow(lead)) : leads.map((lead) => this.toRow(lead)),
    };
    const format = query.format ?? 'xlsx';
    const buffer = format === 'csv' ? this.toCsv(worksheet) : this.excel.createWorkbook(worksheet);

    if (leads[0]) await this.logExport(leads[0].id, currentUser, leads.length, query);

    return { buffer, filename: this.filename(format, query.export_type ?? 'view'), contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', recordsCount: leads.length };
  }

  private rawColumns(): Array<{ header: string; width: number }> {
    return [
      { header: 'Lead ID', width: 38 },
      { header: 'Patient Name', width: 24 },
      { header: 'Phone Number', width: 18 },
      { header: 'Normalized Phone', width: 18 },
      { header: 'Source Channel', width: 18 },
      { header: 'Campaign Name', width: 28 },
      { header: 'Ad Name', width: 28 },
      { header: 'Treatment ID', width: 38 },
      { header: 'Treatment', width: 22 },
      { header: 'Status', width: 18 },
      { header: 'Owner Agent ID', width: 38 },
      { header: 'Owner Agent', width: 24 },
      { header: 'Created By', width: 38 },
      { header: 'Arrival Time', width: 24 },
      { header: 'Appointment At', width: 24 },
      { header: 'Appointment Treatment ID', width: 38 },
      { header: 'Appointment Note', width: 30 },
      { header: 'First Contact Date', width: 24 },
      { header: 'Speed To Contact Seconds', width: 24 },
      { header: 'First Action Date', width: 24 },
      { header: 'Speed To First Action Seconds', width: 28 },
      { header: 'Follow-up Attempts Count', width: 24 },
      { header: 'Is Duplicate', width: 14 },
      { header: 'Duplicate Of Lead ID', width: 38 },
      { header: 'Created Date', width: 24 },
      { header: 'Updated Date', width: 24 },
      { header: 'Deleted Date', width: 24 },
    ];
  }

  private toRow(lead: LeadEntity): string[] {
    return [
      lead.id,
      this.value(lead.name),
      this.value(lead.phone),
      this.value(lead.sourceChannel),
      this.value(lead.campaignName),
      this.value(lead.adName),
      this.value(lead.treatment?.name),
      this.value(lead.status),
      this.value(lead.ownerAgent?.name),
      this.formatDate(lead.arrivalTimestamp),
      this.formatDate(lead.createdAt),
      this.formatDate(lead.firstContactedAt),
      this.formatSpeed(lead.speedToContactSeconds),
      lead.isDuplicate ? 'Duplicate' : 'Original',
    ];
  }

  private toRawRow(lead: LeadEntity): string[] {
    return [
      lead.id,
      this.value(lead.name),
      this.value(lead.phone),
      this.value(lead.normalizedPhone),
      this.value(lead.sourceChannel),
      this.value(lead.campaignName),
      this.value(lead.adName),
      this.value(lead.treatmentId),
      this.value(lead.treatment?.name),
      this.value(lead.status),
      this.value(lead.ownerAgentId),
      this.value(lead.ownerAgent?.name),
      this.value(lead.createdBy),
      this.formatDate(lead.arrivalTimestamp),
      this.formatDate(lead.appointmentAt),
      this.value(lead.appointmentTreatmentId),
      this.value(lead.appointmentNote),
      this.formatDate(lead.firstContactedAt),
      this.value(lead.speedToContactSeconds === null || lead.speedToContactSeconds === undefined ? undefined : String(lead.speedToContactSeconds)),
      this.formatDate(lead.firstActionAt),
      this.value(lead.speedToFirstActionSeconds === null || lead.speedToFirstActionSeconds === undefined ? undefined : String(lead.speedToFirstActionSeconds)),
      String(lead.followUpAttemptsCount),
      lead.isDuplicate ? 'true' : 'false',
      this.value(lead.duplicateOfLeadId),
      this.formatDate(lead.createdAt),
      this.formatDate(lead.updatedAt),
      this.formatDate(lead.deletedAt),
    ];
  }

  private async logExport(leadId: string, user: AuthenticatedUser, recordsCount: number, query: ListLeadsQueryDto): Promise<void> {
    await this.activities.create({
      leadId,
      userId: user.id,
      type: ActivityType.LeadsExported,
      title: 'Leads Exported',
      description: `${user.name} exported ${recordsCount} leads to Excel.`,
      metadata: {
        exported_by: user.name,
        records_count: recordsCount,
        filters: this.exportedFilters(query, user.role),
      },
    });
  }

  private exportedFilters(query: ListLeadsQueryDto, role: UserRole): Record<string, unknown> {
    return {
      search: query.search,
      phone: query.phone,
      status: query.status,
      treatment: query.treatment ?? query.treatmentId,
      source: query.source,
      assignedAgent: role === UserRole.Agent ? undefined : query.assignedAgent,
      duplicatesOnly: query.duplicatesOnly,
      start_date: query.start_date,
      end_date: query.end_date,
      sort: query.sort,
      format: query.format,
      export_type: query.export_type,
    };
  }

  private value(value: string | null | undefined): string {
    return value && value.trim() ? value : '-';
  }

  private formatDate(value: Date | null | undefined): string {
    if (!value) return '-';
    return value.toISOString().replace('T', ' ').slice(0, 19);
  }

  private formatSpeed(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return '-';
    const minutes = Math.round((seconds / 60) * 100) / 100;
    return `${minutes} min`;
  }

  private toCsv(data: { columns: Array<{ header: string }>; rows: string[][] }): Buffer {
    const lines = [[...data.columns.map((column) => column.header)], ...data.rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','));
    return Buffer.from(`\uFEFF${lines.join('\n')}`, 'utf8');
  }

  private filename(format: 'xlsx' | 'csv' = 'xlsx', exportType: 'view' | 'raw' = 'view'): string {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    const prefix = exportType === 'raw' ? 'Leads_Raw' : 'Leads';
    return `${prefix}_${stamp}.${format}`;
  }
}
