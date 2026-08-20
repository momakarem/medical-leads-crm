import type { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import { Topbar } from '../../components/layout/Topbar/Topbar';
import { Footer } from '../../components/layout/Footer/Footer';
import { useI18n } from '../../i18n/I18nContext';

interface AppLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  const { direction } = useI18n();

  return (
    <div className={`crm-shell crm-shell--${direction}`}>
      <Sidebar currentPath={currentPath} />
      <div className="crm-main">
        <Topbar />
        <div className="crm-content">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
