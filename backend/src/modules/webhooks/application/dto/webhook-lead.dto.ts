import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class WebhookLeadDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  phone!: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsOptional()
  @IsString()
  source_channel?: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsOptional()
  @IsString()
  campaign_name?: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsOptional()
  @IsString()
  ad_name?: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsOptional()
  @IsString()
  arrival_timestamp?: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsOptional()
  @IsString()
  treatment?: string;

  get sourceChannel(): string {
    return this.source_channel || 'Google';
  }

  get campaignName(): string | undefined {
    return this.campaign_name;
  }

  get adName(): string | undefined {
    return this.ad_name;
  }

  get arrivalTimestamp(): Date | undefined {
    if (!this.arrival_timestamp) return undefined;
    const parsed = new Date(this.arrival_timestamp);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}