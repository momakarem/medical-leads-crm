import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createTreatment, deleteTreatment, fetchTreatments, updateTreatment } from '../../../api/leadsApi';
import { PageHeader } from '../../../components/layout/PageHeader/PageHeader';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { useI18n } from '../../../i18n/I18nContext';
import type { SaveTreatmentPayload, Treatment } from '../../../types';

type TreatmentFormState = Required<Pick<SaveTreatmentPayload, 'name'>> & {
  description: string;
  isActive: boolean;
};

const emptyForm: TreatmentFormState = {
  name: '',
  description: '',
  isActive: true,
};

function toForm(treatment: Treatment): TreatmentFormState {
  return {
    name: treatment.name,
    description: treatment.description ?? '',
    isActive: treatment.isActive,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function matchesSearch(treatment: Treatment, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [treatment.name, treatment.description ?? ''].some((value) => value.toLowerCase().includes(query));
}

export function TreatmentsPage() {
  const { t } = useI18n();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [form, setForm] = useState<TreatmentFormState>(emptyForm);

  function loadTreatments(signal?: AbortSignal) {
    setIsLoading(true);
    setError(null);
    fetchTreatments(signal)
      .then(setTreatments)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('treatments.loadError'));
      })
      .finally(() => {
        if (!signal?.aborted) setIsLoading(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadTreatments(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredTreatments = useMemo(() => treatments.filter((treatment) => {
    if (status === 'active' && !treatment.isActive) return false;
    if (status === 'inactive' && treatment.isActive) return false;
    return matchesSearch(treatment, search);
  }), [treatments, search, status]);

  const totals = useMemo(() => ({
    total: treatments.length,
    active: treatments.filter((item) => item.isActive).length,
    inactive: treatments.filter((item) => !item.isActive).length,
  }), [treatments]);

  function openCreate() {
    setEditingTreatment(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(treatment: Treatment) {
    setEditingTreatment(treatment);
    setForm(toForm(treatment));
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload: SaveTreatmentPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    };

    try {
      if (editingTreatment) {
        await updateTreatment(editingTreatment.id, payload);
        setSuccess(t('treatments.updated'));
      } else {
        await createTreatment(payload);
        setSuccess(t('treatments.created'));
      }
      setIsFormOpen(false);
      loadTreatments();
    } catch {
      setError(t('treatments.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(treatment: Treatment) {
    const nextStatus = !treatment.isActive;
    if (!window.confirm(`${nextStatus ? 'Activate' : 'Deactivate'} ${treatment.name}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await updateTreatment(treatment.id, { isActive: nextStatus });
      setSuccess(t('treatments.statusUpdated'));
      loadTreatments();
    } catch {
      setError(t('treatments.statusError'));
    }
  }

  async function handleDelete(treatment: Treatment) {
    if (!window.confirm(`Delete ${treatment.name}? Existing leads will keep their history, but this treatment will be removed from the catalog.`)) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteTreatment(treatment.id);
      setSuccess(t('treatments.deleted'));
      loadTreatments();
    } catch {
      setError(t('treatments.deleteError'));
    }
  }

  return (
    <main className="page-shell">
      <PageHeader eyebrow={t('treatments.eyebrow')} title={t('treatments.title')} actions={<Button variant="primary" onClick={openCreate}>{t('treatments.create')}</Button>} />

      <section className="admin-summary-grid" aria-label="Treatments summary">
        <article className="summary-card"><span>{t('treatments.total')}</span><strong>{totals.total}</strong></article>
        <article className="summary-card"><span>{t('treatments.active')}</span><strong>{totals.active}</strong></article>
        <article className="summary-card"><span>{t('treatments.inactive')}</span><strong>{totals.inactive}</strong></article>
      </section>

      <section className="toolbar admin-toolbar" aria-label="Treatment filters">
        <Input label={t('treatments.searchLabel')} placeholder={t('treatments.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="form-control">
          <span>{t('common.status')}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'active' | 'inactive')}>
            <option value="all">{t('common.allStatuses')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </select>
        </label>
      </section>

      {success ? <div className="success-state">{success}</div> : null}
      <section className="panel">
        {error ? <div className="error-state">{error}</div> : null}
        {isLoading ? <div className="loading-state">{t('treatments.loading')}</div> : (
          <div className="table-wrap">
            <table className="leads-table admin-table">
              <thead>
                <tr>
                  <th>{t('treatments.name')}</th>
                  <th>{t('common.description')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.created')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTreatments.length === 0 ? <tr><td colSpan={5} className="empty-cell">{t('treatments.noFound')}</td></tr> : filteredTreatments.map((treatment) => (
                  <tr key={treatment.id}>
                    <td><strong>{treatment.name}</strong></td>
                    <td>{treatment.description || '-'}</td>
                    <td><Badge tone={treatment.isActive ? 'success' : 'danger'}>{treatment.isActive ? t('common.active') : t('common.inactive')}</Badge></td>
                    <td>{formatDate(treatment.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => openEdit(treatment)}>{t('common.edit')}</button>
                        <button type="button" onClick={() => void handleStatus(treatment)}>{treatment.isActive ? t('common.deactivate') : t('common.activate')}</button>
                        <button type="button" onClick={() => void handleDelete(treatment)}>{t('common.delete')}</button>
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
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editingTreatment ? t('treatments.editTitle') : t('treatments.createTitle')}>
          <form className="modal-card user-form-modal" onSubmit={(event) => void handleSubmit(event)}>
            <h2>{editingTreatment ? t('treatments.editTitle') : t('treatments.createTitle')}</h2>
            <Input label={t('treatments.treatmentName')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={150} />
            <label className="form-control">
              <span>{t('common.description')}</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
            </label>
            <label className="checkbox-control"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> {t('treatments.activeCheckbox')}</label>
            <div className="modal-actions">
              <Button type="button" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary" isLoading={isSaving}>{editingTreatment ? t('common.save') : t('common.create')}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
