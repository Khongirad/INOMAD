import { Test, TestingModule } from '@nestjs/testing';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CentralBankAuthGuard } from '../central-bank/central-bank-auth.guard';

describe('DistributionController (distribution/)', () => {
  let controller: DistributionController;
  const mockService = {
    initializePool: jest.fn().mockResolvedValue({ poolId: 'p1', totalEmission: 2100000000000 }),
    getDistributionStatus: jest.fn().mockResolvedValue({ claimed: true, amount: 400 }),
    getPoolStats: jest.fn().mockResolvedValue({ totalDistributed: 1000, remaining: 9000 }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DistributionController],
      providers: [{ provide: DistributionService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(CentralBankAuthGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(DistributionController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('initializes pool', async () => {
    const r = await controller.initializePool({
      totalEmission: 2100000000000,
      citizenPercent: 60,
      statePercent: 30,
      fundPercent: 10,
      estimatedCitizens: 500,
    });
    expect(r.ok).toBe(true);
    expect(r.poolId).toBe('p1');
  });

  it('gets status when user has distribution', async () => {
    const r = await controller.getStatus({ user: { sub: 'u1' } });
    expect(r.ok).toBe(true);
    expect(r.ok).toBe(true);
  });

  it('gets status when user not registered', async () => {
    mockService.getDistributionStatus.mockResolvedValueOnce(null);
    const r = await controller.getStatus({ user: { sub: 'u2' } });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('not registered');
  });

  it('gets pool stats', async () => {
    const r = await controller.getPoolStats();
    expect(r.ok).toBe(true);
  });

  it('gets pool stats when not initialized', async () => {
    mockService.getPoolStats.mockResolvedValueOnce(null);
    const r = await controller.getPoolStats();
    expect(r.ok).toBe(false);
    expect(r.message).toContain('not initialized');
  });
});
