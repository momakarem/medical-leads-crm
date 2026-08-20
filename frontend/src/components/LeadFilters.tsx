import { useI18n } from '../i18n/I18nContext';
import type { AgentOption, LeadSort, LeadStatus, Treatment } from '../types';

const statuses: Array<{ value: LeadStatus; labelKey: string }> = [
  { value: 'new', labelKey: 'status.new' },
  { value: 'no_answer', labelKey: 'status.no_answer' },
  { value: 'follow_up', labelKey: 'status.follow_up' },
  { value: 'interested', labelKey: 'status.interested' },
  { value: 'not_interested', labelKey: 'status.not_interested' },
  { value: 'wrong_number', labelKey: 'status.wrong_number' },
  { value: 'job_seeker', labelKey: 'status.job_seeker' },
  { value: 'booked', labelKey: 'status.booked' },
  { value: 'showed_up', labelKey: 'status.showed_up' },
  { value: 'no_show', labelKey: 'status.no_show' },
  { value: 'paid', labelKey: 'status.paid' },
];

const sources = [
  'Meta',
  'TikTok',
  'Snapchat',
  'Google',
  'WhatsApp',
  'Direct Call',
  'Instagram DM',
  'Walk-in',
  'Referral',
  'Other',
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

const sorts: Array<{ value: LeadSort; labelKey: string }> = [
  { value: 'created_desc', labelKey: 'sort.createdDesc' },
  { value: 'created_asc', labelKey: 'sort.createdAsc' },
  { value: 'name_asc', labelKey: 'sort.nameAsc' },
  { value: 'name_desc', labelKey: 'sort.nameDesc' },
];

interface LeadFiltersProps {
  status: LeadStatus | '';
  treatment: string;
  source: string;
  assignedAgent: string;
  sort: LeadSort;
  duplicatesOnly: boolean;
  treatments: Treatment[];
  agents: AgentOption[];
  canFilterByAgent: boolean;
  onStatusChange: (value: LeadStatus | '') => void;
  onTreatmentChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onAssignedAgentChange: (value: string) => void;
  onSortChange: (value: LeadSort) => void;
  onDuplicatesOnlyChange: (value: boolean) => void;
}

export function LeadFilters({
  status,
  treatment,
  source,
  assignedAgent,
  sort,
  duplicatesOnly,
  treatments,
  agents,
  canFilterByAgent,
  onStatusChange,
  onTreatmentChange,
  onSourceChange,
  onAssignedAgentChange,
  onSortChange,
  onDuplicatesOnlyChange,
}: LeadFiltersProps) {
  const { t } = useI18n();

  return (
    <div className="filters" aria-label={t('filters.leadFilters')}>
      <label className="field">
        <span>{t('common.status')}</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as LeadStatus | '')}>
          <option value="">{t('common.allStatuses')}</option>
          {statuses.map((option) => (
            <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('leads.table.treatment')}</span>
        <select value={treatment} onChange={(event) => onTreatmentChange(event.target.value)}>
          <option value="">{t('filters.allTreatments')}</option>
          {treatments.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('leads.table.sourceChannel')}</span>
        <select value={source} onChange={(event) => onSourceChange(event.target.value)}>
          <option value="">{t('filters.allSources')}</option>
          {sources.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      {canFilterByAgent ? (
        <label className="field">
          <span>{t('leads.table.ownerAgent')}</span>
          <select value={assignedAgent} onChange={(event) => onAssignedAgentChange(event.target.value)}>
            <option value="">{t('filters.allAgents')}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field checkbox-field">
        <span>{t('filters.duplicates')}</span>
        <label className="inline-checkbox">
          <input type="checkbox" checked={duplicatesOnly} onChange={(event) => onDuplicatesOnlyChange(event.target.checked)} />
          {t('filters.duplicatesOnly')}
        </label>
      </label>

      <label className="field">
        <span>{t('filters.sort')}</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value as LeadSort)}>
          {sorts.map((option) => (
            <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
          ))}
        </select>
      </label>
    </div>
  );
}



