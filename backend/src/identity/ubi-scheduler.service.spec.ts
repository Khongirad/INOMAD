import { Test, TestingModule } from '@nestjs/testing';
import { UBISchedulerService } from './ubi-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';

describe('UBISchedulerService', () => {
  let service: UBISchedulerService;
  let prisma: any;
  let bankReward: any;

  const mockUser = { id: 'u1', seatId: 'SEAT-001', email: 'test@test.com' };
  const mockPensionFund = { id: 'pf1', email: 'pension@system.khural' };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([mockUser]),
        findFirst: jest.fn().mockResolvedValue(mockPensionFund),
      },
      ubiPayment: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ubi1', status: 'PENDING' }),
        update: jest.fn().mockResolvedValue({ id: 'ubi1', status: 'COMPLETED' }),
        upsert: jest.fn().mockResolvedValue({ id: 'ubi1', status: 'FAILED' }),
      },
    };
    const mockBankReward = {
      transferReward: jest.fn().mockResolvedValue({ transactionId: 'tx1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UBISchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BankRewardService, useValue: mockBankReward },
      ],
    }).compile();
    service = module.get(UBISchedulerService);
    prisma = module.get(PrismaService);
    bankReward = module.get(BankRewardService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('distributeWeeklyUBI', () => {
    it('distributes to eligible users', async () => {
      await service.distributeWeeklyUBI();
      expect(bankReward.transferReward).toHaveBeenCalled();
      expect(prisma.ubiPayment.create).toHaveBeenCalled();
      expect(prisma.ubiPayment.update).toHaveBeenCalled();
    });
    it('skips already-paid users', async () => {
      prisma.ubiPayment.findUnique.mockResolvedValue({ id: 'existing' });
      await service.distributeWeeklyUBI();
      expect(bankReward.transferReward).not.toHaveBeenCalled();
    });
    it('handles transfer failure', async () => {
      bankReward.transferReward.mockRejectedValue(new Error('Transfer failed'));
      await service.distributeWeeklyUBI();
      expect(prisma.ubiPayment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });
    it('handles no eligible users', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.distributeWeeklyUBI();
      expect(bankReward.transferReward).not.toHaveBeenCalled();
    });
    it('handles pension fund not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      // Should not throw (caught internally)
      await service.distributeWeeklyUBI();
    });
  });

  describe('manualDistribution', () => {
    it('distributes with default dates', async () => {
      const r = await service.manualDistribution();
      expect(r.success).toBe(1);
      expect(r.skipped).toBe(0);
      expect(r.failed).toBe(0);
    });
    it('distributes with custom date', async () => {
      const r = await service.manualDistribution(new Date('2026-01-06'));
      expect(r.success).toBe(1);
    });
    it('skips already paid', async () => {
      prisma.ubiPayment.findUnique.mockResolvedValue({ id: 'x' });
      const r = await service.manualDistribution();
      expect(r.skipped).toBe(1);
      expect(r.success).toBe(0);
    });
    it('handles failure', async () => {
      bankReward.transferReward.mockRejectedValue(new Error('fail'));
      const r = await service.manualDistribution();
      expect(r.failed).toBe(1);
    });
    it('throws when pension fund not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.manualDistribution()).rejects.toThrow('Pension Fund');
    });
  });

  describe('getLastWeekRange (private)', () => {
    it('returns valid date range', () => {
      const range = (service as any).getLastWeekRange();
      expect(range.weekStart).toBeInstanceOf(Date);
      expect(range.weekEnd).toBeInstanceOf(Date);
      expect(range.weekEnd.getTime()).toBeGreaterThan(range.weekStart.getTime());
    });
  });

  describe('getEligibleUsers (private)', () => {
    it('queries verified users with bank links', async () => {
      const users = await (service as any).getEligibleUsers();
      expect(users).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verificationStatus: 'VERIFIED',
          }),
        }),
      );
    });
  });

  describe('getPensionFundAccount (private)', () => {
    it('returns pension fund account', async () => {
      const pf = await (service as any).getPensionFundAccount();
      expect(pf.id).toBe('pf1');
    });
    it('throws when not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect((service as any).getPensionFundAccount()).rejects.toThrow('Pension Fund');
    });
  });
});
