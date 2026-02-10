import { Test, TestingModule } from '@nestjs/testing';
import { EventIndexerService } from './event-indexer.service';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('EventIndexerService', () => {
  let service: EventIndexerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventIndexerService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: BlockchainService, useValue: { getProvider: jest.fn().mockReturnValue(null) } },
      ],
    }).compile();
    service = module.get<EventIndexerService>(EventIndexerService);
  });

  it('getWalletHistory returns empty for unknown wallet', () => {
    expect(service.getWalletHistory('0xunknown')).toEqual([]);
  });

  it('getStats returns object', () => {
    const stats = service.getStats();
    expect(stats).toBeDefined();
  });
});
