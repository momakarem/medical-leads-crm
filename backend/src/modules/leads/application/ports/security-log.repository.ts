export const SECURITY_LOG_REPOSITORY = Symbol('SECURITY_LOG_REPOSITORY');

export interface CreateSecurityLogData {
  userId: string;
  leadId?: string | null;
  action: string;
  ipAddress?: string | null;
}

export interface SecurityLogRepository {
  create(data: CreateSecurityLogData): Promise<void>;
}