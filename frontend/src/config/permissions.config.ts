import type { UserRole } from '../types';

export type Permission =
  | 'dashboard.view'
  | 'leads.view'
  | 'leads.create'
  | 'leads.update'
  | 'leads.delete'
  | 'leads.assign'
  | 'leads.transfer'
  | 'leads.export'
  | 'followups.view'
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'roles.manage'
  | 'treatments.manage'
  | 'integrations.manage'
  | 'reports.view'
  | 'audit.view'
  | 'activities.view'
  | 'settings.update';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'dashboard.view', 'leads.view', 'leads.create', 'leads.update', 'leads.delete', 'leads.assign', 'leads.transfer', 'leads.export',
    'followups.view', 'users.view', 'users.create', 'users.update', 'users.delete', 'roles.manage', 'treatments.manage',
    'integrations.manage', 'reports.view', 'audit.view', 'activities.view', 'settings.update',
  ],
  manager: [
    'dashboard.view', 'leads.view', 'leads.create', 'leads.update', 'leads.assign', 'leads.transfer', 'leads.export',
    'followups.view', 'users.view', 'users.update', 'treatments.manage', 'reports.view', 'audit.view', 'activities.view',
  ],
  agent: ['dashboard.view', 'leads.view', 'leads.create', 'leads.update', 'followups.view', 'activities.view'],
  marketing: ['dashboard.view', 'reports.view'],
};

export function hasPermission(role: UserRole | undefined, permission?: Permission): boolean {
  if (!permission) return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
