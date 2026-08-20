import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export type ReportExportFormat = 'xlsx' | 'csv';
export type ReportExportType = 'management' | 'marketing' | 'all';

export class ReportsQueryDto {
  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsUUID()
  agent_id?: string;

  @IsOptional()
  @IsUUID()
  treatment_id?: string;

  @IsOptional()
  @IsString()
  source_channel?: string;
}

export class ReportsExportQueryDto extends ReportsQueryDto {
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: ReportExportFormat;

  @IsOptional()
  @IsIn(['management', 'marketing', 'all'])
  type?: ReportExportType;
}
