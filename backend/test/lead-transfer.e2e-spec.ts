import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Lead Transfer (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerCookie: string[];
  let agentCookie: string[];
  let agentTwoCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    managerCookie = await login(app, 'manager@example.com', 'Manager123!');
    agentCookie = await login(app, 'agent@example.com', 'Agent123!');
    agentTwoCookie = await login(app, 'agent2@example.com', 'Agent123!');
  });

  afterAll(async () => { if (app) await app.close(); });

  async function createOwnedLead() {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    const agent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@example.com' } });
    const lead = await prisma.lead.create({
      data: {
        name: 'Transfer Test Lead',
        phone: '01017770000',
        sourceChannel: 'Meta',
        ownerAgentId: agent.id,
        createdBy: admin.id,
      },
    });
    return { lead, agent };
  }

  it('transfers a lead, updates ownership, writes transfer history and activity, and updates access immediately', async () => {
    const { lead, agent } = await createOwnedLead();
    const agentTwo = await prisma.user.findUniqueOrThrow({ where: { email: 'agent2@example.com' } });

    await request(app.getHttpServer()).get(`/leads/${lead.id}`).set('Cookie', agentCookie).expect(200);
    await request(app.getHttpServer()).get(`/leads/${lead.id}`).set('Cookie', agentTwoCookie).expect(403);

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/transfer`)
      .set('Cookie', managerCookie)
      .send({ new_agent_id: agentTwo.id, reason: 'Patient requested another representative.' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.ownerAgentId).toBe(agentTwo.id);
      });

    const updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.ownerAgentId).toBe(agentTwo.id);

    const transfers = await prisma.leadTransfer.findMany({ where: { leadId: lead.id } });
    expect(transfers).toHaveLength(1);
    expect(transfers[0].previousAgentId).toBe(agent.id);
    expect(transfers[0].newAgentId).toBe(agentTwo.id);
    expect(transfers[0].reason).toBe('Patient requested another representative.');

    const activity = await prisma.activity.findFirst({ where: { leadId: lead.id, type: ActivityType.lead_transferred } });
    expect(activity).toBeTruthy();

    await request(app.getHttpServer()).get(`/leads/${lead.id}`).set('Cookie', agentCookie).expect(403);
    await request(app.getHttpServer()).get(`/leads/${lead.id}`).set('Cookie', agentTwoCookie).expect(200);
  });

  it('prevents agents from transferring leads', async () => {
    const { lead } = await createOwnedLead();
    const agentTwo = await prisma.user.findUniqueOrThrow({ where: { email: 'agent2@example.com' } });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/transfer`)
      .set('Cookie', agentCookie)
      .send({ new_agent_id: agentTwo.id })
      .expect(403);
  });

  it('rejects transfer to inactive agent and to the same agent', async () => {
    const { lead, agent } = await createOwnedLead();
    const inactive = await prisma.user.create({
      data: {
        name: 'Inactive Agent',
        email: 'inactive-agent@example.com',
        password: 'x',
        role: 'agent',
        isActive: false,
      },
    });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/transfer`)
      .set('Cookie', managerCookie)
      .send({ new_agent_id: inactive.id })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/transfer`)
      .set('Cookie', managerCookie)
      .send({ new_agent_id: agent.id })
      .expect(400);
  });

  it('returns transfer history for manager', async () => {
    const { lead } = await createOwnedLead();
    const agentTwo = await prisma.user.findUniqueOrThrow({ where: { email: 'agent2@example.com' } });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/transfer`)
      .set('Cookie', managerCookie)
      .send({ new_agent_id: agentTwo.id, reason: 'History test' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/leads/${lead.id}/transfers`)
      .set('Cookie', managerCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].newAgent.name).toBe('Development Agent Two');
        expect(body[0].reason).toBe('History test');
      });
  });
});