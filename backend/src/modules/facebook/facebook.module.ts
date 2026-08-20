import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadsModule } from '../leads/leads.module';
import { FacebookConnectionService } from './application/services/facebook-connection.service';
import { FacebookOAuthSessionService } from './application/services/facebook-oauth-session.service';
import { FacebookTokenEncryptionService } from './application/services/facebook-token-encryption.service';
import { MetaGraphApiService } from './application/services/meta-graph-api.service';
import { MetaWebhookService } from './application/services/meta-webhook.service';
import { FacebookConnectionsController } from './presentation/facebook-connections.controller';
import { MetaWebhooksController } from './presentation/meta-webhooks.controller';

@Module({
  imports: [PrismaModule, LeadsModule],
  controllers: [FacebookConnectionsController, MetaWebhooksController],
  providers: [
    FacebookConnectionService,
    FacebookOAuthSessionService,
    FacebookTokenEncryptionService,
    MetaGraphApiService,
    MetaWebhookService,
  ],
})
export class FacebookModule {}

