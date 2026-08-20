import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, FollowUpStatus, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Follow-up scheduling (e2e)', () => {
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

  it('creates follow-up, cancels previous pending, moves lead to follow_up, and logs activities', async () => {
    const leadId = await createLead('follow-up-main-001', LeadStatus.new);
    const firstDate = formatDate(addDays(1));
    const secondDate = formatDate(addDays(2));

    const first = await request(app.getHttpServer())
      .post(`/leads/${leadId}/follow-ups`)
      .set('Cookie', agentCookie)
      .send({ date: firstDate, time: '17:00', note: 'Call after work.' })
      .expect(201);

    expect(first.body.status).toBe(FollowUpStatus.pending);

    const updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    expect(updatedLead.status).toBe(LeadStatus.follow_up);

    const second = await request(app.getHttpServer())
      .post(`/leads/${leadId}/follow-ups`)
      .set('Cookie', agentCookie)
      .send({ date: secondDate, time: '18:00' })
      .expect(201);

    const followUps = await request(app.getHttpServer()).get(`/leads/${leadId}/follow-ups`).set('Cookie', agentCookie).expect(200);
    expect(followUps.body).toHaveLength(2);
    expect(followUps.body.find((item: { id: string }) => item.id === first.body.id).status).toBe(FollowUpStatus.cancelled);
    expect(followUps.body.find((item: { id: string }) => item.id === second.body.id).status).toBe(FollowUpStatus.pending);

    const activities = await prisma.activity.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } });
    expect(activities.map((activity) => activity.type)).toEqual(
      expect.arrayContaining([ActivityType.follow_up_created, ActivityType.follow_up_cancelled, ActivityType.status_changed]),
    );
  });

  it('lists today and overdue follow-ups', async () => {
    const todayLeadId = await createLead('follow-up-today-001', LeadStatus.new);
    const overdueLeadId = await createLead('follow-up-overdue-001', LeadStatus.new);

    await request(app.getHttpServer())
      .post(`/leads/${todayLeadId}/follow-ups`)
      .set('Cookie', agentCookie)
      .send({ date: formatDate(new Date()), time: '23:59' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/leads/${overdueLeadId}/follow-ups`)
      .set('Cookie', agentCookie)
      .send({ date: formatDate(addDays(-1)), time: '09:00' })
      .expect(201);

    const today = await request(app.getHttpServer()).get('/follow-ups/today').set('Cookie', agentCookie).expect(200);
    expect(today.body.some((item: { leadId: string }) => item.leadId === todayLeadId)).toBe(true);

    const overdue = await request(app.getHttpServer()).get('/follow-ups/overdue').set('Cookie', agentCookie).expect(200);
    expect(overdue.body.some((item: { leadId: string }) => item.leadId === overdueLeadId)).toBe(true);
  });

  it('completes and cancels follow-ups and records activities', async () => {
    const completeLeadId = await createLead('follow-up-complete-001', LeadStatus.new);
    const cancelLeadId = await createLead('follow-up-cancel-001', LeadStatus.new);

    const toComplete = await createFollowUp(completeLeadId, formatDate(addDays(3)), '11:00');
    const toCancel = await createFollowUp(cancelLeadId, formatDate(addDays(4)), '12:00');

    await request(app.getHttpServer()).patch(`/follow-ups/${toComplete}/complete`).set('Cookie', agentCookie).expect(200);
    await request(app.getHttpServer()).patch(`/follow-ups/${toCancel}/cancel`).set('Cookie', agentCookie).expect(200);

    const completed = await prisma.followUp.findUniqueOrThrow({ where: { id: toComplete } });
    const cancelled = await prisma.followUp.findUniqueOrThrow({ where: { id: toCancel } });
    expect(completed.status).toBe(FollowUpStatus.completed);
    expect(completed.completedAt).toBeTruthy();
    expect(cancelled.status).toBe(FollowUpStatus.cancelled);

    const activities = await prisma.activity.findMany({ where: { type: { in: [ActivityType.follow_up_completed, ActivityType.follow_up_cancelled] } } });
    expect(activities.length).toBeGreaterThanOrEqual(2);
  });

  async function createLead(phone: string, status: LeadStatus): Promise<string> {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    const lead = await prisma.lead.create({ data: { name: `Lead ${phone}`, phone, sourceChannel: 'Meta', status, createdBy: admin.id } });
    return lead.id;
  }

  async function createFollowUp(leadId: string, date: string, time: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/leads/${leadId}/follow-ups`)
      .set('Cookie', agentCookie)
      .send({ date, time })
      .expect(201);
    return response.body.id as string;
  }
});

function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}