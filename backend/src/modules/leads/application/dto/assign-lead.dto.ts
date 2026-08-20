import { IsUUID } from 'class-validator';

export class AssignLeadDto {
  @IsUUID()
  agent_id!: string;

  get agentId(): string {
    return this.agent_id;
  }
}