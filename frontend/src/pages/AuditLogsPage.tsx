import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLogs } from '../api/leadsApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useI18n } from '../i18n/I18nContext';
import type { AuditLog } from '../types';

export function AuditLogsPage() {
  const { t, language } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  const params = useMemo(() => ({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    module: module || undefined,
    action: action || undefined,
    entity_type: entityType || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  }), [page, debouncedSearch, module, action, entityType, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchAuditLogs(params, controller.signal)
      .then((response) => {
        setLogs(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages || 1);
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('Unable to load audit logs.'));
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [params, t]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('Medical Leads CRM')}</p>
          <h1>{t('Audit Logs')}</h1>
        </div>
        
      </header>

      <section className="toolbar">
        <label className="field field--wide">
          <span>{t('Search')}</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t('User, action, module, entity ID...')} />
        </label>
        <div className="filters">
          <label className="field"><span>{t('Module')}</span><input value={module} onChange={(event) => { setModule(event.target.value); setPage(1); }} /></label>
          <label className="field"><span>{t('Action')}</span><input value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} /></label>
          <label className="field"><span>{t('Entity Type')}</span><input value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }} /></label>
          <label className="field"><span>{t('Start Date')}</span><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} /></label>
          <label className="field"><span>{t('End Date')}</span><input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} /></label>
        </div>
      </section>

      <section className="panel">
        {error ? <div className="error-state">{error}</div> : null}
        {isLoading ? <div className="loading-state">{t('Loading audit logs...')}</div> : null}
        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="leads-table audit-table">
                <thead><tr><th>{t('Date')}</th><th>{t('User')}</th><th>{t('Module')}</th><th>{t('Action')}</th><th>{t('Entity')}</th><th>{t('IP Address')}</th></tr></thead>
                <tbody>
                  {logs.length === 0 ? <tr><td colSpan={6} className="empty-cell">{t('No audit logs found.')}</td></tr> : logs.map((log) => (
                    <tr key={log.id} onClick={() => { window.location.href = `/audit-logs/${log.id}`; }} className="clickable-row">
                      <td>{new Date(log.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td>{log.user?.name ?? '-'}</td>
                      <td>{t(log.module)}</td>
                      <td>{t(log.action)}</td>
                      <td>{t(log.entityType)}{log.entityId ? ` #${log.entityId}` : ''}</td>
                      <td>{log.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination"><span className="pagination__summary">{language === 'ar' ? `صفحة ${page} من ${totalPages} · ${total} سجل` : `Page ${page} of ${totalPages} · ${total} logs`}</span><div className="pagination__actions"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{t('pagination.previous')}</button><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>{t('pagination.next')}</button></div></div>
          </>
        ) : null}
      </section>
    </main>
  );
}


