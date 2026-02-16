import { Test, TestingModule } from '@nestjs/testing';
import { DistributionService } from './distribution.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('DistributionService', () => {
  let service: DistributionService;
  let prisma: any;

  const d = (v: number) => new Decimal(v);

  const mockPool = {
    id: 'pool1', totalEmission: d(2100000000000), citizenPool: d(1260000000000),
    stateTreasury: d(630000000000), peoplesFund: d(210000000000),
    perCitizenShare: d(8689.65), totalCitizens: 100, totalDistributed: d(50000),
    status: 'ACTIVE', emissionDate: new Date(), emissionTxHash: '0xTX',
  };

  const mockDistribution = {
    userId: 'u1', totalAllocation: d(8689.65),
    totalReceived: d(100), remainingBalance: d(8589.65),
    unverifiedReceived: d(100), arbanVerifiedReceived: d(0),
    zunReceived: d(0), fullyReceived: d(0),
    firstDistributionAt: new Date(), lastDistributionAt: new Date(),
    fullyDistributedAt: null,
    user: { verificationLevel: 'UNVERIFIED' },
  };

  beforeEach(async () => {
    process.env.CENTRAL_BANK_WALLET_ADDRESS = '0xCB';

    const mockPrisma = {
      distributionPool: {
        findFirst: jest.fn().mockResolvedValue(mockPool),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'pool-new', ...data }),
        ),
        update: jest.fn().mockResolvedValue(mockPool),
      },
      userDistribution: {
        findUnique: jest.fn().mockResolvedValue(mockDistribution),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'ud-new', ...data }),
        ),
        update: jest.fn().mockResolvedValue(mockDistribution),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', walletAddress: '0xWALLET' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: {} },
      ],
    }).compile();
    service = module.get(DistributionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('initializePool', () => {
    it('creates pool with allocations', async () => {
      prisma.distributionPool.findFirst.mockResolvedValue(null);
      const r = await service.initializePool(2100000000000, 60, 30, 10, 145000000);
      expect(prisma.distributionPool.create).toHaveBeenCalled();
      expect(r.poolId).toBeDefined();
      expect(r.estimatedCitizens).toBe(145000000);
    });

    it('throws if pool already exists', async () => {
      await expect(
        service.initializePool(2100000000000, 60, 30, 10, 145000000),
      ).rejects.toThrow('already initialized');
    });
  });

  describe('registerCitizenForDistribution', () => {
    it('registers new citizen and distributes initial UNVERIFIED amount', async () => {
      prisma.userDistribution.findUnique.mockResolvedValueOnce(null);
      const r = await service.registerCitizenForDistribution('u2');
      expect(prisma.userDistribution.create).toHaveBeenCalled();
      expect(prisma.distributionPool.update).toHaveBeenCalled();
    });

    it('returns existing if already registered', async () => {
      const r = await service.registerCitizenForDistribution('u1');
      expect(r.userId).toBe('u1');
      expect(prisma.userDistribution.create).not.toHaveBeenCalled();
    });
  });

  describe('distributeByLevel', () => {
    it('distributes for UNVERIFIED level', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue({
        ...mockDistribution, totalReceived: d(0), remainingBalance: d(8689.65),
      });
      const r = await service.distributeByLevel('u1', 'UNVERIFIED');
      expect(r.distributed).toBe(true);
      expect(r.amount).toBe(100);
    });

    it('distributes for ARBAN_VERIFIED level', async () => {
      const r = await service.distributeByLevel('u1', 'ARBAN_VERIFIED');
      expect(r.distributed).toBe(true);
      expect(r.amount).toBe(900); // 1000 - 100 already received
    });

    it('distributes for ZUN_VERIFIED level', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue({
        ...mockDistribution, totalReceived: d(1000), remainingBalance: d(9000),
      });
      const r = await service.distributeByLevel('u1', 'ZUN_VERIFIED');
      expect(r.distributed).toBe(true);
      expect(r.amount).toBe(9000);
    });

    it('distributes for FULLY_VERIFIED level', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue({
        ...mockDistribution, totalReceived: d(10000), remainingBalance: d(0),
      });
      const r = await service.distributeByLevel('u1', 'FULLY_VERIFIED');
      expect(r.distributed).toBe(false);
    });

    it('throws when user not registered', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue(null);
      await expect(
        service.distributeByLevel('u999', 'UNVERIFIED'),
      ).rejects.toThrow('not registered');
    });
  });

  describe('getDistributionStatus', () => {
    it('returns distribution status', async () => {
      const r = await service.getDistributionStatus('u1');
      expect(r!.userId).toBe('u1');
      expect(r!.breakdown.unverified).toBeDefined();
    });

    it('returns null when not found', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue(null);
      expect(await service.getDistributionStatus('u999')).toBeNull();
    });
  });

  describe('getPoolStats', () => {
    it('returns pool statistics', async () => {
      const r = await service.getPoolStats();
      expect(r!.status).toBe('ACTIVE');
      expect(r!.totalCitizens).toBe(100);
    });

    it('returns null when no active pool', async () => {
      prisma.distributionPool.findFirst.mockResolvedValue(null);
      expect(await service.getPoolStats()).toBeNull();
    });
  });

  // ─── getActivePool (private) ───────────
  describe('getActivePool (private)', () => {
    it('throws when no active pool', async () => {
      prisma.distributionPool.findFirst.mockResolvedValue(null);
      await expect((service as any).getActivePool()).rejects.toThrow('No active distribution pool');
    });

    it('returns pool when found', async () => {
      const result = await (service as any).getActivePool();
      expect(result.id).toBe('pool1');
    });
  });

  // ─── transferToWallet (private) ────────
  describe('transferToWallet (private)', () => {
    it('returns null when user has no wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', walletAddress: null });
      const result = await (service as any).transferToWallet('u1', 100);
      expect(result).toBeNull();
    });

    it('returns null when CB wallet not configured', async () => {
      delete process.env.CENTRAL_BANK_WALLET_ADDRESS;
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', walletAddress: '0xWALLET' });
      const result = await (service as any).transferToWallet('u1', 100);
      expect(result).toBeNull();
    });

    it('returns mock tx hash on success', async () => {
      process.env.CENTRAL_BANK_WALLET_ADDRESS = '0xCB';
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', walletAddress: '0xWALLET' });
      const result = await (service as any).transferToWallet('u1', 100);
      expect(result).toMatch(/^0x/);
    });

    it('returns null on error', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
      const result = await (service as any).transferToWallet('u1', 100);
      expect(result).toBeNull();
    });
  });

  // ─── distributeByLevel edge case ───────
  describe('distributeByLevel edge cases', () => {
    it('throws when pool not found', async () => {
      prisma.userDistribution.findUnique.mockResolvedValue(mockDistribution);
      prisma.distributionPool.findFirst.mockResolvedValue(null);
      await expect(service.distributeByLevel('u1', 'ARBAN_VERIFIED'))
        .rejects.toThrow('No active distribution pool');
    });
  });
});
