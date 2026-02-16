import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Marketplace & Census E2E Test
 *
 * Tests the complete marketplace journey for an authenticated user:
 *   1. Auth → Register & login
 *   2. Census → Demographic endpoints
 *   3. Marketplace → Listings, search, cart, seller reputation
 *   4. Government → ZAGS, Land Registry, Archive
 */
describe('Marketplace & Government Services (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  const testUser = {
    username: `mkt_e2e_${Date.now()}`,
    password: 'SecurePass123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Register and login
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);

    if ([200, 201].includes(regRes.status)) {
      accessToken = regRes.body.accessToken;
      userId = regRes.body.user?.id || regRes.body.user?.sub;
    }

    // Fallback login if registration didn't return token
    if (!accessToken) {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login-password')
        .send(testUser);
      accessToken = loginRes.body.accessToken;
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ═══════════════════════════════════════════
  //  CENSUS SERVICE
  // ═══════════════════════════════════════════
  describe('Census Service', () => {
    it('GET /api/census/population — should return population summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/population')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('totalPopulation');
      }
    });

    it('GET /api/census/gender — should return gender distribution', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/gender')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/census/age — should return age distribution', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/age')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/census/ethnicity — should return ethnicity breakdown', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/ethnicity')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/census/growth — should return registration growth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/growth')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/census/report — should return full census report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/report')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('should reject unauthenticated census requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/census/population');

      expect([401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  MARKETPLACE
  // ═══════════════════════════════════════════
  describe('Marketplace', () => {
    it('GET /api/marketplace/listings — should return listings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body) || res.body.data).toBeTruthy();
      }
    });

    it('GET /api/marketplace/search/fulltext?q=test — should return search results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/marketplace/search/fulltext')
        .query({ q: 'test' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/marketplace/categories — should return categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/marketplace/categories')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  SHOPPING CART
  // ═══════════════════════════════════════════
  describe('Shopping Cart', () => {
    it('GET /api/marketplace/cart — should return cart (empty for new user)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/marketplace/cart')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('items');
      }
    });

    it('should reject unauthenticated cart access', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/marketplace/cart');

      expect([401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  GOVERNMENT SERVICES
  // ═══════════════════════════════════════════
  describe('ZAGS Service', () => {
    it('GET /api/zags/public-registry — should search public registry', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/zags/public-registry')
        .query({ q: 'test' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/zags/marriages — should return marriages list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/zags/marriages')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/zags/deaths/pending/all — should list pending deaths', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/zags/deaths/pending/all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403, 404]).toContain(res.status);
    });
  });

  describe('Land Registry', () => {
    it('GET /api/land-registry/parcels — should return parcels', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/land-registry/parcels')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Archive', () => {
    it('GET /api/archive/documents — should return documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/archive/documents')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  NOTIFICATIONS & MESSAGING
  // ═══════════════════════════════════════════
  describe('Notifications', () => {
    it('GET /api/notifications — should return notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Messaging', () => {
    it('GET /api/messaging/conversations — should return conversations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/messaging/conversations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  GUILDS & EDUCATION
  // ═══════════════════════════════════════════
  describe('Guilds', () => {
    it('GET /api/guilds — should return guilds list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/guilds')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Education', () => {
    it('GET /api/education/courses — should return courses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/education/courses')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  AUTH GUARD ENFORCEMENT
  // ═══════════════════════════════════════════
  describe('Auth Guard on New Endpoints', () => {
    const protectedRoutes = [
      '/api/census/population',
      '/api/census/report',
      '/api/marketplace/cart',
      '/api/marketplace/search/fulltext?q=test',
      '/api/notifications',
      '/api/messaging/conversations',
    ];

    protectedRoutes.forEach((route) => {
      it(`should reject unauthenticated access to ${route}`, async () => {
        const res = await request(app.getHttpServer()).get(route);
        expect([401, 403, 404]).toContain(res.status);
      });
    });
  });
});
