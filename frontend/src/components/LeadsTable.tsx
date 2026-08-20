import { useEffect, useState } from 'react';
import { fetchLeadActivities, fetchLeadDuplicateGroup } from '../api/leadsApi';
import { ActivityTimeline } from './ActivityTimeline';
import { useI18n } from '../i18n/I18nContext';
import type { AgentOption, ChangeLeadStatusPayload, Lead, LeadActivity, LeadDuplicateGroupItem, LeadStatus, Treatment, UserRole } from '../types';

export const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  no_answer: 'No Answer',
  follow_up: 'Follow Up',
  interested: 'Interested',
  not_interested: 'Not Interested',
  wrong_number: 'Wrong Number',
  job_seeker: 'Job Seeker',
  booked: 'Booked',
  showed_up: 'Showed Up',
  no_show: 'No Show',
  paid: 'Paid',
};

const statusTranslationKeys: Record<LeadStatus, string> = {
  new: 'status.new',
  no_answer: 'status.no_answer',
  follow_up: 'status.follow_up',
  interested: 'status.interested',
  not_interested: 'status.not_interested',
  wrong_number: 'status.wrong_number',
  job_seeker: 'status.job_seeker',
  booked: 'status.booked',
  showed_up: 'status.showed_up',
  no_show: 'status.no_show',
  paid: 'status.paid',
};

const statusOptions = Object.keys(statusLabels) as LeadStatus[];


function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function shortId(value: string | null | undefined): string {
  if (!value) return '-';
  return `#${value.slice(0, 8)}`;
}
function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function maskPhoneNumber(phone: string): string {
  const value = phone.trim();
  if (value.length <= 5) return 'XXXXX';
  return `${value.slice(0, Math.max(2, value.length - 5))}${'X'.repeat(5)}`;
}

function isDeletedDuplicateItem(item: LeadDuplicateGroupItem): boolean {
  return (item.activities ?? []).some((activity) => {
    const type = String(activity.type ?? '').toLowerCase();
    const title = String(activity.title ?? '').toLowerCase();
    return type === 'lead_deleted' || type === 'deleted' || title === 'lead deleted';
  });
}

function visibleDuplicateGroup(items: LeadDuplicateGroupItem[]): LeadDuplicateGroupItem[] {
  return items.filter((item) => !isDeletedDuplicateItem(item));
}

interface TransferState {
  lead: Lead;
  newAgentId: string;
  reason: string;
}

interface StatusState {
  lead: Lead;
  status: LeadStatus;
  note: string;
  followUpDate: string;
  followUpTime: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentTreatmentId: string;
}

interface FollowUpState {
  lead: Lead;
  date: string;
  time: string;
  note: string;
}

interface LeadsTableProps {
  leads: Lead[];
  agents: AgentOption[];
  treatments: Treatment[];
  canManageAssignments: boolean;
  canClaimAvailable?: boolean;
  currentUserRole?: UserRole | null;
  canEditLeads?: boolean;
  canDeleteLeads?: boolean;
  selectedLeadIds?: string[];
  onToggleLeadSelection?: (leadId: string, selected: boolean) => void;
  assignmentBusyId?: string;
  actionBusyId?: string;
  onAssign: (leadId: string, agentId: string) => void;
  onUnassign: (leadId: string) => void;
  onTransfer: (leadId: string, newAgentId: string, reason?: string) => void;
  onClaim?: (leadId: string) => void;
  onChangeStatus: (leadId: string, status: LeadStatus, note?: string, extra?: Partial<ChangeLeadStatusPayload>) => void;
  onCreateFollowUp: (leadId: string, date: string, time: string, note?: string) => void;
  onStartCall?: (leadId: string) => void;
  onEndCall?: (leadId: string) => void;
  onEditLead?: (lead: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
}

function buildStatusState(lead: Lead, status: LeadStatus): StatusState {
  return {
    lead,
    status,
    note: '',
    followUpDate: '',
    followUpTime: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentTreatmentId: lead.treatmentId ?? '',
  };
}

export function LeadsTable({
  leads,
  agents,
  treatments,
  canManageAssignments,
  canClaimAvailable = false,
  currentUserRole,
  canEditLeads = false,
  canDeleteLeads = false,
  selectedLeadIds = [],
  onToggleLeadSelection,
  assignmentBusyId,
  actionBusyId,
  onAssign,
  onUnassign,
  onTransfer,
  onClaim,
  onChangeStatus,
  onCreateFollowUp,
  onStartCall,
  onEndCall,
  onEditLead,
  onDeleteLead,
}: LeadsTableProps) {
  const { t } = useI18n();
  const [selectedAgents, setSelectedAgents] = useState<Record<string, string>>({});
  const [transferState, setTransferState] = useState<TransferState | null>(null);
  const [statusState, setStatusState] = useState<StatusState | null>(null);
  const [followUpState, setFollowUpState] = useState<FollowUpState | null>(null);
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  const [timelineSubject, setTimelineSubject] = useState<{ id: string; name: string; phone: string; status: LeadStatus; createdAt: string; ownerAgent?: { id: string; name: string } | null } | null>(null);
  const [timelineActivities, setTimelineActivities] = useState<LeadActivity[]>([]);
  const [timelineDuplicateGroup, setTimelineDuplicateGroup] = useState<LeadDuplicateGroupItem[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  function recordContactAttempt(leadId: string): void {
    onStartCall?.(leadId);
  }

  async function openTimeline(lead: Lead): Promise<void> {
    setTimelineLead(lead);
    setTimelineSubject({ id: lead.id, name: lead.name, phone: lead.phone, status: lead.status, createdAt: lead.createdAt, ownerAgent: lead.ownerAgent });
    setTimelineActivities([]);
    setTimelineDuplicateGroup([]);
    setTimelineError(null);
    setIsTimelineLoading(true);

    try {
      const [activitiesResponse, duplicateGroup] = await Promise.all([
        fetchLeadActivities(lead.id, 1, 50),
        fetchLeadDuplicateGroup(lead.id),
      ]);
      setTimelineActivities(activitiesResponse.data);
      setTimelineDuplicateGroup(visibleDuplicateGroup(duplicateGroup));
    } catch {
      setTimelineError(t('leads.timeline.loadError'));
    } finally {
      setIsTimelineLoading(false);
    }
  }

  function selectDuplicateTimeline(item: LeadDuplicateGroupItem): void {
    setTimelineSubject(item.lead);
    setTimelineActivities(item.activities);
  }

  function closeTimeline(): void {
    setTimelineLead(null);
    setTimelineSubject(null);
    setTimelineDuplicateGroup([]);
  }

  useEffect(() => {
    setSelectedAgents(
      leads.reduce<Record<string, string>>((accumulator, lead) => {
        accumulator[lead.id] = lead.ownerAgentId ?? '';
        return accumulator;
      }, {}),
    );
  }, [leads]);

  if (leads.length === 0) {
    return <div className="empty-state">{t('leads.table.noLeads')}</div>;
  }

  function submitStatusChange(): void {
    if (!statusState) return;
    const extra: Partial<ChangeLeadStatusPayload> = {};

    if (statusState.status === 'no_answer') {
      extra.follow_up_date = statusState.followUpDate;
      extra.follow_up_time = statusState.followUpTime;
    }

    if (statusState.status === 'booked') {
      extra.appointment_date = statusState.appointmentDate;
      extra.appointment_time = statusState.appointmentTime;
      extra.appointment_treatment_id = statusState.appointmentTreatmentId || undefined;
    }

    onChangeStatus(statusState.lead.id, statusState.status, statusState.note.trim() || undefined, extra);
    setStatusState(null);
  }

  return (
    <>
      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              {canManageAssignments ? <th>{t('leads.table.select')}</th> : null}
              <th>{t('leads.table.name')}</th>
              <th>{t('leads.table.phone')}</th>
              <th>{t('leads.table.contact')}</th>
              <th>{t('leads.table.treatment')}</th>
              <th>{t('leads.table.status')}</th>
              <th>{t('leads.table.callOutcome')}</th>
              <th>{t('leads.table.quickActions')}</th>
              <th>{t('leads.table.sourceChannel')}</th>
              <th>{t('leads.table.adName')}</th>
              <th>{t('leads.table.followUpAttempts')}</th>
              <th>{t('leads.table.ownerAgent')}</th>
              <th>{t('leads.table.createdDate')}</th>
              {canEditLeads || canDeleteLeads ? <th>{t('common.actions')}</th> : null}
              {canManageAssignments ? <th>{t('leads.table.assignment')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const selectedAgent = selectedAgents[lead.id] ?? '';
              const isBusy = assignmentBusyId === lead.id;
              const isActionBusy = actionBusyId === lead.id;
              const canClaim = canClaimAvailable && !lead.ownerAgentId;
              const isMaskedPhone = currentUserRole === 'agent' && !lead.firstActionAt;
              const displayedPhone = isMaskedPhone ? maskPhoneNumber(lead.phone) : lead.phone;

              return (
                <tr key={lead.id} className="lead-row">
                  {canManageAssignments ? (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={(event) => onToggleLeadSelection?.(lead.id, event.target.checked)}
                      />
                    </td>
                  ) : null}
                  <td className="lead-primary-cell">
                    <strong>{lead.name}</strong>{' '}
                    {(lead.isDuplicate || (lead.duplicateCount ?? 0) > 0) ? (
                      <button type="button" className="duplicate-badge duplicate-badge-button" onClick={() => void openTimeline(lead)} title={t('leads.table.duplicate')}>
                        {t('leads.table.duplicate')}
                      </button>
                    ) : null}
                  </td>
                  <td className="mono lead-phone-cell" title={isMaskedPhone ? t('leads.phoneMasked') : lead.phone}>{displayedPhone}</td>
                  <td className="lead-contact-cell">
                    <div className="row-actions compact-actions">
                      <a className="action-link" href={`tel:${lead.phone}`} onClick={() => recordContactAttempt(lead.id)}>{t('leads.actions.call')}</a>
                      <a className="action-link" href={whatsappUrl(lead.phone)} target="_blank" rel="noreferrer" onClick={() => recordContactAttempt(lead.id)}>{t('leads.actions.whatsapp')}</a>
                    </div>
                    <div className="lead-call-presence">
                      {lead.activeCallSession ? (
                        <>
                          <span className="live-call-badge">? {t('leads.call.onCallNow')} · {lead.activeCallSession.agentName}</span>
                          <button type="button" disabled={isActionBusy} onClick={() => onEndCall?.(lead.id)}>{t('leads.call.end')}</button>
                        </>
                      ) : (
                        null
                      )}
                    </div>
                  </td>
                  <td className="lead-treatment-cell">{lead.treatment?.name ?? '-'}</td>
                  <td><span className="status-pill">{t(statusTranslationKeys[lead.status])}</span></td>
                  <td>
                    <div className="row-actions compact-actions outcome-actions">
                      <button className="outcome-chip outcome-chip--muted" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'new')}>{t('status.new')}</button>
                      <button className="outcome-chip outcome-chip--warning" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'no_answer')}>{t('status.no_answer')}</button>
                      <button className="outcome-chip outcome-chip--warning" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'follow_up')}>{t('status.follow_up')}</button>
                      <button className="outcome-chip outcome-chip--success" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'interested')}>{t('status.interested')}</button>
                      <button className="outcome-chip outcome-chip--danger" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'not_interested')}>{t('status.not_interested')}</button>
                      <button className="outcome-chip outcome-chip--muted" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'wrong_number')}>{t('status.wrong_number')}</button>
                      <button className="outcome-chip outcome-chip--muted" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'job_seeker')}>{t('status.job_seeker')}</button>
                      <button className="outcome-chip outcome-chip--primary" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'booked')}>{t('status.booked')}</button>
                      <button className="outcome-chip outcome-chip--primary" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'showed_up')}>{t('status.showed_up')}</button>
                      <button className="outcome-chip outcome-chip--danger" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'no_show')}>{t('status.no_show')}</button>
                      <button className="outcome-chip outcome-chip--success" type="button" disabled={isActionBusy} onClick={() => onChangeStatus(lead.id, 'paid')}>{t('status.paid')}</button>
                      <button className="outcome-chip outcome-chip--more" type="button" disabled={isActionBusy} onClick={() => setStatusState(buildStatusState(lead, lead.status))}>{t('leads.actions.more')}</button>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions compact-actions">
                      {canClaim ? (
                        <button type="button" disabled={isBusy} onClick={() => onClaim?.(lead.id)}>{t('leads.actions.claim')}</button>
                      ) : (
                        <>
                          <button type="button" disabled={isActionBusy} onClick={() => setFollowUpState({ lead, date: '', time: '', note: '' })}>{t('leads.actions.followUp')}</button>
                          <button type="button" onClick={() => void openTimeline(lead)}>{t('leads.actions.timeline')}</button>
                        </>
                      )}
                    </div>
                  </td>
                  <td>{lead.sourceChannel}</td>
                  <td>{lead.adName ?? '-'}</td>
                  <td><span className="metric-chip">{lead.followUpAttemptsCount ?? 0}</span></td>
                  <td>{lead.ownerAgent?.name ?? '-'}</td>
                  <td>{formatDate(lead.arrivalTimestamp ?? lead.createdAt)}</td>
                  {canEditLeads || canDeleteLeads ? (
                    <td>
                      <div className="row-actions compact-actions">
                        {canEditLeads ? <button type="button" onClick={() => onEditLead?.(lead)}>{t('common.edit')}</button> : null}
                        {canDeleteLeads ? <button type="button" onClick={() => onDeleteLead?.(lead)}>{t('common.delete')}</button> : null}
                      </div>
                    </td>
                  ) : null}
                  {canManageAssignments ? (
                    <td>
                      <div className="assignment-controls">
                        <select
                          value={selectedAgent}
                          disabled={isBusy}
                          onChange={(event) => {
                            const nextAgentId = event.target.value;
                            setSelectedAgents((current) => ({ ...current, [lead.id]: nextAgentId }));
                            if (nextAgentId && nextAgentId !== (lead.ownerAgentId ?? '')) {
                              onAssign(lead.id, nextAgentId);
                            } else if (!nextAgentId && lead.ownerAgentId) {
                              onUnassign(lead.id);
                            }
                          }}
                        >
                          <option value="">{t('leads.keepUnassigned')}</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                        </select>
                        <button type="button" disabled={!lead.ownerAgentId || isBusy} onClick={() => onUnassign(lead.id)}>
                          {t('leads.assignment.unassign')}
                        </button>
                        <button type="button" disabled={isBusy} onClick={() => setTransferState({ lead, newAgentId: '', reason: '' })}>
                          {t('leads.assignment.transfer')}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {statusState ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('leads.status.changeTitle')}>
          <div className="modal-card">
            <h2>{t('leads.status.changeTitle')}</h2>
            <p className="subtle">{t('leads.status.updateFor')} {statusState.lead.name}.</p>
            <label className="field">
              <span>{t('leads.table.status')}</span>
              <select value={statusState.status} onChange={(event) => setStatusState((current) => current ? { ...current, status: event.target.value as LeadStatus } : current)}>
                {statusOptions.map((value) => <option key={value} value={value}>{t(statusTranslationKeys[value])}</option>)}
              </select>
            </label>
            {statusState.status === 'no_answer' ? (
              <>
                <label className="field"><span>{t('leads.followUp.callbackDate')}</span><input type="date" value={statusState.followUpDate} onChange={(event) => setStatusState((current) => current ? { ...current, followUpDate: event.target.value } : current)} /></label>
                <label className="field"><span>{t('leads.followUp.callbackTime')}</span><input type="time" value={statusState.followUpTime} onChange={(event) => setStatusState((current) => current ? { ...current, followUpTime: event.target.value } : current)} /></label>
              </>
            ) : null}
            {statusState.status === 'booked' ? (
              <>
                <label className="field"><span>{t('leads.appointment.date')}</span><input type="date" value={statusState.appointmentDate} onChange={(event) => setStatusState((current) => current ? { ...current, appointmentDate: event.target.value } : current)} /></label>
                <label className="field"><span>{t('leads.appointment.time')}</span><input type="time" value={statusState.appointmentTime} onChange={(event) => setStatusState((current) => current ? { ...current, appointmentTime: event.target.value } : current)} /></label>
                <label className="field">
                  <span>{t('leads.appointment.treatment')}</span>
                  <select value={statusState.appointmentTreatmentId} onChange={(event) => setStatusState((current) => current ? { ...current, appointmentTreatmentId: event.target.value } : current)}>
                    <option value="">{t('leads.noTreatment')}</option>
                    {treatments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              </>
            ) : null}
            <label className="field">
              <span>{t('leads.status.callNote')}</span>
              <textarea value={statusState.note} maxLength={500} onChange={(event) => setStatusState((current) => current ? { ...current, note: event.target.value } : current)} />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setStatusState(null)}>{t('common.cancel')}</button>
              <button
                type="button"
                disabled={
                  actionBusyId === statusState.lead.id
                }
                onClick={submitStatusChange}
              >
                {t('leads.status.saveStatus')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {followUpState ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('leads.followUp.scheduleTitle')}>
          <div className="modal-card">
            <h2>{t('leads.followUp.scheduleTitle')}</h2>
            <p className="subtle">{t('leads.followUp.scheduleFor')} {followUpState.lead.name}.</p>
            <label className="field"><span>{t('common.date')}</span><input type="date" value={followUpState.date} onChange={(event) => setFollowUpState((current) => current ? { ...current, date: event.target.value } : current)} /></label>
            <label className="field"><span>{t('common.time')}</span><input type="time" value={followUpState.time} onChange={(event) => setFollowUpState((current) => current ? { ...current, time: event.target.value } : current)} /></label>
            <label className="field"><span>{t('common.note')}</span><textarea value={followUpState.note} maxLength={500} onChange={(event) => setFollowUpState((current) => current ? { ...current, note: event.target.value } : current)} /></label>
            <div className="modal-actions">
              <button type="button" onClick={() => setFollowUpState(null)}>{t('common.cancel')}</button>
              <button type="button" disabled={!followUpState.date || !followUpState.time || actionBusyId === followUpState.lead.id} onClick={() => { onCreateFollowUp(followUpState.lead.id, followUpState.date, followUpState.time, followUpState.note.trim() || undefined); setFollowUpState(null); }}>{t('leads.followUp.schedule')}</button>
            </div>
          </div>
        </div>
      ) : null}

      {timelineLead ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('leads.timeline.title')}>
          <div className="modal-card timeline-modal">
            <div className="modal-header-row">
              <div>
                <p className="eyebrow">{t('leads.timeline.eyebrow')}</p>
                <h2>{t('leads.timeline.title')}</h2>
                <p className="subtle">{timelineSubject?.name ?? timelineLead.name} · {timelineSubject?.phone ?? timelineLead.phone}</p>
                {timelineSubject?.ownerAgent ? (
              <p className="subtle">
                {t('leads.timeline.agent')}: {timelineSubject.ownerAgent.name} · {t('leads.timeline.status')}:{' '}
                {t(statusTranslationKeys[timelineSubject.status])}
              </p>
            ) : null}
              </div>
              <button type="button" className="modal-close-button" onClick={closeTimeline} aria-label={t('common.cancel')}>×</button>
            </div>
            {timelineDuplicateGroup.length > 1 ? (
              <div className="duplicate-summary-card">
                <strong>{t('leads.timeline.duplicateHistory')}</strong>
                <p>{t('leads.timeline.duplicateHelp')}</p>
                <div className="duplicate-tabs">
                  {timelineDuplicateGroup.map((item) => (
                    <button
                      type="button"
                      key={item.lead.id}
                      className={`duplicate-tab-button ${timelineSubject?.id === item.lead.id ? 'is-active' : ''}`}
                      onClick={() => selectDuplicateTimeline(item)}
                    >
                      <strong>{item.lead.name}</strong>
                      <small>{t(statusTranslationKeys[item.lead.status])} · {item.lead.ownerAgent?.name ?? '-'}</small>
                      <small>{formatDate(item.lead.createdAt)}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {isTimelineLoading ? <div className="loading-state">{t('leads.timeline.loading')}</div> : null}
            {timelineError ? <div className="error-state">{timelineError}</div> : null}
            {!isTimelineLoading && !timelineError ? <ActivityTimeline activities={timelineActivities} /> : null}
            <div className="modal-actions">
              <button type="button" onClick={closeTimeline}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      ) : null}      {transferState ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('leads.transfer.title')}>
          <div className="modal-card">
            <h2>{t('leads.transfer.title')}</h2>
            <p className="subtle">{t('leads.transfer.transferFor')} {transferState.lead.name} {t('leads.transfer.toAnotherAgent')}.</p>
            <label className="field">
              <span>{t('leads.assignment.selectAgent')}</span>
              <select value={transferState.newAgentId} onChange={(event) => setTransferState((current) => current ? { ...current, newAgentId: event.target.value } : current)}>
                <option value="">{t('leads.assignment.selectAgent')}</option>
                {agents.filter((agent) => agent.id !== transferState.lead.ownerAgentId).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
            <label className="field"><span>{t('leads.transfer.reason')}</span><textarea value={transferState.reason} maxLength={500} onChange={(event) => setTransferState((current) => current ? { ...current, reason: event.target.value } : current)} /></label>
            <div className="modal-actions">
              <button type="button" onClick={() => setTransferState(null)}>{t('common.cancel')}</button>
              <button type="button" disabled={!transferState.newAgentId || assignmentBusyId === transferState.lead.id} onClick={() => { onTransfer(transferState.lead.id, transferState.newAgentId, transferState.reason.trim() || undefined); setTransferState(null); }}>{t('leads.assignment.transfer')}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}























