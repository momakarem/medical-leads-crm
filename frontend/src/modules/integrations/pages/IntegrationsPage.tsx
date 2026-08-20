import { useEffect, useMemo, useState } from 'react';
import {
  fetchFacebookConnection,
  fetchSnapchatConnection,
  fetchTiktokConnection,
  startFacebookConnection,
  startSnapchatConnection,
  startTiktokConnection,
} from '../../../api/leadsApi';
import { PageHeader } from '../../../components/layout/PageHeader/PageHeader';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { useI18n } from '../../../i18n/I18nContext';
import type { FacebookConnection, SnapchatConnection, TiktokConnection } from '../../../types';

type ProviderKey = 'meta' | 'tiktok' | 'snapchat';
type ConnectionState = {
  meta: FacebookConnection | null;
  tiktok: TiktokConnection | null;
  snapchat: SnapchatConnection | null;
};

type ProviderCard = {
  key: ProviderKey;
  name: string;
  descriptionKey: string;
  webhookPath: string;
  sourceChannel: string;
};

const providers: ProviderCard[] = [
  { key: 'meta', name: 'Meta Lead Ads', descriptionKey: 'integrations.metaDescription', webhookPath: '/webhooks/meta', sourceChannel: 'Meta' },
  { key: 'tiktok', name: 'TikTok Lead Generation', descriptionKey: 'integrations.tiktokDescription', webhookPath: '/webhooks/tiktok', sourceChannel: 'TikTok' },
  { key: 'snapchat', name: 'Snapchat Lead Generation', descriptionKey: 'integrations.snapchatDescription', webhookPath: '/webhooks/snapchat', sourceChannel: 'Snapchat' },
];

const emptyConnections: ConnectionState = { meta: null, tiktok: null, snapchat: null };

function apiBaseUrl(): string {
  const host = window.location.hostname || '127.0.0.1';
  const protocol = window.location.protocol || 'http:';
  if (host === 'localhost' || host === '127.0.0.1') return `${protocol}//${host}:3000`;
  return import.meta.env.VITE_API_BASE_URL ?? `${protocol}//${host}:3000`;
}

function connectionDetails(
  key: ProviderKey,
  connection: ConnectionState[ProviderKey],
  t: (key: string, fallback?: string) => string,
  formatDate: (value: string | null) => string,
): Array<{ label: string; value: string }> {
  if (!connection) return [];
  if (key === 'meta') {
    const meta = connection as FacebookConnection;
    return [
      { label: t('integrations.page'), value: meta.pageName },
      { label: t('integrations.pageId'), value: meta.pageId },
      { label: t('integrations.leadForm'), value: meta.formName },
      { label: t('integrations.formId'), value: meta.formId },
      { label: t('integrations.tokenExpires'), value: formatDate(meta.tokenExpiresAt) },
    ];
  }
  if (key === 'tiktok') {
    const tiktok = connection as TiktokConnection;
    return [
      { label: t('integrations.advertiser'), value: tiktok.advertiserName },
      { label: t('integrations.advertiserId'), value: tiktok.advertiserId },
      { label: t('integrations.leadForm'), value: tiktok.formName },
      { label: t('integrations.formId'), value: tiktok.formId },
      { label: t('integrations.tokenExpires'), value: formatDate(tiktok.tokenExpiresAt) },
    ];
  }
  const snapchat = connection as SnapchatConnection;
  return [
    { label: t('integrations.adAccount'), value: snapchat.adAccountName },
    { label: t('integrations.adAccountId'), value: snapchat.adAccountId },
    { label: t('integrations.leadForm'), value: snapchat.formName },
    { label: t('integrations.formId'), value: snapchat.formId },
    { label: t('integrations.tokenExpires'), value: formatDate(snapchat.tokenExpiresAt) },
  ];
}

export function IntegrationsPage() {
  const { language, t } = useI18n();
  const [connections, setConnections] = useState<ConnectionState>(emptyConnections);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<ProviderKey | null>(null);

  const baseUrl = useMemo(apiBaseUrl, []);
  const genericWebhookUrl = `${baseUrl}/webhooks/leads`;
  const googleWebhookUrl = `${baseUrl}/webhooks/google`;
  const formatDate = (value: string | null): string => {
    if (!value) return t('common.notProvided');
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  };

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      fetchFacebookConnection(controller.signal),
      fetchTiktokConnection(controller.signal),
      fetchSnapchatConnection(controller.signal),
    ])
      .then(([meta, tiktok, snapchat]) => {
        if (controller.signal.aborted) return;
        setConnections({
          meta: meta.status === 'fulfilled' ? meta.value : null,
          tiktok: tiktok.status === 'fulfilled' ? tiktok.value : null,
          snapchat: snapchat.status === 'fulfilled' ? snapchat.value : null,
        });
        if ([meta, tiktok, snapchat].some((item) => item.status === 'rejected')) {
          setError(t('integrations.partialError'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [t]);

  async function handleConnect(provider: ProviderKey) {
    setConnecting(provider);
    setError(null);
    setSuccess(null);
    try {
      const response = provider === 'meta'
        ? await startFacebookConnection()
        : provider === 'tiktok'
          ? await startTiktokConnection()
          : await startSnapchatConnection();
      window.open(response.auth_url, '_blank', 'noopener,noreferrer');
      setSuccess(t('integrations.connectOpened'));
    } catch {
      setError(t('integrations.connectError'));
    } finally {
      setConnecting(null);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setSuccess(t('integrations.copied'));
  }

  return (
    <main className="page-shell">
      <PageHeader eyebrow={t('integrations.eyebrow')} title={t('integrations.title')} />

      <section className="admin-summary-grid integrations-summary" aria-label={t('integrations.title')}>
        <article className="summary-card"><span>{t('integrations.connectedProviders')}</span><strong>{providers.filter((provider) => connections[provider.key]).length}</strong></article>
        <article className="summary-card"><span>{t('integrations.webhookEndpoints')}</span><strong>5</strong></article>
        <article className="summary-card"><span>{t('integrations.genericWebhook')}</span><strong>{t('common.on')}</strong></article>
      </section>

      {success ? <div className="success-state">{success}</div> : null}
      {error ? <div className="error-state">{error}</div> : null}
      {isLoading ? <section className="panel"><div className="loading-state">{t('integrations.loading')}</div></section> : null}

      <section className="integration-grid" aria-label={t('integrations.title')}>
        {providers.map((provider) => {
          const connection = connections[provider.key];
          const webhookUrl = `${baseUrl}${provider.webhookPath}`;
          return (
            <article className="integration-card" key={provider.key}>
              <div className="integration-card__header">
                <div>
                  <p className="eyebrow">{provider.sourceChannel}</p>
                  <h2>{provider.name}</h2>
                </div>
                <Badge tone={connection?.isActive ? 'success' : 'neutral'}>{connection?.isActive ? t('common.connected') : t('common.notConnected')}</Badge>
              </div>
              <p className="subtle">{t(provider.descriptionKey)}</p>
              <div className="integration-meta-list">
                {connection ? connectionDetails(provider.key, connection, t, formatDate).map((item) => (
                  <div key={item.label}><span>{item.label}</span><strong>{item.value || '-'}</strong></div>
                )) : <div><span>{t('common.status')}</span><strong>{t('integrations.noConnection')}</strong></div>}
              </div>
              <div className="webhook-box">
                <span>{t('integrations.webhookUrl')}</span>
                <code>{webhookUrl}</code>
                <button type="button" onClick={() => void copy(webhookUrl)}>{t('common.copy')}</button>
              </div>
              <div className="integration-actions">
                <Button variant="primary" isLoading={connecting === provider.key} onClick={() => void handleConnect(provider.key)}>{connection ? t('common.reconnect') : t('common.connect')}</Button>
                <Button type="button" onClick={() => window.location.reload()}>{t('common.refreshStatus')}</Button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel webhook-panel">
        <div className="panel-header"><div><p className="eyebrow">{t('integrations.webhookIngestion')}</p><h2>{t('integrations.genericGoogle')}</h2></div><Badge tone="info">{t('common.noOAuth')}</Badge></div>
        <p className="subtle">{t('integrations.webhookHelp')}</p>
        <div className="webhook-list">
          <div className="webhook-box"><span>{t('integrations.genericLeadWebhook')}</span><code>{genericWebhookUrl}</code><button type="button" onClick={() => void copy(genericWebhookUrl)}>{t('common.copy')}</button></div>
          <div className="webhook-box"><span>{t('integrations.googleLeadWebhook')}</span><code>{googleWebhookUrl}</code><button type="button" onClick={() => void copy(googleWebhookUrl)}>{t('common.copy')}</button></div>
        </div>
        <pre className="sample-payload">{`{
  "name": "Mohammed Ahmed",
  "phone": "+201012345678",
  "source_channel": "Meta",
  "campaign_name": "Hair Transplant Campaign",
  "treatment": "Hair Transplant"
}`}</pre>
      </section>
    </main>
  );
}
