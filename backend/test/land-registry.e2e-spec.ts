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

describe('Land Registry (e2e)', () => {
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

    authToken = await getAuthToken(app, 'land_e2e');
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Cadastral Search', () => {
    it('GET /api/land-registry/cadastral/land-plots — list plots', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/land-registry/cadastral/land-plots')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });

    it('POST /api/land-registry/cadastral/land-plots/search/gps — GPS search', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/land-registry/cadastral/land-plots/search/gps')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          northEast: { lat: 52.0, lng: 108.0 },
          southWest: { lat: 51.0, lng: 107.0 },
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Ownership', () => {
    it('GET /api/land-registry/cadastral/ownerships/me — my ownerships', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/land-registry/cadastral/ownerships/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Leases', () => {
    it('GET /api/land-registry/cadastral/leases/me — my leases', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/land-registry/cadastral/leases/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Market Trends', () => {
    it('GET /api/land-registry/property/market/:region — get trends', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/land-registry/property/market/Central')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });
});
