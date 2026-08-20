import { useEffect, useMemo, useState } from 'react';
import { exportReports, fetchAgents, fetchReports, fetchTreatments } from '../../../api/leadsApi';
import { PageHeader } from '../../../components/layout/PageHeader/PageHeader';
import { Button } from '../../../components/ui/Button/Button';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import { useI18n } from '../../../i18n/I18nContext';
import type { AgentOption, ReportsExportFormat, ReportsExportType, ReportsQueryParams, ReportsResponse, Treatment } from '../../../types';

const sources = ['Meta', 'TikTok', 'Snapchat', 'Google', 'WhatsApp', 'Direct Call', 'Instagram DM', 'Walk-in', 'Referral', 'Other'];

function numberValue(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat().format(value);
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function translatedStage(value: string, t: (key: string, fallback?: string) => string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const keyByStage: Record<string, string> = {
    new: 'status.new',
    no_answer: 'status.no_answer',
    follow_up: 'status.follow_up',
    contacted: 'reports.contacted',
    interested: 'status.interested',
    not_interested: 'status.not_interested',
    booked: 'status.booked',
    showed_up: 'status.showed_up',
    paid: 'status.paid',
    wrong_number: 'status.wrong_number',
    job_seeker: 'status.job_seeker',
    no_show: 'status.no_show',
  };
  const key = keyByStage[normalized];
  return key ? t(key, value) : value;
}

export function ReportsPage() {
  const { t } = useI18n();
  const [report, setReport] = useState<ReportsResponse | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [filters, setFilters] = useState<ReportsQueryParams>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useMemo(() => filters, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAgents(controller.signal).then(setAgents).catch(() => setAgents([]));
    fetchTreatments(controller.signal).then(setTreatments).catch(() => setTreatments([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchReports(params, controller.signal)
      .then(setReport)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('reports.loadError'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [params, t]);

  async function handleExport(format: ReportsExportFormat, type: ReportsExportType): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportReports({ ...filters, format, type });
      download(result.blob, result.filename);
    } catch {
      setError(t('reports.exportError'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('nav.Reports')}
        actions={
          <div className="header-actions">
            <Button onClick={() => void handleExport('xlsx', 'all')} isLoading={isExporting}>{t('leads.exportExcel')}</Button>
            <Button onClick={() => void handleExport('csv', 'all')} isLoading={isExporting}>{t('leads.exportCsv')}</Button>
          </div>
        }
      />

      <section className="toolbar report-filters" aria-label={t('reports.filters')}>
        <label className="field"><span>{t('reports.fromDate')}</span><input type="date" value={filters.start_date ?? ''} onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value || undefined }))} /></label>
        <label className="field"><span>{t('reports.toDate')}</span><input type="date" value={filters.end_date ?? ''} onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value || undefined }))} /></label>
        <label className="field"><span>{t('reports.agent')}</span><select value={filters.agent_id ?? ''} onChange={(event) => setFilters((current) => ({ ...current, agent_id: event.target.value || undefined }))}><option value="">{t('filters.allAgents')}</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
        <label className="field"><span>{t('reports.treatment')}</span><select value={filters.treatment_id ?? ''} onChange={(event) => setFilters((current) => ({ ...current, treatment_id: event.target.value || undefined }))}><option value="">{t('filters.allTreatments')}</option>{treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{treatment.name}</option>)}</select></label>
        <label className="field"><span>{t('leads.sourceChannel')}</span><select value={filters.source_channel ?? ''} onChange={(event) => setFilters((current) => ({ ...current, source_channel: event.target.value || undefined }))}><option value="">{t('filters.allSources')}</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {isLoading ? <LoadingSpinner label={t('reports.loading')} /> : null}

      {report && !isLoading ? (
        <>
          <section className="panel">
            <div className="dashboard-cards">
              <article className="metric-card"><span>{t('dashboard.totalLeads')}</span><strong>{numberValue(report.overview.total_leads)}</strong></article>
              <article className="metric-card"><span>{t('reports.contacted')}</span><strong>{numberValue(report.overview.contacted_leads)}</strong></article>
              <article className="metric-card"><span>{t('status.booked')}</span><strong>{numberValue(report.overview.booked_leads)}</strong></article>
              <article className="metric-card"><span>{t('status.paid')}</span><strong>{numberValue(report.overview.paid_leads)}</strong></article>
              <article className="metric-card"><span>{t('dashboard.conversionRate')}</span><strong>{percent(report.overview.conversion_rate)}</strong></article>
              <article className="metric-card"><span>{t('reports.avgSpeedToContact')}</span><strong>{numberValue(report.overview.average_speed_to_contact_minutes)} min</strong></article>
            </div>
          </section>

          <section className="panel reports-panel">
            <div className="section-heading-row"><div><p className="eyebrow">{t('reports.hospitalManagement')}</p><h2>{t('reports.agentPerformance')}</h2></div><Button onClick={() => void handleExport('xlsx', 'management')} isLoading={isExporting}>{t('reports.exportManagement')}</Button></div>
            <div className="table-wrap"><table className="leads-table"><thead><tr><th>{t('reports.agent')}</th><th>{t('reports.leadsHandled')}</th><th>{t('dashboard.bookingRate')}</th><th>{t('reports.showUpRate')}</th><th>{t('dashboard.winRate')}</th><th>{t('dashboard.avgFirstAttempt')}</th><th>{t('reports.avgFollowups')}</th><th>{t('reports.activityToday')}</th><th>{t('reports.noAnswerRate')}</th></tr></thead><tbody>{report.agent_performance.map((row) => <tr key={row.agent_id ?? 'unassigned'}><td>{row.agent_name}</td><td>{row.leads_handled}</td><td>{percent(row.booking_rate)}</td><td>{percent(row.show_up_rate)}</td><td>{percent(row.win_rate)}</td><td>{numberValue(row.average_speed_to_first_action_minutes)} min</td><td>{numberValue(row.average_follow_ups_per_lead)}</td><td>{row.activity_volume_today}</td><td>{percent(row.no_answer_rate)}</td></tr>)}</tbody></table></div>
          </section>

          <section className="panel reports-panel">
            <div className="section-heading-row"><div><p className="eyebrow">{t('reports.conversion')}</p><h2>{t('dashboard.conversionFunnel')}</h2></div></div>
            <div className="table-wrap"><table className="leads-table"><thead><tr><th>{t('reports.stage')}</th><th>{t('reports.count')}</th><th>{t('reports.conversionFromPrevious')}</th></tr></thead><tbody>{report.conversion_funnel.map((row) => <tr key={row.stage}><td>{translatedStage(row.stage, t)}</td><td>{row.count}</td><td>{row.conversion_from_previous === null ? '-' : percent(row.conversion_from_previous)}</td></tr>)}</tbody></table></div>
          </section>

          <section className="panel reports-panel">
            <div className="section-heading-row"><div><p className="eyebrow">{t('reports.leadSources')}</p><h2>{t('reports.leadsBySourceChannel')}</h2></div></div>
            <div className="table-wrap"><table className="leads-table"><thead><tr><th>{t('reports.source')}</th><th>{t('nav.Leads')}</th><th>{t('reports.percentage')}</th></tr></thead><tbody>{report.source_breakdown.map((row) => <tr key={row.source_channel}><td>{row.source_channel}</td><td>{row.leads}</td><td>{percent(row.percentage)}</td></tr>)}</tbody></table></div>
          </section>

          <section className="panel reports-panel">
            <div className="section-heading-row"><div><p className="eyebrow">{t('reports.medicalDemand')}</p><h2>{t('reports.leadsByTreatment')}</h2></div></div>
            <div className="table-wrap"><table className="leads-table"><thead><tr><th>{t('leads.treatment')}</th><th>{t('nav.Leads')}</th><th>{t('reports.percentage')}</th></tr></thead><tbody>{report.treatment_breakdown.map((row) => <tr key={row.treatment_id ?? 'none'}><td>{row.treatment_name}</td><td>{row.leads}</td><td>{percent(row.percentage)}</td></tr>)}</tbody></table></div>
          </section>

          <section className="panel reports-panel">
            <div className="section-heading-row"><div><p className="eyebrow">{t('reports.callOutcomes')}</p><h2>{t('reports.callResultDistribution')}</h2></div></div>
            <div className="table-wrap"><table className="leads-table"><thead><tr><th>{t('reports.outcome')}</th><th>{t('reports.count')}</th><th>{t('reports.percentage')}</th></tr></thead><tbody>{report.call_outcome_distribution.map((row) => <tr key={row.status}><td>{translatedStage(row.status || row.label, t)}</td><td>{row.count}</td><td>{percent(row.percentage)}</td></tr>)}</tbody></table></div>
          </section>

          <section className="panel reports-panel">
            <div className="section-heading-row"><div><p className="eyebrow">{t('reports.marketingAgency')}</p><h2>{t('reports.leadQualityBySource')}</h2></div><Button onClick={() => void handleExport('csv', 'marketing')} isLoading={isExporting}>{t('reports.exportMarketingCsv')}</Button></div>
            <div className="table-wrap"><table className="leads-table"><thead><tr><th>{t('reports.source')}</th><th>{t('nav.Leads')}</th><th>{t('reports.junkLeads')}</th><th>{t('reports.converted')}</th><th>{t('status.booked')}</th><th>{t('reports.duplicates')}</th><th>{t('reports.junkRate')}</th><th>{t('reports.convertedRate')}</th><th>{t('reports.duplicateRate')}</th></tr></thead><tbody>{report.marketing_quality.map((row) => <tr key={row.source_channel}><td>{row.source_channel}</td><td>{row.leads}</td><td>{row.junk_leads}</td><td>{row.paid}</td><td>{row.booked}</td><td>{row.duplicates}</td><td>{percent(row.junk_rate)}</td><td>{percent(row.converted_rate)}</td><td>{percent(row.duplicate_rate)}</td></tr>)}</tbody></table></div>
          </section>
        </>
      ) : null}
    </main>
  );
}

