import { Body, Controller, ForbiddenException, Get, HttpCode, Logger, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaWebhookService } from '../application/services/meta-webhook.service';

@Controller('webhooks/meta')
export class MetaWebhooksController {
  private readonly logger = new Logger(MetaWebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly metaWebhook: MetaWebhookService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ): string {
    const expectedToken = this.config.get<string>('meta.webhookVerifyToken');
    if (mode === 'subscribe' && expectedToken && verifyToken === expectedToken) {
      this.logger.log('Meta webhook verification succeeded.');
      return challenge;
    }
    this.logger.warn('Meta webhook verification failed.');
    throw new ForbiddenException('Meta webhook verification failed.');
  }

  @Post()
  @HttpCode(200)
  receive(@Body() payload: unknown): Promise<{ success: true }> {
    return this.metaWebhook.handle(payload as never);
  }
}

