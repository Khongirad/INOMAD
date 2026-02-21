// Mock ArbadCreditLine__factory to prevent import error
jest.mock('../typechain-types/factories/ArbadCreditLine__factory', () => ({
  ArbadCreditLine__factory: {
    connect: jest.fn().mockReturnValue({
      connect: jest.fn(),
      getFamilyCreditLine: jest.fn(),
      getOrgCreditLine: jest.fn(),
      interestRateBps: jest.fn(),
      interface: { parseLog: jest.fn() },
    }),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CreditService', () => {
  let service: CreditService;
  let prisma: any;

  beforeEach(async () => {
    // Clear contract env so constructor doesn't try to connect
    delete process.env.ARBAD_CREDIT_LINE_ADDRESS;

    prisma = {
      creditLine: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      loan: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      familyArbad: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CreditService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // =============================================================
  // VIEW FUNCTIONS (pure Prisma, no blockchain)
  // =============================================================

  describe('getCreditLine', () => {
    const mockCreditLine = {
      arbadId: BigInt(1),
      creditType: 'FAMILY',
      creditRating: 700,
      creditLimit: '10000000000',
      borrowed: '3000000000',
      totalBorrowed: '5000000000',
      totalRepaid: '2000000000',
      defaultCount: 0,
      onTimeCount: 2,
      isActive: true,
      openedAt: new Date(),
    };

    it('returns mapped credit line for FAMILY', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(mockCreditLine);
      const result = await service.getCreditLine(1, 'FAMILY');
      expect(result.arbadId).toBe(1);
      expect(result.creditRating).toBe(700);
      expect(result.isActive).toBe(true);
      expect(result.available).toBeDefined();
    });

    it('throws if credit line not found', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(null);
      await expect(service.getCreditLine(99, 'FAMILY')).rejects.toThrow(NotFoundException);
    });

    it('throws if wrong type', async () => {
      prisma.creditLine.findUnique.mockResolvedValue({ ...mockCreditLine, creditType: 'ORG' });
      await expect(service.getCreditLine(1, 'FAMILY')).rejects.toThrow(NotFoundException);
    });

    it('returns mapped credit line for ORG', async () => {
      prisma.creditLine.findUnique.mockResolvedValue({ ...mockCreditLine, creditType: 'ORG' });
      const result = await service.getCreditLine(1, 'ORG');
      expect(result.arbadId).toBe(1);
    });
  });

  describe('getLoans', () => {
    const mockLoan = {
      loanId: BigInt(1),
      arbadId: BigInt(1),
      creditType: 'FAMILY',
      principal: '5000000',
      interest: '250000',
      dueDate: new Date('2026-03-01'),
      borrowedAt: new Date('2026-01-01'),
      repaidAt: null,
      isActive: true,
      isDefaulted: false,
    };

    it('returns mapped loans', async () => {
      prisma.loan.findMany.mockResolvedValue([mockLoan]);
      const result = await service.getLoans(1, 'FAMILY');
      expect(result).toHaveLength(1);
      expect(result[0].loanId).toBe(1);
      expect(result[0].principal).toBe('5000000');
      expect(result[0].totalDue).toBeDefined();
    });

    it('returns empty array when no loans', async () => {
      prisma.loan.findMany.mockResolvedValue([]);
      const result = await service.getLoans(1, 'FAMILY');
      expect(result).toEqual([]);
    });

    it('returns ORG typed loans', async () => {
      prisma.loan.findMany.mockResolvedValue([{ ...mockLoan, creditType: 'ORG' }]);
      const result = await service.getLoans(1, 'ORG');
      expect(result).toHaveLength(1);
    });
  });

  describe('getCreditDashboard', () => {
    const mockCreditLine = {
      arbadId: BigInt(1),
      creditType: 'FAMILY',
      creditRating: 700,
      creditLimit: '10000000',
      borrowed: '3000000',
      totalBorrowed: '5000000',
      totalRepaid: '2000000',
      defaultCount: 0,
      onTimeCount: 2,
      isActive: true,
      openedAt: new Date(),
    };

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    it('returns full dashboard with performance metrics', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(mockCreditLine);
      prisma.loan.findMany.mockResolvedValue([
        {
          loanId: BigInt(1), arbadId: BigInt(1), creditType: 'FAMILY',
          principal: '1000000', interest: '50000',
          dueDate: now, borrowedAt: monthAgo, repaidAt: now,
          isActive: false, isDefaulted: false,
        },
        {
          loanId: BigInt(2), arbadId: BigInt(1), creditType: 'FAMILY',
          principal: '2000000', interest: '100000',
          dueDate: now, borrowedAt: monthAgo, repaidAt: null,
          isActive: true, isDefaulted: false,
        },
      ]);

      const result = await service.getCreditDashboard(1, 'FAMILY');
      expect(result.creditLine).toBeDefined();
      expect(result.activeLoans).toHaveLength(1);
      expect(result.loanHistory).toHaveLength(1);
      expect(result.performance.onTimeRate).toBe(100);
      expect(result.performance.defaultRate).toBe(0);
    });

    it('handles zero completed loans', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(mockCreditLine);
      prisma.loan.findMany.mockResolvedValue([]);

      const result = await service.getCreditDashboard(1, 'FAMILY');
      expect(result.performance.onTimeRate).toBe(0);
      expect(result.performance.defaultRate).toBe(0);
      expect(result.performance.avgRepaymentDays).toBe(0);
    });

    it('calculates default rate correctly', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(mockCreditLine);
      prisma.loan.findMany.mockResolvedValue([
        {
          loanId: BigInt(1), arbadId: BigInt(1), creditType: 'FAMILY',
          principal: '1000000', interest: '50000',
          dueDate: now, borrowedAt: monthAgo, repaidAt: now,
          isActive: false, isDefaulted: true,
        },
        {
          loanId: BigInt(2), arbadId: BigInt(1), creditType: 'FAMILY',
          principal: '1000000', interest: '50000',
          dueDate: now, borrowedAt: monthAgo, repaidAt: now,
          isActive: false, isDefaulted: false,
        },
      ]);

      const result = await service.getCreditDashboard(1, 'FAMILY');
      expect(result.performance.onTimeRate).toBe(50);
      expect(result.performance.defaultRate).toBe(50);
    });
  });

  // =============================================================
  // BLOCKCHAIN OPERATIONS (need contract mock)
  // =============================================================

  describe('openFamilyCreditLine', () => {
    it('throws if credit line already exists', async () => {
      prisma.creditLine.findUnique.mockResolvedValue({ arbadId: BigInt(1) });
      await expect(
        service.openFamilyCreditLine(1, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if family arbad not found', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(null);
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(
        service.openFamilyCreditLine(1, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if family arbad inactive', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(null);
      prisma.familyArbad.findUnique.mockResolvedValue({ arbadId: BigInt(1), isActive: false });
      await expect(
        service.openFamilyCreditLine(1, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('borrowFamily', () => {
    it('throws if credit line not found', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(null);
      await expect(
        service.borrowFamily({ arbadId: 1, amount: '100', durationDays: 30, creditType: 'FAMILY' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if credit type is not FAMILY', async () => {
      prisma.creditLine.findUnique.mockResolvedValue({ creditType: 'ORG' });
      await expect(
        service.borrowFamily({ arbadId: 1, amount: '100', durationDays: 30, creditType: 'FAMILY' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('repayFamily', () => {
    it('throws if loan index out of bounds', async () => {
      prisma.loan.findMany.mockResolvedValue([]);
      await expect(
        service.repayFamily({ arbadId: 1, loanIdx: 0 } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('openOrgCreditLine', () => {
    it('throws if credit line already exists', async () => {
      prisma.creditLine.findUnique.mockResolvedValue({ arbadId: BigInt(1) });
      await expect(
        service.openOrgCreditLine(1, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('borrowOrg', () => {
    it('throws if credit line not found', async () => {
      prisma.creditLine.findUnique.mockResolvedValue(null);
      await expect(
        service.borrowOrg({ arbadId: 1, amount: '100', durationDays: 30, creditType: 'ORG' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if credit type is not ORG', async () => {
      prisma.creditLine.findUnique.mockResolvedValue({ creditType: 'FAMILY' });
      await expect(
        service.borrowOrg({ arbadId: 1, amount: '100', durationDays: 30, creditType: 'ORG' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('repayOrg', () => {
    it('throws if loan index out of bounds', async () => {
      prisma.loan.findMany.mockResolvedValue([]);
      await expect(
        service.repayOrg({ arbadId: 1, loanIdx: 0 } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setInterestRate', () => {
    it('throws if contract not available', async () => {
      // contract is undefined because env is cleared
      await expect(
        service.setInterestRate(500, {} as any),
      ).rejects.toThrow();
    });
  });

  describe('getCurrentInterestRate', () => {
    it('throws if contract not available', async () => {
      await expect(
        service.getCurrentInterestRate(),
      ).rejects.toThrow();
    });
  });
});
