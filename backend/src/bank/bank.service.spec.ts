import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BankService } from './bank.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankFeeService } from './bank-fee.service';

describe('BankService', () => {
  let service: BankService;
  let prisma: any;
  let feeService: jest.Mocked<BankFeeService>;

  beforeEach(async () => {
    prisma = {
      altanLedger: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      bankLink: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      altanTransaction: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) =>
        fn({
          altanLedger: {
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
          },
          altanTransaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
          },
        }),
      ),
    };

    feeService = {
      computeFee: jest.fn().mockReturnValue(0.03),
      isEnabled: jest.fn().mockReturnValue(true),
      getInomadBankRef: jest.fn().mockReturnValue('INOMAD-INC-BANKREF'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        { provide: PrismaService, useValue: prisma },
        { provide: BankFeeService, useValue: feeService },
      ],
    }).compile();

    service = module.get<BankService>(BankService);
  });

  describe('getBalance', () => {
    it('should return balance for valid bankRef', async () => {
      const now = new Date();
      prisma.altanLedger.findFirst.mockResolvedValue({
        id: 'bankref-1',
        balance: 1000,
        lastSyncedAt: now,
      });

      const result = await service.getBalance('bankref-1');

      expect(result).toEqual({
        balance: '1000',
        lastSyncedAt: now.toISOString(),
      });
    });

    it('should return 0 balance for non-existent bankRef', async () => {
      prisma.altanLedger.findFirst.mockResolvedValue(null);
      prisma.bankLink.findFirst.mockResolvedValue(null);

      const result = await service.getBalance('nonexistent-ref');

      expect(result).toEqual({
        balance: '0',
        lastSyncedAt: null,
      });
    });

    it('should fallback to userId-based ledger via bankLink', async () => {
      // First findFirst returns null (no ledger by bankRef id)
      prisma.altanLedger.findFirst.mockResolvedValue(null);
      // But bankLink exists
      prisma.bankLink.findFirst.mockResolvedValue({ userId: 'user-1' });
      // And user's ledger exists
      prisma.altanLedger.findUnique.mockResolvedValue({
        balance: 500,
        lastSyncedAt: null,
      });

      const result = await service.getBalance('legacy-bankref');

      expect(result).toEqual({
        balance: '500',
        lastSyncedAt: null,
      });
    });
  });

  describe('transfer', () => {
    it('should reject zero or negative amount', async () => {
      await expect(
        service.transfer('sender', 'recipient', 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.transfer('sender', 'recipient', -100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer to same account', async () => {
      await expect(
        service.transfer('same-ref', 'same-ref', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when sender bankRef not found', async () => {
      prisma.bankLink.findFirst.mockResolvedValue(null);

      await expect(
        service.transfer('invalid-sender', 'recipient', 100),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveBankRef', () => {
    it('should return exists=true for active bankRef', async () => {
      prisma.bankLink.findFirst.mockResolvedValue({ bankCode: 'ALT-001' });

      const result = await service.resolveBankRef('valid-ref');

      expect(result).toEqual({ exists: true, bankCode: 'ALT-001' });
    });

    it('should return exists=false for unknown bankRef', async () => {
      prisma.bankLink.findFirst.mockResolvedValue(null);

      const result = await service.resolveBankRef('unknown-ref');

      expect(result).toEqual({ exists: false, bankCode: null });
    });
  });
});
