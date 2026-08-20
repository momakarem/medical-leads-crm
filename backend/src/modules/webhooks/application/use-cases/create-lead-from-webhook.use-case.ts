import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { LeadIngestionService } from '../../../leads/application/services/lead-ingestion.service';
import { ActivityType } from '../../../leads/domain/activity-type.enum';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../../../treatments/application/ports/treatment.repository';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { UserRole } from '../../../users/domain/user-role.enum';
import type { WebhookLeadDto } from '../dto/webhook-lead.dto';
import type { WebhookLeadResponse } from '../dto/webhook-lead-response.dto';

@Injectable()
export class CreateLeadFromWebhookUseCase {
  private readonly logger = new Logger(CreateLeadFromWebhookUseCase.name);

  constructor(
    private readonly ingestion: LeadIngestionService,
    @Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(payload: WebhookLeadDto): Promise<WebhookLeadResponse> {
    this.logger.log('Webhook Request Received.');

    const creator = await this.users.findFirstActiveByRole(UserRole.Admin);
    if (!creator) throw new InternalServerErrorException('Webhook creator user is not configured.');

    const treatment = payload.treatment ? await this.treatments.findByName(payload.treatment) : null;
    const result = await this.ingestion.ingest({
      name: payload.name,
      phone: payload.phone,
      sourceChannel: payload.sourceChannel,
      campaignName: payload.campaignName || undefined,
      adName: payload.adName || undefined,
      arrivalTimestamp: payload.arrivalTimestamp,
      treatmentId: treatment?.id,
      createdBy: creator.id,
      activityType: ActivityType.LeadCreatedViaWebhook,
      activityTitle: 'Lead Created via Webhook',
      activityDescription: 'Lead created via Generic Webhook.',
      metadata: {
        source_channel: payload.sourceChannel,
        campaign_name: payload.campaignName ?? null,
        ad_name: payload.adName ?? null,
        arrival_timestamp: payload.arrivalTimestamp?.toISOString() ?? null,
        treatment: payload.treatment ?? null,
        treatment_id: treatment?.id ?? null,
      },
    });

    this.logger.log(`Webhook Lead Created. lead_id=${result.leadId}`);
    return { success: true, message: 'Lead created successfully.', lead_id: result.leadId };
  }
}
