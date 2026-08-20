import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TiktokWebhookService } from '../application/services/tiktok-webhook.service';

@Controller('webhooks/tiktok')
export class TiktokWebhooksController {
  constructor(private readonly webhook: TiktokWebhookService) {}
  @Post()
  @HttpCode(200)
  receive(@Body() payload: unknown): Promise<{ success: true }> { return this.webhook.handle(payload as never); }
}
