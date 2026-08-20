import { useEffect, useState } from 'react';
import { fetchAuditLog } from '../api/leadsApi';
import type { AuditLog } from '../types';

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="json-block">{value ? JSON.stringify(value, null, 2) : '-'}</pre>;
}

export function AuditLogDetailsPage({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<AuditLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchAuditLog(auditId, controller.signal)
      .then(setAudit)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError('Unable to load audit details.');
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [auditId]);

  return (
    <main className="page-shell">
      <header className="page-header"><div><p className="eyebrow">Medical Leads CRM</p><h1>Audit Details</h1></div><a className="table-link" href="/audit-logs">Audit Logs</a></header>
      <section className="panel details-panel">
        {error ? <div className="error-state">{error}</div> : null}
        {isLoading ? <div className="loading-state">Loading audit details...</div> : null}
        {!isLoading && audit ? (
          <div className="details-grid">
            <div><span>Date</span><strong>{new Date(audit.createdAt).toLocaleString()}</strong></div>
            <div><span>User</span><strong>{audit.user?.name ?? '-'}</strong></div>
            <div><span>Module</span><strong>{audit.module}</strong></div>
            <div><span>Action</span><strong>{audit.action}</strong></div>
            <div><span>Entity</span><strong>{audit.entityType}{audit.entityId ? ` #${audit.entityId}` : ''}</strong></div>
            <div><span>IP Address</span><strong>{audit.ipAddress ?? '-'}</strong></div>
            <div><span>HTTP Method</span><strong>{audit.requestMethod ?? '-'}</strong></div>
            <div><span>Endpoint</span><strong>{audit.endpoint ?? '-'}</strong></div>
            <div className="details-wide"><span>Browser</span><strong>{audit.userAgent ?? '-'}</strong></div>
            <div className="details-wide"><span>Old Values</span><JsonBlock value={audit.oldValues} /></div>
            <div className="details-wide"><span>New Values</span><JsonBlock value={audit.newValues} /></div>
            <div className="details-wide"><span>Metadata</span><JsonBlock value={audit.metadata} /></div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
