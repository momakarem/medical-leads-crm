import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum DashboardRange {
  Today = 'today',
  Last7Days = 'last_7_days',
  Last30Days = 'last_30_days',
}

export class DashboardOverviewQueryDto {
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
}
