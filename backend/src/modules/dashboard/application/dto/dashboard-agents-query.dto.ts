import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DashboardRange } from './dashboard-overview-query.dto';

export enum AgentStatsSort {
  LeadsDesc = 'leads_desc',
  BookingsDesc = 'bookings_desc',
  PaymentsDesc = 'payments_desc',
  AgentNameAsc = 'agent_name_asc',
}

export class DashboardAgentsQueryDto {
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(AgentStatsSort)
  sort?: AgentStatsSort;
}
