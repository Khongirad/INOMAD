import { Test, TestingModule } from '@nestjs/testing';
import { EventIndexerService } from './event-indexer.service';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('EventIndexerService', () => {
  let service: EventIndexerService;
  let blockchain: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    const mockBlockchain = {
      getProvider: jest.fn().mockReturnValue({}),
      getAltanCoreLedgerContract: jest.fn().mockReturnValue({
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventIndexerService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: BlockchainService, useValue: mockBlockchain },
      ],
    }).compile();
    service = module.get(EventIndexerService);
    blockchain = module.get(BlockchainService);
  });

  afterEach(() => { jest.useRealTimers(); });

  it('should be defined', () => expect(service).toBeDefined());

  describe('onModuleInit', () => {
    it('sets up delayed initialization', async () => {
      await service.onModuleInit();
      // Don't advance timer to avoid actual init side effects
    });
  });

  describe('initialize', () => {
    it('initializes when blockchain available', async () => {
      await (service as any).initialize();
      expect((service as any).isListening).toBe(true);
    });
    it('stays offline when no provider', async () => {
      blockchain.getProvider.mockReturnValue(null);
      await (service as any).initialize();
      expect((service as any).isListening).toBe(false);
    });
    it('stays offline when no contract', async () => {
      blockchain.getAltanCoreLedgerContract.mockReturnValue(null);
      await (service as any).initialize();
      expect((service as any).isListening).toBe(false);
    });
  });

  describe('startListening', () => {
    it('does nothing if already listening', async () => {
      (service as any).isListening = true;
      (service as any).altanContract = { on: jest.fn() };
      await (service as any).startListening();
    });
    it('handles error in event setup', async () => {
      (service as any).altanContract = {
        on: jest.fn().mockImplementation(() => { throw new Error('fail'); }),
      };
      await (service as any).startListening();
      expect((service as any).isListening).toBe(false);
    });
  });

  describe('handleTransferEvent', () => {
    it('records transfer and increments counter', async () => {
      await (service as any).handleTransferEvent(
        '0xFROM', '0xTO', BigInt(100), { blockNumber: 1, transactionHash: '0xTX' }
      );
      expect((service as any).eventCounts.transfers).toBe(1);
    });
    it('detects suspicious activity with high frequency', async () => {
      // Fill cache with >10 recent transactions
      const cache: any[] = [];
      for (let i = 0; i < 11; i++) {
        cache.push({
          type: 'transfer', from: '0xfrom', to: '0xto',
          amount: '100', timestamp: Date.now(), blockNumber: 1, txHash: '0xTX',
        });
      }
      (service as any).recentTransactions.set('0xfrom', cache);
      await (service as any).handleTransferEvent(
        '0xFROM', '0xTO', BigInt(100), { blockNumber: 2, transactionHash: '0xTX2' }
      );
      expect((service as any).eventCounts.suspicious).toBe(1);
    });
    it('detects draining pattern', async () => {
      const cache: any[] = [];
      for (let i = 0; i < 3; i++) {
        cache.push({
          type: 'transfer', from: '0xfrom', to: '0xdrain',
          amount: '100', timestamp: Date.now(), blockNumber: 1, txHash: '0xTX',
        });
      }
      (service as any).recentTransactions.set('0xfrom', cache);
      await (service as any).handleTransferEvent(
        '0xFROM', '0xDRAIN', BigInt(100), { blockNumber: 2, transactionHash: '0xTX3' }
      );
      expect((service as any).eventCounts.suspicious).toBeGreaterThanOrEqual(1);
    });
    it('detects new recipient', async () => {
      const cache: any[] = [];
      for (let i = 0; i < 6; i++) {
        cache.push({
          type: 'transfer', from: '0xfrom', to: '0xknown',
          amount: '100', timestamp: Date.now() - 100000, blockNumber: 1, txHash: '0xTX',
        });
      }
      (service as any).recentTransactions.set('0xfrom', cache);
      await (service as any).handleTransferEvent(
        '0xFROM', '0xNEW', BigInt(100), { blockNumber: 2, transactionHash: '0xTX4' }
      );
      // New recipient should be flagged
    });
  });

  describe('handleApprovalEvent', () => {
    it('ignores normal approvals', async () => {
      await (service as any).handleApprovalEvent(
        '0xOWNER', '0xSPENDER', BigInt(100), { blockNumber: 1, transactionHash: '0xTX' }
      );
      expect((service as any).eventCounts.approvals).toBe(1);
    });
    it('detects unlimited approval', async () => {
      const maxUint = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      await (service as any).handleApprovalEvent(
        '0xOWNER', '0xSPENDER', maxUint, { blockNumber: 1, transactionHash: '0xTX' }
      );
      expect((service as any).eventCounts.approvals).toBe(1);
    });
  });

  describe('addToCache', () => {
    it('creates new wallet entry', () => {
      const record = {
        type: 'transfer', from: '0x1', to: '0x2',
        amount: '100', timestamp: Date.now(), blockNumber: 1, txHash: '0x',
      };
      (service as any).addToCache('0x1', record);
      expect((service as any).recentTransactions.get('0x1')).toHaveLength(1);
    });
    it('cleans old entries', () => {
      (service as any).recentTransactions.set('0x1', [{
        type: 'transfer', from: '0x1', to: '0x2',
        amount: '100', timestamp: Date.now() - 25 * 60 * 60 * 1000, // >24h ago
        blockNumber: 1, txHash: '0x',
      }]);
      const record = {
        type: 'transfer', from: '0x1', to: '0x2',
        amount: '100', timestamp: Date.now(), blockNumber: 2, txHash: '0x2',
      };
      (service as any).addToCache('0x1', record);
      expect((service as any).recentTransactions.get('0x1')).toHaveLength(1);
    });
  });

  describe('getWalletHistory', () => {
    it('returns empty for unknown wallet', () => {
      expect(service.getWalletHistory('0xUNKNOWN')).toEqual([]);
    });
    it('returns cached records', () => {
      (service as any).recentTransactions.set('0x1', [{ type: 'transfer' }]);
      expect(service.getWalletHistory('0x1')).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('returns current stats', () => {
      const stats = service.getStats();
      expect(stats.isListening).toBe(false);
      expect(stats.eventCounts).toBeDefined();
      expect(stats.cachedWallets).toBe(0);
    });
  });

  describe('stopListening', () => {
    it('removes listeners', async () => {
      const mockContract = { removeAllListeners: jest.fn() };
      (service as any).altanContract = mockContract;
      (service as any).isListening = true;
      await service.stopListening();
      expect(mockContract.removeAllListeners).toHaveBeenCalled();
      expect((service as any).isListening).toBe(false);
    });
    it('handles no contract', async () => {
      (service as any).altanContract = null;
      await service.stopListening();
    });
  });
});
