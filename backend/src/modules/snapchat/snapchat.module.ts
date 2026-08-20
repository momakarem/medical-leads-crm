import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { LeadsModule } from '../leads/leads.module';
import { SnapchatApiService } from './application/services/snapchat-api.service';
import { SnapchatConnectionService } from './application/services/snapchat-connection.service';
import { SnapchatOAuthSessionService } from './application/services/snapchat-oauth-session.service';
import { SnapchatTokenEncryptionService } from './application/services/snapchat-token-encryption.service';
import { SnapchatWebhookService } from './application/services/snapchat-webhook.service';
import { SnapchatConnectionsController } from './presentation/snapchat-connections.controller';
import { SnapchatWebhooksController } from './presentation/snapchat-webhooks.controller';

@Module({
  imports: [PrismaModule, LeadsModule],
  controllers: [SnapchatConnectionsController, SnapchatWebhooksController],
  providers: [SnapchatApiService, SnapchatConnectionService, SnapchatOAuthSessionService, SnapchatTokenEncryptionService, SnapchatWebhookService],
})
export class SnapchatModule {}
