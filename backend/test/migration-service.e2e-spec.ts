import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Helper: register + login and return auth token
 */
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

describe('Migration Service (e2e)', () => {
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

    authToken = await getAuthToken(app, 'migration_e2e');
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Passport Applications', () => {
    let applicationId: string;

    it('POST /api/migration-service/applications — create passport application', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/migration-service/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Test Citizen',
          dateOfBirth: '1990-01-01',
          placeOfBirth: 'Ulaanbaatar',
          nationality: 'Mongol',
          sex: 'Male',
          address: '123 Test Street',
          city: 'Ulaanbaatar',
          region: 'Central',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) {
        applicationId = res.body.id;
        expect(res.body.fullName).toBe('Test Citizen');
      }
    });

    it('GET /api/migration-service/applications/me — get my applications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/migration-service/applications/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });

    it('POST /api/migration-service/applications/:id/submit — submit application', async () => {
      if (!applicationId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/migration-service/applications/${applicationId}/submit`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /api/migration-service/lookup/:number — lookup nonexistent passport', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/migration-service/lookup/NONEXISTENT-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });
});
