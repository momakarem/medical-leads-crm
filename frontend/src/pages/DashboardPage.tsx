import { useEffect, useMemo, useState } from 'react';
import { fetchAgentSpeedToContactStats, fetchCurrentUser, fetchDashboardAgentStats, fetchFollowUps, fetchLeads, fetchReports } from '../api/leadsApi';
import { useI18n } from '../i18n/I18nContext';
import type { AgentSpeedToContactStats, AgentStats, CurrentUser, FollowUp, Lead, ReportsQueryParams, ReportsResponse } from '../types';

type RangeOption = 'today' | 'last_7_days' | 'last_30_days' | 'custom' | '';

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

function formatMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0 min';
  return `${formatNumber(value)} min`;
}

function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0.00%';
  return `${value.toFixed(2)}%`;
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfRange(range: RangeOption): string | undefined {
  const date = new Date();
  if (range === 'today') return todayIso();
  if (range === 'last_7_days') date.setDate(date.getDate() - 6);
  else if (range === 'last_30_days') date.setDate(date.getDate() - 29);
  else return undefined;
  return date.toISOString().slice(0, 10);
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function MiniTable({ title, eyebrow, headers, rows, emptyLabel }: { title: string; eyebrow: string; headers: string[]; rows: Array<Array<string | number>>; emptyLabel: string }) {
  return (
    <section className="panel reports-panel">
      <div className="section-heading-row"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>
      <div className="table-wrap">
        <table className="leads-table">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={headers.length} className="empty-cell">{emptyLabel}</td></tr> : rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const dashboardOutcomeStatuses = [
  'no_answer',
  'interested',
  'not_interested',
  'wrong_number',
  'job_seeker',
  'showed_up',
] as const;

function outcomeCount(report: ReportsResponse, status: string): number {
  return report.call_outcome_distribution.find((row) => row.status === status)?.count ?? 0;
}
export function DashboardPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [report, setReport] = useState<ReportsResponse | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [agentSpeedStats, setAgentSpeedStats] = useState<AgentSpeedToContactStats | null>(null);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [range, setRange] = useState<RangeOption>('last_30_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportParams: ReportsQueryParams = useMemo(() => {
    if (range === 'custom') return { start_date: startDate || undefined, end_date: endDate || undefined };
    return { start_date: startOfRange(range), end_date: range ? todayIso() : undefined };
  }, [range, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentUser(controller.signal).then(setCurrentUser).catch(() => setCurrentUser(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    setReport(null);
    setAgentStats(null);
    setAgentSpeedStats(null);

    const dashboardRequest = currentUser.role === 'agent'
      ? Promise.all([
          fetchDashboardAgentStats(reportParams, controller.signal).then((response) => setAgentStats(response[0] ?? null)),
          fetchAgentSpeedToContactStats(reportParams, controller.signal).then((response) => setAgentSpeedStats(response[0] ?? null)),
          fetchLeads({ page: 1, limit: 20, sort: 'created_desc' }, controller.signal).then((response) => setMyLeads(response.data)),
          fetchFollowUps('today', 1, 20, controller.signal).then((response) => setTodayFollowUps(response.data)),
        ])
      : fetchReports(reportParams, controller.signal).then(setReport);

    Promise.all([dashboardRequest])
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('dashboard.loadError'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [currentUser, reportParams]);

  const agentLeadCount = agentStats?.leads ?? myLeads.length;
  const agentBookingRate = agentLeadCount > 0 ? ((agentStats?.bookings ?? 0) / agentLeadCount) * 100 : 0;
  const agentWinRate = agentLeadCount > 0 ? ((agentStats?.payments ?? 0) / agentLeadCount) * 100 : 0;
  const activeMyLeads = myLeads.filter((lead) => !['paid', 'not_interested', 'wrong_number', 'job_seeker'].includes(lead.status)).length;

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('leads.eyebrow')}</p>
          <h1>{currentUser?.role === 'marketing' ? t('dashboard.agency') : currentUser?.role === 'agent' ? t('dashboard.agent') : t('dashboard.management')}</h1>
        </div>
      </header>

      <section className="toolbar dashboard-toolbar" aria-label="Dashboard filters">
        <div className="filters">
          <label className="field"><span>{t('dashboard.dateRange')}</span><select value={range} onChange={(event) => setRange(event.target.value as RangeOption)}><option value="">{t('dashboard.allTime')}</option><option value="today">{t('dashboard.today')}</option><option value="last_7_days">{t('dashboard.last7')}</option><option value="last_30_days">{t('dashboard.last30')}</option><option value="custom">{t('dashboard.customRange')}</option></select></label>
          {range === 'custom' ? <><label className="field"><span>{t('dashboard.startDate')}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span>{t('dashboard.endDate')}</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></> : null}
        </div>
      </section>

      {error ? <div className="error-state">{error}</div> : null}
      {isLoading ? <div className="loading-state">{t('dashboard.loading')}</div> : null}

      {report && !isLoading && currentUser?.role !== 'agent' ? (
        <>
          <section className="panel"><div className="dashboard-cards">
            <MetricCard label={t('dashboard.totalLeads')} value={formatNumber(report.overview.total_leads)} />
            <MetricCard label={t('dashboard.bookedLeads')} value={formatNumber(report.overview.booked_leads)} />
            <MetricCard label={t('dashboard.paidLeads')} value={formatNumber(report.overview.paid_leads)} />
            <MetricCard label={t('dashboard.conversionRate')} value={percent(report.overview.conversion_rate)} />
            <MetricCard label={t('dashboard.avgSpeedFirstContact')} value={formatMinutes(report.overview.average_speed_to_contact_minutes)} />
            <MetricCard label={t('dashboard.contactedLeads')} value={formatNumber(report.overview.contacted_leads)} />
            {dashboardOutcomeStatuses.map((status) => (
              <MetricCard key={status} label={translatedStage(status, t) + ' ' + t('nav.Leads')} value={formatNumber(outcomeCount(report, status))} />
            ))}
          </div></section>

          {currentUser?.role === 'marketing' ? (
            <>
              <MiniTable title={t('reports.leadQualityBySource')} eyebrow={t('dashboard.agencyLabel')} headers={[t('reports.source'), t('nav.Leads'), t('reports.junkRate'), t('reports.convertedRate')]} emptyLabel={t('common.noData')} rows={report.marketing_quality.map((row) => [row.source_channel, row.leads, percent(row.junk_rate), percent(row.converted_rate)])} />
              <MiniTable title={t('dashboard.channelComparison')} eyebrow={t('dashboard.sources')} headers={[t('reports.source'), t('nav.Leads'), t('reports.percentage')]} emptyLabel={t('common.noData')} rows={report.source_breakdown.map((row) => [row.source_channel, row.leads, percent(row.percentage)])} />
              <MiniTable title={t('dashboard.campaignPerformance')} eyebrow={t('dashboard.campaigns')} headers={[t('reports.campaign'), t('reports.source'), t('nav.Leads'), t('status.booked'), t('status.paid'), t('reports.conversion')]} emptyLabel={t('common.noData')} rows={(report.campaign_performance ?? []).map((row) => [row.campaign_name, row.source_channel, row.leads, row.booked, row.paid, percent(row.conversion_rate)])} />
            </>
          ) : (
            <>
              <MiniTable title={t('dashboard.conversionFunnel')} eyebrow={t('dashboard.teamFunnel')} headers={[t('reports.stage'), t('reports.count'), t('reports.conversion')]} emptyLabel={t('common.noData')} rows={report.conversion_funnel.map((row) => [translatedStage(row.stage, t), row.count, row.conversion_from_previous === null ? '-' : percent(row.conversion_from_previous)])} />
              <MiniTable title={t('dashboard.agentRanking')} eyebrow={t('dashboard.callCenter')} headers={[t('reports.agent'), t('nav.Leads'), t('dashboard.bookingRate'), t('dashboard.avgFirstAttempt')]} emptyLabel={t('common.noData')} rows={report.agent_performance.map((row) => [row.agent_name, row.leads_handled, percent(row.booking_rate), formatMinutes(row.average_speed_to_first_action_minutes)])} />
              <MiniTable title={t('dashboard.newLeadsBySource')} eyebrow={t('dashboard.dailyIntake')} headers={[t('reports.source'), t('nav.Leads'), t('reports.share')]} emptyLabel={t('common.noData')} rows={report.source_breakdown.map((row) => [row.source_channel, row.leads, percent(row.percentage)])} />
            </>
          )}
        </>
      ) : null}

      {currentUser?.role === 'agent' && !isLoading && !error ? (
        <>
          <section className="panel"><div className="dashboard-cards">
            <MetricCard label={t('dashboard.assignedLeads')} value={formatNumber(agentLeadCount)} />
            <MetricCard label={t('dashboard.activeLeads')} value={formatNumber(activeMyLeads)} />
            <MetricCard label={t('dashboard.todayFollowups')} value={formatNumber(todayFollowUps.length)} />
            <MetricCard label={t('dashboard.bookingRate')} value={percent(agentBookingRate)} />
            <MetricCard label={t('dashboard.winRate')} value={percent(agentWinRate)} />
            <MetricCard label={t('dashboard.avgFirstAttempt')} value={formatMinutes(agentSpeedStats?.average_speed_to_contact_minutes)} />
          </div></section>
          <MiniTable title={t('dashboard.myAssignedLeads')} eyebrow={t('dashboard.dailyWork')} headers={[t('reports.lead'), t('leads.table.phone'), t('common.status'), t('reports.source')]} emptyLabel={t('common.noData')} rows={myLeads.map((lead) => [lead.name, lead.phone, translatedStage(lead.status, t), lead.sourceChannel])} />
          <MiniTable title={t('dashboard.todayFollowups')} eyebrow={t('dashboard.callbacks')} headers={[t('reports.lead'), t('leads.table.phone'), t('reports.scheduledAt'), t('common.status')]} emptyLabel={t('common.noData')} rows={todayFollowUps.map((item) => [item.lead?.name ?? '-', item.lead?.phone ?? '-', new Date(item.scheduledAt).toLocaleString(), translatedStage(item.status, t)])} />
        </>
      ) : null}
    </main>
  );
}







