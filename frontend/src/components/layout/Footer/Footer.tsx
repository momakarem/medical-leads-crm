import { useI18n } from '../../../i18n/I18nContext';

export function Footer() {
  const { t } = useI18n();
  return <footer className="crm-footer">{t('app.footer')}</footer>;
}
