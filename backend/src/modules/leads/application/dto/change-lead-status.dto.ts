import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, Matches } from 'class-validator';
import { LeadStatus } from '../../domain/lead-status.enum';

export class ChangeLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  follow_up_date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  follow_up_time?: string;

  @IsOptional()
  @IsString()
  appointment_date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  appointment_time?: string;

  @IsOptional()
  @IsUUID()
  appointment_treatment_id?: string;

  get followUpDate(): string | undefined { return this.follow_up_date; }
  get followUpTime(): string | undefined { return this.follow_up_time; }
  get appointmentDate(): string | undefined { return this.appointment_date; }
  get appointmentTime(): string | undefined { return this.appointment_time; }
  get appointmentTreatmentId(): string | undefined { return this.appointment_treatment_id; }
}

