import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EndCallSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
