import { Test, TestingModule } from '@nestjs/testing';
import { BankBlockchainService } from './bank-blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';

describe('BankBlockchainService', () => {
  let service: BankBlockchainService;
  let blockchain: any;
  let prisma: any;
  let configService: any;

  beforeEach(async () => {
    const mockBlockchain = {
      isAvailable: jest.fn().mockReturnValue(true),
      getAltanBalance: jest.fn().mockResolvedValue('100.0'),
      getAltanCoreLedgerContract: jest.fn().mockReturnValue({
        on: jest.fn(),
        removeAllListeners: jest.fn(),
        getAddress: jest.fn().mockResolvedValue('0xCONTRACT'),
      }),
    };
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      altanLedger: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankBlockchainService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('false') } },
      ],
    }).compile();
    service = module.get(BankBlockchainService);
    blockchain = module.get(BlockchainService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('onModuleInit', () => {
    it('logs enabled when blockchain available', async () => {
      await service.onModuleInit();
    });
    it('starts event listener when enabled', async () => {
      configService.get = jest.fn().mockReturnValue('true');
      (service as any).configService = configService;
      await service.onModuleInit();
    });
    it('logs disabled when blockchain offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      await service.onModuleInit();
    });
  });

  describe('onModuleDestroy', () => {
    it('stops listener', async () => {
      await service.onModuleDestroy();
    });
  });

  describe('getOnChainBalance', () => {
    it('returns null when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.getOnChainBalance('0x1');
      expect(r.balance).toBeNull();
    });
    it('returns balance', async () => {
      const r = await service.getOnChainBalance('0x1');
      expect(r.balance).toBe('100.0');
    });
    it('returns null on error', async () => {
      blockchain.getAltanBalance.mockRejectedValue(new Error('fail'));
      const r = await service.getOnChainBalance('0x1');
      expect(r.balance).toBeNull();
    });
  });

  describe('syncBalanceFromBlockchain', () => {
    it('returns not synced when no user', async () => {
      const r = await service.syncBalanceFromBlockchain('u1');
      expect(r.synced).toBe(false);
    });
    it('returns not synced when no wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', walletAddress: null, altanLedger: null });
      const r = await service.syncBalanceFromBlockchain('u1');
      expect(r.synced).toBe(false);
    });
    it('returns not synced when balance unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', walletAddress: '0x1', altanLedger: null });
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.syncBalanceFromBlockchain('u1');
      expect(r.synced).toBe(false);
    });
    it('detects discrepancy', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', walletAddress: '0x1', altanLedger: { balance: { toString: () => '50.0' } },
      });
      const r = await service.syncBalanceFromBlockchain('u1');
      expect(r.synced).toBe(true);
      expect(r.discrepancy).toBe(true);
    });
    it('no discrepancy', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', walletAddress: '0x1', altanLedger: { balance: { toString: () => '100.0' } },
      });
      const r = await service.syncBalanceFromBlockchain('u1');
      expect(r.synced).toBe(true);
      expect(r.discrepancy).toBe(false);
    });
  });

  describe('getBalanceStatus', () => {
    it('throws when no user', async () => {
      await expect(service.getBalanceStatus('u1')).rejects.toThrow('User not found');
    });
    it('returns status without wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: null, altanLedger: null,
      });
      const r = await service.getBalanceStatus('u1');
      expect(r.blockchain.synced).toBe(false);
    });
    it('returns full status with wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0x1', altanLedger: { balance: { toString: () => '100.0' }, updatedAt: new Date() },
      });
      const r = await service.getBalanceStatus('u1');
      expect(r.blockchain.synced).toBe(true);
    });
  });

  describe('bulkSyncBalances', () => {
    it('returns zeros when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.bulkSyncBalances();
      expect(r.total).toBe(0);
    });
    it('syncs users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', walletAddress: '0x1', altanLedger: { balance: { toString: () => '100.0' } } },
      ]);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', walletAddress: '0x1', altanLedger: { balance: { toString: () => '100.0' } },
      });
      const r = await service.bulkSyncBalances(10);
      expect(r.total).toBe(1);
    });
  });

  describe('startTransferEventListener', () => {
    it('does nothing when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      await (service as any).startTransferEventListener();
    });
    it('does nothing when no contract', async () => {
      blockchain.getAltanCoreLedgerContract.mockReturnValue(null);
      await (service as any).startTransferEventListener();
    });
    it('does nothing when already active', async () => {
      (service as any).eventListenerActive = true;
      await (service as any).startTransferEventListener();
    });
    it('starts listening', async () => {
      await (service as any).startTransferEventListener();
      expect((service as any).eventListenerActive).toBe(true);
    });
  });

  describe('stopTransferEventListener', () => {
    it('removes listeners', async () => {
      (service as any).eventListenerActive = true;
      await (service as any).stopTransferEventListener();
      expect((service as any).eventListenerActive).toBe(false);
    });
  });

  describe('handleTransferEvent', () => {
    it('handles transfer with known users', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 'sender' })
        .mockResolvedValueOnce({ id: 'receiver' });
      await (service as any).handleTransferEvent('0xFROM', '0xTO', BigInt(100), {
        log: { blockNumber: 1, transactionHash: '0xTX' },
      });
    });
    it('handles transfer with zero address', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 'minter' })
        .mockResolvedValueOnce(null);
      await (service as any).handleTransferEvent(
        '0x0000000000000000000000000000000000000000', '0xTO', BigInt(100),
        { log: { blockNumber: 1, transactionHash: '0xTX' } }
      );
    });
    it('handles error', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('db fail'));
      await (service as any).handleTransferEvent('0xF', '0xT', BigInt(1), {
        log: { blockNumber: 1, transactionHash: '0x' },
      });
    });
  });

  describe('reconcileUserBalance', () => {
    it('returns when no balance', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      await (service as any).reconcileUserBalance('u1', '0x1');
    });
    it('updates when discrepancy found', async () => {
      prisma.altanLedger.findFirst.mockResolvedValue({ balance: { toString: () => '50.0' } });
      await (service as any).reconcileUserBalance('u1', '0x1');
      expect(prisma.altanLedger.upsert).toHaveBeenCalled();
    });
    it('no update when balances match', async () => {
      prisma.altanLedger.findFirst.mockResolvedValue({ balance: { toString: () => '100.0' } });
      await (service as any).reconcileUserBalance('u1', '0x1');
    });
  });

  describe('attemptReconnect', () => {
    it('gives up after max attempts', async () => {
      (service as any).reconnectAttempts = 5;
      await (service as any).attemptReconnect();
    });
  });

  describe('hassufficientOnChainBalance', () => {
    it('returns false when no balance', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.hassufficientOnChainBalance('0x1', '50')).toBe(false);
    });
    it('returns true when sufficient', async () => {
      blockchain.getAltanBalance.mockResolvedValue('200');
      expect(await service.hassufficientOnChainBalance('0x1', '100')).toBe(true);
    });
    it('returns false when insufficient', async () => {
      blockchain.getAltanBalance.mockResolvedValue('50');
      expect(await service.hassufficientOnChainBalance('0x1', '100')).toBe(false);
    });
    it('returns false on parse error', async () => {
      blockchain.getAltanBalance.mockResolvedValue('not-a-number');
      expect(await service.hassufficientOnChainBalance('0x1', '100')).toBe(false);
    });
  });

  describe('hassufficientOnChainBalance', () => {
    it('returns true when balance is sufficient', async () => {
      blockchain.getAltanBalance.mockResolvedValue('1000');
      expect(await service.hassufficientOnChainBalance('0x1', '500')).toBe(true);
    });
    it('returns false on parse error', async () => {
      blockchain.getAltanBalance.mockResolvedValue('not-a-number');
      expect(await service.hassufficientOnChainBalance('0x1', '100')).toBe(false);
    });
  });

  // ─── logTransferEvent (private) ───────
  describe('logTransferEvent (private)', () => {
    it('should log transfer event', async () => {
      await (service as any).logTransferEvent('0xFrom', '0xTo', BigInt(100), '0xHash', 12345);
      // Non-critical, just verify it doesn't throw
    });
  });

  // ─── handleTransferEvent with unknown users ─
  describe('handleTransferEvent edge cases', () => {
    it('handles transfer with no known users', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await (service as any).handleTransferEvent(
        '0xUnknownFrom', '0xUnknownTo', BigInt(1000),
        { log: { blockNumber: 1, transactionHash: '0xHash' } },
      );
    });
    it('handles transfer from zero address (mint)', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // from = 0x00
        .mockResolvedValueOnce({ id: 'receiver' });
      blockchain.getAltanBalance.mockResolvedValue('1000');
      prisma.altanLedger.findFirst.mockResolvedValue({ balance: { toString: () => '0' } });
      prisma.altanLedger.upsert.mockResolvedValue({});
      await (service as any).handleTransferEvent(
        '0x0000000000000000000000000000000000000000', '0xTo', BigInt(1000),
        { log: { blockNumber: 1, transactionHash: '0xHash' } },
      );
    });
    it('handles errors gracefully', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('DB error'));
      await (service as any).handleTransferEvent(
        '0xFrom', '0xTo', BigInt(1000),
        { log: { blockNumber: 1, transactionHash: '0xHash' } },
      );
      // Should not throw - errors are caught internally
    });
  });

  // ─── startTransferEventListener error ─
  describe('startTransferEventListener error', () => {
    it('handles contract setup error', async () => {
      const mockContract = {
        on: jest.fn().mockImplementation(() => { throw new Error('RPC error'); }),
        getAddress: jest.fn().mockResolvedValue('0xContract'),
        removeAllListeners: jest.fn(),
      };
      blockchain.getAltanCoreLedgerContract.mockReturnValue(mockContract);
      (service as any).reconnectAttempts = 5; // prevent infinite loop
      await (service as any).startTransferEventListener();
      // Should handle error without throwing
    });
  });

  // ─── reconcileUserBalance existing ────
  describe('reconcileUserBalance with existing ledger', () => {
    it('should skip update when balances match', async () => {
      blockchain.getAltanBalance.mockResolvedValue('500');
      prisma.altanLedger.findFirst.mockResolvedValue({ balance: { toString: () => '500' } });
      await (service as any).reconcileUserBalance('u1', '0x1');
      expect(prisma.altanLedger.upsert).not.toHaveBeenCalled();
    });
  });

  // ─── getOnChainBalance offline ────────
  describe('getOnChainBalance offline', () => {
    it('returns not synced when blockchain offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.getOnChainBalance('0x1');
      expect(r.balance).toBeNull();
    });
  });

  // ─── getBalanceStatus with wallet/no wallet ─
  describe('getBalanceStatus edge cases', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getBalanceStatus('bad')).rejects.toThrow();
    });
  });
});
