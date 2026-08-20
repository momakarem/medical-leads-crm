import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateAgentCapacityDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_active_leads!: number;

  get maxActiveLeads(): number {
    return this.max_active_leads;
  }
}