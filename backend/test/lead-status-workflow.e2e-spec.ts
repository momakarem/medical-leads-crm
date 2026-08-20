import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Lead status workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agentCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    agentCookie = await login(app, 'agent@example.com', 'Agent123!');
  });

  afterAll(async () => { if (app) await app.close(); });

  it('allows New -> Interested -> Booked -> Showed Up -> Paid and stores history/activity', async () => {
    const leadId = await createLead(LeadStatus.new, 'workflow-valid-001');

    await changeStatus(leadId, LeadStatus.interested, 200);
    await changeStatus(leadId, LeadStatus.booked, 200);
    await changeStatus(leadId, LeadStatus.showed_up, 200);
    await changeStatus(leadId, LeadStatus.paid, 200);

    const history = await request(app.getHttpServer())
      .get(`/leads/${leadId}/status-history`)
      .set('Cookie', agentCookie)
      .expect(200);

    expect(history.body.map((item: { newStatus: LeadStatus }) => item.newStatus)).toEqual([
      LeadStatus.interested,
      LeadStatus.booked,
      LeadStatus.showed_up,
      LeadStatus.paid,
    ]);

    const activities = await prisma.activity.findMany({ where: { leadId, type: ActivityType.status_changed } });
    expect(activities).toHaveLength(4);
  });

  it.each([
    [LeadStatus.new, LeadStatus.paid],
    [LeadStatus.new, LeadStatus.showed_up],
    [LeadStatus.interested, LeadStatus.paid],
    [LeadStatus.paid, LeadStatus.interested],
    [LeadStatus.not_interested, LeadStatus.booked],
  ])('rejects invalid transition %s -> %s', async (oldStatus, newStatus) => {
    const leadId = await createLead(oldStatus, `workflow-invalid-${oldStatus}-${newStatus}`);
    await changeStatus(leadId, newStatus, 400);
  });

  async function createLead(status: LeadStatus, phoneSuffix: string): Promise<string> {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    const lead = await prisma.lead.create({
      data: {
        name: `Workflow ${phoneSuffix}`,
        phone: phoneSuffix.slice(0, 25),
        sourceChannel: 'Meta',
        status,
        createdBy: admin.id,
      },
    });
    return lead.id;
  }

  async function changeStatus(leadId: string, status: LeadStatus, expectedStatus: number): Promise<void> {
    await request(app.getHttpServer())
      .post(`/leads/${leadId}/change-status`)
      .set('Cookie', agentCookie)
      .send({ status, note: `Move to ${status}` })
      .expect(expectedStatus);
  }
});