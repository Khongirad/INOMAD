import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FamilyArbanService } from './family-arban.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractAddressesService } from '../blockchain/contract-addresses.service';

// Mock the ArbanCompletion__factory
jest.mock('../typechain-types/factories/ArbanCompletion__factory', () => ({
  ArbanCompletion__factory: {
    connect: jest.fn().mockReturnValue({
      connect: jest.fn(),
      interface: { parseLog: jest.fn() },
      registerMarriage: jest.fn(),
      addChild: jest.fn(),
      changeHeir: jest.fn(),
      setKhuralRepresentative: jest.fn(),
      getFamilyArban: jest.fn(),
    }),
  },
}));

describe('FamilyArbanService', () => {
  let service: FamilyArbanService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      familyArban: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      familyArbanChild: {
        findFirst: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyArbanService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ContractAddressesService,
          useValue: {
            getRpcUrl: jest.fn().mockReturnValue('http://localhost:8545'),
            getGuildContracts: jest.fn().mockReturnValue({
              arbanCompletion: '0x' + '0'.repeat(40),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:8545') },
        },
      ],
    }).compile();

    service = module.get<FamilyArbanService>(FamilyArbanService);
  });

  describe('registerMarriage', () => {
    it('should reject if husband is already married', async () => {
      prisma.familyArban.findFirst
        .mockResolvedValueOnce({ arbanId: 'existing' }) // husband
        .mockResolvedValueOnce(null); // wife

      await expect(
        service.registerMarriage(
          { husbandSeatId: 'H1', wifeSeatId: 'W1' } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if wife is already married', async () => {
      prisma.familyArban.findFirst
        .mockResolvedValueOnce(null) // husband
        .mockResolvedValueOnce({ arbanId: 'existing' }); // wife

      await expect(
        service.registerMarriage(
          { husbandSeatId: 'H1', wifeSeatId: 'W1' } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addChild', () => {
    it('should reject if arban not found', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);

      await expect(
        service.addChild({ arbanId: 'not-found', childSeatId: 'C1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if arban is inactive', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({ arbanId: '1', isActive: false });

      await expect(
        service.addChild({ arbanId: '1', childSeatId: 'C1' } as any, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeHeir', () => {
    it('should reject if child not in arban', async () => {
      prisma.familyArbanChild.findFirst.mockResolvedValue(null);

      await expect(
        service.changeHeir({ arbanId: '1', newHeirSeatId: 'C99' } as any, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setKhuralRepresentative', () => {
    it('should reject representative over 60', async () => {
      await expect(
        service.setKhuralRepresentative(
          { arbanId: '1', repSeatId: 'H1', birthYear: 1950 } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject rep who is not husband or wife', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({
        arbanId: '1',
        husbandSeatId: 'H1',
        wifeSeatId: 'W1',
      });

      await expect(
        service.setKhuralRepresentative(
          { arbanId: '1', repSeatId: 'C1', birthYear: 2000 } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFamilyArban', () => {
    it('should throw NotFoundException when arban missing', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);

      await expect(service.getFamilyArban(999)).rejects.toThrow(NotFoundException);
    });

    it('should return mapped arban data', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({
        arbanId: '1',
        husbandSeatId: 'H1',
        wifeSeatId: 'W1',
        children: [{ childSeatId: 'C1' }, { childSeatId: 'C2' }],
        heirSeatId: 'C2',
        zunId: null,
        khuralRepSeatId: 'H1',
        khuralRepBirthYear: 1990,
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.getFamilyArban(1);
      expect(result.arbanId).toBe(1);
      expect(result.childrenSeatIds).toEqual(['C1', 'C2']);
    });
  });

  describe('getFamilyArbanBySeat', () => {
    it('should return null if no arban found', async () => {
      prisma.familyArban.findFirst.mockResolvedValue(null);

      const result = await service.getFamilyArbanBySeat('UNKNOWN');
      expect(result).toBeNull();
    });
  });

  describe('checkKhuralEligibility', () => {
    it('should return false for missing arban', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);

      const result = await service.checkKhuralEligibility(999);
      expect(result).toBe(false);
    });

    it('should return true for active arban', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({ isActive: true });

      const result = await service.checkKhuralEligibility(1);
      expect(result).toBe(true);
    });
  });

  describe('getKhuralRepresentatives', () => {
    it('should return mapped representatives', async () => {
      prisma.familyArban.findMany.mockResolvedValue([
        {
          arbanId: '1',
          khuralRepSeatId: 'H1',
          khuralRepBirthYear: 1990,
          createdAt: new Date(),
        },
      ]);

      const reps = await service.getKhuralRepresentatives();
      expect(reps).toHaveLength(1);
      expect(reps[0].seatId).toBe('H1');
    });
  });
});
