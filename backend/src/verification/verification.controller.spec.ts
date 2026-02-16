import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { TieredVerificationService } from './tiered-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('VerificationController', () => {
  let controller: VerificationController;
  const req = { user: { sub: 'u1', id: 'u1' } };

  beforeEach(async () => {
    const mockVerif = {
      getPendingUsers: jest.fn().mockResolvedValue([]),
      verifyUser: jest.fn().mockResolvedValue({ id: 'v1' }),
      getVerificationChain: jest.fn().mockResolvedValue([]),
      getVerifierStats: jest.fn().mockResolvedValue({ verified: 5 }),
      revokeVerification: jest.fn().mockResolvedValue({ id: 'v1' }),
    };
    const mockTiered = {
      getEmissionStatus: jest.fn().mockResolvedValue({ limit: 100, used: 10 }),
      requestVerificationUpgrade: jest.fn().mockResolvedValue({ id: 'r1' }),
      getMyRequests: jest.fn().mockResolvedValue([]),
      getPendingRequests: jest.fn().mockResolvedValue([]),
      reviewVerificationRequest: jest.fn().mockResolvedValue({ id: 'r1' }),
      setVerificationLevel: jest.fn().mockResolvedValue({ id: 'u1' }),
    };
    const module = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        { provide: VerificationService, useValue: mockVerif },
        { provide: TieredVerificationService, useValue: mockTiered },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(VerificationController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('gets pending users', async () => { await controller.getPendingUsers(); });
  it('verifies user', async () => { await controller.verifyUser('u2', req, '127.0.0.1', 'agent', {}); });
  it('gets verification chain', async () => { await controller.getVerificationChain('u1'); });
  it('gets my stats', async () => { await controller.getMyStats(req); });
  it('revokes verification', async () => { await controller.revokeVerification('v1', req, { reason: 'fraud' }); });
  it('gets emission status', async () => { await controller.getEmissionStatus(req); });
  it('requests upgrade', async () => {
    await controller.requestUpgrade(req, { requestedLevel: 'LEVEL_2' as any, justification: 'need it' });
  });
  it('gets my requests', async () => { await controller.getMyRequests(req); });
  it('gets pending requests', async () => { await controller.getPendingRequests(); });
  it('reviews request', async () => {
    await controller.reviewRequest('r1', req, { approved: true, notes: 'ok' });
  });
  it('sets verification level', async () => {
    await controller.setVerificationLevel('u1', req, { level: 'LEVEL_3' as any });
  });
});
