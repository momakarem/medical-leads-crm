import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GraphListResponse<T> { data?: T[]; error?: { message?: string; code?: number }; }
interface GraphTokenResponse { access_token?: string; expires_in?: number; error?: { message?: string; code?: number }; }
interface GraphPageResponse { id: string; name: string; access_token: string; }
interface GraphLeadFormResponse { id: string; name: string; }
export interface MetaLeadFieldData { name: string; values?: string[]; }
export interface MetaLeadDetails { id: string; created_time?: string; field_data?: MetaLeadFieldData[]; }

@Injectable()
export class MetaGraphApiService {
  private readonly logger = new Logger(MetaGraphApiService.name);
  private readonly graphBaseUrl = 'https://graph.facebook.com/v20.0';
  constructor(private readonly config: ConfigService) {}

  buildLoginUrl(): string {
    const params = new URLSearchParams({
      client_id: this.requiredConfig('meta.appId', 'META_APP_ID'),
      redirect_uri: this.requiredConfig('meta.redirectUri', 'META_REDIRECT_URI'),
      scope: 'pages_show_list,leads_retrieval,pages_manage_metadata',
      response_type: 'code',
    });
    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForUserToken(code: string): Promise<{ accessToken: string; expiresAt: Date | null }> {
    const response = await this.get<GraphTokenResponse>('/oauth/access_token', {
      client_id: this.requiredConfig('meta.appId', 'META_APP_ID'),
      client_secret: this.requiredConfig('meta.appSecret', 'META_APP_SECRET'),
      redirect_uri: this.requiredConfig('meta.redirectUri', 'META_REDIRECT_URI'),
      code,
    });
    if (!response.access_token) throw new BadRequestException('Facebook did not return an access token.');
    return { accessToken: response.access_token, expiresAt: response.expires_in ? new Date(Date.now() + response.expires_in * 1000) : null };
  }

  async getPages(userAccessToken: string): Promise<GraphPageResponse[]> {
    const response = await this.get<GraphListResponse<GraphPageResponse>>('/me/accounts', { fields: 'id,name,access_token', access_token: userAccessToken });
    return response.data ?? [];
  }

  async getLeadForms(pageId: string, pageAccessToken: string): Promise<GraphLeadFormResponse[]> {
    const response = await this.get<GraphListResponse<GraphLeadFormResponse>>(`/${pageId}/leadgen_forms`, { fields: 'id,name', access_token: pageAccessToken });
    return response.data ?? [];
  }

  async subscribePageToLeadgen(pageId: string, pageAccessToken: string): Promise<void> {
    await this.post(`/${pageId}/subscribed_apps`, { subscribed_fields: 'leadgen', access_token: pageAccessToken });
  }

  async getLeadDetails(leadgenId: string, pageAccessToken: string): Promise<MetaLeadDetails> {
    this.logger.log('Meta Graph API request: lead details.');
    const lead = await this.get<MetaLeadDetails>(`/${leadgenId}`, { fields: 'id,created_time,field_data', access_token: pageAccessToken });
    this.logger.log('Meta Graph API response received.');
    return lead;
  }

  private async get<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = new URL(`${this.graphBaseUrl}${path}`);
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
    return this.request<T>(url, { method: 'GET' });
  }

  private async post<T = unknown>(path: string, body: Record<string, string>): Promise<T> {
    const url = new URL(`${this.graphBaseUrl}${path}`);
    return this.request<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = (await response.json()) as T & { error?: { message?: string; code?: number } };
    if (!response.ok || payload.error) {
      this.logger.error(`Meta API Error. status=${response.status} code=${payload.error?.code ?? 'unknown'} message=${payload.error?.message ?? 'Unknown Meta API error'}`);
      throw new BadRequestException(payload.error?.message ?? 'Meta API request failed.');
    }
    return payload;
  }

  private requiredConfig(key: string, envName: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new InternalServerErrorException(`${envName} is not configured.`);
    return value;
  }
}
