import { useEffect, useMemo, useState } from 'react';
import { fetchFollowUps } from '../api/leadsApi';
import { FollowUpsTable } from '../components/FollowUpsTable';
import { PaginationControls } from '../components/PaginationControls';
import { useI18n } from '../i18n/I18nContext';
import type { FollowUp, FollowUpFilter } from '../types';

const filters: Array<{ value: FollowUpFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

export function FollowUpsListPage() {
  const { t } = useI18n();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [filter, setFilter] = useState<FollowUpFilter>('today');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useMemo(() => ({ filter, page, limit }), [filter, page, limit]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchFollowUps(params.filter, params.page, params.limit, controller.signal)
      .then((response) => {
        setFollowUps(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('Could not load follow-ups. Please try again.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [params, t]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('Medical Leads CRM')}</p>
          <h1>{t('Follow-Ups')}</h1>
        </div>
      </header>

      <section className="toolbar" aria-label={t('Follow-up filters')}>
        <label className="field">
          <span>{t('Filter')}</span>
          <select value={filter} onChange={(event) => { setFilter(event.target.value as FollowUpFilter); setPage(1); }}>
            {filters.map((item) => <option key={item.value} value={item.value}>{t(item.label)}</option>)}
          </select>
        </label>
      </section>

      <section className="panel">
        {error ? <div className="error-state">{error}</div> : null}
        {isLoading ? <div className="loading-state">{t('Loading follow-ups...')}</div> : <FollowUpsTable followUps={followUps} />}
        <PaginationControls
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
        />
      </section>
    </main>
  );
}