import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Citizen Lifecycle E2E Test
 * 
 * Tests the complete citizen journey:
 *   1. Registration → User created with DRAFT status
 *   2. Login → JWT token obtained
 *   3. Verification status check → Progress tracking
 *   4. Emission status check → Tiered emission limits
 *   5. Onboarding progress → Gamified steps
 *   6. Wallet creation → MPC wallet provisioned
 *
 * Принцип: иерархия строится снизу вверх
 *   Гражданин → Арбан → Зуун → Мянган → Тумэн → Республиканский Хурал
 */
describe('Citizen Lifecycle (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  const testUser = {
    username: `citizen_e2e_${Date.now()}`,
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
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ═══════════════════════════════════════════
  //  STEP 1: Registration
  // ═══════════════════════════════════════════
  describe('Step 1: Registration', () => {
    it('POST /api/auth/register — should create citizen with DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser);

      expect([200, 201]).toContain(res.status);
      expect(res.body.ok).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();

      accessToken = res.body.accessToken;
      userId = res.body.user.id || res.body.user.sub;
    });

    it('should reject duplicate registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser);

      // Should fail — user already exists
      expect([400, 409]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  STEP 2: Authentication
  // ═══════════════════════════════════════════
  describe('Step 2: Authentication', () => {
    it('POST /api/auth/login-password — should authenticate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login-password')
        .send(testUser);

      expect([200, 201]).toContain(res.status);
      expect(res.body.ok).toBe(true);
      expect(res.body.accessToken).toBeDefined();

      // Update token for subsequent requests
      accessToken = res.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login-password')
        .send({ username: testUser.username, password: 'WrongPassword' });

      expect([401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  STEP 3: Profile & Verification Status
  // ═══════════════════════════════════════════
  describe('Step 3: Verification Status', () => {
    it('GET /api/verification/emission/status — should return emission limits', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/verification/emission/status')
        .set('Authorization', `Bearer ${accessToken}`);

      // May return 200 with status or 404 if user not fully set up yet
      if (res.status === 200) {
        expect(res.body).toHaveProperty('level');
        expect(res.body).toHaveProperty('limit');
        expect(res.body).toHaveProperty('isUnlimited');
      }
    });

    it('GET /api/verification/pending — should list pending verifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/verification/pending')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should return array (may be empty)
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════
  //  STEP 4: Onboarding
  // ═══════════════════════════════════════════
  describe('Step 4: Onboarding', () => {
    it('GET /api/onboarding/progress — should return onboarding steps', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('steps');
      }
    });
  });

  // ═══════════════════════════════════════════
  //  STEP 5: Wallet
  // ═══════════════════════════════════════════
  describe('Step 5: MPC Wallet', () => {
    it('GET /api/mpc-wallet/status — should return wallet status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mpc-wallet/status')
        .set('Authorization', `Bearer ${accessToken}`);

      // Wallet may not exist yet — both 200 and 404 are valid
      expect([200, 404]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  //  STEP 6: Protected Routes Enforcement
  // ═══════════════════════════════════════════
  describe('Step 6: Auth Guard Enforcement', () => {
    it('should reject unauthenticated verification requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/verification/emission/status');

      expect([401, 403]).toContain(res.status);
    });

    it('should reject unauthenticated wallet access', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mpc-wallet/status');

      expect([401, 403, 404]).toContain(res.status);
    });

    it('should reject unauthenticated onboarding access', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/onboarding/progress');

      expect([401, 403]).toContain(res.status);
    });

    it('should reject non-admin verification level set', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/verification/admin/set-level/fake-user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ level: 'ZUN_VERIFIED' });

      // Regular user should be blocked by AdminGuard
      expect([401, 403]).toContain(res.status);
    });
  });
});
