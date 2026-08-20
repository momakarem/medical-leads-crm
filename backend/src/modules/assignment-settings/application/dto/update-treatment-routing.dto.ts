import { IsArray, IsUUID } from 'class-validator';

export class UpdateTreatmentRoutingDto {
  @IsArray()
  @IsUUID('4', { each: true })
  agent_ids!: string[];

  get agentIds(): string[] {
    return this.agent_ids;
  }
}
