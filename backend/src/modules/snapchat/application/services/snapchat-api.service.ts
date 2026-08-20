import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SnapchatTokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; }
interface SnapchatListResponse<T> { adaccounts?: T[]; lead_forms?: T[]; leads?: T[]; data?: T[]; }
interface SnapchatAdAccountResponse { id?: string; ad_account_id?: string; name?: string; organization_id?: string; }
interface SnapchatFormResponse { id?: string; form_id?: string; name?: string; form_name?: string; }
export interface SnapchatLeadDetails { id?: string; lead_id?: string; full_name?: string; name?: string; phone_number?: string; phone?: string; field_data?: Array<{ name: string; values?: string[] }>; }

@Injectable()
export class SnapchatApiService {
  private readonly logger = new Logger(SnapchatApiService.name);
  constructor(private readonly config: ConfigService) {}

  buildLoginUrl(): string {
    const params = new URLSearchParams({
      client_id: this.required('snapchat.clientId', 'SNAPCHAT_CLIENT_ID'),
      redirect_uri: this.required('snapchat.redirectUri', 'SNAPCHAT_REDIRECT_URI'),
      response_type: 'code',
      scope: this.config.get<string>('snapchat.scopes') || 'snapchat-marketing-api',
    });
    return `${this.required('snapchat.oauthAuthorizeUrl', 'SNAPCHAT_OAUTH_AUTHORIZE_URL')}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date | null }> {
    const payload = await this.request<SnapchatTokenResponse>(this.required('snapchat.oauthTokenUrl', 'SNAPCHAT_OAUTH_TOKEN_URL'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: this.required('snapchat.clientId', 'SNAPCHAT_CLIENT_ID'), client_secret: this.required('snapchat.clientSecret', 'SNAPCHAT_CLIENT_SECRET'), redirect_uri: this.required('snapchat.redirectUri', 'SNAPCHAT_REDIRECT_URI') }).toString(),
    });
    if (!payload.access_token || !payload.refresh_token) throw new BadRequestException('Snapchat did not return tokens.');
    return { accessToken: payload.access_token, refreshToken: payload.refresh_token, expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null };
  }

  async listAdAccounts(accessToken: string): Promise<Array<{ id: string; name: string; organizationId: string | null }>> {
    const url = `${this.baseUrl}/me/adaccounts`;
    const payload = await this.request<SnapchatListResponse<SnapchatAdAccountResponse>>(url, { headers: this.authHeaders(accessToken) });
    return (payload.adaccounts ?? payload.data ?? []).map((item) => ({ id: item.ad_account_id ?? item.id ?? '', name: item.name ?? 'Snapchat Ad Account', organizationId: item.organization_id ?? null })).filter((item) => item.id);
  }

  async listLeadForms(adAccountId: string, accessToken: string): Promise<Array<{ id: string; name: string }>> {
    const url = `${this.baseUrl}/adaccounts/${encodeURIComponent(adAccountId)}/lead_forms`;
    const payload = await this.request<SnapchatListResponse<SnapchatFormResponse>>(url, { headers: this.authHeaders(accessToken) });
    return (payload.lead_forms ?? payload.data ?? []).map((item) => ({ id: item.form_id ?? item.id ?? '', name: item.form_name ?? item.name ?? 'Snapchat Lead Form' })).filter((item) => item.id);
  }

  async getLeadDetails(adAccountId: string, leadId: string, accessToken: string): Promise<SnapchatLeadDetails> {
    this.logger.log('Snapchat API request: lead details.');
    const url = `${this.baseUrl}/adaccounts/${encodeURIComponent(adAccountId)}/leads/${encodeURIComponent(leadId)}`;
    const payload = await this.request<SnapchatLeadDetails | { data?: SnapchatLeadDetails }>(url, { headers: this.authHeaders(accessToken) });
    this.logger.log('Snapchat API response received.');
    return 'data' in payload && payload.data ? payload.data : payload as SnapchatLeadDetails;
  }

  private get baseUrl(): string { return this.config.get<string>('snapchat.apiBaseUrl') || 'https://adsapi.snapchat.com/v1'; }
  private authHeaders(accessToken: string): HeadersInit { return { Authorization: `Bearer ${accessToken}` }; }
  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = (await response.json()) as T & { request_status?: string; message?: string; error?: { message?: string } };
    if (!response.ok || payload.request_status === 'ERROR') {
      this.logger.error(`Snapchat API Error. status=${response.status} message=${payload.error?.message ?? payload.message ?? 'Snapchat API request failed.'}`);
      throw new BadRequestException(payload.error?.message ?? payload.message ?? 'Snapchat API request failed.');
    }
    return payload;
  }
  private required(key: string, env: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new InternalServerErrorException(`${env} is not configured.`);
    return value;
  }
}
