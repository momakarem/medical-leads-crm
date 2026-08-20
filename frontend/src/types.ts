export type UserRole = 'admin' | 'manager' | 'agent' | 'marketing';

export type LeadStatus =
  | 'new'
  | 'no_answer'
  | 'follow_up'
  | 'interested'
  | 'not_interested'
  | 'wrong_number'
  | 'job_seeker'
  | 'booked'
  | 'showed_up'
  | 'no_show'
  | 'paid';

export type LeadSort = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

export interface Treatment {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveTreatmentPayload {
  name: string;
  nameAr?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface FacebookConnection {
  id: string;
  pageId: string;
  pageName: string;
  formId: string;
  formName: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TiktokConnection {
  id: string;
  advertiserId: string;
  advertiserName: string;
  formId: string;
  formName: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnapchatConnection {
  id: string;
  organizationId: string | null;
  adAccountId: string;
  adAccountName: string;
  formId: string;
  formName: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnectResponse {
  auth_url: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AgentOption {
  id: string;
  name: string;
  email: string;
}

export interface OwnerAgent {
  id: string;
  name: string;
}

export interface ActiveCallSession {
  id: string;
  leadId: string;
  agentId: string;
  agentName: string;
  startedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string | null;
  isDuplicate: boolean;
  duplicateOfLeadId: string | null;
  sourceChannel: string;
  campaignName: string | null;
  adName: string | null;
  arrivalTimestamp: string;
  treatment: Treatment | null;
  treatmentId: string | null;
  status: LeadStatus;
  ownerAgent: OwnerAgent | null;
  activeCallSession: ActiveCallSession | null;
  ownerAgentId: string | null;
  appointmentAt: string | null;
  appointmentTreatmentId: string | null;
  appointmentNote: string | null;
  firstContactedAt: string | null;
  speedToContactSeconds: number | null;
  firstActionAt: string | null;
  speedToFirstActionSeconds: number | null;
  followUpAttemptsCount: number;
  duplicateCount: number;
  createdAt: string;
}

export interface PaginatedLeadsResponse {
  data: Lead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    queryTimeMs?: number;
  };
}

export interface LeadListParams {
  page: number;
  limit: number;
  search?: string;
  status?: LeadStatus;
  treatment?: string;
  source?: string;
  assignedAgent?: string;
  duplicatesOnly?: boolean;
  sort: LeadSort;
}
export interface ActivityUser {
  id: string;
  name: string;
}

export interface LeadDuplicateLeadSummary {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  ownerAgent?: OwnerAgent | null;
}

export interface LeadDuplicateHistoryItem {
  id: string;
  originalLeadId: string;
  duplicateLeadId: string;
  detectedBy: string;
  createdAt: string;
  originalLead?: LeadDuplicateLeadSummary | null;
  duplicateLead?: LeadDuplicateLeadSummary | null;
  detector?: OwnerAgent | null;
}
export interface LeadDuplicateGroupItem {
  lead: LeadDuplicateLeadSummary;
  activities: LeadActivity[];
}
export interface LeadActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: ActivityUser;
}


export interface LeadTransferUser {
  id: string;
  name: string;
}

export interface LeadTransfer {
  id: string;
  leadId: string;
  previousAgentId: string | null;
  newAgentId: string;
  transferredBy: string;
  reason: string | null;
  createdAt: string;
  previousAgent?: LeadTransferUser | null;
  newAgent?: LeadTransferUser;
  transferer?: LeadTransferUser;
}

export interface PaginatedActivitiesResponse {
  data: LeadActivity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
export type FollowUpStatus = 'pending' | 'completed' | 'cancelled';
export type FollowUpFilter = 'today' | 'upcoming' | 'overdue' | 'completed';

export interface FollowUpLead {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string | null;
  isDuplicate: boolean;
  duplicateOfLeadId: string | null;
}

export interface FollowUpUser {
  id: string;
  name: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  userId: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledAt: string;
  status: FollowUpStatus;
  note: string | null;
  completedAt: string | null;
  lead?: FollowUpLead;
  user?: FollowUpUser;
}

export interface PaginatedFollowUpsResponse {
  data: FollowUp[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type DashboardRange = 'today' | 'last_7_days' | 'last_30_days';

export interface DashboardOverview {
  total_leads: number;
  new_leads: number;
  paid_leads: number;
}

export interface DashboardOverviewParams {
  range?: DashboardRange;
  start_date?: string;
  end_date?: string;
}

export type AgentStatsSort = 'leads_desc' | 'bookings_desc' | 'payments_desc' | 'agent_name_asc';

export interface AgentStats {
  agent_id: string;
  agent_name: string;
  leads: number;
  bookings: number;
  payments: number;
}

export interface AgentStatsParams extends DashboardOverviewParams {
  sort?: AgentStatsSort;
}

export interface SpeedToContactOverview {
  average_speed_to_contact_minutes: number | null;
  median_speed_to_contact_minutes: number | null;
  minimum_speed_to_contact_minutes: number | null;
  maximum_speed_to_contact_minutes: number | null;
}

export interface AgentSpeedToContactStats {
  agent_id: string;
  agent_name: string;
  average_speed_to_contact_minutes: number | null;
  contacted_leads: number;
}

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
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
  createdAt: string;
  user?: AuditLogUser | null;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuditLogListParams {
  page: number;
  limit: number;
  search?: string;
  module?: string;
  action?: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customRoleId: string | null;
  customRole: CustomRole | null;
  isActive: boolean;
  maxActiveLeads: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsersResponse {
  data: ManagedUser[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: 'active' | 'inactive';
}

export interface SaveUserPayload {
  name: string;
  email: string;
  role: UserRole;
  customRoleId?: string | null;
  isActive: boolean;
  maxActiveLeads: number;
  password?: string;
}

export type RolePermissionMap = Record<string, string[]>;

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  baseRole: UserRole;
  permissions: RolePermissionMap;
  isSystem: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveRolePayload {
  name: string;
  description?: string;
  baseRole: UserRole;
  permissions: RolePermissionMap;
}

export type AssignmentMethod = 'manual' | 'round_robin' | 'treatment_based';

export interface AssignmentSettings {
  id: string;
  assignmentMethod: AssignmentMethod;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateLeadPayload {
  name: string;
  phone: string;
  sourceChannel: string;
  campaignName?: string;
  adName?: string;
  treatmentId?: string;
  ownerAgentId?: string;
  status?: LeadStatus;
  note?: string;
}

export interface ChangeLeadStatusPayload {
  status: LeadStatus;
  note?: string;
  follow_up_date?: string;
  follow_up_time?: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_treatment_id?: string;
}

export interface CreateFollowUpPayload {
  date: string;
  time: string;
  note?: string;
}
export interface TreatmentRoutingItem {
  treatment_id: string;
  treatment_name: string;
  agent_ids: string[];
  agents: AgentOption[];
}

export interface DistributionAllocationItem {
  id?: string;
  agent_id: string;
  agent_name?: string;
  weight: number;
  assigned_count?: number;
}

export interface DistributionRuleItem {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  source_channel: string | null;
  campaign_name: string | null;
  ad_name: string | null;
  form_id: string | null;
  allocations: DistributionAllocationItem[];
  created_at: string;
  updated_at: string;
}

export interface SaveDistributionRulePayload {
  name: string;
  is_active?: boolean;
  priority?: number;
  source_channel?: string | null;
  campaign_name?: string | null;
  ad_name?: string | null;
  form_id?: string | null;
  allocations: Array<{ agent_id: string; weight: number }>;
}

export interface BulkAssignLeadsResult {
  success: true;
  assigned_count: number;
  lead_ids: string[];
}


export interface ReportsOverview {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  booked_leads: number;
  paid_leads: number;
  conversion_rate: number;
  average_speed_to_contact_minutes: number | null;
}

export interface AgentPerformanceReportRow {
  agent_id: string | null;
  agent_name: string;
  leads: number;
  leads_handled: number;
  contacted: number;
  booked: number;
  showed_up: number;
  paid: number;
  no_answer: number;
  booking_rate: number;
  show_up_rate: number;
  win_rate: number;
  no_answer_rate: number;
  average_speed_to_contact_minutes: number | null;
  average_speed_to_first_action_minutes: number | null;
  average_follow_ups_per_lead: number;
  activity_volume_today: number;
}

export interface MarketingQualityReportRow {
  source_channel: string;
  leads: number;
  duplicates: number;
  junk_leads: number;
  booked: number;
  paid: number;
  conversion_rate: number;
  duplicate_rate: number;
  junk_rate: number;
  converted_rate: number;
}

export interface SourceBreakdownRow {
  source_channel: string;
  leads: number;
  percentage: number;
}

export interface TreatmentBreakdownRow {
  treatment_id: string | null;
  treatment_name: string;
  leads: number;
  percentage: number;
}

export interface FunnelStageRow {
  stage: string;
  count: number;
  conversion_from_previous: number | null;
}

export interface CallOutcomeDistributionRow {
  status: LeadStatus;
  label: string;
  count: number;
  percentage: number;
}


export interface CampaignPerformanceRow {
  campaign_name: string;
  source_channel: string;
  leads: number;
  booked: number;
  paid: number;
  conversion_rate: number;
}

export interface ReportsResponse {
  overview: ReportsOverview;
  agent_performance: AgentPerformanceReportRow[];
  marketing_quality: MarketingQualityReportRow[];
  source_breakdown: SourceBreakdownRow[];
  treatment_breakdown: TreatmentBreakdownRow[];
  conversion_funnel: FunnelStageRow[];
  call_outcome_distribution: CallOutcomeDistributionRow[];
  campaign_performance: CampaignPerformanceRow[];
  filters: Record<string, string | null>;
}

export interface ReportsQueryParams {
  start_date?: string;
  end_date?: string;
  agent_id?: string;
  treatment_id?: string;
  source_channel?: string;
}

export type ReportsExportFormat = 'xlsx' | 'csv';
export type ReportsExportType = 'management' | 'marketing' | 'all';

export type LeadExportFormat = 'xlsx' | 'csv';
export type LeadExportType = 'view' | 'raw';


