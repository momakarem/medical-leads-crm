import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Round Robin Assignment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerCookie: string[];
  let agents: Array<{ id: string; name: string }>;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    managerCookie = await login(app, 'manager@example.com', 'Manager123!');
    agents = await prepareThreeAgents();
  });

  afterAll(async () => { if (app) await app.close(); });

  async function prepareThreeAgents(): Promise<Array<{ id: string; name: string }>> {
    await prisma.user.updateMany({ where: { role: 'agent' }, data: { isActive: false } });
    const first = await prisma.user.update({
      where: { email: 'agent@example.com' },
      data: { name: 'Ahmed', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z') },
      select: { id: true, name: true },
    });
    const second = await prisma.user.update({
      where: { email: 'agent2@example.com' },
      data: { name: 'Mohammed', isActive: true, createdAt: new Date('2026-01-02T00:00:00.000Z') },
      select: { id: true, name: true },
    });
    const third = await prisma.user.upsert({
      where: { email: 'ali.agent@example.com' },
      create: {
        name: 'Ali',
        email: 'ali.agent@example.com',
        password: 'not-used',
        role: 'agent',
        isActive: true,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      update: { name: 'Ali', role: 'agent', isActive: true, createdAt: new Date('2026-01-03T00:00:00.000Z') },
      select: { id: true, name: true },
    });
    return [first, second, third];
  }

  async function resetRoundRobinData(method: 'manual' | 'round_robin' = 'round_robin'): Promise<void> {
    await prisma.securityLog.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.followUp.deleteMany();
    await prisma.leadTransfer.deleteMany();
    await prisma.leadAssignment.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.roundRobinState.deleteMany();
    await prisma.assignmentSettings.deleteMany();
    await prisma.assignmentSettings.create({ data: { assignmentMethod: method, isEnabled: true } });
    await prisma.roundRobinState.create({ data: { key: 'default' } });
  }

  async function createLead(index: number): Promise<{ id: string; ownerAgentId: string | null }> {
    const response = await request(app.getHttpServer())
      .post('/leads')
      .set('Cookie', managerCookie)
      .send({ name: `Round Robin Lead ${index}`, phone: `0102000${String(index).padStart(5, '0')}`, sourceChannel: 'Meta' })
      .expect(201);
    return response.body as { id: string; ownerAgentId: string | null };
  }

  it('assigns 12 leads evenly across 3 active agents in order', async () => {
    agents = await prepareThreeAgents();
    await resetRoundRobinData();

    const created = [] as Array<{ id: string; ownerAgentId: string | null }>;
    for (let index = 1; index <= 12; index += 1) created.push(await createLead(index));

    const expected = [
      agents[0].id, agents[1].id, agents[2].id,
      agents[0].id, agents[1].id, agents[2].id,
      agents[0].id, agents[1].id, agents[2].id,
      agents[0].id, agents[1].id, agents[2].id,
    ];
    expect(created.map((lead) => lead.ownerAgentId)).toEqual(expected);

    const assignments = await prisma.leadAssignment.findMany({ orderBy: { createdAt: 'asc' } });
    expect(assignments).toHaveLength(12);
    expect(assignments.every((assignment) => assignment.assignmentType === 'round_robin')).toBe(true);

    const autoActivities = await prisma.activity.findMany({ where: { type: ActivityType.lead_auto_assigned } });
    expect(autoActivities).toHaveLength(12);
  });

  it('skips inactive agents', async () => {
    agents = await prepareThreeAgents();
    await prisma.user.update({ where: { id: agents[1].id }, data: { isActive: false } });
    await resetRoundRobinData();

    const created = [] as Array<{ ownerAgentId: string | null }>;
    for (let index = 1; index <= 6; index += 1) created.push(await createLead(index));

    expect(created.map((lead) => lead.ownerAgentId)).toEqual([
      agents[0].id, agents[2].id,
      agents[0].id, agents[2].id,
      agents[0].id, agents[2].id,
    ]);
  });

  it('assigns all leads to the single active agent', async () => {
    agents = await prepareThreeAgents();
    await prisma.user.updateMany({ where: { role: 'agent', id: { not: agents[0].id } }, data: { isActive: false } });
    await resetRoundRobinData();

    const created = [] as Array<{ ownerAgentId: string | null }>;
    for (let index = 1; index <= 4; index += 1) created.push(await createLead(index));

    expect(created.every((lead) => lead.ownerAgentId === agents[0].id)).toBe(true);
  });

  it('creates leads as unassigned when no active agents exist', async () => {
    await prepareThreeAgents();
    await prisma.user.updateMany({ where: { role: 'agent' }, data: { isActive: false } });
    await resetRoundRobinData();

    const lead = await createLead(1);
    expect(lead.ownerAgentId).toBeNull();
    await expect(prisma.leadAssignment.count()).resolves.toBe(0);
    await expect(prisma.activity.count({ where: { type: ActivityType.lead_auto_assigned } })).resolves.toBe(0);
  });

  it('leaves leads unassigned in manual mode and exposes settings APIs', async () => {
    await prepareThreeAgents();
    await resetRoundRobinData('round_robin');

    await request(app.getHttpServer())
      .patch('/settings/assignment-method')
      .set('Cookie', managerCookie)
      .send({ method: 'manual' })
      .expect(200)
      .expect(({ body }) => expect(body.assignmentMethod).toBe('manual'));

    await request(app.getHttpServer())
      .get('/settings/assignment-method')
      .set('Cookie', managerCookie)
      .expect(200)
      .expect(({ body }) => expect(body.assignmentMethod).toBe('manual'));

    const lead = await createLead(1);
    expect(lead.ownerAgentId).toBeNull();
  });

  it('keeps concurrent lead creation balanced', async () => {
    agents = await prepareThreeAgents();
    await resetRoundRobinData();

    await Promise.all(Array.from({ length: 6 }, (_, index) => createLead(index + 1)));

    const grouped = await prisma.lead.groupBy({ by: ['ownerAgentId'], _count: { ownerAgentId: true } });
    const counts = new Map(grouped.map((row) => [row.ownerAgentId, row._count.ownerAgentId]));
    expect(counts.get(agents[0].id)).toBe(2);
    expect(counts.get(agents[1].id)).toBe(2);
    expect(counts.get(agents[2].id)).toBe(2);
  });
});