import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadsModule } from '../leads/leads.module';
import { TiktokApiService } from './application/services/tiktok-api.service';
import { TiktokConnectionService } from './application/services/tiktok-connection.service';
import { TiktokOAuthSessionService } from './application/services/tiktok-oauth-session.service';
import { TiktokTokenEncryptionService } from './application/services/tiktok-token-encryption.service';
import { TiktokWebhookService } from './application/services/tiktok-webhook.service';
import { TiktokConnectionsController } from './presentation/tiktok-connections.controller';
import { TiktokWebhooksController } from './presentation/tiktok-webhooks.controller';

@Module({
  imports: [PrismaModule, LeadsModule],
  controllers: [TiktokConnectionsController, TiktokWebhooksController],
  providers: [TiktokApiService, TiktokConnectionService, TiktokOAuthSessionService, TiktokTokenEncryptionService, TiktokWebhookService],
})
export class TiktokModule {}

