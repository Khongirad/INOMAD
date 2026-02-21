import { Test, TestingModule } from '@nestjs/testing';
import { ZunService } from './zun.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';

jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  },
}));

jest.mock('../typechain-types/factories/ArbadCompletion__factory', () => ({
  ArbadCompletion__factory: {
    connect: jest.fn().mockReturnValue(null), // Will be overridden in beforeEach
  },
}));

describe('ZunService', () => {
  let service: ZunService;
  let prisma: any;
  let citizenAllocation: any;

  beforeEach(async () => {
    process.env.ARBAD_COMPLETION_ADDRESS = '0xCONTRACT';
    process.env.RPC_URL = 'http://localhost:8545';

    const mockPrisma = {
      familyArbad: {
        findUnique: jest.fn().mockResolvedValue({
          arbadId: BigInt(1), isActive: true, zunId: null,
          zun: {
            zunId: BigInt(1), name: 'TestZun', founderArbadId: BigInt(1),
            memberArbads: [{ arbadId: BigInt(1) }], elderSeatId: 's1',
            isActive: true, createdAt: new Date(),
          },
        }),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      zun: {
        create: jest.fn().mockResolvedValue({ id: 'z1', zunId: BigInt(1) }),
        findUnique: jest.fn().mockResolvedValue({
          zunId: BigInt(1), name: 'TestZun', founderArbadId: BigInt(1),
          memberArbads: [{ arbadId: BigInt(1) }, { arbadId: BigInt(2) }],
          elderSeatId: 's1', isActive: true, createdAt: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u1', seatId: 's1' }]),
      },
    };
    const mockAllocation = {
      allocateLevel3Funds: jest.fn().mockResolvedValue({ allocated: true, amount: '300' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CitizenAllocationService, useValue: mockAllocation },
      ],
    }).compile();
    service = module.get(ZunService);
    prisma = module.get(PrismaService);
    citizenAllocation = module.get(CitizenAllocationService);

    // Set up contract mock directly on service instance
    (service as any).contract = {
      connect: jest.fn().mockReturnValue({
        formZun: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({
            hash: '0xTX',
            logs: [{ name: 'ZunFormed' }],
          }),
        }),
        setZunElder: jest.fn().mockResolvedValue({ wait: jest.fn() }),
      }),
      interface: {
        parseLog: jest.fn().mockReturnValue({
          name: 'ZunFormed', args: { zunId: BigInt(1) },
        }),
      },
      getZun: jest.fn().mockResolvedValue(['TestZun', BigInt(1), [BigInt(1), BigInt(2)], BigInt(42), true]),
    };
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('constructor', () => {
    it('handles no address', () => {
      delete process.env.ARBAD_COMPLETION_ADDRESS;
      const s = new ZunService(prisma, citizenAllocation);
      expect(s).toBeDefined();
    });
  });

  describe('formZun', () => {
    it('forms zun successfully', async () => {
      prisma.zun.findUnique.mockResolvedValue({
        id: 'z1', memberArbads: [{
          husbandSeatId: 's1', wifeSeatId: 's2', children: [{ childSeatId: 's3' }],
        }],
      });
      const r = await service.formZun({
        zunName: 'TestZun', arbadIds: [1, 2],
      }, {} as any);
      expect(r.zunId).toBe(1);
    });
    it('throws with less than 2 arbads', async () => {
      await expect(service.formZun(
        { zunName: 'TestZun', arbadIds: [1] }, {} as any,
      )).rejects.toThrow('At least 2');
    });
    it('throws when arbad not found', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(service.formZun(
        { zunName: 'TestZun', arbadIds: [1, 2] }, {} as any,
      )).rejects.toThrow('not found or inactive');
    });
    it('throws when arbad already in zun', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue({
        arbadId: BigInt(1), isActive: true, zunId: BigInt(99),
      });
      await expect(service.formZun(
        { zunName: 'TestZun', arbadIds: [1, 2] }, {} as any,
      )).rejects.toThrow('already in a Zun');
    });
  });

  describe('setZunElder', () => {
    it('sets elder', async () => {
      await service.setZunElder(1, '42', {} as any);
      expect(prisma.zun.update).toHaveBeenCalled();
    });
    it('throws when not found', async () => {
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.setZunElder(1, '42', {} as any)).rejects.toThrow('not found');
    });
  });

  describe('getZun', () => {
    it('returns zun', async () => {
      const r = await service.getZun(1);
      expect(r.zunId).toBe(1);
    });
    it('throws when not found', async () => {
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.getZun(999)).rejects.toThrow('not found');
    });
  });

  describe('getZunsByFamily', () => {
    it('returns zuns', async () => {
      const r = await service.getZunsByFamily(1);
      expect(r).toHaveLength(1);
    });
    it('returns empty when no zun', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue({ arbadId: BigInt(1), zun: null });
      const r = await service.getZunsByFamily(1);
      expect(r).toEqual([]);
    });
    it('returns empty when arbad not found', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      const r = await service.getZunsByFamily(999);
      expect(r).toEqual([]);
    });
  });

  describe('syncFromBlockchain', () => {
    it('syncs successfully', async () => {
      await service.syncFromBlockchain(1);
      expect(prisma.zun.upsert).toHaveBeenCalled();
    });
    it('throws on error', async () => {
      (service as any).contract.getZun = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(service.syncFromBlockchain(1)).rejects.toThrow('fail');
    });
  });

  describe('allocateLevel3ToAllMembers', () => {
    it('allocates to all members', async () => {
      prisma.zun.findUnique.mockResolvedValue({
        id: 'z1', memberArbads: [{
          husbandSeatId: 's1', wifeSeatId: 's2', children: [{ childSeatId: 's3' }],
        }],
      });
      await (service as any).allocateLevel3ToAllMembers('z1');
      expect(citizenAllocation.allocateLevel3Funds).toHaveBeenCalled();
    });
    it('handles no member arbads', async () => {
      prisma.zun.findUnique.mockResolvedValue(null);
      await (service as any).allocateLevel3ToAllMembers('z1');
    });
    it('logs when already allocated', async () => {
      prisma.zun.findUnique.mockResolvedValue({
        id: 'z1', memberArbads: [{
          husbandSeatId: 's1', wifeSeatId: 's2', children: [],
        }],
      });
      citizenAllocation.allocateLevel3Funds.mockResolvedValue({ allocated: false });
      await (service as any).allocateLevel3ToAllMembers('z1');
    });
    it('handles allocation error gracefully', async () => {
      prisma.zun.findUnique.mockResolvedValue({
        id: 'z1', memberArbads: [{
          husbandSeatId: 's1', wifeSeatId: 's2', children: [],
        }],
      });
      citizenAllocation.allocateLevel3Funds.mockRejectedValue(new Error('fail'));
      await (service as any).allocateLevel3ToAllMembers('z1');
    });
    it('handles top-level error gracefully', async () => {
      prisma.zun.findUnique.mockRejectedValue(new Error('db fail'));
      await (service as any).allocateLevel3ToAllMembers('z1');
    });
  });
});
