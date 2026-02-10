import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BankBlockchainService } from './bank-blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('BankBlockchainService', () => {
  let service: BankBlockchainService;
  let prisma: any;
  let blockchain: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      altanLedger: {
        findFirst: jest.fn(),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
      getAltanBalance: jest.fn(),
      getAltanCoreLedgerContract: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankBlockchainService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('false'),
          },
        },
      ],
    }).compile();

    service = module.get<BankBlockchainService>(BankBlockchainService);
  });

  describe('getOnChainBalance', () => {
    it('should return null balance when blockchain unavailable', async () => {
      const result = await service.getOnChainBalance('0xAddr');

      expect(result).toEqual({ balance: null, decimals: 18 });
    });

    it('should return balance when blockchain available', async () => {
      blockchain.isAvailable.mockReturnValue(true);
      blockchain.getAltanBalance.mockResolvedValue('1000');

      const result = await service.getOnChainBalance('0xAddr');

      expect(result).toEqual({ balance: '1000', decimals: 18 });
    });

    it('should handle blockchain error gracefully', async () => {
      blockchain.isAvailable.mockReturnValue(true);
      blockchain.getAltanBalance.mockRejectedValue(new Error('RPC error'));

      const result = await service.getOnChainBalance('0xAddr');

      expect(result).toEqual({ balance: null, decimals: 18 });
    });
  });

  describe('syncBalanceFromBlockchain', () => {
    it('should return not synced for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.syncBalanceFromBlockchain('unknown');

      expect(result.synced).toBe(false);
      expect(result.walletAddress).toBeNull();
    });

    it('should return not synced for user without wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        walletAddress: null,
        altanLedger: { balance: '100' },
      });

      const result = await service.syncBalanceFromBlockchain('user-1');

      expect(result.synced).toBe(false);
      expect(result.dbBalance).toBe('100');
    });
  });

  describe('bulkSyncBalances', () => {
    it('should skip when blockchain unavailable', async () => {
      const result = await service.bulkSyncBalances();

      expect(result).toEqual({ total: 0, synced: 0, discrepancies: 0 });
    });
  });

  describe('getBalanceStatus', () => {
    it('should throw for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getBalanceStatus('unknown'),
      ).rejects.toThrow('User not found');
    });

    it('should return status without blockchain when unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        seatId: 'SEAT-001',
        walletAddress: '0xAddr',
        altanLedger: { balance: '500', updatedAt: new Date() },
      });

      const result = await service.getBalanceStatus('user-1');

      expect(result.user.id).toBe('user-1');
      expect(result.database.balance).toBe('500');
      expect(result.blockchain.synced).toBe(false);
    });
  });

  describe('hassufficientOnChainBalance', () => {
    it('should return false when blockchain unavailable', async () => {
      const result = await service.hassufficientOnChainBalance('0xAddr', '100');

      expect(result).toBe(false);
    });

    it('should return true when balance sufficient', async () => {
      blockchain.isAvailable.mockReturnValue(true);
      blockchain.getAltanBalance.mockResolvedValue('1000');

      const result = await service.hassufficientOnChainBalance('0xAddr', '500');

      expect(result).toBe(true);
    });

    it('should return false when balance insufficient', async () => {
      blockchain.isAvailable.mockReturnValue(true);
      blockchain.getAltanBalance.mockResolvedValue('100');

      const result = await service.hassufficientOnChainBalance('0xAddr', '500');

      expect(result).toBe(false);
    });
  });
});
