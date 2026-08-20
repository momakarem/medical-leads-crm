import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { createTestApp, login, seedTestData } from './test-app';

jest.setTimeout(30000);

describe('Auth and role test endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedTestData(prisma);
  });

  afterAll(async () => { if (app) await app.close(); });

  it('logs in successfully', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin@example.com', password: 'Admin123!' }).expect(201);
    expect(response.body.user.email).toBe('admin@example.com');
    expect(response.body.user.password).toBeUndefined();
  });

  it('rejects invalid login', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin@example.com', password: 'wrong' }).expect(401);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/leads').expect(401);
  });

  it('enforces role permissions', async () => {
    const admin = await login(app, 'admin@example.com', 'Admin123!');
    const manager = await login(app, 'manager@example.com', 'Manager123!');
    const agent = await login(app, 'agent@example.com', 'Agent123!');

    await request(app.getHttpServer()).get('/admin/test').set('Cookie', admin).expect(200);
    await request(app.getHttpServer()).get('/manager/test').set('Cookie', admin).expect(200);
    await request(app.getHttpServer()).get('/agent/test').set('Cookie', admin).expect(200);

    await request(app.getHttpServer()).get('/admin/test').set('Cookie', manager).expect(403);
    await request(app.getHttpServer()).get('/manager/test').set('Cookie', manager).expect(200);
    await request(app.getHttpServer()).get('/agent/test').set('Cookie', manager).expect(200);

    await request(app.getHttpServer()).get('/admin/test').set('Cookie', agent).expect(403);
    await request(app.getHttpServer()).get('/manager/test').set('Cookie', agent).expect(403);
    await request(app.getHttpServer()).get('/agent/test').set('Cookie', agent).expect(200);
  });
});

