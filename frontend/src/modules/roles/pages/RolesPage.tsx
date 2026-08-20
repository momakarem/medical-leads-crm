import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRole, deleteRole, fetchRoles, updateRole } from '../../../api/leadsApi';
import { PageHeader } from '../../../components/layout/PageHeader/PageHeader';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { useI18n } from '../../../i18n/I18nContext';
import type { CustomRole, RolePermissionMap, UserRole } from '../../../types';

const allPermissions = ['View', 'Create', 'Update', 'Delete', 'Assign', 'Transfer', 'Export', 'Manage'] as const;
type Permission = (typeof allPermissions)[number];

const modules = ['Leads', 'Dashboard', 'Users', 'Roles', 'Treatments', 'Integrations', 'Reports', 'Audit Logs', 'Settings'];

interface RoleFormState {
  id?: string;
  name: string;
  description: string;
  baseRole: UserRole;
  permissions: RolePermissionMap;
  isSystem?: boolean;
}

function emptyPermissions(): RolePermissionMap {
  return Object.fromEntries(modules.map((module) => [module, []])) as RolePermissionMap;
}

function normalizePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return { ...emptyPermissions(), ...permissions };
}

function roleTone(role: UserRole): 'info' | 'warning' | 'neutral' {
  if (role === 'admin') return 'info';
  if (role === 'manager' || role === 'marketing') return 'warning';
  return 'neutral';
}

function toForm(role: CustomRole): RoleFormState {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? '',
    baseRole: role.baseRole,
    permissions: normalizePermissions(role.permissions),
    isSystem: role.isSystem,
  };
}

export function RolesPage() {
  const { t, language } = useI18n();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editingRole, setEditingRole] = useState<RoleFormState | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  function loadRoles(signal?: AbortSignal) {
    setIsLoading(true);
    setError(null);
    fetchRoles(signal)
      .then(setRoles)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('Unable to load roles. Please try again.'));
      })
      .finally(() => {
        if (!signal?.aborted) setIsLoading(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadRoles(controller.signal);
    return () => controller.abort();
  }, []);

  function openCreate() {
    setEditingRole({ name: '', description: '', baseRole: 'agent', permissions: emptyPermissions() });
    setError(null);
  }

  function openEdit(role: CustomRole) {
    setEditingRole(toForm(role));
    setError(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRole) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: editingRole.name.trim(),
        description: editingRole.description.trim(),
        baseRole: editingRole.baseRole,
        permissions: normalizePermissions(editingRole.permissions),
      };
      if (editingRole.id) await updateRole(editingRole.id, payload);
      else await createRole(payload);
      setEditingRole(null);
      setSuccess(t('Role saved successfully. It is now available in the user form.'));
      loadRoles();
    } catch {
      setError(t('Could not save role. Check the name and permissions.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function duplicateRole(role: CustomRole) {
    setError(null);
    try {
      await createRole({
        name: `${role.name} ${t('Copy')}`,
        description: role.description ?? '',
        baseRole: role.baseRole,
        permissions: normalizePermissions(role.permissions),
      });
      setSuccess(t('Role duplicated successfully.'));
      loadRoles();
    } catch {
      setError(t('Could not duplicate role.'));
    }
  }

  async function handleDeleteRole(role: CustomRole) {
    if (role.isSystem) {
      setError(t('System roles cannot be deleted. You can edit their permissions profile only.'));
      return;
    }
    if (!window.confirm(language === 'ar' ? `هل تريد حذف الدور ${role.name}؟ سيعود المستخدمون المرتبطون به إلى دورهم الأساسي.` : `Delete role ${role.name}? Users assigned to it will fall back to their base role.`)) return;
    setError(null);
    try {
      await deleteRole(role.id);
      setSuccess(t('Role deleted successfully.'));
      loadRoles();
    } catch {
      setError(t('Could not delete role.'));
    }
  }

  function togglePermission(module: string, permission: Permission) {
    if (!editingRole) return;
    const current = editingRole.permissions[module] ?? [];
    const next = current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission];
    setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [module]: next } });
  }

  const matrixRoles = useMemo(() => roles.map((role) => ({ ...role, permissions: normalizePermissions(role.permissions) })), [roles]);

  return (
    <main className="page-shell">
      <PageHeader eyebrow={t('Access Control')} title={t('Roles & Permissions')} actions={<Button variant="primary" onClick={openCreate}>{t('Create Role')}</Button>} />
      {success ? <div className="success-state">{success}</div> : null}
      {error ? <div className="error-state">{error}</div> : null}

      {isLoading ? <section className="panel"><div className="loading-state">{t('Loading roles...')}</div></section> : (
        <>
          <section className="role-card-grid" aria-label={t('Role overview')}>
            {matrixRoles.map((role) => (
              <article className="role-card" key={role.id}>
                <div className="role-card__header"><Badge tone={roleTone(role.baseRole)}>{t(role.baseRole === 'marketing' ? 'Marketing Viewer' : role.baseRole.charAt(0).toUpperCase() + role.baseRole.slice(1))}</Badge><span>{role.usersCount} {t('users')}</span></div>
                <h2>{t(role.name)}</h2>
                <p>{t(role.description || 'Custom CRM role.')}</p>
                <div className="row-actions"><button type="button" onClick={() => openEdit(role)}>{t('Edit Role')}</button><button type="button" onClick={() => void duplicateRole(role)}>{t('Duplicate')}</button><button type="button" onClick={() => void handleDeleteRole(role)}>{t('Delete')}</button></div>
              </article>
            ))}
          </section>

          <section className="panel permission-panel">
            <div className="panel-header"><div><p className="eyebrow">{t('Permission Matrix')}</p><h2>{t('Access by module')}</h2></div><span className="config-note">{t('Saved role profiles can now be assigned to users.')}</span></div>
            <div className="table-wrap">
              <table className="leads-table permission-table"><thead><tr><th>{t('Module')}</th>{matrixRoles.map((role) => <th key={role.id}>{t(role.name)}</th>)}</tr></thead><tbody>{modules.map((module) => (<tr key={module}><td><strong>{t(module)}</strong><small>{allPermissions.map((permission) => t(permission)).join(' · ')}</small></td>{matrixRoles.map((role) => (<td key={role.id}><div className="permission-pills">{allPermissions.map((permission) => (<span className={role.permissions[module]?.includes(permission) ? 'permission-pill permission-pill--on' : 'permission-pill'} key={permission}>{t(permission)}</span>))}</div></td>))}</tr>))}</tbody></table>
            </div>
          </section>
        </>
      )}

      {editingRole ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card role-form-modal" onSubmit={(event) => void handleSave(event)}>
            <h2>{t(editingRole.id ? 'Edit Role' : 'Create Role')}</h2>
            <Input label={t('Role Name')} value={editingRole.name} onChange={(event) => setEditingRole({ ...editingRole, name: event.target.value })} required />
            <Select label={t('Secure Base Role')} value={editingRole.baseRole} disabled={editingRole.isSystem} onChange={(event) => setEditingRole({ ...editingRole, baseRole: event.target.value as UserRole })}>
              <option value="admin">{t('Admin')}</option>
              <option value="manager">{t('Manager')}</option>
              <option value="agent">{t('Agent')}</option>
              <option value="marketing">{t('Marketing Viewer')}</option>
            </Select>
            <small className="form-hint">{t('The base role controls backend access. Permissions below are saved as the UI permission profile.')}</small>
            <label className="form-control"><span>{t('Description')}</span><textarea value={editingRole.description} onChange={(event) => setEditingRole({ ...editingRole, description: event.target.value })} /></label>
            <div className="role-permission-editor">{modules.map((module) => (<div className="role-permission-row" key={module}><strong>{t(module)}</strong><div className="permission-pills">{allPermissions.map((permission) => (<button type="button" className={editingRole.permissions[module]?.includes(permission) ? 'permission-pill permission-pill--on' : 'permission-pill'} onClick={() => togglePermission(module, permission)} key={permission}>{t(permission)}</button>))}</div></div>))}</div>
            <div className="modal-actions"><Button type="button" onClick={() => setEditingRole(null)}>{t('Cancel')}</Button><Button type="submit" variant="primary" isLoading={isSaving}>{t('Save Role')}</Button></div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
