import { FormEvent, useEffect, useState } from 'react';
import {
  createDistributionRule,
  deleteDistributionRule,
  fetchAgents,
  fetchAssignmentSettings,
  fetchDistributionRules,
  fetchTreatmentRouting,
  updateAssignmentMethod,
  updateDistributionRule,
  updateTreatmentRouting,
} from '../../../api/leadsApi';
import { PageHeader } from '../../../components/layout/PageHeader/PageHeader';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { useI18n } from '../../../i18n/I18nContext';
import type { AgentOption, AssignmentMethod, DistributionRuleItem, SaveDistributionRulePayload, TreatmentRoutingItem } from '../../../types';

const storageKey = 'medical-crm-settings-v1';
const distributionSources = ['', 'Meta', 'TikTok', 'Snapchat', 'Google', 'WhatsApp', 'Direct Call', 'Instagram DM', 'Walk-in', 'Referral', 'Other'];
const allowedTimezones = ['Asia/Dubai', 'Europe/Istanbul'] as const;
type AllowedTimezone = typeof allowedTimezones[number];

interface LocalSettings {
  crmName: string;
  defaultLanguage: 'en' | 'ar';
  timezone: AllowedTimezone;
}

const defaultLocalSettings: LocalSettings = {
  crmName: 'Medical Leads CRM',
  defaultLanguage: 'en',
  timezone: 'Asia/Dubai',
};

const emptyDistributionRule: SaveDistributionRulePayload = {
  name: '',
  is_active: true,
  priority: 100,
  source_channel: null,
  campaign_name: '',
  ad_name: '',
  form_id: '',
  allocations: [{ agent_id: '', weight: 100 }],
};

function normalizeTimezone(value: unknown): AllowedTimezone {
  return allowedTimezones.includes(value as AllowedTimezone) ? value as AllowedTimezone : 'Asia/Dubai';
}

function loadLocalSettings(): LocalSettings {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return defaultLocalSettings;
  const parsed = { ...defaultLocalSettings, ...JSON.parse(saved) } as LocalSettings;
  return { ...parsed, timezone: normalizeTimezone(parsed.timezone) };
}

export function SettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<LocalSettings>(defaultLocalSettings);
  const [assignmentMethod, setAssignmentMethod] = useState<AssignmentMethod>('round_robin');
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [routing, setRouting] = useState<TreatmentRoutingItem[]>([]);
  const [routingDraft, setRoutingDraft] = useState<Record<string, string[]>>({});
  const [distributionRules, setDistributionRules] = useState<DistributionRuleItem[]>([]);
  const [distributionDraft, setDistributionDraft] = useState<SaveDistributionRulePayload>(emptyDistributionRule);
  const [editingDistributionRuleId, setEditingDistributionRuleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setSettings(loadLocalSettings());
    Promise.all([
      fetchAssignmentSettings(controller.signal),
      fetchAgents(controller.signal),
      fetchTreatmentRouting(controller.signal),
      fetchDistributionRules(controller.signal),
    ])
      .then(([assignmentResponse, agentResponse, routingResponse, distributionResponse]) => {
        setAssignmentMethod(assignmentResponse.assignmentMethod);
        setAgents(agentResponse);
        setRouting(routingResponse);
        setRoutingDraft(Object.fromEntries(routingResponse.map((item) => [item.treatment_id, item.agent_ids])));
        setDistributionRules(distributionResponse);
      })
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== 'AbortError') setError(t('settings.assignmentLoadError'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  function updateRoutingDraft(treatmentId: string, selectedOptions: HTMLCollectionOf<HTMLOptionElement>): void {
    const selectedAgentIds = Array.from(selectedOptions).filter((option) => option.selected).map((option) => option.value);
    setRoutingDraft((current) => ({ ...current, [treatmentId]: selectedAgentIds }));
  }

  function resetDistributionDraft(): void {
    setDistributionDraft({ ...emptyDistributionRule, allocations: [{ agent_id: '', weight: 100 }] });
    setEditingDistributionRuleId(null);
  }

  function updateDistributionAllocation(index: number, patch: Partial<{ agent_id: string; weight: number }>): void {
    setDistributionDraft((current) => ({
      ...current,
      allocations: current.allocations.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  async function saveDistributionRule(): Promise<void> {
    const payload: SaveDistributionRulePayload = {
      ...distributionDraft,
      name: distributionDraft.name.trim(),
      source_channel: distributionDraft.source_channel || null,
      campaign_name: distributionDraft.campaign_name?.trim() || null,
      ad_name: distributionDraft.ad_name?.trim() || null,
      form_id: distributionDraft.form_id?.trim() || null,
      priority: Number(distributionDraft.priority ?? 100),
      allocations: distributionDraft.allocations
        .filter((item) => item.agent_id && Number(item.weight) > 0)
        .map((item) => ({ agent_id: item.agent_id, weight: Number(item.weight) })),
    };

    if (!payload.name || payload.allocations.length === 0) {
      setError(t('settings.distributionValidationError'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = editingDistributionRuleId
        ? await updateDistributionRule(editingDistributionRuleId, payload)
        : await createDistributionRule(payload);
      setDistributionRules((current) => editingDistributionRuleId
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]);
      resetDistributionDraft();
      setSuccess(t('settings.distributionSaved'));
    } catch {
      setError(t('settings.distributionSaveError'));
    } finally {
      setIsSaving(false);
    }
  }

  function editDistributionRule(rule: DistributionRuleItem): void {
    setEditingDistributionRuleId(rule.id);
    setDistributionDraft({
      name: rule.name,
      is_active: rule.is_active,
      priority: rule.priority,
      source_channel: rule.source_channel,
      campaign_name: rule.campaign_name ?? '',
      ad_name: rule.ad_name ?? '',
      form_id: rule.form_id ?? '',
      allocations: rule.allocations.map((item) => ({ agent_id: item.agent_id, weight: item.weight })),
    });
  }

  async function removeDistributionRule(ruleId: string): Promise<void> {
    if (!window.confirm(t('settings.distributionDeleteConfirm'))) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteDistributionRule(ruleId);
      setDistributionRules((current) => current.filter((item) => item.id !== ruleId));
      if (editingDistributionRuleId === ruleId) resetDistributionDraft();
      setSuccess(t('settings.distributionDeleted'));
    } catch {
      setError(t('settings.distributionDeleteError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const savedSettings = { ...settings, crmName: settings.crmName.trim() || defaultLocalSettings.crmName };
      localStorage.setItem(storageKey, JSON.stringify(savedSettings));
      localStorage.setItem('crm_language', savedSettings.defaultLanguage);
      setSettings(savedSettings);
      window.dispatchEvent(new Event('crm-settings-updated'));
      await updateAssignmentMethod(assignmentMethod);
      await Promise.all(routing.map((item) => updateTreatmentRouting(item.treatment_id, routingDraft[item.treatment_id] ?? [])));
      setSuccess(t('settings.saved'));
    } catch {
      setError(t('settings.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <PageHeader eyebrow={t('settings.system')} title={t('settings.title')} />
      {success ? <div className="success-state">{success}</div> : null}
      {error ? <div className="error-state">{error}</div> : null}

      <form onSubmit={(event) => void handleSave(event)}>
        <section className="settings-grid">
          <article className="panel settings-card">
            <div className="panel-header"><div><p className="eyebrow">{t('General')}</p><h2>{t('Workspace Settings')}</h2></div><Badge tone="info">{t('Local UI')}</Badge></div>
            <Input label={t('CRM Name')} value={settings.crmName} onChange={(event) => setSettings({ ...settings, crmName: event.target.value })} />
            <Select label={t('Default Language')} value={settings.defaultLanguage} onChange={(event) => setSettings({ ...settings, defaultLanguage: event.target.value as 'en' | 'ar' })}>
              <option value="en">{t('English')}</option>
              <option value="ar">{t('Arabic')}</option>
            </Select>
            <Select label={t('Timezone')} value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: normalizeTimezone(event.target.value) })}>
              <option value="Asia/Dubai">{t('Dubai (Asia/Dubai)')}</option>
              <option value="Europe/Istanbul">{t('Turkey (Europe/Istanbul)')}</option>
            </Select>
          </article>

          <article className="panel settings-card">
            <div className="panel-header"><div><p className="eyebrow">{t('Assignment')}</p><h2>{t('Lead Distribution')}</h2></div><Badge tone="success">{t('Backend')}</Badge></div>
            {isLoading ? <div className="loading-state">{t('Loading assignment settings...')}</div> : (
              <>
                <Select label={t('Assignment Method')} value={assignmentMethod} onChange={(event) => setAssignmentMethod(event.target.value as AssignmentMethod)}>
                  <option value="manual">{t('Manual Assignment')}</option>
                  <option value="round_robin">{t('Round Robin')}</option>
                  <option value="treatment_based">{t('Treatment-Based Routing')}</option>
                </Select>
                <p className="settings-help">{t('Manual leaves new leads in the open pool. Round Robin distributes eligible leads automatically. Treatment-Based Routing assigns leads to agents mapped to the selected treatment.')}</p>
              </>
            )}
          </article>

          <article className="panel settings-card settings-card--wide">
            <div className="panel-header"><div><p className="eyebrow">{t('settings.weightedRouting')}</p><h2>{t('settings.advancedDistributionRules')}</h2></div><Badge tone="success">{t('settings.live')}</Badge></div>
            <p className="settings-help">{t('settings.distributionHelp')}</p>
            <div className="distribution-rule-builder">
              <Input label={t('settings.ruleName')} value={distributionDraft.name} onChange={(event) => setDistributionDraft({ ...distributionDraft, name: event.target.value })} />
              <Select label={t('settings.sourceChannel')} value={distributionDraft.source_channel ?? ''} onChange={(event) => setDistributionDraft({ ...distributionDraft, source_channel: event.target.value || null })}>
                {distributionSources.map((item) => <option key={item || 'all'} value={item}>{item ? t(item) : t('settings.anySource')}</option>)}
              </Select>
              <Input label={t('settings.campaignName')} value={distributionDraft.campaign_name ?? ''} onChange={(event) => setDistributionDraft({ ...distributionDraft, campaign_name: event.target.value })} placeholder={t('settings.optionalCampaignName')} />
              <Input label={t('settings.adName')} value={distributionDraft.ad_name ?? ''} onChange={(event) => setDistributionDraft({ ...distributionDraft, ad_name: event.target.value })} placeholder={t('settings.optionalAdName')} />
              <Input label={t('settings.formId')} value={distributionDraft.form_id ?? ''} onChange={(event) => setDistributionDraft({ ...distributionDraft, form_id: event.target.value })} placeholder={t('settings.optionalFormId')} />
              <Input label={t('settings.priority')} type="number" min={1} value={distributionDraft.priority ?? 100} onChange={(event) => setDistributionDraft({ ...distributionDraft, priority: Number(event.target.value) })} />
              <label className="inline-checkbox distribution-active-toggle"><input type="checkbox" checked={distributionDraft.is_active ?? true} onChange={(event) => setDistributionDraft({ ...distributionDraft, is_active: event.target.checked })} /> {t('settings.activeRule')}</label>
            </div>
            <div className="distribution-allocations">
              <div className="distribution-allocations__header"><strong>{t('settings.agentDistribution')}</strong><Button type="button" onClick={() => setDistributionDraft((current) => ({ ...current, allocations: [...current.allocations, { agent_id: '', weight: 50 }] }))}>{t('settings.addAgent')}</Button></div>
              {distributionDraft.allocations.map((allocation, index) => (
                <div className="distribution-allocation-row" key={index}>
                  <Select label={t('settings.agent')} value={allocation.agent_id} onChange={(event) => updateDistributionAllocation(index, { agent_id: event.target.value })}>
                    <option value="">{t('settings.selectAgent')}</option>
                    {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                  </Select>
                  <Input label={t('settings.weightPercent')} type="number" min={1} value={allocation.weight} onChange={(event) => updateDistributionAllocation(index, { weight: Number(event.target.value) })} />
                  <Button type="button" variant="ghost" onClick={() => setDistributionDraft((current) => ({ ...current, allocations: current.allocations.filter((_, itemIndex) => itemIndex !== index) }))} disabled={distributionDraft.allocations.length === 1}>{t('settings.remove')}</Button>
                </div>
              ))}
            </div>
            <div className="settings-actions distribution-actions">
              <Button type="button" onClick={resetDistributionDraft}>{t('settings.reset')}</Button>
              <Button type="button" variant="primary" isLoading={isSaving} onClick={() => void saveDistributionRule()}>{editingDistributionRuleId ? t('settings.updateRule') : t('settings.createRule')}</Button>
            </div>
            <div className="table-wrap distribution-rules-table">
              <table className="leads-table">
                <thead><tr><th>{t('settings.rule')}</th><th>{t('settings.match')}</th><th>{t('settings.distribution')}</th><th>{t('settings.status')}</th><th>{t('settings.actions')}</th></tr></thead>
                <tbody>
                  {distributionRules.length === 0 ? <tr><td colSpan={5} className="empty-cell">{t('settings.noDistributionRules')}</td></tr> : distributionRules.map((rule) => (
                    <tr key={rule.id}>
                      <td><strong>{rule.name}</strong><br /><small>{t('settings.priority')} {rule.priority}</small></td>
                      <td>{[rule.source_channel, rule.campaign_name, rule.ad_name, rule.form_id].filter(Boolean).join(' · ') || t('settings.anyLead')}</td>
                      <td>{rule.allocations.map((item) => `${item.agent_name ?? item.agent_id}: ${item.weight}`).join(' / ')}</td>
                      <td><Badge tone={rule.is_active ? 'success' : 'neutral'}>{rule.is_active ? t('settings.active') : t('settings.inactive')}</Badge></td>
                      <td><div className="row-actions"><button type="button" onClick={() => editDistributionRule(rule)}>{t('settings.edit')}</button><button type="button" onClick={() => void removeDistributionRule(rule.id)}>{t('settings.delete')}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel settings-card settings-card--wide">
            <div className="panel-header"><div><p className="eyebrow">{t('Routing')}</p><h2>{t('Treatment Routing')}</h2></div><Badge tone="info">{t('Many-to-many')}</Badge></div>
            {isLoading ? <div className="loading-state">{t('Loading treatment routing...')}</div> : (
              <div className="settings-routing-list">
                {routing.map((item) => (
                  <label className="field" key={item.treatment_id}>
                    <span>{t(item.treatment_name)}</span>
                    <select
                      multiple
                      value={routingDraft[item.treatment_id] ?? []}
                      onChange={(event) => updateRoutingDraft(item.treatment_id, event.currentTarget.options)}
                    >
                      {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                    </select>
                    <small className="settings-help">{t('Hold Ctrl to select more than one agent.')}</small>
                  </label>
                ))}
              </div>
            )}
          </article>

          <article className="panel settings-card settings-card--wide">
            <div className="panel-header"><div><p className="eyebrow">{t('Security')}</p><h2>{t('Access & Sessions')}</h2></div><Badge tone="neutral">{t('Read only')}</Badge></div>
            <div className="settings-kv"><span>{t('Authentication')}</span><strong>{t('Cookie / JWT protected routes')}</strong></div>
            <div className="settings-kv"><span>{t('Inactive users')}</span><strong>{t('Blocked from login')}</strong></div>
            <div className="settings-kv"><span>{t('Audit logs')}</span><strong>{t('Enabled for sensitive actions')}</strong></div>
          </article>
        </section>

        <div className="settings-actions"><Button type="submit" variant="primary" isLoading={isSaving}>{t('Save Settings')}</Button></div>
      </form>
    </main>
  );
}

