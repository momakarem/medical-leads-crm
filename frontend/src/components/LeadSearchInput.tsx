import { useI18n } from '../i18n/I18nContext';

interface LeadSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function LeadSearchInput({ value, onChange }: LeadSearchInputProps) {
  const { t } = useI18n();

  return (
    <label className="field field--wide">
      <span>{t('leads.searchLabel')}</span>
      <input
        type="search"
        value={value}
        placeholder={t('leads.searchPlaceholder')}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
