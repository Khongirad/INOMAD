import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BankRewardService } from './bank-reward.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BankRewardService', () => {
  let service: BankRewardService;
  let prisma: any;

  beforeEach(async () => {
    const txMocks = {
      altanLedger: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      altanTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      },
    };

    prisma = {
      bankLink: { findUnique: jest.fn() },
      $transaction: jest.fn((fn) => fn(txMocks)),
      _txMocks: txMocks, // store for test assertions
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankRewardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BankRewardService>(BankRewardService);
  });

  describe('transferReward', () => {
    it('should reject zero amount', async () => {
      await expect(
        service.transferReward('from', 'to', 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative amount', async () => {
      await expect(
        service.transferReward('from', 'to', -50),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject self-reward', async () => {
      await expect(
        service.transferReward('same-user', 'same-user', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should resolve bankRefs from userIds', async () => {
      prisma.bankLink.findUnique
        .mockResolvedValueOnce({ bankRef: 'sender-ref' })
        .mockResolvedValueOnce({ bankRef: 'recipient-ref' });

      prisma._txMocks.altanLedger.findUnique
        .mockResolvedValueOnce({ balance: 1000 }) // sender
        .mockResolvedValueOnce({ balance: 500 }); // recipient

      const result = await service.transferReward('from-user', 'to-user', 100);

      expect(result.transactionId).toBe('tx-1');
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject insufficient balance', async () => {
      prisma.bankLink.findUnique.mockResolvedValue(null);

      prisma._txMocks.altanLedger.findUnique
        .mockResolvedValueOnce({ balance: 50 }); // only 50, need 100

      await expect(
        service.transferReward('from', 'to', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create ledger for new recipient', async () => {
      prisma.bankLink.findUnique.mockResolvedValue(null);

      prisma._txMocks.altanLedger.findUnique
        .mockResolvedValueOnce({ balance: 1000 }) // sender has balance
        .mockResolvedValueOnce(null); // recipient no ledger

      const result = await service.transferReward('from', 'to', 100);

      expect(prisma._txMocks.altanLedger.create).toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
    });
  });
});
