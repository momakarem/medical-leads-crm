import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  assignLead,
  bulkAssignLeads,
  changeLeadStatus,
  claimLead,
  createLead,
  updateLead,
  deleteLead,
  createLeadFollowUp,
  exportLeads,
  fetchAgents,
  fetchAvailableLeads,
  fetchCurrentUser,
  fetchLeads,
  fetchTreatments,
  startLeadCall,
  endLeadCall,
  transferLead,
  unassignLead,
} from '../api/leadsApi';
import { LeadFilters } from '../components/LeadFilters';
import { LeadSearchInput } from '../components/LeadSearchInput';
import { LeadsTable } from '../components/LeadsTable';
import { PaginationControls } from '../components/PaginationControls';
import { Button } from '../components/ui/Button/Button';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { hasPermission } from '../config/permissions.config';
import { useI18n } from '../i18n/I18nContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AgentOption, ChangeLeadStatusPayload, CreateLeadPayload, CurrentUser, Lead, LeadSort, LeadStatus, Treatment } from '../types';

const manualSources = [
  'Meta Manual',
  'TikTok Manual',
  'Snapchat Manual',
  'Google Manual',
  'WhatsApp Manual',
  'Direct Call Manual',
  'Instagram DM Manual',
  'Walk-in Manual',
  'Referral Manual',
  'Other Manual',
];

const emptyLeadForm: CreateLeadPayload = {
  name: '',
  phone: '',
  sourceChannel: 'Direct Call Manual',
  campaignName: '',
  adName: '',
  note: '',
  treatmentId: '',
  ownerAgentId: '',
  status: 'new',
};

function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  return /^\+?\d{7,25}$/.test(trimmed);
}

function validateLeadForm(payload: CreateLeadPayload, translate: (key: string, fallback?: string) => string): string | null {
  if (!payload.name.trim()) return translate('leads.validation.nameRequired');
  if (!payload.phone.trim()) return translate('leads.validation.phoneRequired');
  if (!isValidPhoneNumber(payload.phone)) return translate('leads.validation.phoneInvalid');
  if (!payload.sourceChannel.trim()) return translate('leads.validation.sourceRequired');
  if (!payload.treatmentId) return translate('leads.validation.treatmentRequired');
  return null;
}
export function LeadsListPage() {
  const { t } = useI18n();
  const message = (key: string, replacements?: Record<string, string | number>) => {
    let value = t(key);
    Object.entries(replacements ?? {}).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, String(replacement));
    });
    return value;
  };
  const clearFieldMessage = (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
    event.currentTarget.setCustomValidity('');
  };
  const [leads, setLeads] = useState<Lead[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [treatment, setTreatment] = useState('');
  const [source, setSource] = useState('');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [sort, setSort] = useState<LeadSort>('created_desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [queryTimeMs, setQueryTimeMs] = useState<number | undefined>();
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assignmentBusyId, setAssignmentBusyId] = useState<string | undefined>();
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkTreatmentId, setBulkTreatmentId] = useState('');
  const [bulkSourceChannel, setBulkSourceChannel] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leadForm, setLeadForm] = useState<CreateLeadPayload>(emptyLeadForm);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editLeadForm, setEditLeadForm] = useState<CreateLeadPayload>(emptyLeadForm);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const canManageAssignments = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canAdminLeadMutations = currentUser?.role === 'admin';
  const canUseAvailablePool = currentUser?.role === 'agent';
  const canExportLeads = hasPermission(currentUser?.role, 'leads.export');
  const [leadView, setLeadView] = useState<'owned' | 'available'>('owned');

  const params = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: status || undefined,
      treatment: treatment || undefined,
      source: source || undefined,
      assignedAgent: canManageAssignments && assignedAgent ? assignedAgent : undefined,
      duplicatesOnly: duplicatesOnly || undefined,
      sort,
    }),
    [page, limit, debouncedSearch, status, treatment, source, assignedAgent, duplicatesOnly, canManageAssignments, sort],
  );

  function loadLeads(signal?: AbortSignal, options: { silent?: boolean } = {}): void {
    if (options.silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setError(null);
    }
    const loader = canUseAvailablePool && leadView === 'available' ? fetchAvailableLeads : fetchLeads;
    loader(params, signal)
      .then((response) => {
        setLeads(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
        setQueryTimeMs(response.meta.queryTimeMs);
        setLastSyncedAt(new Date());
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError' && !options.silent) setError('Could not load leads. Please try again.');
      })
      .finally(() => {
        if (!signal?.aborted) {
          if (options.silent) setIsRefreshing(false);
          else setIsLoading(false);
        }
      });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchTreatments(controller.signal)
      .then(setTreatments)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setTreatments([]);
      });

    fetchCurrentUser(controller.signal)
      .then((user) => {
        setCurrentUser(user);
        if (user.role === 'admin' || user.role === 'manager') return fetchAgents(controller.signal).then(setAgents);
        setAgents([]);
        return undefined;
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') {
          setCurrentUser(null);
          setAgents([]);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadLeads(controller.signal);
    return () => controller.abort();
  }, [params, canUseAvailablePool, leadView]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const controller = new AbortController();
      loadLeads(controller.signal, { silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [params, canUseAvailablePool, leadView]);

  function resetToFirstPage(callback: () => void): void {
    callback();
    setPage(1);
  }

  function updateLeadInList(updatedLead: Lead): void {
    setLeads((current) => current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
  }

  function openCreateLead(): void {
    setLeadForm(emptyLeadForm);
    setError(null);
    setSuccess(null);
    setIsCreateOpen(true);
  }

  async function handleCreateLead(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationError = validateLeadForm(leadForm, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSavingLead(true);
    setError(null);
    setSuccess(null);
    try {
      await createLead({
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        sourceChannel: leadForm.sourceChannel.trim(),
        campaignName: leadForm.campaignName?.trim() || undefined,
        adName: leadForm.adName?.trim() || undefined,
        note: leadForm.note?.trim() || undefined,
        treatmentId: leadForm.treatmentId,
        ownerAgentId: canManageAssignments && leadForm.ownerAgentId ? leadForm.ownerAgentId : undefined,
        status: leadForm.status || 'new',
      });
      setIsCreateOpen(false);
      setSuccess(t('leads.messages.created'));
      setPage(1);
      loadLeads();
    } catch {
      setError(t('leads.messages.createError'));
    } finally {
      setIsSavingLead(false);
    }
  }

  function openEditLead(lead: Lead): void {
    setEditingLead(lead);
    setEditLeadForm({
      name: lead.name,
      phone: lead.phone,
      sourceChannel: lead.sourceChannel,
      campaignName: lead.campaignName ?? '',
      adName: lead.adName ?? '',
      note: '',
      treatmentId: lead.treatmentId ?? '',
      ownerAgentId: lead.ownerAgentId ?? '',
      status: lead.status,
    });
    setError(null);
    setSuccess(null);
  }

  async function handleUpdateLead(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editingLead) return;
    const validationError = validateLeadForm(editLeadForm, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSavingLead(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedLead = await updateLead(editingLead.id, {
        name: editLeadForm.name.trim(),
        phone: editLeadForm.phone.trim(),
        sourceChannel: editLeadForm.sourceChannel.trim(),
        campaignName: editLeadForm.campaignName?.trim() || undefined,
        adName: editLeadForm.adName?.trim() || undefined,
        treatmentId: editLeadForm.treatmentId,
        ownerAgentId: canManageAssignments && editLeadForm.ownerAgentId ? editLeadForm.ownerAgentId : undefined,
      });
      updateLeadInList(updatedLead);
      setEditingLead(null);
      setSuccess(t('leads.messages.updated'));
    } catch {
      setError(t('leads.messages.updateError'));
    } finally {
      setIsSavingLead(false);
    }
  }

  async function handleDeleteLead(lead: Lead): Promise<void> {
    if (!window.confirm(message('leads.messages.deleteConfirm', { name: lead.name }))) return;
    setActionBusyId(lead.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteLead(lead.id);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setSelectedLeadIds((current) => current.filter((id) => id !== lead.id));
      setSuccess(t('leads.messages.deleted'));
      loadLeads();
    } catch {
      setError(t('leads.messages.deleteError'));
    } finally {
      setActionBusyId(undefined);
    }
  }
  async function handleAssign(leadId: string, agentId: string): Promise<void> {
    setAssignmentBusyId(leadId);
    setAssignmentError(null);
    try {
      const updatedLead = await assignLead(leadId, agentId);
      updateLeadInList(updatedLead);
      setSuccess('Lead assigned successfully.');
    } catch {
      setAssignmentError(t('leads.messages.assignError'));
    } finally {
      setAssignmentBusyId(undefined);
    }
  }

  async function handleClaimLead(leadId: string): Promise<void> {
    setAssignmentBusyId(leadId);
    setAssignmentError(null);
    setSuccess(null);
    try {
      await claimLead(leadId);
      setSuccess('Lead claimed successfully. It is now in My Leads.');
      loadLeads();
    } catch {
      setAssignmentError('Could not claim this lead. It may already be assigned.');
    } finally {
      setAssignmentBusyId(undefined);
    }
  }

  async function handleBulkAssign(): Promise<void> {
    if (!bulkAgentId || selectedLeadIds.length === 0) return;
    setAssignmentBusyId('bulk');
    setAssignmentError(null);
    setSuccess(null);
    try {
      const result = await bulkAssignLeads(selectedLeadIds, bulkAgentId);
      setSuccess(`Bulk assignment completed for ${result.assigned_count} leads.`);
      setSelectedLeadIds([]);
      setBulkAgentId('');
      loadLeads();
    } catch {
      setAssignmentError(t('leads.messages.bulkAssignError'));
    } finally {
      setAssignmentBusyId(undefined);
    }
  }

  async function handleBulkEdit(): Promise<void> {
    if (selectedLeadIds.length === 0 || (!bulkTreatmentId && !bulkSourceChannel)) return;
    setActionBusyId('bulk-edit');
    setError(null);
    setSuccess(null);
    try {
      const payload: Partial<CreateLeadPayload> = {};
      if (bulkTreatmentId) payload.treatmentId = bulkTreatmentId;
      if (bulkSourceChannel) payload.sourceChannel = bulkSourceChannel;
      await Promise.all(selectedLeadIds.map((leadId) => updateLead(leadId, payload)));
      setSuccess(message('leads.messages.bulkEditDone', { count: selectedLeadIds.length }));
      setBulkTreatmentId('');
      setBulkSourceChannel('');
      setSelectedLeadIds([]);
      loadLeads();
    } catch {
      setError(t('leads.messages.bulkEditError'));
    } finally {
      setActionBusyId(undefined);
    }
  }
  function toggleLeadSelection(leadId: string, selected: boolean): void {
    setSelectedLeadIds((current) => selected ? [...new Set([...current, leadId])] : current.filter((id) => id !== leadId));
  }

  async function handleTransfer(leadId: string, newAgentId: string, reason?: string): Promise<void> {
    setAssignmentBusyId(leadId);
    setAssignmentError(null);
    try {
      const updatedLead = await transferLead(leadId, newAgentId, reason);
      updateLeadInList(updatedLead);
      setSuccess('Lead transferred successfully.');
    } catch {
      setAssignmentError('Could not transfer lead. Please try again.');
    } finally {
      setAssignmentBusyId(undefined);
    }
  }

  async function handleUnassign(leadId: string): Promise<void> {
    setAssignmentBusyId(leadId);
    setAssignmentError(null);
    try {
      const updatedLead = await unassignLead(leadId);
      updateLeadInList(updatedLead);
      setSuccess('Lead unassigned successfully.');
    } catch {
      setAssignmentError('Could not remove assignment. Please try again.');
    } finally {
      setAssignmentBusyId(undefined);
    }
  }

  async function handleChangeStatus(leadId: string, nextStatus: LeadStatus, note?: string, extra?: Partial<ChangeLeadStatusPayload>): Promise<void> {
    setActionBusyId(leadId);
    setError(null);
    setSuccess(null);
    try {
      const updatedLead = await changeLeadStatus(leadId, { status: nextStatus, note, ...extra });
      updateLeadInList(updatedLead);
      setSuccess(t('leads.messages.statusUpdated'));
    } catch {
      setError(t('leads.messages.statusError'));
    } finally {
      setActionBusyId(undefined);
    }
  }

  async function handleStartCall(leadId: string): Promise<void> {
    setActionBusyId(leadId);
    setError(null);
    setSuccess(null);
    try {
      const activeCallSession = await startLeadCall(leadId);
      const firstActionAt = new Date().toISOString();
      setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, activeCallSession, firstActionAt: lead.firstActionAt ?? firstActionAt } : lead));
      setSuccess('Contact time recorded.');
    } catch {
      setError('Could not start call. Please make sure the lead is assigned.');
    } finally {
      setActionBusyId(undefined);
    }
  }

  async function handleEndCall(leadId: string): Promise<void> {
    setActionBusyId(leadId);
    setError(null);
    setSuccess(null);
    try {
      await endLeadCall(leadId);
      setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, activeCallSession: null } : lead));
      setSuccess('Call ended.');
    } catch {
      setError('Could not end call. Please try again.');
    } finally {
      setActionBusyId(undefined);
    }
  }

  async function handleCreateFollowUp(leadId: string, date: string, time: string, note?: string): Promise<void> {
    setActionBusyId(leadId);
    setError(null);
    setSuccess(null);
    try {
      await createLeadFollowUp(leadId, { date, time, note });
      setSuccess('Follow-up scheduled successfully.');
      loadLeads();
    } catch {
      setError('Could not schedule follow-up. Please check date and time.');
    } finally {
      setActionBusyId(undefined);
    }
  }

  async function handleExport(format: 'xlsx' | 'csv' = 'xlsx', exportType: 'view' | 'raw' = 'view'): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportLeads(params, format, exportType);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('leads.messages.exportError'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('leads.eyebrow')}</p>
          <h1>{t('leads.title')}</h1>
        </div>
        <div className="header-actions">
          {canUseAvailablePool ? (
            <>
              <Button variant={leadView === 'owned' ? 'primary' : 'secondary'} onClick={() => resetToFirstPage(() => setLeadView('owned'))}>{t('leads.myLeads')}</Button>
              <Button variant={leadView === 'available' ? 'primary' : 'secondary'} onClick={() => resetToFirstPage(() => setLeadView('available'))}>{t('leads.availableLeads')}</Button>
            </>
          ) : null}
          <Button variant="primary" onClick={openCreateLead}>{t('leads.add')}</Button>
          {canExportLeads ? <>
            <Button onClick={() => void handleExport('xlsx', 'view')} isLoading={isExporting}>{t('leads.exportExcel')}</Button>
            <Button onClick={() => void handleExport('csv', 'view')} isLoading={isExporting}>{t('leads.exportCsv')}</Button>
            <Button onClick={() => void handleExport('csv', 'raw')} isLoading={isExporting}>{t('leads.exportRaw')}</Button>
          </> : null}
          {queryTimeMs !== undefined ? <span className="query-time">DB query: {queryTimeMs}ms</span> : null}
          <span className={isRefreshing ? 'realtime-pill realtime-pill--syncing' : 'realtime-pill'}>{isRefreshing ? t('leads.syncing') : `${t('leads.live')}${lastSyncedAt ? ` - ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}</span>
        </div>
      </header>

      <section className="toolbar" aria-label="Search and filters">
        <LeadSearchInput value={search} onChange={(value) => resetToFirstPage(() => setSearch(value))} />
        <LeadFilters
          status={status}
          treatment={treatment}
          source={source}
          assignedAgent={assignedAgent}
          sort={sort}
          duplicatesOnly={duplicatesOnly}
          treatments={treatments}
          agents={agents}
          canFilterByAgent={canManageAssignments}
          onStatusChange={(value) => resetToFirstPage(() => setStatus(value))}
          onTreatmentChange={(value) => resetToFirstPage(() => setTreatment(value))}
          onSourceChange={(value) => resetToFirstPage(() => setSource(value))}
          onAssignedAgentChange={(value) => resetToFirstPage(() => setAssignedAgent(value))}
          onSortChange={(value) => resetToFirstPage(() => setSort(value))}
          onDuplicatesOnlyChange={(value) => resetToFirstPage(() => setDuplicatesOnly(value))}
        />
      </section>

      {success ? <div className="success-state">{success}</div> : null}
      <section className="panel">
        {error ? <div className="error-state">{error}</div> : null}
        {assignmentError ? <div className="error-state">{assignmentError}</div> : null}

        {canManageAssignments ? (
          <div className="bulk-actions">
            <span>{selectedLeadIds.length} {t('leads.bulk.selectedSuffix')}</span>
            <select value={bulkAgentId} onChange={(event) => setBulkAgentId(event.target.value)}>
              <option value="">{t('leads.bulk.assignPlaceholder')}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            <Button type="button" onClick={() => void handleBulkAssign()} disabled={!bulkAgentId || selectedLeadIds.length === 0 || assignmentBusyId === 'bulk'}>{t('leads.bulk.assign')}</Button>            {canAdminLeadMutations ? (
              <>
                <select value={bulkTreatmentId} onChange={(event) => setBulkTreatmentId(event.target.value)}>
                  <option value="">{t('leads.bulk.treatmentPlaceholder')}</option>
                  {treatments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={bulkSourceChannel} onChange={(event) => setBulkSourceChannel(event.target.value)}>
                  <option value="">{t('leads.bulk.sourcePlaceholder')}</option>
                  {manualSources.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <Button type="button" onClick={() => void handleBulkEdit()} disabled={selectedLeadIds.length === 0 || (!bulkTreatmentId && !bulkSourceChannel) || actionBusyId === 'bulk-edit'}>{t('leads.bulk.edit')}</Button>
              </>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setSelectedLeadIds([])} disabled={selectedLeadIds.length === 0}>{t('leads.bulk.clear')}</Button>
          </div>
        ) : null}
        {isLoading ? (
          <div className="loading-state">{t('leads.loading')}</div>
        ) : (
          <LeadsTable
            leads={leads}
            agents={agents}
            treatments={treatments}
            canManageAssignments={canManageAssignments}
            canClaimAvailable={canUseAvailablePool && leadView === 'available'}
            currentUserRole={currentUser?.role}
            canEditLeads={canAdminLeadMutations}
            canDeleteLeads={canAdminLeadMutations}
            selectedLeadIds={selectedLeadIds}
            onToggleLeadSelection={toggleLeadSelection}
            assignmentBusyId={assignmentBusyId}
            actionBusyId={actionBusyId}
            onAssign={(leadId, agentId) => void handleAssign(leadId, agentId)}
            onUnassign={(leadId) => void handleUnassign(leadId)}
            onTransfer={(leadId, newAgentId, reason) => void handleTransfer(leadId, newAgentId, reason)}
            onClaim={(leadId) => void handleClaimLead(leadId)}
            onChangeStatus={(leadId, nextStatus, note, extra) => void handleChangeStatus(leadId, nextStatus, note, extra)}
            onCreateFollowUp={(leadId, date, time, note) => void handleCreateFollowUp(leadId, date, time, note)}
            onStartCall={(leadId) => void handleStartCall(leadId)}
            onEndCall={(leadId) => void handleEndCall(leadId)}
            onEditLead={openEditLead}
            onDeleteLead={(lead) => void handleDeleteLead(lead)}
          />
        )}
        <PaginationControls
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onLimitChange={(value) => resetToFirstPage(() => setLimit(value))}
        />
      </section>

      {isCreateOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create lead">
          <form className="modal-card user-form-modal" noValidate onSubmit={(event) => void handleCreateLead(event)}>
            <h2>{t('leads.createTitle')}</h2>
            <Input label={t('leads.patientName')} value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} />
            <Input label={t('leads.phoneNumber')} value={leadForm.phone} maxLength={25} inputMode="tel" onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })} />

            <Select label={t('leads.sourceChannel')} value={leadForm.sourceChannel} onChange={(event) => setLeadForm({ ...leadForm, sourceChannel: event.target.value })}>
              {manualSources.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <small className="form-hint">{t('leads.sourceHint')}</small>
            <label className="field"><span>{t('leads.quickNotes')}</span><textarea value={leadForm.note ?? ''} maxLength={500} onChange={(event) => setLeadForm({ ...leadForm, note: event.target.value })} /></label>
            <Select label={t('leads.treatment')} value={leadForm.treatmentId ?? ''} onChange={(event) => setLeadForm({ ...leadForm, treatmentId: event.target.value })}>
              <option value="">{t('leads.form.selectTreatment')}</option>
              {treatments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            {canManageAssignments ? (
              <Select label={t('leads.assignToAgent')} value={leadForm.ownerAgentId ?? ''} onChange={(event) => setLeadForm({ ...leadForm, ownerAgentId: event.target.value })}>
                <option value="">{t('leads.keepUnassigned')}</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </Select>
            ) : null}
            <div className="modal-actions"><Button type="button" onClick={() => setIsCreateOpen(false)}>{t('leads.cancel')}</Button><Button type="submit" variant="primary" isLoading={isSavingLead}>{t('leads.createLead')}</Button></div>
          </form>
        </div>
      ) : null}
      {editingLead ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit lead">
          <form className="modal-card user-form-modal" noValidate onSubmit={(event) => void handleUpdateLead(event)}>
            <h2>{t('leads.editTitle')}</h2>
            <Input label={t('leads.patientName')} value={editLeadForm.name} onChange={(event) => setEditLeadForm({ ...editLeadForm, name: event.target.value })} />
            <Input label={t('leads.phoneNumber')} value={editLeadForm.phone} maxLength={25} inputMode="tel" onChange={(event) => setEditLeadForm({ ...editLeadForm, phone: event.target.value })} />
            <Select label={t('leads.sourceChannel')} value={editLeadForm.sourceChannel} onChange={(event) => setEditLeadForm({ ...editLeadForm, sourceChannel: event.target.value })}>
              {manualSources.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Input label={t('leads.campaignName')} value={editLeadForm.campaignName ?? ''} onChange={(event) => setEditLeadForm({ ...editLeadForm, campaignName: event.target.value })} />
            <Input label={t('leads.adName')} value={editLeadForm.adName ?? ''} onChange={(event) => setEditLeadForm({ ...editLeadForm, adName: event.target.value })} />
            <Select label={t('leads.treatment')} value={editLeadForm.treatmentId ?? ''} onChange={(event) => setEditLeadForm({ ...editLeadForm, treatmentId: event.target.value })}>
              <option value="">{t('leads.form.selectTreatment')}</option>
              {treatments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            {canManageAssignments ? (
              <Select label={t('leads.assignToAgent')} value={editLeadForm.ownerAgentId ?? ''} onChange={(event) => setEditLeadForm({ ...editLeadForm, ownerAgentId: event.target.value })}>
                <option value="">{t('leads.keepUnassigned')}</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </Select>
            ) : null}
            <div className="modal-actions">
              <Button type="button" onClick={() => setEditingLead(null)}>{t('leads.cancel')}</Button>
              <Button type="submit" variant="primary" isLoading={isSavingLead}>{t('leads.saveChanges')}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}


