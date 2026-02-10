import { Test, TestingModule } from '@nestjs/testing';
import { TempleOfHeavenService } from './temple.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('TempleOfHeavenService', () => {
  let service: TempleOfHeavenService;
  let prisma: any;
  let blockchain: any;

  beforeEach(async () => {
    prisma = {
      templeRecord: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    blockchain = {
      getWallet: jest.fn().mockReturnValue({ getAddress: jest.fn().mockResolvedValue('0xABC') }),
      getProvider: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TempleOfHeavenService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<TempleOfHeavenService>(TempleOfHeavenService);
  });

  describe('getTempleContract', () => {
    it('should throw if TEMPLE_OF_HEAVEN_ADDRESS not configured', () => {
      delete process.env.TEMPLE_OF_HEAVEN_ADDRESS;
      expect(() => (service as any).getTempleContract()).toThrow('TEMPLE_OF_HEAVEN_ADDRESS not configured');
    });
  });

  describe('getRecord', () => {
    it('should return record by ID', async () => {
      prisma.templeRecord.findUnique.mockResolvedValue({ id: 'r1', recordType: 'LIBRARY' });
      const result = await service.getRecord('r1');
      expect(result.id).toBe('r1');
    });

    it('should return null for missing record', async () => {
      prisma.templeRecord.findUnique.mockResolvedValue(null);
      const result = await service.getRecord('bad');
      expect(result).toBeNull();
    });
  });

  describe('getRecordsByType', () => {
    it('should query by record type', async () => {
      await service.getRecordsByType('LIBRARY' as any);
      expect(prisma.templeRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { recordType: 'LIBRARY' } }),
      );
    });
  });

  describe('getRecordsBySubmitter', () => {
    it('should query by submitter', async () => {
      await service.getRecordsBySubmitter('S1');
      expect(prisma.templeRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { submitterSeatId: 'S1' } }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      prisma.templeRecord.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(40)   // verified
        .mockResolvedValueOnce(30)   // library
        .mockResolvedValueOnce(50)   // archive
        .mockResolvedValueOnce(20);  // cadastre

      const result = await service.getStatistics();
      expect(result.totalRecords).toBe(100);
      expect(result.scientificVerified).toBe(40);
      expect(result.unverifiedRecords).toBe(60);
      expect(result.byType.library).toBe(30);
    });
  });
});
