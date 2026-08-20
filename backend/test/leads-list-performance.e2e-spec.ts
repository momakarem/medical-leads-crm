import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ActivityType, LeadStatus } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(60000);

describe('Leads list performance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string[];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
    await seedAdditionalLeads(prisma, 500);
    adminCookie = await login(app, 'admin@example.com', 'Admin123!');
  });

  afterAll(async () => { if (app) await app.close(); });

  it('measures first page, search, filters, and pagination speed', async () => {
    await measure('/leads?page=1&limit=20&sort=created_desc', 'first_page');
    await measure('/leads?page=1&limit=20&search=Performance Lead 050', 'search_name');
    await measure('/leads?page=1&limit=20&search=01200000050', 'search_phone');
    await measure('/leads?page=1&limit=20&status=new', 'filter_status');
    await measure('/leads?page=1&limit=20&source=Meta', 'filter_source');
    await measure('/leads?page=5&limit=50&sort=name_asc', 'pagination_and_sort');
  });

  async function measure(path: string, label: string): Promise<void> {
    const startedAt = performance.now();
    const response = await request(app.getHttpServer()).get(path).set('Cookie', adminCookie).expect(200);
    const responseTimeMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const queryTimeMs = response.body.meta.queryTimeMs;
    console.info(`[leads-list-performance] ${label}: response=${responseTimeMs}ms db=${queryTimeMs}ms rows=${response.body.data.length}`);
    expect(response.body.data.length).toBeLessThanOrEqual(response.body.meta.limit);
  }
});

async function seedAdditionalLeads(prisma: PrismaService, count: number): Promise<void> {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
  const agent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@example.com' } });
  const treatments = await prisma.treatment.findMany({ orderBy: { name: 'asc' } });
  const statuses = [
    LeadStatus.new,
    LeadStatus.no_answer,
    LeadStatus.interested,
    LeadStatus.not_interested,
    LeadStatus.booked,
    LeadStatus.paid,
    LeadStatus.showed_up,
    LeadStatus.follow_up,
  ];
  const sources = ['Meta', 'TikTok', 'Snapchat', 'Google', 'WhatsApp', 'Direct Call', 'Other'];

  for (let index = 1; index <= count; index += 1) {
    const padded = String(index).padStart(3, '0');
    const phone = `012${String(index).padStart(8, '0')}`;
    const existing = await prisma.lead.findFirst({ where: { phone, deletedAt: null } });
    if (existing) continue;

    const lead = await prisma.lead.create({
      data: {
        name: `Performance Lead ${padded}`,
        phone,
        sourceChannel: sources[index % sources.length],
        campaignName: `Performance Campaign ${Math.ceil(index / 50)}`,
        status: statuses[index % statuses.length],
        treatmentId: treatments[index % treatments.length]?.id,
        ownerAgentId: agent.id,
        createdBy: admin.id,
      },
    });
    await prisma.activity.create({ data: { leadId: lead.id, userId: admin.id, type: ActivityType.lead_created, title: 'Lead Created', description: 'Development Admin created this lead.' } });
  }
}