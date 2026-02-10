import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { ConfigService } from '@nestjs/config';
import { ContractAddressesService } from './contract-addresses.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  beforeEach(async () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'BLOCKCHAIN_RPC_URL') return null;
        return null;
      }),
    };
    const contractAddresses = {
      getAddress: jest.fn().mockReturnValue(null),
      isLoaded: jest.fn().mockReturnValue(false),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: ConfigService, useValue: configService },
        { provide: ContractAddressesService, useValue: contractAddresses },
      ],
    }).compile();
    service = module.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('isAvailable returns false when no provider', () => {
    expect(service.isAvailable()).toBe(false);
  });
});
