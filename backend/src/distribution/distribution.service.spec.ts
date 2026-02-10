import { Test, TestingModule } from '@nestjs/testing';
import { DistributionService } from './distribution.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

// Decimal-like mock
const d = (v: number) => ({
  equals: (o: number) => v === o,
  toNumber: () => v,
  toString: () => String(v),
});

describe('DistributionService', () => {
  let service: DistributionService;
  let prisma: any;

  const mockPool = {
    id: 'pool-1',
    totalEmission: d(2100000000000),
    citizenPool: d(1260000000000),
    stateTreasury: d(630000000000),
    peoplesFund: d(210000000000),
    perCitizenShare: d(8689),
    totalCitizens: 1000,
    totalDistributed: d(0),
    emissionDate: new Date(),
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      distributionPool: {
        findFirst: jest.fn().mockResolvedValue(mockPool),
        create: jest.fn().mockResolvedValue(mockPool),
        update: jest.fn(),
      },
      userDistribution: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<DistributionService>(DistributionService);
  });

  describe('getPoolStats', () => {
    it('should return stats when pool exists', async () => {
      const result = await service.getPoolStats();
      expect(result).toBeDefined();
      expect(result.totalEmission).toBe('2100000000000');
    });

    it('should return null when no pool', async () => {
      prisma.distributionPool.findFirst.mockResolvedValue(null);
      const result = await service.getPoolStats();
      expect(result).toBeNull();
    });
  });

  describe('getDistributionStatus', () => {
    it('should return null for unregistered user', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue(null);
      const result = await service.getDistributionStatus('u1');
      expect(result).toBeNull();
    });

    it('should return full status for registered user', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue({
        userId: 'u1',
        currentLevel: 'REGISTERED',
        totalReceived: d(100),
        totalAllocation: d(8689),
        remainingBalance: d(8589),
        unverifiedReceived: d(100),
        arbanVerifiedReceived: d(0),
        zunReceived: d(0),
        fullyReceived: d(0),
        firstDistributionAt: new Date(),
        lastDistributionAt: new Date(),
        fullyDistributedAt: null,
        user: { verificationLevel: 'UNVERIFIED' },
      });
      const result = await service.getDistributionStatus('u1');
      expect(result).toBeDefined();
      expect(result.verificationLevel).toBe('UNVERIFIED');
      expect(result.totalAllocation).toBe('8689');
    });
  });

  describe('registerCitizenForDistribution', () => {
    it('should skip already registered users', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue({ id: 'existing' });
      const result = await service.registerCitizenForDistribution('u1');
      expect(result).toBeDefined();
      expect(prisma.userDistribution.create).not.toHaveBeenCalled();
    });
  });
});
