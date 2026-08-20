import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TransferLeadDto {
  @IsUUID()
  new_agent_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  get newAgentId(): string {
    return this.new_agent_id;
  }
}