import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class SaveSnapchatConnectionDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  session_id!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  ad_account_id!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  form_id!: string;

  get sessionId(): string { return this.session_id; }
  get adAccountId(): string { return this.ad_account_id; }
  get formId(): string { return this.form_id; }
}
