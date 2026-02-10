import { Test, TestingModule } from '@nestjs/testing';
import { CouncilOfJusticeService } from './justice.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('CouncilOfJusticeService', () => {
  let service: CouncilOfJusticeService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      councilOfJusticeMember: {
        create: jest.fn().mockResolvedValue({ id: 'jm-1' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      judicialCase: {
        create: jest.fn().mockResolvedValue({ id: 'case-1', status: 'FILED' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      legalPrecedent: {
        create: jest.fn().mockResolvedValue({ id: 'prec-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'prec-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
      getProvider: jest.fn(),
      getContractAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouncilOfJusticeService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<CouncilOfJusticeService>(CouncilOfJusticeService);
  });

  describe('getMember', () => {
    it('should return member by ID', async () => {
      prisma.councilOfJusticeMember.findUnique.mockResolvedValue({ id: 'jm-1', seatId: 'SEAT-1' });
      const result = await service.getMember('jm-1');
      expect(result.id).toBe('jm-1');
    });
  });

  describe('getMemberBySeatId', () => {
    it('should find member by seat ID', async () => {
      prisma.councilOfJusticeMember.findUnique.mockResolvedValue({ id: 'jm-1', seatId: 'SEAT-1' });
      const result = await service.getMemberBySeatId('SEAT-1');
      expect(result.seatId).toBe('SEAT-1');
    });
  });

  describe('getCase', () => {
    it('should return case by ID', async () => {
      prisma.judicialCase.findUnique.mockResolvedValue({ id: 'case-1', status: 'FILED' });
      const result = await service.getCase('case-1');
      expect(result.id).toBe('case-1');
    });
  });

  describe('getCasesByPlaintiff', () => {
    it('should return cases for plaintiff', async () => {
      await service.getCasesByPlaintiff('SEAT-1');
      expect(prisma.judicialCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { plaintiffSeatId: 'SEAT-1' } }),
      );
    });
  });

  describe('getCasesByDefendant', () => {
    it('should return cases for defendant', async () => {
      await service.getCasesByDefendant('SEAT-2');
      expect(prisma.judicialCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { defendantSeatId: 'SEAT-2' } }),
      );
    });
  });

  describe('getPrecedent', () => {
    it('should return precedent by ID', async () => {
      const result = await service.getPrecedent('prec-1');
      expect(result.id).toBe('prec-1');
    });
  });

  describe('getPrecedentsByCase', () => {
    it('should return precedents by case', async () => {
      await service.getPrecedentsByCase(1);
      expect(prisma.legalPrecedent.findMany).toHaveBeenCalled();
    });
  });
});
