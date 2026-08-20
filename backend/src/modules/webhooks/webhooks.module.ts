import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { TreatmentsModule } from '../treatments/treatments.module';
import { UsersModule } from '../users/users.module';
import { CreateLeadFromWebhookUseCase } from './application/use-cases/create-lead-from-webhook.use-case';
import { WebhooksController } from './presentation/webhooks.controller';

@Module({
  imports: [LeadsModule, TreatmentsModule, UsersModule],
  controllers: [WebhooksController],
  providers: [CreateLeadFromWebhookUseCase],
})
export class WebhooksModule {}