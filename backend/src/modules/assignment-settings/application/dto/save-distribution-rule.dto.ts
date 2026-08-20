import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class SaveDistributionAllocationDto {
  @IsUUID()
  agent_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  weight!: number;
}

export class SaveDistributionRuleDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source_channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  campaign_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ad_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  form_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveDistributionAllocationDto)
  allocations!: SaveDistributionAllocationDto[];
}
