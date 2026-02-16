import { Test, TestingModule } from '@nestjs/testing';
import { TempleOfHeavenService } from './temple.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Contract } from 'ethers';

// Mock ethers Contract
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    Contract: jest.fn().mockImplementation(() => ({
      submitRecord: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      verifyRecord: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
      receiveDonation: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({}),
        hash: '0xTX_HASH',
      }),
      getDonationBalance: jest.fn().mockResolvedValue(BigInt(1000000)),
      target: '0xTEMPLE',
    })),
  };
});

describe('TempleOfHeavenService', () => {
  let service: TempleOfHeavenService;
  let prisma: any;
  let blockchain: any;

  beforeEach(async () => {
    process.env.TEMPLE_OF_HEAVEN_ADDRESS = '0xTEMPLE';

    const mockPrisma = {
      templeRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'tr1', documentHash: '0xHASH', recordType: 'LIBRARY',
          submitterSeatId: '0x1', scientificVerified: false,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'tr1', documentHash: '0xHASH', recordType: 'LIBRARY',
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({
          id: 'tr1', scientificVerified: true, scientificVerifier: '0x2',
        }),
        count: jest.fn().mockResolvedValue(10),
      },
    };

    const mockBlockchain = {
      getWallet: jest.fn().mockReturnValue({
        getAddress: jest.fn().mockResolvedValue('0x1'),
      }),
      getProvider: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TempleOfHeavenService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: mockBlockchain },
      ],
    }).compile();
    service = module.get(TempleOfHeavenService);
    prisma = module.get(PrismaService);
    blockchain = module.get(BlockchainService);
  });

  afterEach(() => {
    delete process.env.TEMPLE_OF_HEAVEN_ADDRESS;
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('submitRecord', () => {
    it('submits record on-chain and stores in DB', async () => {
      const r = await service.submitRecord({
        documentHash: '0xHASH', recordType: 'LIBRARY' as any,
        submitterPrivateKey: 'pk1',
      });
      expect(r.id).toBe('tr1');
      expect(r.documentHash).toBe('0xHASH');
      expect(prisma.templeRecord.create).toHaveBeenCalled();
      expect(blockchain.getWallet).toHaveBeenCalledWith('pk1');
    });

    it('submits ARCHIVE type', async () => {
      await service.submitRecord({
        documentHash: '0xARCH', recordType: 'ARCHIVE' as any,
        submitterPrivateKey: 'pk1', metadata: 'Historical doc',
      });
      expect(prisma.templeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recordType: 'ARCHIVE' }),
        }),
      );
    });

    it('throws when TEMPLE_OF_HEAVEN_ADDRESS not configured', async () => {
      delete process.env.TEMPLE_OF_HEAVEN_ADDRESS;
      await expect(
        service.submitRecord({
          documentHash: '0xHASH', recordType: 'LIBRARY' as any,
          submitterPrivateKey: 'pk1',
        }),
      ).rejects.toThrow('TEMPLE_OF_HEAVEN_ADDRESS');
    });
  });

  describe('verifyRecord', () => {
    it('verifies record on-chain and updates DB', async () => {
      const r = await service.verifyRecord('tr1', { verifierPrivateKey: 'pk2' });
      expect(r.scientificVerified).toBe(true);
      expect(prisma.templeRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scientificVerified: true }),
        }),
      );
    });

    it('throws when record not found', async () => {
      prisma.templeRecord.findUnique.mockResolvedValue(null);
      await expect(
        service.verifyRecord('bad', { verifierPrivateKey: 'pk2' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('getRecord', () => {
    it('returns record by ID', async () => {
      const r = await service.getRecord('tr1');
      expect(r.id).toBe('tr1');
    });
  });

  describe('getRecordsByType', () => {
    it('returns records filtered by type', async () => {
      await service.getRecordsByType('LIBRARY' as any);
      expect(prisma.templeRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recordType: 'LIBRARY' },
        }),
      );
    });
  });

  describe('getRecordsBySubmitter', () => {
    it('returns records for submitter', async () => {
      await service.getRecordsBySubmitter('0x1');
      expect(prisma.templeRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { submitterSeatId: '0x1' },
        }),
      );
    });
  });

  describe('makeDonation', () => {
    it('makes donation on-chain', async () => {
      const r = await service.makeDonation({
        amount: '1.0', donorPrivateKey: 'pk1',
      });
      expect(r.donor).toBe('0x1');
      expect(r.amount).toBe('1.0');
      expect(r.transactionHash).toBe('0xTX_HASH');
    });
  });

  describe('getDonationBalance', () => {
    it('returns donation balance', async () => {
      const r = await service.getDonationBalance();
      expect(r.balance).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('returns aggregated statistics', async () => {
      const r = await service.getStatistics();
      expect(r.totalRecords).toBe(10);
      expect(r.scientificVerified).toBe(10);
      expect(r.unverifiedRecords).toBe(0);
      expect(r.byType.library).toBe(10);
    });
  });
});
