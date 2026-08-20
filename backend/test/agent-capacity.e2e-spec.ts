import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Agent Capacity Limits (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerCookie: string[];
  let agents: Array<{ id: string; name: string }>;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    managerCookie = await login(app, 'manager@example.com', 'Manager123!');
    agents = await prepareAgents();
  });

  afterAll(async () => { if (app) await app.close(); });

  async function prepareAgents(maxActiveLeads = 50): Promise<Array<{ id: string; name: string }>> {
    await prisma.user.updateMany({ where: { role: 'agent' }, data: { isActive: false } });
    const first = await prisma.user.update({
      where: { email: 'agent@example.com' },
      data: { name: 'Ahmed', isActive: true, maxActiveLeads, createdAt: new Date('2026-01-01T00:00:00.000Z') },
      select: { id: true, name: true },
    });
    const second = await prisma.user.update({
      where: { email: 'agent2@example.com' },
      data: { name: 'Mohammed', isActive: true, maxActiveLeads, createdAt: new Date('2026-01-02T00:00:00.000Z') },
      select: { id: true, name: true },
    });
    const third = await prisma.user.upsert({
      where: { email: 'ali.capacity@example.com' },
      create: {
        name: 'Ali',
        email: 'ali.capacity@example.com',
        password: 'not-used',
        role: 'agent',
        isActive: true,
        maxActiveLeads,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      update: { name: 'Ali', role: 'agent', isActive: true, maxActiveLeads, createdAt: new Date('2026-01-03T00:00:00.000Z') },
      select: { id: true, name: true },
    });
    return [first, second, third];
  }

  async function resetRoundRobin(): Promise<void> {
    await prisma.agentCapacityHistory.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.followUp.deleteMany();
    await prisma.leadTransfer.deleteMany();
    await prisma.leadAssignment.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.roundRobinState.deleteMany();
    await prisma.assignmentSettings.deleteMany();
    await prisma.assignmentSettings.create({ data: { assignmentMethod: 'round_robin', isEnabled: true } });
    await prisma.roundRobinState.create({ data: { key: 'default' } });
  }

  async function createLead(index: number): Promise<{ id: string; ownerAgentId: string | null }> {
    const response = await request(app.getHttpServer())
      .post('/leads')
      .set('Cookie', managerCookie)
      .send({ name: `Capacity Lead ${index}`, phone: `0103000${String(index).padStart(5, '0')}`, sourceChannel: 'Meta' })
      .expect(201);
    return response.body as { id: string; ownerAgentId: string | null };
  }

  it('reports agent capacity and marks the agent as full at max active leads', async () => {
    agents = await prepareAgents(3);
    await resetRoundRobin();

    for (let index = 1; index <= 7; index += 1) await createLead(index);

    await request(app.getHttpServer())
      .get(`/agents/${agents[0].id}/capacity`)
      .set('Cookie', managerCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.agent_id).toBe(agents[0].id);
        expect(body.active_leads).toBe(3);
        expect(body.max_active_leads).toBe(3);
        expect(body.remaining_capacity).toBe(0);
        expect(body.is_full).toBe(true);
      });
  });

  it('skips a full agent and assigns the next lead to another available agent', async () => {
    agents = await prepareAgents(3);
    await resetRoundRobin();

    for (let index = 1; index <= 7; index += 1) await createLead(index);
    const eighth = await createLead(8);

    expect(eighth.ownerAgentId).toBe(agents[1].id);
    await expect(prisma.agentCapacityHistory.count({ where: { agentId: agents[0].id, type: 'agent_capacity_reached' } })).resolves.toBeGreaterThan(0);
  });

  it('makes capacity available again when a lead becomes paid', async () => {
    agents = await prepareAgents(3);
    await resetRoundRobin();

    for (let index = 1; index <= 9; index += 1) await createLead(index);
    const ahmedLead = await prisma.lead.findFirstOrThrow({ where: { ownerAgentId: agents[0].id } });
    await prisma.lead.update({ where: { id: ahmedLead.id }, data: { status: LeadStatus.paid } });

    const next = await createLead(10);
    expect(next.ownerAgentId).toBe(agents[0].id);

    await request(app.getHttpServer())
      .get(`/agents/${agents[0].id}/capacity`)
      .set('Cookie', managerCookie)
      .expect(200)
      .expect(({ body }) => expect(body.active_leads).toBe(3));
  });

  it('creates lead unassigned when all active agents are full', async () => {
    agents = await prepareAgents(1);
    await resetRoundRobin();

    await createLead(1);
    await createLead(2);
    await createLead(3);
    const unassigned = await createLead(4);

    expect(unassigned.ownerAgentId).toBeNull();
    await expect(prisma.activity.count({ where: { leadId: unassigned.id, type: ActivityType.lead_unassigned_no_capacity } })).resolves.toBe(1);
  });

  it('updates max active leads and records capacity history', async () => {
    agents = await prepareAgents(3);
    await resetRoundRobin();

    await request(app.getHttpServer())
      .patch(`/agents/${agents[0].id}/capacity`)
      .set('Cookie', managerCookie)
      .send({ max_active_leads: 10 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.max_active_leads).toBe(10);
        expect(body.remaining_capacity).toBe(10);
      });

    const history = await prisma.agentCapacityHistory.findFirst({ where: { agentId: agents[0].id, type: 'agent_capacity_updated' } });
    expect(history?.oldMaxActiveLeads).toBe(3);
    expect(history?.newMaxActiveLeads).toBe(10);
  });

  it('does not exceed capacity during simultaneous lead creation', async () => {
    agents = await prepareAgents(2);
    await resetRoundRobin();

    await Promise.all(Array.from({ length: 8 }, (_, index) => createLead(index + 1)));

    const counts = await prisma.lead.groupBy({
      by: ['ownerAgentId'],
      where: { ownerAgentId: { in: agents.map((agent) => agent.id) } },
      _count: { ownerAgentId: true },
    });
    const countByAgent = new Map(counts.map((row) => [row.ownerAgentId, row._count.ownerAgentId]));
    expect(countByAgent.get(agents[0].id)).toBeLessThanOrEqual(2);
    expect(countByAgent.get(agents[1].id)).toBeLessThanOrEqual(2);
    expect(countByAgent.get(agents[2].id)).toBeLessThanOrEqual(2);
    await expect(prisma.lead.count({ where: { ownerAgentId: null } })).resolves.toBe(2);
  });
});