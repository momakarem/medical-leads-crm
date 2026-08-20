import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class BulkAssignLeadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  lead_ids!: string[];

  @IsUUID('4')
  agent_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  get leadIds(): string[] {
    return this.lead_ids;
  }

  get agentId(): string {
    return this.agent_id;
  }
}
