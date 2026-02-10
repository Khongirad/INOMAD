import { Test, TestingModule } from '@nestjs/testing';
import { UBISchedulerService } from './ubi-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';

// Mock the @nestjs/schedule Cron decorator
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {},
}));

// Mock bank.utils
jest.mock('../bank/bank.utils', () => ({
  ECONOMIC_CONSTANTS: { UBI_WEEKLY_AMOUNT: 400 },
  TRANSACTION_REASONS: { UBI_WEEKLY: 'Weekly UBI Distribution' },
}));

describe('UBISchedulerService', () => {
  let service: UBISchedulerService;
  let prisma: any;
  let bankReward: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      ubiPayment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };

    bankReward = {
      transferReward: jest.fn().mockResolvedValue({ transactionId: 'tx-1', status: 'COMPLETED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UBISchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: BankRewardService, useValue: bankReward },
      ],
    }).compile();

    service = module.get<UBISchedulerService>(UBISchedulerService);
  });

  describe('manualDistribution', () => {
    it('should throw when pension fund account missing', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'user-1', seatId: 'SEAT-1' }]);
      prisma.user.findFirst.mockResolvedValue(null); // no pension fund

      await expect(service.manualDistribution()).rejects.toThrow(
        'Pension Fund system account not found',
      );
    });

    it('should skip already-paid users (idempotency)', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', seatId: 'SEAT-1' },
      ]);
      prisma.user.findFirst.mockResolvedValue({ id: 'pension-fund' });
      prisma.ubiPayment.findUnique.mockResolvedValue({ id: 'existing-payment' });

      const result = await service.manualDistribution();

      expect(result.skipped).toBe(1);
      expect(result.success).toBe(0);
      expect(bankReward.transferReward).not.toHaveBeenCalled();
    });

    it('should pay eligible users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', seatId: 'SEAT-1' },
        { id: 'user-2', seatId: 'SEAT-2' },
      ]);
      prisma.user.findFirst.mockResolvedValue({ id: 'pension-fund' });
      prisma.ubiPayment.findUnique.mockResolvedValue(null);
      prisma.ubiPayment.create.mockResolvedValue({ id: 'payment-1' });
      prisma.ubiPayment.update.mockResolvedValue({});

      const result = await service.manualDistribution();

      expect(result.success).toBe(2);
      expect(bankReward.transferReward).toHaveBeenCalledTimes(2);
    });

    it('should record failures', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', seatId: 'SEAT-1' },
      ]);
      prisma.user.findFirst.mockResolvedValue({ id: 'pension-fund' });
      prisma.ubiPayment.findUnique.mockResolvedValue(null);
      prisma.ubiPayment.create.mockResolvedValue({ id: 'payment-1' });
      bankReward.transferReward.mockRejectedValue(new Error('Insufficient balance'));
      prisma.ubiPayment.upsert.mockResolvedValue({});

      const result = await service.manualDistribution();

      expect(result.failed).toBe(1);
      expect(prisma.ubiPayment.upsert).toHaveBeenCalled();
    });

    it('should use custom weekStartDate', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.findFirst.mockResolvedValue({ id: 'pension-fund' });

      const customDate = new Date('2026-01-06');
      const result = await service.manualDistribution(customDate);

      expect(result.success).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });
});
