import type {
  AgentStats,
  AgentStatsParams,
  AuditLog,
  AuditLogListParams,
  PaginatedAuditLogsResponse,
  AgentOption,
  CurrentUser,
  DashboardOverview,
  DashboardOverviewParams,
  FollowUpFilter,
  Lead,
  LeadListParams,
  LeadTransfer,
  PaginatedActivitiesResponse,
  PaginatedFollowUpsResponse,
  PaginatedLeadsResponse,
  Treatment,
  SaveTreatmentPayload,
  FacebookConnection,
  TiktokConnection,
  SnapchatConnection,
  IntegrationConnectResponse,
  SpeedToContactOverview,
  AgentSpeedToContactStats,
  ManagedUser,
  PaginatedUsersResponse,
  SaveUserPayload,
  UserListParams,
  CustomRole,
  SaveRolePayload,
  AssignmentSettings,
  AssignmentMethod,
  TreatmentRoutingItem,
  DistributionRuleItem,
  SaveDistributionRulePayload,
  BulkAssignLeadsResult,
  CreateLeadPayload,
  ChangeLeadStatusPayload,
  CreateFollowUpPayload,
  FollowUp,
  ReportsExportFormat,
  ReportsExportType,
  ReportsQueryParams,
  ReportsResponse,
  LeadExportFormat,
  LeadExportType,
  LeadDuplicateHistoryItem,
  LeadDuplicateGroupItem,
} from '../types';
function resolveApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof window === 'undefined') {
    return configuredUrl ?? 'http://localhost:3000';
  }

  const currentHost = window.location.hostname;
  const isLocalBrowserHost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  if (isLocalBrowserHost) {
    return `${window.location.protocol}//${currentHost}:3000`;
  }

  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

function buildDashboardQuery(params: DashboardOverviewParams | AgentStatsParams): string {
  const query = new URLSearchParams();
  if (params.range) query.set('range', params.range);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if ('sort' in params && params.sort) query.set('sort', params.sort);
  return query.toString();
}

function buildQuery(params: LeadListParams): string {
  const query = new URLSearchParams();
  query.set('page', String(params.page));
  query.set('limit', String(params.limit));
  query.set('sort', params.sort);

  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.treatment) query.set('treatment', params.treatment);
  if (params.source) query.set('source', params.source);
  if (params.assignedAgent) query.set('assignedAgent', params.assignedAgent);
  if (params.duplicatesOnly) query.set('duplicatesOnly', 'true');

  return query.toString();
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function readApiErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message: unknown }).message;
      if (Array.isArray(message)) return message.join(' ');
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return `Request failed with status ${response.status}`;
}
async function mutateJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

function buildAuditQuery(params: AuditLogListParams): string {
  const query = new URLSearchParams();
  query.set('page', String(params.page));
  query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.module) query.set('module', params.module);
  if (params.action) query.set('action', params.action);
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.entity_type) query.set('entity_type', params.entity_type);
  if (params.entity_id) query.set('entity_id', params.entity_id);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  return query.toString();
}


function buildReportsQuery(params: ReportsQueryParams & { format?: ReportsExportFormat; type?: ReportsExportType }): string {
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.agent_id) query.set('agent_id', params.agent_id);
  if (params.treatment_id) query.set('treatment_id', params.treatment_id);
  if (params.source_channel) query.set('source_channel', params.source_channel);
  if (params.format) query.set('format', params.format);
  if (params.type) query.set('type', params.type);
  return query.toString();
}

export function fetchReports(params: ReportsQueryParams, signal?: AbortSignal): Promise<ReportsResponse> {
  const query = buildReportsQuery(params);
  return requestJson<ReportsResponse>(`/reports${query ? `?${query}` : ''}`, signal);
}

export async function exportReports(params: ReportsQueryParams & { format: ReportsExportFormat; type: ReportsExportType }): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}/reports/export?${buildReportsQuery(params)}`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiErrorMessage(response));
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob: await response.blob(), filename: match?.[1] ?? `CRM_Reports.${params.format}` };
}

export function fetchAuditLogs(params: AuditLogListParams, signal?: AbortSignal): Promise<PaginatedAuditLogsResponse> {
  return requestJson<PaginatedAuditLogsResponse>(`/audit-logs?${buildAuditQuery(params)}`, signal);
}

export function fetchAuditLog(id: string, signal?: AbortSignal): Promise<AuditLog> {
  return requestJson<AuditLog>(`/audit-logs/${id}`, signal);
}
export async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  const response = await requestJson<CurrentUser | { user: CurrentUser }>('/auth/me', signal);
  return 'user' in response ? response.user : response;
}

export function fetchDashboardOverview(
  params: DashboardOverviewParams,
  signal?: AbortSignal,
): Promise<DashboardOverview> {
  const query = new URLSearchParams();
  if (params.range) query.set('range', params.range);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return requestJson<DashboardOverview>(`/dashboard/overview${suffix}`, signal);
}
export function fetchSpeedToContactOverview(
  params: DashboardOverviewParams,
  signal?: AbortSignal,
): Promise<SpeedToContactOverview> {
  const query = buildDashboardQuery(params);
  const suffix = query ? `?${query}` : '';
  return requestJson<SpeedToContactOverview>(`/dashboard/speed-to-contact${suffix}`, signal);
}

export function fetchAgentSpeedToContactStats(
  params: DashboardOverviewParams,
  signal?: AbortSignal,
): Promise<AgentSpeedToContactStats[]> {
  const query = buildDashboardQuery(params);
  const suffix = query ? `?${query}` : '';
  return requestJson<AgentSpeedToContactStats[]>(`/dashboard/agents/speed-to-contact${suffix}`, signal);
}
export function fetchDashboardAgentStats(params: AgentStatsParams, signal?: AbortSignal): Promise<AgentStats[]> {
  const query = buildDashboardQuery(params);
  const suffix = query ? `?${query}` : '';
  return requestJson<AgentStats[]>(`/dashboard/agents${suffix}`, signal);
}

export function fetchAgents(signal?: AbortSignal): Promise<AgentOption[]> {
  return requestJson<AgentOption[]>('/users/agents', signal);
}

export async function exportLeads(
  params: LeadListParams,
  format: LeadExportFormat = 'xlsx',
  exportType: LeadExportType = 'view',
): Promise<{ blob: Blob; filename: string }> {
  const query = new URLSearchParams(buildQuery(params));
  query.set('format', format);
  query.set('export_type', exportType);
  const response = await fetch(`${API_BASE_URL}/leads/export?${query.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return {
    blob: await response.blob(),
    filename: match?.[1] ?? `Leads.${format}`,
  };
}

export function exportLeadsToExcel(params: LeadListParams): Promise<{ blob: Blob; filename: string }> {
  return exportLeads(params, 'xlsx', 'view');
}
export function fetchLeads(params: LeadListParams, signal?: AbortSignal): Promise<PaginatedLeadsResponse> {
  return requestJson<PaginatedLeadsResponse>(`/leads?${buildQuery(params)}`, signal);
}

export function fetchAvailableLeads(params: LeadListParams, signal?: AbortSignal): Promise<PaginatedLeadsResponse> {
  return requestJson<PaginatedLeadsResponse>(`/leads/unassigned?${buildQuery(params)}`, signal);
}

export function fetchLead(leadId: string, signal?: AbortSignal): Promise<Lead> {
  return requestJson<Lead>(`/leads/${leadId}`, signal);
}

export function fetchTreatments(signal?: AbortSignal): Promise<Treatment[]> {
  return requestJson<Treatment[]>('/treatments', signal);
}

export function createTreatment(payload: SaveTreatmentPayload): Promise<Treatment> {
  return mutateJson<Treatment>('/treatments', payload);
}

export function updateTreatment(id: string, payload: Partial<SaveTreatmentPayload>): Promise<Treatment> {
  return patchJson<Treatment>(`/treatments/${id}`, payload);
}

export function deleteTreatment(id: string): Promise<Treatment> {
  return deleteJson<Treatment>(`/treatments/${id}`);
}

export function fetchFacebookConnection(signal?: AbortSignal): Promise<FacebookConnection | null> {
  return requestJson<FacebookConnection | null>('/facebook/connections/current', signal);
}

export function fetchTiktokConnection(signal?: AbortSignal): Promise<TiktokConnection | null> {
  return requestJson<TiktokConnection | null>('/tiktok/connections/current', signal);
}

export function fetchSnapchatConnection(signal?: AbortSignal): Promise<SnapchatConnection | null> {
  return requestJson<SnapchatConnection | null>('/snapchat/connections/current', signal);
}

export function startFacebookConnection(): Promise<IntegrationConnectResponse> {
  return requestJson<IntegrationConnectResponse>('/facebook/connect');
}

export function startTiktokConnection(): Promise<IntegrationConnectResponse> {
  return requestJson<IntegrationConnectResponse>('/tiktok/connect');
}

export function startSnapchatConnection(): Promise<IntegrationConnectResponse> {
  return requestJson<IntegrationConnectResponse>('/snapchat/connect');
}
export function createLead(payload: CreateLeadPayload): Promise<Lead> {
  return mutateJson<Lead>('/leads', payload);
}

export function updateLead(leadId: string, payload: Partial<CreateLeadPayload>): Promise<Lead> {
  return patchJson<Lead>(`/leads/${leadId}`, payload);
}

export function deleteLead(leadId: string): Promise<Lead> {
  return deleteJson<Lead>(`/leads/${leadId}`);
}

export function changeLeadStatus(leadId: string, payload: ChangeLeadStatusPayload): Promise<Lead> {
  return mutateJson<Lead>(`/leads/${leadId}/change-status`, payload);
}

export function startLeadCall(leadId: string): Promise<Lead['activeCallSession']> {
  return mutateJson<Lead['activeCallSession']>(`/leads/${leadId}/call/start`);
}

export function endLeadCall(leadId: string, note?: string): Promise<Lead['activeCallSession']> {
  return mutateJson<Lead['activeCallSession']>(`/leads/${leadId}/call/end`, { note });
}

export function createLeadFollowUp(leadId: string, payload: CreateFollowUpPayload): Promise<FollowUp> {
  return mutateJson<FollowUp>(`/leads/${leadId}/follow-ups`, payload);
}

export function assignLead(leadId: string, agentId: string): Promise<Lead> {
  return mutateJson<Lead>(`/leads/${leadId}/assign`, { agent_id: agentId });
}

export function claimLead(leadId: string): Promise<Lead> {
  return mutateJson<Lead>(`/leads/${leadId}/claim`);
}

export function unassignLead(leadId: string): Promise<Lead> {
  return mutateJson<Lead>(`/leads/${leadId}/unassign`);
}

export function transferLead(leadId: string, newAgentId: string, reason?: string): Promise<Lead> {
  return mutateJson<Lead>(`/leads/${leadId}/transfer`, { new_agent_id: newAgentId, reason: reason || undefined });
}

export function bulkAssignLeads(leadIds: string[], agentId: string): Promise<BulkAssignLeadsResult> {
  return mutateJson<BulkAssignLeadsResult>('/leads/bulk-assign', { lead_ids: leadIds, agent_id: agentId });
}
export function fetchLeadTransfers(leadId: string, signal?: AbortSignal): Promise<LeadTransfer[]> {
  return requestJson<LeadTransfer[]>(`/leads/${leadId}/transfers`, signal);
}

export function fetchLeadDuplicateGroup(leadId: string, signal?: AbortSignal): Promise<LeadDuplicateGroupItem[]> {
  return requestJson<LeadDuplicateGroupItem[]>(`/leads/${leadId}/duplicate-group`, signal);
}
export function fetchLeadDuplicates(leadId: string, signal?: AbortSignal): Promise<LeadDuplicateHistoryItem[]> {
  return requestJson<LeadDuplicateHistoryItem[]>(`/leads/${leadId}/duplicates`, signal);
}
export function fetchLeadActivities(
  leadId: string,
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<PaginatedActivitiesResponse> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return requestJson<PaginatedActivitiesResponse>(`/leads/${leadId}/activities?${query.toString()}`, signal);
}

export function fetchFollowUps(
  filter: FollowUpFilter,
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<PaginatedFollowUpsResponse> {
  const query = new URLSearchParams({ filter, page: String(page), limit: String(limit) });
  return requestJson<PaginatedFollowUpsResponse>(`/follow-ups?${query.toString()}`, signal);
}









function buildUsersQuery(params: UserListParams): string {
  const query = new URLSearchParams();
  query.set('page', String(params.page));
  query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  return query.toString();
}

async function patchJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(await readApiErrorMessage(response));
  return response.json() as Promise<T>;
}

async function deleteJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE', credentials: 'include' });
  if (!response.ok) throw new Error(await readApiErrorMessage(response));
  return response.json() as Promise<T>;
}

export function fetchUsers(params: UserListParams, signal?: AbortSignal): Promise<PaginatedUsersResponse> {
  return requestJson<PaginatedUsersResponse>(`/users?${buildUsersQuery(params)}`, signal);
}

export function createUser(payload: SaveUserPayload): Promise<ManagedUser> {
  return mutateJson<ManagedUser>('/users', payload);
}

export function updateUser(id: string, payload: Partial<SaveUserPayload>): Promise<ManagedUser> {
  return patchJson<ManagedUser>(`/users/${id}`, payload);
}

export function updateUserStatus(id: string, isActive: boolean): Promise<ManagedUser> {
  return patchJson<ManagedUser>(`/users/${id}/status`, { isActive });
}

export function resetUserPassword(id: string, password: string): Promise<{ success: true }> {
  return patchJson<{ success: true }>(`/users/${id}/reset-password`, { password });
}

export function deactivateUser(id: string): Promise<ManagedUser> {
  return deleteJson<ManagedUser>(`/users/${id}`);
}




export function fetchRoles(signal?: AbortSignal): Promise<CustomRole[]> {
  return requestJson<CustomRole[]>('/roles', signal);
}

export function createRole(payload: SaveRolePayload): Promise<CustomRole> {
  return mutateJson<CustomRole>('/roles', payload);
}

export function updateRole(id: string, payload: SaveRolePayload): Promise<CustomRole> {
  return patchJson<CustomRole>(`/roles/${id}`, payload);
}

export function deleteRole(id: string): Promise<{ success: true }> {
  return deleteJson<{ success: true }>(`/roles/${id}`);
}

export function fetchAssignmentSettings(signal?: AbortSignal): Promise<AssignmentSettings> {
  return requestJson<AssignmentSettings>('/settings/assignment-method', signal);
}

export function updateAssignmentMethod(method: AssignmentMethod): Promise<AssignmentSettings> {
  return patchJson<AssignmentSettings>('/settings/assignment-method', { method });
}
export function fetchTreatmentRouting(signal?: AbortSignal): Promise<TreatmentRoutingItem[]> {
  return requestJson<TreatmentRoutingItem[]>('/settings/assignment-method/treatment-routing', signal);
}

export function updateTreatmentRouting(treatmentId: string, agentIds: string[]): Promise<TreatmentRoutingItem> {
  return patchJson<TreatmentRoutingItem>(`/settings/assignment-method/treatment-routing/${treatmentId}`, { agent_ids: agentIds });
}


export function fetchDistributionRules(signal?: AbortSignal): Promise<DistributionRuleItem[]> {
  return requestJson<DistributionRuleItem[]>('/settings/assignment-method/distribution-rules', signal);
}

export function createDistributionRule(payload: SaveDistributionRulePayload): Promise<DistributionRuleItem> {
  return mutateJson<DistributionRuleItem>('/settings/assignment-method/distribution-rules', payload);
}

export function updateDistributionRule(id: string, payload: SaveDistributionRulePayload): Promise<DistributionRuleItem> {
  return patchJson<DistributionRuleItem>(`/settings/assignment-method/distribution-rules/${id}`, payload);
}

export function deleteDistributionRule(id: string): Promise<{ success: true }> {
  return deleteJson<{ success: true }>(`/settings/assignment-method/distribution-rules/${id}`);
}
