import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TiktokTokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; data?: { access_token?: string; refresh_token?: string; expires_in?: number }; message?: string; }
interface TiktokListResponse<T> { data?: { list?: T[] }; list?: T[]; message?: string; code?: number; }
interface TiktokAdvertiserResponse { advertiser_id?: string; id?: string; advertiser_name?: string; name?: string; }
interface TiktokFormResponse { form_id?: string; id?: string; form_name?: string; name?: string; }
export interface TiktokLeadDetails { lead_id?: string; id?: string; full_name?: string; name?: string; phone_number?: string; phone?: string; field_data?: Array<{ name: string; values?: string[] }>; }

@Injectable()
export class TiktokApiService {
  private readonly logger = new Logger(TiktokApiService.name);
  constructor(private readonly config: ConfigService) {}

  buildLoginUrl(): string {
    const authorizeUrl = this.required('tiktok.oauthAuthorizeUrl', 'TIKTOK_OAUTH_AUTHORIZE_URL');
    const params = new URLSearchParams({
      app_id: this.required('tiktok.appId', 'TIKTOK_APP_ID'),
      redirect_uri: this.required('tiktok.redirectUri', 'TIKTOK_REDIRECT_URI'),
      response_type: 'code',
      scope: this.config.get<string>('tiktok.scopes') || 'lead_management,advertiser_management',
    });
    return `${authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date | null }> {
    const tokenUrl = this.required('tiktok.oauthTokenUrl', 'TIKTOK_OAUTH_TOKEN_URL');
    const payload = await this.request<TiktokTokenResponse>(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.required('tiktok.appId', 'TIKTOK_APP_ID'),
        secret: this.required('tiktok.appSecret', 'TIKTOK_APP_SECRET'),
        auth_code: code,
        grant_type: 'authorization_code',
      }),
    });
    const accessToken = payload.access_token ?? payload.data?.access_token;
    const refreshToken = payload.refresh_token ?? payload.data?.refresh_token;
    const expiresIn = payload.expires_in ?? payload.data?.expires_in;
    if (!accessToken || !refreshToken) throw new BadRequestException('TikTok did not return tokens.');
    return { accessToken, refreshToken, expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null };
  }

  async listAdvertisers(accessToken: string): Promise<Array<{ id: string; name: string }>> {
    const url = `${this.baseUrl}/oauth2/advertiser/get/`;
    const payload = await this.request<TiktokListResponse<TiktokAdvertiserResponse>>(url, { headers: { 'Access-Token': accessToken } });
    return (payload.data?.list ?? payload.list ?? []).map((item) => ({ id: item.advertiser_id ?? item.id ?? '', name: item.advertiser_name ?? item.name ?? 'TikTok Advertiser' })).filter((item) => item.id);
  }

  async listLeadForms(advertiserId: string, accessToken: string): Promise<Array<{ id: string; name: string }>> {
    const url = `${this.baseUrl}/lead/form/list/?advertiser_id=${encodeURIComponent(advertiserId)}`;
    const payload = await this.request<TiktokListResponse<TiktokFormResponse>>(url, { headers: { 'Access-Token': accessToken } });
    return (payload.data?.list ?? payload.list ?? []).map((item) => ({ id: item.form_id ?? item.id ?? '', name: item.form_name ?? item.name ?? 'TikTok Lead Form' })).filter((item) => item.id);
  }

  async getLeadDetails(advertiserId: string, leadId: string, accessToken: string): Promise<TiktokLeadDetails> {
    this.logger.log('TikTok Graph/API request: lead details.');
    const url = `${this.baseUrl}/lead/get/?advertiser_id=${encodeURIComponent(advertiserId)}&lead_id=${encodeURIComponent(leadId)}`;
    const payload = await this.request<{ data?: TiktokLeadDetails } & TiktokLeadDetails>(url, { headers: { 'Access-Token': accessToken } });
    this.logger.log('TikTok Graph/API response received.');
    return payload.data ?? payload;
  }

  private get baseUrl(): string { return this.config.get<string>('tiktok.apiBaseUrl') || 'https://business-api.tiktok.com/open_api/v1.3'; }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = (await response.json()) as T & { message?: string; code?: number };
    if (!response.ok || (typeof payload.code === 'number' && payload.code !== 0)) {
      this.logger.error(`TikTok API Error. status=${response.status} code=${payload.code ?? 'unknown'} message=${payload.message ?? 'TikTok API request failed.'}`);
      throw new BadRequestException(payload.message ?? 'TikTok API request failed.');
    }
    return payload;
  }

  private required(key: string, env: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new InternalServerErrorException(`${env} is not configured.`);
    return value;
  }
}
