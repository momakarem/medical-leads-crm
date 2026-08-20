import type { LeadStatus } from './lead-status.enum';

export interface LeadTableTreatment {
  id: string;
  name: string;
}

export interface LeadTableOwnerAgent {
  id: string;
  name: string;
}

export interface LeadEntity {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string | null;
  isDuplicate: boolean;
  duplicateOfLeadId: string | null;
  sourceChannel: string;
  campaignName: string | null;
  adName: string | null;
  arrivalTimestamp: Date;
  appointmentAt: Date | null;
  appointmentTreatmentId: string | null;
  appointmentNote: string | null;
  treatmentId: string | null;
  treatment?: LeadTableTreatment | null;
  status: LeadStatus;
  ownerAgentId: string | null;
  isPrivate: boolean;
  ownerAgent?: LeadTableOwnerAgent | null;
  createdBy: string;
  deletedAt: Date | null;
  firstContactedAt: Date | null;
  speedToContactSeconds: number | null;
  firstActionAt: Date | null;
  speedToFirstActionSeconds: number | null;
  followUpAttemptsCount: number;
  duplicateCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedLeads {
  data: LeadEntity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    queryTimeMs: number;
  };
}
