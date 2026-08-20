import { hasPermission } from '../config/permissions.config';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { AppLayout } from '../layouts/AppLayout/AppLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner/LoadingSpinner';
import { matchRoute } from './routes';
import { navigate, useLocationPath } from './router';

function roleHome(role: string | undefined): string {
  if (role === 'admin' || role === 'manager') return '/dashboard';
  if (role === 'agent') return '/dashboard';
  return '/login';
}

export function App() {
  const path = useLocationPath();
  const route = matchRoute(path);
  const { user, isAuthenticated, isLoading } = useAuth();
  const Page = route.component;
  const { t } = useI18n();

  if (isLoading) {
    return <div className="boot-screen"><LoadingSpinner label="Preparing CRM workspace..." /></div>;
  }

  if (route.isPublic) {
    if (isAuthenticated) {
      navigate(roleHome(user?.role));
      return null;
    }
    return <Page {...(route.params ?? {})} />;
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (!hasPermission(user?.role, route.permission)) {
    return (
      <AppLayout currentPath={path}>
        <main className="page-shell">
          <section className="state-card state-card--error">
            <div className="state-icon">403</div>
            <strong>{t('app.noPermissionTitle')}</strong>
            <p>{t('app.noPermissionBody')}</p>
          </section>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout currentPath={path}>
      <Page {...(route.params ?? {})} />
    </AppLayout>
  );
}
