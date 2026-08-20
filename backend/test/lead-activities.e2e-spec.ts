import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Lead activity timeline (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    adminCookie = await login(app, 'admin@example.com', 'Admin123!');
  });

  afterAll(async () => { if (app) await app.close(); });

  it('records create, update, status change, and delete activities newest first', async () => {
    const created = await request(app.getHttpServer())
      .post('/leads')
      .set('Cookie', adminCookie)
      .send({ name: 'Timeline Lead', phone: '01500000001', sourceChannel: 'Meta' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/leads/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({ phone: '01500000002' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/leads/${created.body.id}/change-status`)
      .set('Cookie', adminCookie)
      .send({ status: LeadStatus.interested, note: 'Patient is interested.' })
      .expect(201);

    await request(app.getHttpServer()).delete(`/leads/${created.body.id}`).set('Cookie', adminCookie).expect(200);

    const timeline = await request(app.getHttpServer())
      .get(`/leads/${created.body.id}/activities?page=1&limit=20`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(timeline.body.data.map((activity: { type: ActivityType }) => activity.type)).toEqual([
      ActivityType.lead_deleted,
      ActivityType.status_changed,
      ActivityType.lead_updated,
      ActivityType.lead_created,
    ]);
    expect(timeline.body.data[0].user.name).toBe('Development Admin');
    expect(timeline.body.data[1].metadata).toMatchObject({ old_status: LeadStatus.new, new_status: LeadStatus.interested });
    expect(timeline.body.data[2].metadata.changed_fields).toContain('phone');
  });
});