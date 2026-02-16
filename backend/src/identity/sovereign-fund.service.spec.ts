import { Test, TestingModule } from '@nestjs/testing';
import { SovereignFundService } from './sovereign-fund.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock ethers module
const mockContract = {
  getCurrentBalance: jest.fn().mockResolvedValue(BigInt(5000000000)),
  getFundStats: jest.fn().mockResolvedValue({
    balance: BigInt(5000000000),
    totalReceived: BigInt(10000000000),
    totalInvested: BigInt(3000000000),
    totalWithdrawn: BigInt(2000000000),
    activeInvestments: BigInt(5),
  }),
  getIncomeBreakdown: jest.fn().mockResolvedValue({
    sources: [BigInt(0), BigInt(3)],
    amounts: [BigInt(1000000000), BigInt(500000000)],
  }),
  getActiveInvestments: jest.fn().mockResolvedValue([BigInt(1)]),
  getInvestment: jest.fn().mockResolvedValue({
    id: BigInt(1), name: 'Infrastructure', description: 'Roads',
    amount: BigInt(1000000000), beneficiary: '0xBENEF',
    timestamp: BigInt(1700000000), active: true,
    approvalHash: '0xHASH',
  }),
  getPublishedYears: jest.fn().mockResolvedValue([BigInt(2025)]),
  getAnnualReport: jest.fn().mockResolvedValue({
    year: BigInt(2025), totalBalance: BigInt(5000000000),
    received: BigInt(10000000000), invested: BigInt(3000000000),
    investmentReturns: BigInt(1000000000),
    reportHash: '0xREPORT', publishedAt: BigInt(1700000000),
  }),
};

jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    ethers: {
      ...original.ethers,
      Contract: jest.fn().mockImplementation(() => mockContract),
      formatUnits: original.ethers?.formatUnits ?? original.formatUnits,
    },
    Contract: jest.fn().mockImplementation(() => mockContract),
    formatUnits: original.formatUnits,
  };
});

describe('SovereignFundService', () => {
  let service: SovereignFundService;
  let mockBlockchain: any;

  beforeEach(async () => {
    mockBlockchain = {
      isAvailable: jest.fn().mockReturnValue(true),
      contractAddresses: {
        getAddress: jest.fn().mockReturnValue('0xFUND'),
      },
      provider: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SovereignFundService,
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = module.get(SovereignFundService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getCurrentBalance', () => {
    it('returns balance from contract', async () => {
      const r = await service.getCurrentBalance();
      expect(r).toBeDefined();
      expect(typeof r).toBe('string');
    });

    it('returns null when blockchain not available', async () => {
      mockBlockchain.isAvailable.mockReturnValue(false);
      const r = await service.getCurrentBalance();
      expect(r).toBeNull();
    });

    it('returns null when fund address not configured', async () => {
      mockBlockchain.contractAddresses.getAddress.mockReturnValue(null);
      const r = await service.getCurrentBalance();
      expect(r).toBeNull();
    });
  });

  describe('getFundStats', () => {
    it('returns fund statistics', async () => {
      const r = await service.getFundStats();
      expect(r).toBeDefined();
      expect(r!.activeInvestments).toBe(5);
    });

    it('returns null when blockchain unavailable', async () => {
      mockBlockchain.isAvailable.mockReturnValue(false);
      expect(await service.getFundStats()).toBeNull();
    });

    it('returns null when no fund address', async () => {
      mockBlockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getFundStats()).toBeNull();
    });
  });

  describe('getIncomeBreakdown', () => {
    it('returns income breakdown with source names', async () => {
      const r = await service.getIncomeBreakdown();
      expect(r.length).toBe(2);
      expect(r[0].source).toBe('INITIAL_DISTRIBUTION');
      expect(r[1].source).toBe('TAX_REVENUE');
    });

    it('returns empty array when unavailable', async () => {
      mockBlockchain.isAvailable.mockReturnValue(false);
      expect(await service.getIncomeBreakdown()).toEqual([]);
    });

    it('returns empty when no fund address', async () => {
      mockBlockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getIncomeBreakdown()).toEqual([]);
    });
  });

  describe('getActiveInvestments', () => {
    it('returns active investments', async () => {
      const r = await service.getActiveInvestments();
      expect(r.length).toBe(1);
      expect(r[0].name).toBe('Infrastructure');
      expect(r[0].active).toBe(true);
    });

    it('returns empty array when no fund address', async () => {
      mockBlockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getActiveInvestments()).toEqual([]);
    });

    it('returns empty when unavailable', async () => {
      mockBlockchain.isAvailable.mockReturnValue(false);
      expect(await service.getActiveInvestments()).toEqual([]);
    });
  });

  describe('getAnnualReports', () => {
    it('returns annual reports', async () => {
      const r = await service.getAnnualReports();
      expect(r.length).toBe(1);
      expect(r[0].year).toBe(2025);
    });

    it('returns empty array when unavailable', async () => {
      mockBlockchain.isAvailable.mockReturnValue(false);
      expect(await service.getAnnualReports()).toEqual([]);
    });

    it('returns empty when no fund address', async () => {
      mockBlockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getAnnualReports()).toEqual([]);
    });
  });

  describe('getFundOverview', () => {
    it('returns complete fund overview', async () => {
      const r = await service.getFundOverview();
      expect(r.stats).toBeDefined();
      expect(r.incomeBreakdown.length).toBeGreaterThan(0);
      expect(r.activeInvestments.length).toBeGreaterThan(0);
      expect(r.annualReports.length).toBeGreaterThan(0);
    });

    it('handles all unavailable', async () => {
      mockBlockchain.isAvailable.mockReturnValue(false);
      const r = await service.getFundOverview();
      expect(r.stats).toBeNull();
      expect(r.incomeBreakdown).toEqual([]);
    });
  });

  // ─── error handling ───────────────────
  describe('error handling', () => {
    it('getCurrentBalance returns null when contract throws', async () => {
      mockContract.getCurrentBalance.mockRejectedValueOnce(new Error('RPC error'));
      const r = await service.getCurrentBalance();
      expect(r).toBeNull();
    });

    it('getFundStats returns null when contract throws', async () => {
      mockContract.getFundStats.mockRejectedValueOnce(new Error('RPC error'));
      const r = await service.getFundStats();
      expect(r).toBeNull();
    });

    it('getIncomeBreakdown returns empty when contract throws', async () => {
      mockContract.getIncomeBreakdown.mockRejectedValueOnce(new Error('RPC error'));
      const r = await service.getIncomeBreakdown();
      expect(r).toEqual([]);
    });

    it('getActiveInvestments returns empty when contract throws', async () => {
      mockContract.getActiveInvestments.mockRejectedValueOnce(new Error('RPC error'));
      const r = await service.getActiveInvestments();
      expect(r).toEqual([]);
    });

    it('getAnnualReports returns empty when contract throws', async () => {
      mockContract.getPublishedYears.mockRejectedValueOnce(new Error('RPC error'));
      const r = await service.getAnnualReports();
      expect(r).toEqual([]);
    });
  });
});

