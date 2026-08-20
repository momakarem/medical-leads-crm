import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SnapchatWebhookService } from '../application/services/snapchat-webhook.service';

@Controller('webhooks/snapchat')
export class SnapchatWebhooksController {
  constructor(private readonly webhook: SnapchatWebhookService) {}
  @Post()
  @HttpCode(200)
  receive(@Body() payload: unknown): Promise<{ success: true }> { return this.webhook.handle(payload as never); }
}
