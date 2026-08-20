export interface AgentCapacitySummary {
  agent_id: string;
  active_leads: number;
  max_active_leads: number;
  remaining_capacity: number;
  is_full: boolean;
}