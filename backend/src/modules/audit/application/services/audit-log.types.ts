export interface AuditLogEntity {
  id: string;
  userId: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  endpoint: string | null;
  oldValues: unknown;
  newValues: unknown;
  metadata: unknown;
  createdAt: Date;
  user?: { id: string; name: string; email: string } | null;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntity[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
