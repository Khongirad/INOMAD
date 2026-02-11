import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

async function getAuthToken(app: INestApplication, prefix: string): Promise<string> {
  const username = `${prefix}_${Date.now()}`;
  const password = 'TestPass123';

  const regRes = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ username, password });

  if (regRes.body.accessToken) return regRes.body.accessToken;

  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login-password')
    .send({ username, password });

  return loginRes.body.accessToken || '';
}

describe('ZAGS Service (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authToken = await getAuthToken(app, 'zags_e2e');
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Certificate Verification', () => {
    it('GET /api/zags/certificates/:number/verify — verify nonexistent certificate', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/zags/certificates/NONEXISTENT-CERT/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('My Marriages', () => {
    it('GET /api/zags/marriages/me — get my marriages (empty)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/zags/marriages/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });
});
