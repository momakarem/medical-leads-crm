import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as argon2 from 'argon2';
import { ActivityType, LeadStatus, UserRole } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  return app;
}

export async function seedTestData(prisma: PrismaClient): Promise<void> {
  await prisma.agentCapacityHistory.deleteMany();
  await prisma.securityLog.deleteMany();
  await prisma.roundRobinState.deleteMany();
  await prisma.assignmentSettings.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.leadTransfer.deleteMany();
  await prisma.leadAssignment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.treatment.deleteMany();

  const users = [
    { name: 'Development Admin', email: 'admin@example.com', password: 'Admin123!', role: UserRole.admin },
    { name: 'Development Manager', email: 'manager@example.com', password: 'Manager123!', role: UserRole.manager },
    { name: 'Development Agent', email: 'agent@example.com', password: 'Agent123!', role: UserRole.agent },
    { name: 'Development Agent Two', email: 'agent2@example.com', password: 'Agent123!', role: UserRole.agent },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, password: await argon2.hash(user.password, { type: argon2.argon2id }) },
      update: { name: user.name, password: await argon2.hash(user.password, { type: argon2.argon2id }), role: user.role, isActive: true },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
  const agent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@example.com' } });
  const dental = await prisma.treatment.create({ data: { name: 'Dental' } });
  const dermatology = await prisma.treatment.create({ data: { name: 'Dermatology' } });
  await prisma.treatment.create({ data: { name: 'Hair Transplant' } });

  const leads = [
    { name: 'Ahmed Hassan', phone: '01010000001', sourceChannel: 'Meta', status: LeadStatus.new, treatmentId: dental.id },
    { name: 'Mona Ali', phone: '01010000002', sourceChannel: 'TikTok', status: LeadStatus.no_answer, treatmentId: dermatology.id },
    { name: 'Omar Samir', phone: '01010000003', sourceChannel: 'Google', status: LeadStatus.interested, treatmentId: dental.id },
  ];

  for (const leadData of leads) {
    const lead = await prisma.lead.create({ data: { ...leadData, ownerAgentId: agent.id, createdBy: admin.id } });
    await prisma.activity.create({ data: { leadId: lead.id, userId: admin.id, type: ActivityType.lead_created, title: 'Lead Created', description: 'Development Admin created this lead.' } });
  }
}

export async function login(app: INestApplication, email: string, password: string): Promise<string[]> {
  const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);
  const cookies = response.headers['set-cookie'];
  return Array.isArray(cookies) ? cookies : [cookies as string];
}

