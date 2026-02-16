import { Test, TestingModule } from '@nestjs/testing';
import { BankRewardService } from './bank-reward.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('BankRewardService', () => {
  let service: BankRewardService;
  let prisma: any;

  const mockTx = {
    altanLedger: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    altanTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'tx-1', status: 'COMPLETED' }),
    },
  };

  const mockPrisma = () => ({
    bankLink: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankRewardService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(BankRewardService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('transferReward', () => {
    it('should transfer reward between users', async () => {
      prisma.bankLink.findUnique
        .mockResolvedValueOnce({ bankRef: 'BANK-SENDER' })
        .mockResolvedValueOnce({ bankRef: 'BANK-RECEIVER' });
      mockTx.altanLedger.findUnique
        .mockResolvedValueOnce({ userId: 'u1', balance: 1000 }) // sender
        .mockResolvedValueOnce({ userId: 'u2', balance: 500 }); // recipient exists
      const result = await service.transferReward('u1', 'u2', 100);
      expect(result.status).toBe('COMPLETED');
    });

    it('should create ledger for new recipient', async () => {
      prisma.bankLink.findUnique
        .mockResolvedValueOnce({ bankRef: 'S' })
        .mockResolvedValueOnce({ bankRef: 'R' });
      mockTx.altanLedger.findUnique
        .mockResolvedValueOnce({ userId: 'u1', balance: 500 }) // sender
        .mockResolvedValueOnce(null); // no recipient ledger
      const result = await service.transferReward('u1', 'u2', 50);
      expect(mockTx.altanLedger.create).toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw if amount <= 0', async () => {
      await expect(service.transferReward('u1', 'u2', 0)).rejects.toThrow(BadRequestException);
    });

    it('should throw if self-transfer', async () => {
      await expect(service.transferReward('u1', 'u1', 100)).rejects.toThrow(BadRequestException);
    });

    it('should throw if insufficient balance', async () => {
      prisma.bankLink.findUnique.mockResolvedValue({ bankRef: 'B' });
      mockTx.altanLedger.findUnique.mockResolvedValueOnce({ userId: 'u1', balance: 10 });
      await expect(service.transferReward('u1', 'u2', 100)).rejects.toThrow(BadRequestException);
    });
  });
});
