import type { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { I18nProvider } from '../i18n/I18nContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return <I18nProvider><AuthProvider>{children}</AuthProvider></I18nProvider>;
}
