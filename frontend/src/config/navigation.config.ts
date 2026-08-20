import type { Permission } from './permissions.config';

export interface NavigationItem {
  label: string;
  path?: string;
  icon: string;
  permission?: Permission;
  children?: NavigationItem[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '⌂', permission: 'dashboard.view' },
  {
    label: 'Leads',
    icon: '◎',
    permission: 'leads.view',
    children: [
      { label: 'All Leads', path: '/', icon: '•', permission: 'leads.view' },
      { label: 'Follow-Ups', path: '/follow-ups', icon: '•', permission: 'followups.view' },
    ],
  },
  {
    label: 'Users',
    icon: '◫',
    permission: 'users.view',
    children: [
      { label: 'Users List', path: '/users', icon: '•', permission: 'users.view' },
      { label: 'Roles & Permissions', path: '/roles', icon: '•', permission: 'roles.manage' },
    ],
  },
  { label: 'Treatments', path: '/treatments', icon: '✚', permission: 'treatments.manage' },
  { label: 'Integrations', path: '/integrations', icon: '⛓', permission: 'integrations.manage' },
  { label: 'Reports', path: '/reports', icon: '◈', permission: 'reports.view' },
  { label: 'Audit Logs', path: '/audit-logs', icon: '◷', permission: 'audit.view' },
  { label: 'Settings', path: '/settings', icon: '⚙', permission: 'settings.update' },
];
