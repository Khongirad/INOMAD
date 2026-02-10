import { Test, TestingModule } from '@nestjs/testing';
import { CitizenAllocationService } from './citizen-allocation.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';

// Mock bank.utils
jest.mock('../bank/bank.utils', () => ({
  generateBankRef: jest.fn().mockReturnValue('BOS-TEST-0001'),
  ECONOMIC_CONSTANTS: {
    LEVEL_1_ALLOCATION: 100,
    LEVEL_2_ALLOCATION: 5000,
    LEVEL_3_ALLOCATION: 9383,
    PER_CAPITA_TOTAL: 14483,
    PENSION_FUND_BANK_REF: 'PENSION-FUND',
  },
  TRANSACTION_REASONS: {
    LEVEL_1_VERIFICATION: 'Verification Award Level 1',
    LEVEL_2_ARBAN: 'Verification Award Level 2',
    LEVEL_3_ZUN: 'Verification Award Level 3',
  },
}));

describe('CitizenAllocationService', () => {
  let service: CitizenAllocationService;
  let prisma: any;
  let bankReward: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
      bankLink: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
      altanLedger: { upsert: jest.fn().mockResolvedValue({}) },
      altanTransaction: { findFirst: jest.fn(), findMany: jest.fn() },
      familyArban: { findUnique: jest.fn() },
      orgArbanMember: { findFirst: jest.fn() },
      zun: { findUnique: jest.fn() },
    };

    bankReward = {
      transferReward: jest.fn().mockResolvedValue({ transactionId: 'tx-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenAllocationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BankRewardService, useValue: bankReward },
      ],
    }).compile();

    service = module.get<CitizenAllocationService>(CitizenAllocationService);
  });

  describe('createCitizenBankAccount', () => {
    it('should return existing account if already exists', async () => {
      prisma.bankLink.findUnique.mockResolvedValue({ bankRef: 'BOS-EXISTING' });

      const result = await service.createCitizenBankAccount('u1');
      expect(result.alreadyExists).toBe(true);
      expect(result.bankRef).toBe('BOS-EXISTING');
      expect(result.accountCreated).toBe(false);
    });

    it('should create new account when none exists', async () => {
      prisma.bankLink.findUnique.mockResolvedValue(null);

      const result = await service.createCitizenBankAccount('u1');
      expect(result.accountCreated).toBe(true);
      expect(result.bankRef).toBe('BOS-TEST-0001');
      expect(prisma.bankLink.create).toHaveBeenCalled();
      expect(prisma.altanLedger.upsert).toHaveBeenCalled();
    });
  });

  describe('allocateLevel1Funds', () => {
    it('should throw if no bank account', async () => {
      prisma.bankLink.findUnique.mockResolvedValue(null);

      await expect(service.allocateLevel1Funds('u1', 'S1')).rejects.toThrow(
        'No bank account found',
      );
    });

    it('should throw if pension fund missing', async () => {
      prisma.bankLink.findUnique.mockResolvedValue({ bankRef: 'BOS-001' });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.allocateLevel1Funds('u1', 'S1')).rejects.toThrow(
        'Pension Fund system account not found',
      );
    });

    it('should allocate 100 ALTAN on success', async () => {
      prisma.bankLink.findUnique.mockResolvedValue({ bankRef: 'BOS-001' });
      prisma.user.findFirst.mockResolvedValue({ id: 'pension-fund' });

      const result = await service.allocateLevel1Funds('u1', 'S1');
      expect(result.allocated).toBe(true);
      expect(result.amount).toBe(100);
      expect(bankReward.transferReward).toHaveBeenCalledWith(
        'pension-fund', 'u1', 100, expect.anything(), expect.anything(),
      );
    });
  });

  describe('getAllocationSummary', () => {
    it('should return blank summary for user without bank link', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', bankLink: null });

      const result = await service.getAllocationSummary('u1');
      expect(result.level1Received).toBe(false);
      expect(result.level2Received).toBe(false);
      expect(result.level3Received).toBe(false);
      expect(result.totalReceived).toBe(0);
      expect(result.totalAvailable).toBe(14483);
    });

    it('should detect level 1 allocation from transactions', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        bankLink: { bankRef: 'BOS-001' },
      });
      prisma.altanTransaction.findMany.mockResolvedValue([
        { memo: 'Verification Award Level 1', toBankRef: 'BOS-001' },
      ]);

      const result = await service.getAllocationSummary('u1');
      expect(result.level1Received).toBe(true);
      expect(result.level2Received).toBe(false);
      expect(result.totalReceived).toBe(100);
    });
  });
});
