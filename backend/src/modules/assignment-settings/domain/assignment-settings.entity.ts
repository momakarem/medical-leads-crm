export enum AssignmentMethod {
  Manual = 'manual',
  RoundRobin = 'round_robin',
  TreatmentBased = 'treatment_based',
}

export interface AssignmentSettingsEntity {
  id: string;
  assignmentMethod: AssignmentMethod;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}