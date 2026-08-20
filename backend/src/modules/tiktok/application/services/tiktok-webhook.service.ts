import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadIngestionService } from '../../../leads/application/services/lead-ingestion.service';
import { ActivityType } from '../../../leads/domain/activity-type.enum';
import { TiktokApiService, type TiktokLeadDetails } from './tiktok-api.service';
import { TiktokTokenEncryptionService } from './tiktok-token-encryption.service';

interface TiktokWebhookPayload { lead_id?: string; advertiser_id?: string; form_id?: string; data?: { lead_id?: string; advertiser_id?: string; form_id?: string }; event?: { lead_id?: string; advertiser_id?: string; form_id?: string } }

@Injectable()
export class TiktokWebhookService {
  private readonly logger = new Logger(TiktokWebhookService.name);
  constructor(private readonly prisma: PrismaService, private readonly api: TiktokApiService, private readonly encryption: TiktokTokenEncryptionService, private readonly ingestion: LeadIngestionService) {}

  async handle(payload: TiktokWebhookPayload): Promise<{ success: true }> {
    this.logger.log('TikTok Webhook Received.');
    const event = this.extract(payload);
    if (!event) return { success: true };
    await this.process(event).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown TikTok webhook processing error.';
      this.logger.error(`TikTok API Error. lead_id=${event.leadId} message=${message}`);
    });
    return { success: true };
  }

  private extract(payload: TiktokWebhookPayload): { leadId: string; advertiserId: string; formId: string } | null {
    const source = payload.data ?? payload.event ?? payload;
    if (!source.lead_id || !source.advertiser_id || !source.form_id) { this.logger.warn('TikTok webhook payload missing lead_id, advertiser_id, or form_id.'); return null; }
    return { leadId: source.lead_id, advertiserId: source.advertiser_id, formId: source.form_id };
  }

  private async process(event: { leadId: string; advertiserId: string; formId: string }): Promise<void> {
    const connection = await this.prisma.tiktokConnection.findFirst({ where: { advertiserId: event.advertiserId, formId: event.formId, isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!connection) { this.logger.warn(`No active TikTok connection found for advertiser_id=${event.advertiserId} form_id=${event.formId}.`); return; }
    const details = await this.api.getLeadDetails(event.advertiserId, event.leadId, this.encryption.decrypt(connection.accessToken));
    this.logger.log('TikTok Lead Retrieved.');
    const mapped = this.mapLead(details, connection.formName);
    if (!mapped.name || !mapped.phone) { this.logger.warn(`TikTok lead mapping failed. lead_id=${event.leadId}`); return; }
    const result = await this.ingestion.ingest({ name: mapped.name, phone: mapped.phone, sourceChannel: 'TikTok', campaignName: mapped.campaignName, adName: mapped.adName, createdBy: connection.createdBy, activityType: ActivityType.LeadCreatedViaTiktok, activityTitle: 'Lead Created via TikTok', activityDescription: 'Lead created via TikTok Lead Generation.', metadata: { advertiser_id: event.advertiserId, form_id: event.formId, lead_id: event.leadId, ad_name: mapped.adName ?? null } });
    this.logger.log(`TikTok Lead Created. lead_id=${result.leadId}`);
  }

  private mapLead(details: TiktokLeadDetails, formName: string): { name: string | null; phone: string | null; campaignName: string; adName?: string } {
    const fields = new Map((details.field_data ?? []).map((field) => [field.name, field.values?.[0]?.trim() ?? '']));
    return { name: details.full_name ?? details.name ?? fields.get('full_name') ?? fields.get('name') ?? null, phone: details.phone_number ?? details.phone ?? fields.get('phone_number') ?? fields.get('phone') ?? null, campaignName: formName, adName: fields.get('ad_name') || fields.get('ad') || undefined };
  }
}
