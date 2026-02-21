import { Test, TestingModule } from '@nestjs/testing';
import { ArbadVerificationController } from './arbad-verification.controller';
import { ArbadVerificationService } from './arbad-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ArbadVerificationController', () => {
  let controller: ArbadVerificationController;
  const mockService = {
    verifyMember: jest.fn().mockResolvedValue({ id: 'v1' }),
    getVerificationMatrix: jest.fn().mockResolvedValue({ matrix: [] }),
    getVerificationProgress: jest.fn().mockResolvedValue({ progress: 0.5 }),
    isFullyVerified: jest.fn().mockResolvedValue(true),
    getUnverifiedMembers: jest.fn().mockResolvedValue([{ id: 'm1' }]),
    getMemberVerifications: jest.fn().mockResolvedValue([{ verifierId: 'u1' }]),
    revokeVerification: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ArbadVerificationController],
      providers: [{ provide: ArbadVerificationService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ArbadVerificationController);
  });

  const req = { user: { sub: 'u1' } };

  it('should be defined', () => expect(controller).toBeDefined());

  it('verifies a member', async () => {
    const r = await controller.verifyMember('a1', req, { memberId: 'm1', notes: 'OK' });
    expect(r).toBeDefined();
    expect(mockService.verifyMember).toHaveBeenCalledWith('a1', 'u1', 'm1', 'OK');
  });

  it('gets verification matrix', async () => {
    const r = await controller.getVerificationMatrix('a1');
    expect(r.matrix).toBeDefined();
  });

  it('gets verification progress', async () => {
    const r = await controller.getVerificationProgress('a1');
    expect(r).toBeDefined();
  });

  it('checks fully verified (true)', async () => {
    const r = await controller.isFullyVerified('a1');
    expect(r.isFullyVerified).toBe(true);
  });

  it('checks fully verified (false)', async () => {
    mockService.isFullyVerified.mockResolvedValueOnce(false);
    const r = await controller.isFullyVerified('a1');
    expect(r.isFullyVerified).toBe(false);
  });

  it('gets unverified members', async () => {
    const r = await controller.getUnverifiedMembers('a1', req);
    expect(r).toHaveLength(1);
  });

  it('gets member verifications', async () => {
    const r = await controller.getMemberVerifications('a1', 'm1');
    expect(r).toHaveLength(1);
  });

  it('revokes verification', async () => {
    const r = await controller.revokeVerification('a1', 'v1', req, { reason: 'Mistake' });
    expect(r.success).toBe(true);
  });
});
