// Mock the typechain factory before imports
const mockContractInstance = {
  connect: jest.fn().mockReturnValue({
    registerMarriage: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        hash: '0xTX',
        logs: [{ topics: [], data: '0x' }],
      }),
    }),
    addChild: jest.fn().mockResolvedValue({ wait: jest.fn() }),
    changeHeir: jest.fn().mockResolvedValue({ wait: jest.fn() }),
    setKhuralRepresentative: jest.fn().mockResolvedValue({ wait: jest.fn() }),
  }),
  interface: {
    parseLog: jest.fn().mockReturnValue({
      name: 'MarriageRegistered',
      args: { arbanId: BigInt(1) },
    }),
  },
  getFamilyArban: jest.fn().mockResolvedValue([
    'husband1', 'wife1', ['child1'], 'child1', BigInt(0), 'husband1', true,
  ]),
};

jest.mock('../blockchain/abis/arbanCompletion.abi', () => ({ ArbanCompletion_ABI: [] }));
jest.mock('../typechain-types/factories/ArbanCompletion__factory', () => ({
  ArbanCompletion__factory: {
    connect: jest.fn().mockReturnValue(mockContractInstance),
  },
}));
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    ethers: {
      ...original.ethers,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    },
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { FamilyArbanService } from './family-arban.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractAddressesService } from '../blockchain/contract-addresses.service';
import { ConfigService } from '@nestjs/config';

describe('FamilyArbanService', () => {
  let service: FamilyArbanService;
  let prisma: any;

  const mockArban = {
    arbanId: 1, husbandSeatId: 'husband1', wifeSeatId: 'wife1',
    heirSeatId: 'child1', zunId: null, khuralRepSeatId: 'husband1',
    khuralRepBirthYear: 1990, isActive: true, createdAt: new Date(),
    children: [{ childSeatId: 'child1' }],
  };

  const mockSignerWallet = {} as any;

  beforeEach(async () => {
    const mockPrisma = {
      familyArban: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(mockArban),
        findMany: jest.fn().mockResolvedValue([mockArban]),
        create: jest.fn().mockResolvedValue(mockArban),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockArban, ...data }),
        ),
        upsert: jest.fn().mockResolvedValue(mockArban),
      },
      familyArbanChild: {
        findFirst: jest.fn().mockResolvedValue({ childSeatId: 'child1' }),
        create: jest.fn().mockResolvedValue({ childSeatId: 'child2' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const mockContractAddresses = {
      getRpcUrl: jest.fn().mockReturnValue('http://localhost:8545'),
      getGuildContracts: jest.fn().mockReturnValue({
        arbanCompletion: '0xCONTRACT',
      }),
    };

    const mockConfig = {
      get: jest.fn().mockReturnValue('http://localhost:8545'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyArbanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContractAddressesService, useValue: mockContractAddresses },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(FamilyArbanService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('registerMarriage', () => {
    it('registers marriage when both parties are single', async () => {
      const r = await service.registerMarriage(
        { husbandSeatId: 'h1', wifeSeatId: 'w1' },
        mockSignerWallet,
      );
      expect(r.arbanId).toBe(1);
      expect(r.txHash).toBe('0xTX');
      expect(prisma.familyArban.create).toHaveBeenCalled();
    });

    it('throws when husband already married', async () => {
      prisma.familyArban.findFirst.mockResolvedValueOnce(mockArban);
      await expect(
        service.registerMarriage(
          { husbandSeatId: 'husband1', wifeSeatId: 'w2' },
          mockSignerWallet,
        ),
      ).rejects.toThrow('already married');
    });

    it('throws when wife already married', async () => {
      prisma.familyArban.findFirst
        .mockResolvedValueOnce(null) // husband check
        .mockResolvedValueOnce(mockArban); // wife check
      await expect(
        service.registerMarriage(
          { husbandSeatId: 'h2', wifeSeatId: 'wife1' },
          mockSignerWallet,
        ),
      ).rejects.toThrow('already married');
    });
  });

  describe('addChild', () => {
    it('adds child to existing arban', async () => {
      await service.addChild(
        { arbanId: 1, childSeatId: 'child2' },
        mockSignerWallet,
      );
      expect(prisma.familyArbanChild.create).toHaveBeenCalled();
      expect(prisma.familyArban.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ heirSeatId: 'child2' }),
        }),
      );
    });

    it('throws when arban not found', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);
      await expect(
        service.addChild({ arbanId: 999, childSeatId: 'c1' }, mockSignerWallet),
      ).rejects.toThrow('not found');
    });

    it('throws when arban not active', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({ ...mockArban, isActive: false });
      await expect(
        service.addChild({ arbanId: 1, childSeatId: 'c1' }, mockSignerWallet),
      ).rejects.toThrow('not active');
    });
  });

  describe('changeHeir', () => {
    it('changes heir to another child', async () => {
      await service.changeHeir(
        { arbanId: 1, newHeirSeatId: 'child1' },
        mockSignerWallet,
      );
      expect(prisma.familyArban.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ heirSeatId: 'child1' }),
        }),
      );
    });

    it('throws when child not found', async () => {
      prisma.familyArbanChild.findFirst.mockResolvedValue(null);
      await expect(
        service.changeHeir({ arbanId: 1, newHeirSeatId: 'stranger' }, mockSignerWallet),
      ).rejects.toThrow('not a child');
    });
  });

  describe('setKhuralRepresentative', () => {
    it('sets khural rep when valid spouse under 60', async () => {
      await service.setKhuralRepresentative(
        { arbanId: 1, repSeatId: 'husband1', birthYear: 1990 },
        mockSignerWallet,
      );
      expect(prisma.familyArban.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ khuralRepSeatId: 'husband1' }),
        }),
      );
    });

    it('throws when rep is 60+', async () => {
      await expect(
        service.setKhuralRepresentative(
          { arbanId: 1, repSeatId: 'husband1', birthYear: 1950 },
          mockSignerWallet,
        ),
      ).rejects.toThrow('under 60');
    });

    it('throws when rep is not husband or wife', async () => {
      await expect(
        service.setKhuralRepresentative(
          { arbanId: 1, repSeatId: 'stranger', birthYear: 1990 },
          mockSignerWallet,
        ),
      ).rejects.toThrow('husband or wife');
    });

    it('throws when arban not found', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);
      await expect(
        service.setKhuralRepresentative(
          { arbanId: 999, repSeatId: 'h1', birthYear: 1990 },
          mockSignerWallet,
        ),
      ).rejects.toThrow('not found');
    });
  });

  describe('getKhuralRepresentatives', () => {
    it('returns representatives with age calculated', async () => {
      const r = await service.getKhuralRepresentatives();
      expect(r.length).toBe(1);
      expect(r[0].seatId).toBe('husband1');
      expect(r[0].age).toBeGreaterThan(0);
    });
  });

  describe('getFamilyArban', () => {
    it('returns family arban by ID', async () => {
      const r = await service.getFamilyArban(1);
      expect(r.arbanId).toBe(1);
      expect(r.childrenSeatIds).toEqual(['child1']);
    });

    it('throws when not found', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);
      await expect(service.getFamilyArban(999)).rejects.toThrow('not found');
    });
  });

  describe('getFamilyArbanBySeat', () => {
    it('returns arban when found', async () => {
      prisma.familyArban.findFirst.mockResolvedValue(mockArban);
      const r = await service.getFamilyArbanBySeat('husband1');
      expect(r!.husbandSeatId).toBe('husband1');
    });

    it('returns null when not found', async () => {
      prisma.familyArban.findFirst.mockResolvedValue(null);
      const r = await service.getFamilyArbanBySeat('stranger');
      expect(r).toBeNull();
    });
  });

  describe('checkKhuralEligibility', () => {
    it('returns true for active arban', async () => {
      expect(await service.checkKhuralEligibility(1)).toBe(true);
    });

    it('returns false when arban not found', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);
      expect(await service.checkKhuralEligibility(999)).toBe(false);
    });
  });

  describe('syncFromBlockchain', () => {
    it('syncs arban from blockchain', async () => {
      await service.syncFromBlockchain(1);
      expect(prisma.familyArban.upsert).toHaveBeenCalled();
      expect(prisma.familyArbanChild.deleteMany).toHaveBeenCalled();
      expect(prisma.familyArbanChild.create).toHaveBeenCalled();
    });
  });
});
