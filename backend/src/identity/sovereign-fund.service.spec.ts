import { Test, TestingModule } from '@nestjs/testing';
import { SovereignFundService } from './sovereign-fund.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SovereignFundService', () => {
  let service: SovereignFundService;
  let blockchain: any;
  let prisma: any;

  beforeEach(async () => {
    blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
    };
    prisma = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SovereignFundService,
        { provide: BlockchainService, useValue: blockchain },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SovereignFundService>(SovereignFundService);
  });

  describe('getCurrentBalance', () => {
    it('should return null when blockchain unavailable', async () => {
      const result = await service.getCurrentBalance();
      expect(result).toBeNull();
    });
  });

  describe('getFundStats', () => {
    it('should return null when blockchain unavailable', async () => {
      const result = await service.getFundStats();
      expect(result).toBeNull();
    });
  });

  describe('getIncomeBreakdown', () => {
    it('should return empty array when blockchain unavailable', async () => {
      const result = await service.getIncomeBreakdown();
      expect(result).toEqual([]);
    });
  });

  describe('getActiveInvestments', () => {
    it('should return empty array when blockchain unavailable', async () => {
      const result = await service.getActiveInvestments();
      expect(result).toEqual([]);
    });
  });

  describe('getFundOverview', () => {
    it('should return overview with null stats when offline', async () => {
      const result = await service.getFundOverview();
      expect(result.stats).toBeNull();
      expect(result.incomeBreakdown).toEqual([]);
      expect(result.activeInvestments).toEqual([]);
      expect(result.annualReports).toEqual([]);
    });
  });
});
