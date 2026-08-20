import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ActivityType } from '../../../leads/domain/activity-type.enum';
import { LeadIngestionService } from '../../../leads/application/services/lead-ingestion.service';
import { SnapchatApiService, type SnapchatLeadDetails } from './snapchat-api.service';
import { SnapchatTokenEncryptionService } from './snapchat-token-encryption.service';

interface SnapchatWebhookPayload { lead_id?: string; ad_account_id?: string; form_id?: string; data?: { lead_id?: string; ad_account_id?: string; form_id?: string }; event?: { lead_id?: string; ad_account_id?: string; form_id?: string }; }

@Injectable()
export class SnapchatWebhookService {
  private readonly logger = new Logger(SnapchatWebhookService.name);
  constructor(private readonly prisma: PrismaService, private readonly api: SnapchatApiService, private readonly encryption: SnapchatTokenEncryptionService, private readonly ingestion: LeadIngestionService) {}
  async handle(payload: SnapchatWebhookPayload): Promise<{ success: true }> {
    this.logger.log('Snapchat Webhook Received.');
    const event = this.extract(payload);
    if (!event) return { success: true };
    await this.process(event).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown Snapchat webhook processing error.';
      this.logger.error(`Snapchat API Error. lead_id=${event.leadId} message=${message}`);
    });
    return { success: true };
  }
  private extract(payload: SnapchatWebhookPayload): { leadId: string; adAccountId: string; formId: string } | null {
    const source = payload.data ?? payload.event ?? payload;
    if (!source.lead_id || !source.ad_account_id || !source.form_id) { this.logger.warn('Snapchat webhook payload missing lead_id, ad_account_id, or form_id.'); return null; }
    return { leadId: source.lead_id, adAccountId: source.ad_account_id, formId: source.form_id };
  }
  private async process(event: { leadId: string; adAccountId: string; formId: string }): Promise<void> {
    const connection = await this.prisma.snapchatConnection.findFirst({ where: { adAccountId: event.adAccountId, formId: event.formId, isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!connection) { this.logger.warn(`No active Snapchat connection found for ad_account_id=${event.adAccountId} form_id=${event.formId}.`); return; }
    const accessToken = this.encryption.decrypt(connection.accessToken);
    const details = await this.api.getLeadDetails(event.adAccountId, event.leadId, accessToken);
    this.logger.log('Snapchat Lead Retrieved.');
    const mapped = this.mapLead(details, connection.formName);
    if (!mapped.name || !mapped.phone) { this.logger.warn(`Snapchat lead mapping failed. lead_id=${event.leadId}`); return; }
    const result = await this.ingestion.ingest({ name: mapped.name, phone: mapped.phone, sourceChannel: 'Snapchat', campaignName: mapped.campaignName, adName: mapped.adName, createdBy: connection.createdBy, activityType: ActivityType.LeadCreatedViaSnapchat, activityTitle: 'Lead Created via Snapchat', activityDescription: 'Lead created via Snapchat Lead Generation.', metadata: { ad_account_id: event.adAccountId, form_id: event.formId, lead_id: event.leadId, ad_name: mapped.adName ?? null, source_channel: 'Snapchat' } });
    this.logger.log(`Snapchat Lead Created. lead_id=${result.leadId}`);
  }
  private mapLead(details: SnapchatLeadDetails, formName: string): { name: string | null; phone: string | null; campaignName: string; adName?: string } {
    const fields = new Map((details.field_data ?? []).map((field) => [field.name, field.values?.[0]?.trim() ?? '']));
    return { name: details.full_name ?? details.name ?? fields.get('full_name') ?? fields.get('name') ?? null, phone: details.phone_number ?? details.phone ?? fields.get('phone_number') ?? fields.get('phone') ?? null, campaignName: formName, adName: fields.get('ad_name') || fields.get('ad') || undefined };
  }
}
