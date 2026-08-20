import { useAuth } from '../../../contexts/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';

export function Topbar() {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useI18n();

  return (
    <header className="topbar">
      <div className="topbar__search" role="search">
        <span>⌕</span>
        <input placeholder={t('app.search')} aria-label={t('app.search')} />
      </div>
      <div className="topbar__actions">        <button className="language-button" type="button" onClick={toggleLanguage}>{language === 'ar' ? 'en' : 'ar'}</button>
        <div className="user-menu">
          <div className="avatar" aria-hidden="true">{user?.name?.slice(0, 1).toUpperCase() ?? 'U'}</div>
          <div className="user-menu__text"><strong>{user?.name ?? 'User'}</strong><span>{user?.role ?? t('app.guest')}</span></div>
        </div>
        <button className="logout-button" type="button" onClick={() => void logout()}>{t('app.logout')}</button>
      </div>
    </header>
  );
}

