import { useEffect, useMemo, useState } from 'react';
import { NAVIGATION_ITEMS, type NavigationItem } from '../../../config/navigation.config';
import { hasPermission } from '../../../config/permissions.config';
import { useAuth } from '../../../contexts/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';

function isActive(item: NavigationItem, currentPath: string): boolean {
  if (item.path === '/') return currentPath === '/';
  if (item.path && currentPath.startsWith(item.path)) return true;
  return Boolean(item.children?.some((child) => isActive(child, currentPath)));
}

const settingsStorageKey = 'medical-crm-settings-v1';
const settingsUpdatedEvent = 'crm-settings-updated';

function readSavedCrmName(): string {
  try {
    const saved = window.localStorage.getItem(settingsStorageKey);
    if (!saved) return '';
    const value = (JSON.parse(saved) as { crmName?: unknown }).crmName;
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function Sidebar({ currentPath }: { currentPath: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [crmName, setCrmName] = useState(readSavedCrmName);

  useEffect(() => {
    const syncCrmName = () => setCrmName(readSavedCrmName());
    window.addEventListener(settingsUpdatedEvent, syncCrmName);
    window.addEventListener('storage', syncCrmName);
    return () => {
      window.removeEventListener(settingsUpdatedEvent, syncCrmName);
      window.removeEventListener('storage', syncCrmName);
    };
  }, []);

  const visibleItems = useMemo(
    () => NAVIGATION_ITEMS
      .filter((item) => hasPermission(user?.role, item.permission))
      .map((item) => ({ ...item, children: item.children?.filter((child) => hasPermission(user?.role, child.permission)) })),
    [user?.role],
  );

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <button className="brand-logo" type="button" onClick={() => navigate('/dashboard')} aria-label={t('app.goDashboard')}>+</button>
        {!collapsed ? <div><strong>{crmName || t('app.name')}</strong><span>{t('app.hospitalCrm')}</span></div> : null}
      </div>
      <button className="sidebar__toggle" type="button" onClick={() => setCollapsed((value) => !value)}>
        {collapsed ? '›' : '‹'}
      </button>
      <nav className="sidebar__nav" aria-label={t('Main navigation')}>
        {visibleItems.map((item) => (
          <div className="nav-group" key={item.label}>
            {item.path ? (
              <button type="button" className={`nav-item ${isActive(item, currentPath) ? 'nav-item--active' : ''}`} onClick={() => navigate(item.path!)}>
                <span className="nav-icon">{item.icon}</span>
                {!collapsed ? <span>{t(`nav.${item.label}`, item.label)}</span> : null}
              </button>
            ) : (
              <div className={`nav-section ${isActive(item, currentPath) ? 'nav-section--active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {!collapsed ? <span>{t(`nav.${item.label}`, item.label)}</span> : null}
              </div>
            )}
            {!collapsed && item.children?.length ? (
              <div className="nav-children">
                {item.children.map((child) => (
                  <button key={child.label} type="button" className={`nav-child ${isActive(child, currentPath) ? 'nav-child--active' : ''}`} onClick={() => child.path && navigate(child.path)}>
                    <span>{child.icon}</span>{t(`nav.${child.label}`, child.label)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
