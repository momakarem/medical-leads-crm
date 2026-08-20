import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Manual Lead Assignment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string[];
  let managerCookie: string[];
  let agentCookie: string[];
  let agentTwoCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    adminCookie = await login(app, 'admin@example.com', 'Admin123!');
    managerCookie = await login(app, 'manager@example.com', 'Manager123!');
    agentCookie = await login(app, 'agent@example.com', 'Agent123!');
    agentTwoCookie = await login(app, 'agent2@example.com', 'Agent123!');
  });

  afterAll(async () => { if (app) await app.close(); });

  it('assigns, reassigns, unassigns, enforces agent visibility, and writes history/activity records', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    const agent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@example.com' } });
    const agentTwo = await prisma.user.findUniqueOrThrow({ where: { email: 'agent2@example.com' } });
    const treatment = await prisma.treatment.findFirstOrThrow();
    const lead = await prisma.lead.create({
      data: {
        name: 'Assignment Test Lead',
        phone: '01015550000',
        sourceChannel: 'Meta',
        treatmentId: treatment.id,
        createdBy: admin.id,
      },
    });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/assign`)
      .set('Cookie', managerCookie)
      .send({ agent_id: agent.id })
      .expect(201)
      .expect(({ body }) => {
        expect(body.ownerAgentId).toBe(agent.id);
      });

    await request(app.getHttpServer())
      .get('/my/leads')
      .set('Cookie', agentCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((item: { id: string }) => item.id === lead.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/my/leads')
      .set('Cookie', agentTwoCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((item: { id: string }) => item.id === lead.id)).toBe(false);
      });

    await request(app.getHttpServer()).get(`/leads/${lead.id}`).set('Cookie', agentTwoCookie).expect(403);

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/assign`)
      .set('Cookie', adminCookie)
      .send({ agent_id: agentTwo.id })
      .expect(201)
      .expect(({ body }) => {
        expect(body.ownerAgentId).toBe(agentTwo.id);
      });

    await request(app.getHttpServer())
      .get('/my/leads')
      .set('Cookie', agentCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((item: { id: string }) => item.id === lead.id)).toBe(false);
      });

    await request(app.getHttpServer())
      .get('/my/leads')
      .set('Cookie', agentTwoCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((item: { id: string }) => item.id === lead.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/unassign`)
      .set('Cookie', managerCookie)
      .expect(201)
      .expect(({ body }) => {
        expect(body.ownerAgentId).toBeNull();
      });

    await request(app.getHttpServer())
      .get('/my/leads')
      .set('Cookie', agentTwoCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((item: { id: string }) => item.id === lead.id)).toBe(false);
      });

    await request(app.getHttpServer()).get(`/leads/${lead.id}`).set('Cookie', adminCookie).expect(200);

    const history = await prisma.leadAssignment.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: 'asc' } });
    expect(history).toHaveLength(3);
    expect(history[0].previousAgentId).toBeNull();
    expect(history[0].newAgentId).toBe(agent.id);
    expect(history[1].previousAgentId).toBe(agent.id);
    expect(history[1].newAgentId).toBe(agentTwo.id);
    expect(history[2].previousAgentId).toBe(agentTwo.id);
    expect(history[2].newAgentId).toBeNull();

    const activities = await prisma.activity.findMany({ where: { leadId: lead.id }, select: { type: true } });
    expect(activities.map((activity) => activity.type)).toEqual(
      expect.arrayContaining([ActivityType.lead_assigned, ActivityType.lead_reassigned, ActivityType.lead_unassigned]),
    );
  });

  it('prevents agents from assigning leads and rejects non-agent assignment targets', async () => {
    const lead = await prisma.lead.findFirstOrThrow({ where: { deletedAt: null } });
    const manager = await prisma.user.findUniqueOrThrow({ where: { email: 'manager@example.com' } });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/assign`)
      .set('Cookie', agentCookie)
      .send({ agent_id: manager.id })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/assign`)
      .set('Cookie', adminCookie)
      .send({ agent_id: manager.id })
      .expect(400);
  });
});