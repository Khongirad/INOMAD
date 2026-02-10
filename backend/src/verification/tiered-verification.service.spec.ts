import { Test, TestingModule } from '@nestjs/testing';
import { TieredVerificationService } from './tiered-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { DistributionService } from '../distribution/distribution.service';

describe('TieredVerificationService', () => {
  let service: TieredVerificationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      verificationRequest: {
        create: jest.fn().mockResolvedValue({ id: 'vr1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const distribution = { distributeByLevel: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TieredVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: DistributionService, useValue: distribution },
      ],
    }).compile();
    service = module.get<TieredVerificationService>(TieredVerificationService);
  });

  it('getEmissionLimit returns correct limits', () => {
    expect(service.getEmissionLimit('UNVERIFIED' as any)).toBeGreaterThanOrEqual(0);
    expect(service.getEmissionLimit('FULLY_VERIFIED' as any)).toBeGreaterThan(0);
  });

  it('getPendingRequests returns list', async () => {
    await service.getPendingRequests();
    expect(prisma.verificationRequest.findMany).toHaveBeenCalled();
  });

  it('getMyRequests returns user requests', async () => {
    await service.getMyRequests('u1');
    expect(prisma.verificationRequest.findMany).toHaveBeenCalled();
  });
});
