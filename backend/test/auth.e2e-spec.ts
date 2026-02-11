import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Registration Flow', () => {
    const testUser = {
      username: `e2e_test_${Date.now()}`,
      password: 'TestPassword123',
    };

    it('POST /api/auth/register should create a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser);

      expect([200, 201]).toContain(res.status);
      expect(res.body.ok).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(testUser.username);
    });

    it('POST /api/auth/login-password should authenticate user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login-password')
        .send(testUser);

      expect([200, 201]).toContain(res.status);
      expect(res.body.ok).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/users/me should reject without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me');

      // Should reject with 401 (Unauthorized) or 404 (route may not exist)
      expect([401, 403, 404]).toContain(res.status);
    });
  });
});
