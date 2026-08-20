import { BadRequestException, Body, Controller, Logger, Post } from '@nestjs/common';
import { WebhookLeadDto } from '../application/dto/webhook-lead.dto';
import type { WebhookLeadResponse } from '../application/dto/webhook-lead-response.dto';
import { CreateLeadFromWebhookUseCase } from '../application/use-cases/create-lead-from-webhook.use-case';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly createLeadFromWebhook: CreateLeadFromWebhookUseCase) {}

  @Post('leads')
  async createLead(@Body() dto: WebhookLeadDto): Promise<WebhookLeadResponse> {
    if (!dto.source_channel?.trim()) throw new BadRequestException('source_channel is required.');
    try {
      return await this.createLeadFromWebhook.execute(dto);
    } catch (error) {
      this.logger.warn('Webhook Validation Failed or processing failed.');
      throw error;
    }
  }

  @Post('google')
  async createGoogleLead(@Body() dto: WebhookLeadDto): Promise<WebhookLeadResponse> {
    dto.source_channel = dto.source_channel || 'Google';
    try {
      return await this.createLeadFromWebhook.execute(dto);
    } catch (error) {
      this.logger.warn('Google Webhook Validation Failed or processing failed.');
      throw error;
    }
  }
}
