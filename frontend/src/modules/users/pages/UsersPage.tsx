import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createUser, deactivateUser, fetchRoles, fetchUsers, resetUserPassword, updateUser, updateUserStatus } from '../../../api/leadsApi';
import { PageHeader } from '../../../components/layout/PageHeader/PageHeader';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { useI18n } from '../../../i18n/I18nContext';
import type { CustomRole, ManagedUser, SaveUserPayload, UserRole } from '../../../types';

type UserFormState = SaveUserPayload;

const emptyForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'agent',
  customRoleId: null,
  isActive: true,
  maxActiveLeads: 50,
};

function roleTone(role: UserRole): 'info' | 'warning' | 'neutral' {
  if (role === 'admin') return 'info';
  if (role === 'manager' || role === 'marketing') return 'warning';
  return 'neutral';
}

function toForm(user: ManagedUser): UserFormState {
  return {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    customRoleId: user.customRoleId,
    isActive: user.isActive,
    maxActiveLeads: user.maxActiveLeads,
  };
}

const baseRoleOrder: UserRole[] = ['admin', 'manager', 'agent', 'marketing'];

function resolveProfileSelection(form: UserFormState, roles: CustomRole[]): string {
  if (form.customRoleId) return form.customRoleId;
  const systemRole = roles.find((item) => item.isSystem && item.baseRole === form.role);
  return systemRole?.id ?? `base:${form.role}`;
}

function getFallbackBaseRoleOptions(roles: CustomRole[]): UserRole[] {
  return baseRoleOrder.filter((baseRole) => !roles.some((item) => item.isSystem && item.baseRole === baseRole));
}
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('');
  const [page] = useState(1);
  const [limit] = useState(100);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  function loadUsers(signal?: AbortSignal) {
    setIsLoading(true);
    setError(null);
    fetchUsers({ page, limit, search: search.trim() || undefined, role: role || undefined, status: status || undefined }, signal)
      .then((response) => {
        setUsers(response.data);
        setTotal(response.meta.total);
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError('Unable to load users. Please try again.');
      })
      .finally(() => {
        if (!signal?.aborted) setIsLoading(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    fetchRoles(controller.signal)
      .then(setRoles)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError('Unable to load role profiles.');
      });
    return () => controller.abort();
  }, [search, role, status]);

  const totals = useMemo(() => ({
    total,
    admins: users.filter((user) => user.role === 'admin').length,
    managers: users.filter((user) => user.role === 'manager').length,
    agents: users.filter((user) => user.role === 'agent').length,
    marketing: users.filter((user) => user.role === 'marketing').length,
  }), [total, users]);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setError(null);
  }

  function openEdit(user: ManagedUser) {
    setEditingUser(user);
    setForm(toForm(user));
    setIsFormOpen(true);
    setError(null);
  }

  function handleProfileChange(value: string) {
    const selectedRole = roles.find((item) => item.id === value);
    if (selectedRole) {
      setForm({ ...form, customRoleId: selectedRole.id, role: selectedRole.baseRole });
      return;
    }

    const baseRole = value.replace('base:', '') as UserRole;
    setForm({ ...form, role: baseRole, customRoleId: null });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!editingUser && (!form.password || form.password.length < 6)) {
        setError('Password must be at least 6 characters.');
        return;
      }

      const payload: SaveUserPayload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: editingUser ? undefined : form.password,
        role: form.role,
        customRoleId: form.customRoleId ?? null,
        isActive: form.isActive,
        maxActiveLeads: Number(form.maxActiveLeads),
      };

      if (editingUser) {
        await updateUser(editingUser.id, payload);
        setSuccess('User updated successfully.');
      } else {
        await createUser(payload);
        setSuccess('User created successfully.');
      }
      setIsFormOpen(false);
      loadUsers();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not save user. Check the data and try again.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(user: ManagedUser, isActive: boolean) {
    if (!window.confirm(`${isActive ? 'Activate' : 'Deactivate'} ${user.name}?`)) return;
    setError(null);
    try {
      await updateUserStatus(user.id, isActive);
      setSuccess(`User ${isActive ? 'activated' : 'deactivated'} successfully.`);
      loadUsers();
    } catch {
      setError('Could not update user status.');
    }
  }

  async function handleDeactivate(user: ManagedUser) {
    if (!window.confirm(`Delete/deactivate ${user.name}? The record will be kept for audit history.`)) return;
    setError(null);
    try {
      await deactivateUser(user.id);
      setSuccess('User deleted successfully.');
      loadUsers();
    } catch {
      setError('Could not delete user.');
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setIsSaving(true);
    setError(null);
    try {
      await resetUserPassword(resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword('');
      setSuccess('Password reset successfully. The user can now login with the new password.');
      loadUsers();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not reset password. Password must be at least 6 characters.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <PageHeader eyebrow={t('Administration')} title={t('Users')} actions={<Button variant="primary" onClick={openCreate}>{t('Create User')}</Button>} />

      <section className="admin-summary-grid" aria-label={t('Users summary')}>
        <article className="summary-card"><span>{t('Total Users')}</span><strong>{totals.total}</strong></article>
        <article className="summary-card"><span>{t('Admins')}</span><strong>{totals.admins}</strong></article>
        <article className="summary-card"><span>{t('Managers')}</span><strong>{totals.managers}</strong></article>
        <article className="summary-card"><span>{t('Agents')}</span><strong>{totals.agents}</strong></article>
        <article className="summary-card"><span>{t('Marketing')}</span><strong>{totals.marketing}</strong></article>
      </section>

      <section className="toolbar admin-toolbar" aria-label={t('Users filters')}>
        <Input label={t('Search users')} placeholder={t('Search by name or email...')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label={t('Base Role')} value={role} onChange={(event) => setRole(event.target.value as UserRole | '')}>
          <option value="">{t('All roles')}</option><option value="admin">{t('Admin')}</option><option value="manager">{t('Manager')}</option><option value="agent">{t('Agent')}</option><option value="marketing">{t('Marketing Viewer')}</option>
        </Select>
        <Select label={t('Status')} value={status} onChange={(event) => setStatus(event.target.value as 'active' | 'inactive' | '')}>
          <option value="">{t('All statuses')}</option><option value="active">{t('Active')}</option><option value="inactive">{t('Inactive')}</option>
        </Select>
      </section>

      {success ? <div className="success-state">{success}</div> : null}
      <section className="panel">
        {error ? <div className="error-state">{error}</div> : null}
        {isLoading ? <div className="loading-state">{t('Loading users...')}</div> : (
          <div className="table-wrap">
            <table className="leads-table admin-table">
              <thead><tr><th>{t('User')}</th><th>{t('Email')}</th><th>{t('Role')}</th><th>{t('Base Role')}</th><th>{t('Status')}</th><th>{t('Capacity')}</th><th>{t('Actions')}</th></tr></thead>
              <tbody>
                {users.length === 0 ? <tr><td colSpan={7} className="empty-cell">{t('No users found.')}</td></tr> : users.map((user) => (
                  <tr key={user.id}>
                    <td><div className="user-cell"><div className="mini-avatar">{user.name.slice(0, 1)}</div><strong>{user.name}</strong></div></td>
                    <td>{user.email}</td>
                    <td><strong>{user.customRole?.name ?? t(user.role === 'marketing' ? 'Marketing Viewer' : user.role.charAt(0).toUpperCase() + user.role.slice(1))}</strong></td>
                    <td><Badge tone={roleTone(user.role)}>{user.role}</Badge></td>
                    <td><Badge tone={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'active' : 'inactive'}</Badge></td>
                    <td>{user.maxActiveLeads === 0 ? t('Unlimited') : user.maxActiveLeads}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => openEdit(user)}>{t('Edit')}</button>
                        <button type="button" onClick={() => { setResetTarget(user); setNewPassword(''); }}>{t('Reset Password')}</button>
                        <button type="button" onClick={() => void handleStatus(user, !user.isActive)}>{user.isActive ? t('Deactivate') : t('Activate')}</button>
                        <button type="button" onClick={() => void handleDeactivate(user)}>{t('Delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card user-form-modal" onSubmit={(event) => void handleSubmit(event)}>
            <h2>{editingUser ? t('Edit User') : t('Create User')}</h2>
            <Input label={t('Name')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <Input label={t('Email')} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            {!editingUser ? <Input label={t('Password')} type="password" minLength={6} value={form.password ?? ''} onChange={(event) => setForm({ ...form, password: event.target.value })} required /> : null}
            <Select label={t('Role / Permission Profile')} value={resolveProfileSelection(form, roles)} onChange={(event) => handleProfileChange(event.target.value)}>
              {roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              {getFallbackBaseRoleOptions(roles).map((item) => <option key={item} value={`base:${item}`}>{t(item === 'marketing' ? 'Marketing Viewer' : item.charAt(0).toUpperCase() + item.slice(1))}</option>)}
            </Select>
            <small className="form-hint">{t('Choose one role profile. Saved permissions from Roles & Permissions apply to this user.')}</small>
            <Input label={t('Max Active Leads')} type="number" min={0} value={form.maxActiveLeads} onChange={(event) => setForm({ ...form, maxActiveLeads: Number(event.target.value) })} />
            <small className="form-hint">{t('Use 0 for unlimited active leads.')}</small>
            <label className="checkbox-control"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> {t('Active user')}</label>
            <div className="modal-actions"><Button type="button" onClick={() => setIsFormOpen(false)}>{t('Cancel')}</Button><Button type="submit" variant="primary" isLoading={isSaving}>{t('Save')}</Button></div>
          </form>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={(event) => void handleResetPassword(event)}>
            <h2>{t('Reset Password')}</h2>
            <p className="subtle">{t('Set a new password for')} {resetTarget.name}.</p>
            <Input label={t('New Password')} type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            <div className="modal-actions"><Button type="button" onClick={() => setResetTarget(null)}>{t('Cancel')}</Button><Button type="submit" variant="primary" isLoading={isSaving}>{t('Reset')}</Button></div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
