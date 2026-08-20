import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Generic Lead Webhook (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
  });

  afterAll(async () => { if (app) await app.close(); });

  it('creates an unassigned lead and webhook activity for a valid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/leads')
      .send({
        name: ' Mohammed Ahmed ',
        phone: ' +201012345678 ',
        source_channel: ' Meta ',
        campaign_name: ' Hair Transplant Campaign ',
        treatment: 'Hair Transplant',
      })
      .expect(201);

    expect(response.body).toMatchObject({ success: true, message: 'Lead created successfully.' });
    expect(response.body.lead_id).toBeDefined();

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: response.body.lead_id } });
    const treatment = await prisma.treatment.findFirstOrThrow({ where: { name: 'Hair Transplant' } });
    expect(lead.name).toBe('Mohammed Ahmed');
    expect(lead.phone).toBe('+201012345678');
    expect(lead.sourceChannel).toBe('Meta');
    expect(lead.campaignName).toBe('Hair Transplant Campaign');
    expect(lead.status).toBe(LeadStatus.new);
    expect(lead.ownerAgentId).toBeNull();
    expect(lead.treatmentId).toBe(treatment.id);

    const activity = await prisma.activity.findFirst({ where: { leadId: lead.id, type: ActivityType.lead_created_via_webhook } });
    expect(activity).toBeTruthy();
    expect(activity?.metadata).toMatchObject({ source_channel: 'Meta', campaign_name: 'Hair Transplant Campaign' });
  });

  it('rejects missing phone', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/leads')
      .send({ name: 'Missing Phone', source_channel: 'Meta' })
      .expect(400);
  });

  it('rejects missing name', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/leads')
      .send({ phone: '+201012345678', source_channel: 'Meta' })
      .expect(400);
  });

  it('rejects missing source channel', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/leads')
      .send({ name: 'Missing Source', phone: '+201012345678' })
      .expect(400);
  });

  it('creates lead with null treatment when treatment name is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/leads')
      .send({ name: 'Unknown Treatment', phone: '+201099999999', source_channel: 'Zapier', treatment: 'Not Existing' })
      .expect(201);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: response.body.lead_id } });
    expect(lead.treatmentId).toBeNull();
    expect(lead.ownerAgentId).toBeNull();
  });
});