export interface ApplicationConfiguration {
  nodeEnv: string;
  port: number;
  authCookieName: string;
  cookieSecure: boolean;
  corsOrigins: string[];
  meta: { appId: string; appSecret: string; redirectUri: string; webhookVerifyToken: string; tokenEncryptionKey: string };
  tiktok: { appId: string; appSecret: string; redirectUri: string; tokenEncryptionKey: string; apiBaseUrl: string; oauthAuthorizeUrl: string; oauthTokenUrl: string; scopes: string };
  snapchat: { clientId: string; clientSecret: string; redirectUri: string; tokenEncryptionKey: string; apiBaseUrl: string; oauthAuthorizeUrl: string; oauthTokenUrl: string; scopes: string };
  security: { enforceHttps: boolean; hstsMaxAge: number };
}

export default (): ApplicationConfiguration => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  authCookieName: process.env.AUTH_COOKIE_NAME ?? 'medical_crm_access',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigins: (process.env.CORS_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  security: { enforceHttps: process.env.SECURITY_ENFORCE_HTTPS === 'true', hstsMaxAge: Number(process.env.SECURITY_HSTS_MAX_AGE ?? 15552000) },
  meta: { appId: process.env.META_APP_ID ?? '', appSecret: process.env.META_APP_SECRET ?? '', redirectUri: process.env.META_REDIRECT_URI ?? '', webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? '', tokenEncryptionKey: process.env.META_TOKEN_ENCRYPTION_KEY ?? '' },
  tiktok: { appId: process.env.TIKTOK_APP_ID ?? '', appSecret: process.env.TIKTOK_APP_SECRET ?? '', redirectUri: process.env.TIKTOK_REDIRECT_URI ?? '', tokenEncryptionKey: process.env.TIKTOK_TOKEN_ENCRYPTION_KEY ?? '', apiBaseUrl: process.env.TIKTOK_API_BASE_URL ?? 'https://business-api.tiktok.com/open_api/v1.3', oauthAuthorizeUrl: process.env.TIKTOK_OAUTH_AUTHORIZE_URL ?? '', oauthTokenUrl: process.env.TIKTOK_OAUTH_TOKEN_URL ?? '', scopes: process.env.TIKTOK_SCOPES ?? 'lead_management,advertiser_management' },
  snapchat: { clientId: process.env.SNAPCHAT_CLIENT_ID ?? '', clientSecret: process.env.SNAPCHAT_CLIENT_SECRET ?? '', redirectUri: process.env.SNAPCHAT_REDIRECT_URI ?? '', tokenEncryptionKey: process.env.SNAPCHAT_TOKEN_ENCRYPTION_KEY ?? '', apiBaseUrl: process.env.SNAPCHAT_API_BASE_URL ?? 'https://adsapi.snapchat.com/v1', oauthAuthorizeUrl: process.env.SNAPCHAT_OAUTH_AUTHORIZE_URL ?? '', oauthTokenUrl: process.env.SNAPCHAT_OAUTH_TOKEN_URL ?? '', scopes: process.env.SNAPCHAT_SCOPES ?? 'snapchat-marketing-api' },
});
