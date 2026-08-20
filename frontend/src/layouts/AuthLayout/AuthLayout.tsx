import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nContext';

export function AuthLayout({ children }: { children: ReactNode }) {
  const { language, toggleLanguage, t } = useI18n();

  return (
    <main className="auth-layout">
      <button className="auth-language-button" type="button" onClick={toggleLanguage} aria-label={language === 'ar' ? 'Switch to English' : '??????? ??? ???????'}>
        {language === 'ar' ? 'en' : 'ar'}
      </button>
      <section className="auth-hero" aria-label={t('auth.heroLabel')}>
        <div className="auth-brand-mark">+</div>
        <p className="eyebrow">{t('app.name')}</p>
        <h1>{t('auth.heroTitle')}</h1>
        <p>{t('auth.heroDescription')}</p>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}

