import type { ComponentType } from 'react';
import { AuditLogDetailsPage } from '../pages/AuditLogDetailsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { FollowUpsListPage } from '../pages/FollowUpsListPage';
import { LeadTimelinePage } from '../pages/LeadTimelinePage';
import { LeadsListPage } from '../pages/LeadsListPage';
import { IntegrationsPage } from '../modules/integrations/pages/IntegrationsPage';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { ReportsPage } from '../modules/reports/pages/ReportsPage';
import { RolesPage } from '../modules/roles/pages/RolesPage';
import { SettingsPage } from '../modules/settings/pages/SettingsPage';
import { TreatmentsPage } from '../modules/treatments/pages/TreatmentsPage';
import { UsersPage } from '../modules/users/pages/UsersPage';
import type { Permission } from '../config/permissions.config';

export interface RouteMatch {
  component: ComponentType<any>;
  params?: Record<string, string>;
  isPublic?: boolean;
  permission?: Permission;
}

interface RouteDefinition {
  pattern: RegExp;
  component: ComponentType<any>;
  isPublic?: boolean;
  permission?: Permission;
  paramNames?: string[];
}

const routes: RouteDefinition[] = [
  { pattern: /^\/login$/, component: LoginPage, isPublic: true },
  { pattern: /^\/$/, component: LeadsListPage, permission: 'leads.view' },
  { pattern: /^\/dashboard$/, component: DashboardPage, permission: 'dashboard.view' },
  { pattern: /^\/follow-ups$/, component: FollowUpsListPage, permission: 'followups.view' },
  { pattern: /^\/leads\/([^/]+)$/, component: LeadTimelinePage, permission: 'leads.view', paramNames: ['leadId'] },
  { pattern: /^\/audit-logs$/, component: AuditLogsPage, permission: 'audit.view' },
  { pattern: /^\/audit-logs\/([^/]+)$/, component: AuditLogDetailsPage, permission: 'audit.view', paramNames: ['auditId'] },
  { pattern: /^\/users$/, component: UsersPage, permission: 'users.view' },
  { pattern: /^\/roles$/, component: RolesPage, permission: 'roles.manage' },
  { pattern: /^\/treatments$/, component: TreatmentsPage, permission: 'treatments.manage' },
  { pattern: /^\/integrations$/, component: IntegrationsPage, permission: 'integrations.manage' },
  { pattern: /^\/reports$/, component: ReportsPage, permission: 'reports.view' },
  { pattern: /^\/settings$/, component: SettingsPage, permission: 'settings.update' },
];

export function matchRoute(pathname: string): RouteMatch {
  for (const route of routes) {
    const match = pathname.match(route.pattern);
    if (!match) continue;
    const params = route.paramNames?.reduce<Record<string, string>>((acc, name, index) => {
      acc[name] = match[index + 1];
      return acc;
    }, {});
    return { component: route.component, params, isPublic: route.isPublic, permission: route.permission };
  }

  return { component: LeadsListPage, permission: 'leads.view' };
}
