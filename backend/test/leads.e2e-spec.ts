import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Lead CRUD (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string[];
  let managerCookie: string[];
  let agentCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    adminCookie = await login(app, 'admin@example.com', 'Admin123!');
    managerCookie = await login(app, 'manager@example.com', 'Manager123!');
    agentCookie = await login(app, 'agent@example.com', 'Agent123!');
  });

  afterAll(async () => { if (app) await app.close(); });

  it('creates, edits, deletes a lead, and writes activities', async () => {
    const treatment = await prisma.treatment.findFirstOrThrow({ where: { name: 'Dental' } });
    const created = await request(app.getHttpServer())
      .post('/leads')
      .set('Cookie', agentCookie)
      .send({ name: 'Test Lead', phone: '01111111111', sourceChannel: 'Meta', treatmentId: treatment.id })
      .expect(201);

    expect(created.body.id).toBeDefined();
    await request(app.getHttpServer())
      .patch(`/leads/${created.body.id}`)
      .set('Cookie', managerCookie)
      .send({ campaignName: 'Campaign A' })
      .expect(200);

    await request(app.getHttpServer()).delete(`/leads/${created.body.id}`).set('Cookie', adminCookie).expect(200);

    const activityTypes = await prisma.activity.findMany({ where: { leadId: created.body.id }, select: { type: true } });
    expect(activityTypes.map((activity) => activity.type)).toEqual(
      expect.arrayContaining([ActivityType.lead_created, ActivityType.lead_updated, ActivityType.lead_deleted]),
    );
  });

  it('searches by name and phone', async () => {
    const byName = await request(app.getHttpServer()).get('/leads?search=Ahmed').set('Cookie', adminCookie).expect(200);
    expect(byName.body.data.some((lead: { name: string }) => lead.name.includes('Ahmed'))).toBe(true);

    const byPhone = await request(app.getHttpServer()).get('/leads?phone=01010000002').set('Cookie', adminCookie).expect(200);
    expect(byPhone.body.data).toHaveLength(1);
  });

  it('filters by status and treatment', async () => {
    const dental = await prisma.treatment.findFirstOrThrow({ where: { name: 'Dental' } });
    const byStatus = await request(app.getHttpServer()).get('/leads?status=no_answer').set('Cookie', adminCookie).expect(200);
    expect(byStatus.body.data.every((lead: { status: string }) => lead.status === LeadStatus.no_answer)).toBe(true);

    const byTreatment = await request(app.getHttpServer()).get(`/leads?treatmentId=${dental.id}`).set('Cookie', adminCookie).expect(200);
    expect(byTreatment.body.data.every((lead: { treatmentId: string }) => lead.treatmentId === dental.id)).toBe(true);
  });

  it('prevents agent from updating and deleting leads', async () => {
    const lead = await prisma.lead.findFirstOrThrow({ where: { deletedAt: null } });
    await request(app.getHttpServer()).patch(`/leads/${lead.id}`).set('Cookie', agentCookie).send({ status: LeadStatus.interested }).expect(403);
    await request(app.getHttpServer()).delete(`/leads/${lead.id}`).set('Cookie', agentCookie).expect(403);
  });

  it('removes the duplicate flag when the matching original lead is deleted', async () => {
    const treatment = await prisma.treatment.findFirstOrThrow({ where: { name: 'Dental' } });
    const phone = '01019999991';
    const original = await request(app.getHttpServer())
      .post('/leads')
      .set('Cookie', adminCookie)
      .send({ name: 'Original Lead', phone, sourceChannel: 'Direct Call Manual', treatmentId: treatment.id })
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post('/leads')
      .set('Cookie', adminCookie)
      .send({ name: 'Duplicate Lead', phone, sourceChannel: 'Direct Call Manual', treatmentId: treatment.id })
      .expect(201);

    expect(duplicate.body.isDuplicate).toBe(true);
    await request(app.getHttpServer()).delete(`/leads/${original.body.id}`).set('Cookie', adminCookie).expect(200);

    const remaining = await request(app.getHttpServer()).get(`/leads/${duplicate.body.id}`).set('Cookie', adminCookie).expect(200);
    expect(remaining.body.isDuplicate).toBe(false);
    expect(remaining.body.duplicateOfLeadId).toBeNull();
    expect(remaining.body.duplicateCount).toBe(0);
  });
});

