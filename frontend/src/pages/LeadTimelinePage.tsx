import { useEffect, useMemo, useState } from 'react';
import { fetchLead, fetchLeadActivities, fetchLeadTransfers } from '../api/leadsApi';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { PaginationControls } from '../components/PaginationControls';
import type { Lead, LeadActivity, LeadTransfer } from '../types';

interface LeadTimelinePageProps {
  leadId: string;
}

export function LeadTimelinePage({ leadId }: LeadTimelinePageProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [transfers, setTransfers] = useState<LeadTransfer[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useMemo(() => ({ page, limit }), [page, limit]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchLead(leadId, controller.signal).then(setLead).catch(() => setLead(null));
    fetchLeadTransfers(leadId, controller.signal).then(setTransfers).catch(() => setTransfers([]));

    fetchLeadActivities(leadId, params.page, params.limit, controller.signal)
      .then((response) => {
        setActivities(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') {
          setError('Could not load activity timeline. Please try again.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [leadId, params]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Medical Leads CRM</p>
          <h1>Activity Timeline</h1>
          <p className="subtle">Lead ID: {leadId}</p>
          {lead ? (
            <div className="lead-summary-strip">
              <span><strong>Patient:</strong> {lead.name}</span>
              <span><strong>Phone:</strong> {lead.phone}</span>
              <span><strong>Follow-up Attempts:</strong> {lead.followUpAttemptsCount ?? 0}</span>
              <span><strong>Status:</strong> {lead.status.replaceAll('_', ' ')}</span>
            </div>
          ) : null}
          {lead?.isDuplicate ? (
            <div className="duplicate-alert">?? Duplicate Lead — Original Lead: {lead.duplicateOfLeadId ?? '-'}</div>
          ) : null}
        </div>
      </header>


      {transfers.length > 0 ? (
        <section className="panel transfer-history-panel">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Transfer Control</p>
              <h2>Transfer History</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Previous Agent</th>
                  <th>New Agent</th>
                  <th>Transferred By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(transfer.createdAt))}</td>
                    <td>{transfer.previousAgent?.name ?? 'Unassigned'}</td>
                    <td>{transfer.newAgent?.name ?? '-'}</td>
                    <td>{transfer.transferer?.name ?? '-'}</td>
                    <td>{transfer.reason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel">
        {error ? <div className="error-state">{error}</div> : null}
        {isLoading ? <div className="loading-state">Loading activity timeline...</div> : <ActivityTimeline activities={activities} />}
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
