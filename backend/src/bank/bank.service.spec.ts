import { Test, TestingModule } from '@nestjs/testing';
import { BankService } from './bank.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankFeeService } from './bank-fee.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BankService', () => {
  let service: BankService;
  let prisma: any;

  const mockPrisma = () => ({
    altanLedger: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), upsert: jest.fn() },
    altanTransaction: { findMany: jest.fn(), create: jest.fn() },
    bankLink: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
  });

  const mockFeeService = () => ({
    computeFee: jest.fn().mockReturnValue(0.15), // 0.03% of 500
    isEnabled: jest.fn().mockReturnValue(true),
    getInomadBankRef: jest.fn().mockReturnValue('INOMAD_BR'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: BankFeeService, useFactory: mockFeeService },
      ],
    }).compile();
    service = module.get(BankService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── getBalance ────────────────────────
  describe('getBalance', () => {
    it('should return balance from ledger', async () => {
      prisma.altanLedger.findFirst.mockResolvedValue({ balance: 1000, lastSyncedAt: new Date() });
      const result = await service.getBalance('br-1');
      expect(result.balance).toBe('1000');
    });

    it('should fallback to bankLink → userId ledger', async () => {
      prisma.altanLedger.findFirst.mockResolvedValue(null); // no direct ledger
      prisma.bankLink.findFirst.mockResolvedValue({ userId: 'u1' });
      prisma.altanLedger.findUnique.mockResolvedValue({ balance: 500, lastSyncedAt: null });
      const result = await service.getBalance('br-1');
      expect(result.balance).toBe('500');
    });

    it('should return 0 when no ledger found', async () => {
      prisma.altanLedger.findFirst.mockResolvedValue(null);
      prisma.bankLink.findFirst.mockResolvedValue(null);
      const result = await service.getBalance('br-bad');
      expect(result.balance).toBe('0');
    });
  });

  // ─── getHistory ────────────────────────
  describe('getHistory', () => {
    it('should return transaction history', async () => {
      prisma.bankLink.findFirst.mockResolvedValue({ userId: 'u1' });
      prisma.altanTransaction.findMany.mockResolvedValue([{
        id: 'tx-1', amount: 100, type: 'TRANSFER', status: 'COMPLETED',
        txHash: '0x1', memo: 'test', createdAt: new Date(),
        fromBankRef: 'br-1', toBankRef: 'br-2', fromUserId: 'u1', toUserId: 'u2',
      }]);
      const result = await service.getHistory('br-1');
      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe('OUT');
    });

    it('should return empty for unknown bankRef', async () => {
      prisma.bankLink.findFirst.mockResolvedValue(null);
      const result = await service.getHistory('bad');
      expect(result).toEqual([]);
    });

    it('should resolve legacy transactions via bankLink', async () => {
      prisma.bankLink.findFirst.mockResolvedValue({ userId: 'u1' });
      prisma.altanTransaction.findMany.mockResolvedValue([{
        id: 'tx-2', amount: 200, type: 'TRANSFER', status: 'COMPLETED',
        txHash: null, memo: null, createdAt: new Date(),
        fromBankRef: null, toBankRef: null, fromUserId: 'u2', toUserId: 'u1',
      }]);
      prisma.bankLink.findMany.mockResolvedValue([{ userId: 'u2', bankRef: 'br-2' }]);
      const result = await service.getHistory('br-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── transfer ──────────────────────────
  describe('transfer', () => {
    it('should transfer funds with fee', async () => {
      prisma.bankLink.findFirst
        .mockResolvedValueOnce({ userId: 'sender' })  // sender
        .mockResolvedValueOnce({ userId: 'recipient' }) // recipient
        .mockResolvedValueOnce({ userId: 'inomad' }); // fee account
      prisma.altanLedger.findUnique
        .mockResolvedValueOnce({ balance: 1000 }) // sender balance
        .mockResolvedValueOnce({ balance: 200 }); // recipient balance
      prisma.altanLedger.update.mockResolvedValue({});
      prisma.altanLedger.upsert.mockResolvedValue({});
      prisma.altanTransaction.create.mockResolvedValue({ id: 'tx-1' });
      const result = await service.transfer('br-sender', 'br-recipient', 500, 'Test');
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw for negative amount', async () => {
      await expect(service.transfer('br-1', 'br-2', -100)).rejects.toThrow(BadRequestException);
    });

    it('should throw for same account transfer', async () => {
      await expect(service.transfer('br-1', 'br-1', 100)).rejects.toThrow(BadRequestException);
    });

    it('should throw for missing sender', async () => {
      prisma.bankLink.findFirst.mockResolvedValue(null);
      await expect(service.transfer('bad', 'br-2', 100)).rejects.toThrow(NotFoundException);
    });

    it('should throw for insufficient balance', async () => {
      prisma.bankLink.findFirst
        .mockResolvedValueOnce({ userId: 'sender' })
        .mockResolvedValueOnce({ userId: 'recipient' })
        .mockResolvedValueOnce({ userId: 'inomad' });
      prisma.altanLedger.findUnique.mockResolvedValue({ balance: 10 }); // not enough
      await expect(service.transfer('br-1', 'br-2', 500)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── resolveBankRef ────────────────────
  describe('resolveBankRef', () => {
    it('should resolve active bankRef', async () => {
      prisma.bankLink.findFirst.mockResolvedValue({ bankCode: 'ABC' });
      const result = await service.resolveBankRef('br-1');
      expect(result.exists).toBe(true);
      expect(result.bankCode).toBe('ABC');
    });

    it('should return false for unknown bankRef', async () => {
      prisma.bankLink.findFirst.mockResolvedValue(null);
      const result = await service.resolveBankRef('bad');
      expect(result.exists).toBe(false);
    });
  });
});
