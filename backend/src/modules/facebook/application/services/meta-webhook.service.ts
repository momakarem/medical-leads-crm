import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadIngestionService } from '../../../leads/application/services/lead-ingestion.service';
import { ActivityType } from '../../../leads/domain/activity-type.enum';
import { FacebookTokenEncryptionService } from './facebook-token-encryption.service';
import { MetaGraphApiService, type MetaLeadDetails } from './meta-graph-api.service';

interface MetaWebhookPayload {
  entry?: Array<{ changes?: Array<{ field?: string; value?: { leadgen_id?: string; page_id?: string; form_id?: string } }> }>;
}
interface MetaLeadEvent { leadgenId: string; pageId: string; formId: string }

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphApiService,
    private readonly encryption: FacebookTokenEncryptionService,
    private readonly ingestion: LeadIngestionService,
  ) {}

  async handle(payload: MetaWebhookPayload): Promise<{ success: true }> {
    this.logger.log('Meta Webhook Received.');
    const events = this.extractLeadEvents(payload);
    for (const event of events) {
      await this.processLeadEvent(event).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown Meta webhook processing error.';
        this.logger.error(`Meta API Error. leadgen_id=${event.leadgenId} message=${message}`);
      });
    }
    return { success: true };
  }

  private extractLeadEvents(payload: MetaWebhookPayload): MetaLeadEvent[] {
    const events: MetaLeadEvent[] = [];
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;
        const value = change.value;
        if (!value?.leadgen_id || !value.page_id || !value.form_id) continue;
        this.logger.log(`leadgen_id received: ${value.leadgen_id}`);
        events.push({ leadgenId: value.leadgen_id, pageId: value.page_id, formId: value.form_id });
      }
    }
    return events;
  }

  private async processLeadEvent(event: MetaLeadEvent): Promise<void> {
    const connection = await this.prisma.facebookConnection.findFirst({ where: { pageId: event.pageId, formId: event.formId, isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!connection) { this.logger.warn(`No active Facebook connection found for page_id=${event.pageId} form_id=${event.formId}.`); return; }
    const details = await this.graph.getLeadDetails(event.leadgenId, this.encryption.decrypt(connection.accessToken));
    this.logger.log('Meta Lead Retrieved.');
    const mapped = this.mapLead(details, connection.formName);
    if (!mapped.name || !mapped.phone) { this.logger.warn(`Meta lead mapping failed. leadgen_id=${event.leadgenId}`); return; }
    const result = await this.ingestion.ingest({ name: mapped.name, phone: mapped.phone, sourceChannel: 'Meta', campaignName: mapped.campaignName, adName: mapped.adName, createdBy: connection.createdBy, activityType: ActivityType.LeadCreatedViaMeta, activityTitle: 'Lead Created via Meta', activityDescription: 'Lead created via Meta Lead Ads.', metadata: { page_id: event.pageId, form_id: event.formId, leadgen_id: event.leadgenId, ad_name: mapped.adName ?? null } });
    this.logger.log(`Meta Lead Created. lead_id=${result.leadId}`);
  }

  private mapLead(details: MetaLeadDetails, formName: string): { name: string | null; phone: string | null; campaignName: string; adName?: string } {
    const fields = new Map((details.field_data ?? []).map((field) => [field.name, field.values?.[0]?.trim() ?? '']));
    return { name: fields.get('full_name') || fields.get('name') || fields.get('first_name') || null, phone: fields.get('phone_number') || fields.get('phone') || null, campaignName: formName, adName: fields.get('ad_name') || fields.get('ad') || undefined };
  }
}
