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
      args: { arbadId: BigInt(1) },
    }),
  },
  getFamilyArbad: jest.fn().mockResolvedValue([
    'husband1', 'wife1', ['child1'], 'child1', BigInt(0), 'husband1', true,
  ]),
};

jest.mock('../blockchain/abis/arbadCompletion.abi', () => ({ ArbadCompletion_ABI: [] }));
jest.mock('../typechain-types/factories/ArbadCompletion__factory', () => ({
  ArbadCompletion__factory: {
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
import { FamilyArbadService } from './family-arbad.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractAddressesService } from '../blockchain/contract-addresses.service';
import { ConfigService } from '@nestjs/config';

describe('FamilyArbadService', () => {
  let service: FamilyArbadService;
  let prisma: any;

  const mockArbad = {
    arbadId: 1, husbandSeatId: 'husband1', wifeSeatId: 'wife1',
    heirSeatId: 'child1', zunId: null, khuralRepSeatId: 'husband1',
    khuralRepBirthYear: 1990, isActive: true, createdAt: new Date(),
    children: [{ childSeatId: 'child1' }],
  };

  const mockSignerWallet = {} as any;

  beforeEach(async () => {
    const mockPrisma = {
      familyArbad: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(mockArbad),
        findMany: jest.fn().mockResolvedValue([mockArbad]),
        create: jest.fn().mockResolvedValue(mockArbad),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockArbad, ...data }),
        ),
        upsert: jest.fn().mockResolvedValue(mockArbad),
      },
      familyArbadChild: {
        findFirst: jest.fn().mockResolvedValue({ childSeatId: 'child1' }),
        create: jest.fn().mockResolvedValue({ childSeatId: 'child2' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const mockContractAddresses = {
      getRpcUrl: jest.fn().mockReturnValue('http://localhost:8545'),
      getGuildContracts: jest.fn().mockReturnValue({
        arbadCompletion: '0xCONTRACT',
      }),
    };

    const mockConfig = {
      get: jest.fn().mockReturnValue('http://localhost:8545'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyArbadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContractAddressesService, useValue: mockContractAddresses },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(FamilyArbadService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('registerMarriage', () => {
    it('registers marriage when both parties are single', async () => {
      const r = await service.registerMarriage(
        { husbandSeatId: 'h1', wifeSeatId: 'w1' },
        mockSignerWallet,
      );
      expect(r.arbadId).toBe(1);
      expect(r.txHash).toBe('0xTX');
      expect(prisma.familyArbad.create).toHaveBeenCalled();
    });

    it('throws when husband already married', async () => {
      prisma.familyArbad.findFirst.mockResolvedValueOnce(mockArbad);
      await expect(
        service.registerMarriage(
          { husbandSeatId: 'husband1', wifeSeatId: 'w2' },
          mockSignerWallet,
        ),
      ).rejects.toThrow('already married');
    });

    it('throws when wife already married', async () => {
      prisma.familyArbad.findFirst
        .mockResolvedValueOnce(null) // husband check
        .mockResolvedValueOnce(mockArbad); // wife check
      await expect(
        service.registerMarriage(
          { husbandSeatId: 'h2', wifeSeatId: 'wife1' },
          mockSignerWallet,
        ),
      ).rejects.toThrow('already married');
    });
  });

  describe('addChild', () => {
    it('adds child to existing arbad', async () => {
      await service.addChild(
        { arbadId: 1, childSeatId: 'child2' },
        mockSignerWallet,
      );
      expect(prisma.familyArbadChild.create).toHaveBeenCalled();
      expect(prisma.familyArbad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ heirSeatId: 'child2' }),
        }),
      );
    });

    it('throws when arbad not found', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(
        service.addChild({ arbadId: 999, childSeatId: 'c1' }, mockSignerWallet),
      ).rejects.toThrow('not found');
    });

    it('throws when arbad not active', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue({ ...mockArbad, isActive: false });
      await expect(
        service.addChild({ arbadId: 1, childSeatId: 'c1' }, mockSignerWallet),
      ).rejects.toThrow('not active');
    });
  });

  describe('changeHeir', () => {
    it('changes heir to another child', async () => {
      await service.changeHeir(
        { arbadId: 1, newHeirSeatId: 'child1' },
        mockSignerWallet,
      );
      expect(prisma.familyArbad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ heirSeatId: 'child1' }),
        }),
      );
    });

    it('throws when child not found', async () => {
      prisma.familyArbadChild.findFirst.mockResolvedValue(null);
      await expect(
        service.changeHeir({ arbadId: 1, newHeirSeatId: 'stranger' }, mockSignerWallet),
      ).rejects.toThrow('not a child');
    });
  });

  describe('setKhuralRepresentative', () => {
    it('sets khural rep when valid spouse under 60', async () => {
      await service.setKhuralRepresentative(
        { arbadId: 1, repSeatId: 'husband1', birthYear: 1990 },
        mockSignerWallet,
      );
      expect(prisma.familyArbad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ khuralRepSeatId: 'husband1' }),
        }),
      );
    });

    it('throws when rep is 60+', async () => {
      await expect(
        service.setKhuralRepresentative(
          { arbadId: 1, repSeatId: 'husband1', birthYear: 1950 },
          mockSignerWallet,
        ),
      ).rejects.toThrow('under 60');
    });

    it('throws when rep is not husband or wife', async () => {
      await expect(
        service.setKhuralRepresentative(
          { arbadId: 1, repSeatId: 'stranger', birthYear: 1990 },
          mockSignerWallet,
        ),
      ).rejects.toThrow('husband or wife');
    });

    it('throws when arbad not found', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(
        service.setKhuralRepresentative(
          { arbadId: 999, repSeatId: 'h1', birthYear: 1990 },
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

  describe('getFamilyArbad', () => {
    it('returns family arbad by ID', async () => {
      const r = await service.getFamilyArbad(1);
      expect(r.arbadId).toBe(1);
      expect(r.childrenSeatIds).toEqual(['child1']);
    });

    it('throws when not found', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(service.getFamilyArbad(999)).rejects.toThrow('not found');
    });
  });

  describe('getFamilyArbadBySeat', () => {
    it('returns arbad when found', async () => {
      prisma.familyArbad.findFirst.mockResolvedValue(mockArbad);
      const r = await service.getFamilyArbadBySeat('husband1');
      expect(r!.husbandSeatId).toBe('husband1');
    });

    it('returns null when not found', async () => {
      prisma.familyArbad.findFirst.mockResolvedValue(null);
      const r = await service.getFamilyArbadBySeat('stranger');
      expect(r).toBeNull();
    });
  });

  describe('checkKhuralEligibility', () => {
    it('returns true for active arbad', async () => {
      expect(await service.checkKhuralEligibility(1)).toBe(true);
    });

    it('returns false when arbad not found', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      expect(await service.checkKhuralEligibility(999)).toBe(false);
    });
  });

  describe('syncFromBlockchain', () => {
    it('syncs arbad from blockchain', async () => {
      await service.syncFromBlockchain(1);
      expect(prisma.familyArbad.upsert).toHaveBeenCalled();
      expect(prisma.familyArbadChild.deleteMany).toHaveBeenCalled();
      expect(prisma.familyArbadChild.create).toHaveBeenCalled();
    });
  });
});
