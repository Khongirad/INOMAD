import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { ContractAddressesService } from './contract-addresses.service';

describe('BlockchainService', () => {
  let service: BlockchainService;
  let configService: ConfigService;
  let addressService: ContractAddressesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                BLOCKCHAIN_ENABLED: 'false', // Disabled for unit tests
                ALTAN_RPC_URL: 'http://localhost:8545',
                ALTAN_CHAIN_ID: '31337',
                CONTRACTS_BASE_PATH: '../chain',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: ContractAddressesService,
          useValue: {
            getChainId: jest.fn(() => 31337),
            getRpcUrl: jest.fn(() => 'http://localhost:8545'),
            getAllAddresses: jest.fn(() => ({})),
            getIdentityContracts: jest.fn(() => ({
              seatSBT: '0x0000000000000000000000000000000000000001',
              citizenRegistry: '0x0000000000000000000000000000000000000002',
              activationRegistry: '0x0000000000000000000000000000000000000003',
            })),
            getBankingContracts: jest.fn(() => ({
              altan: '0x0000000000000000000000000000000000000004',
            })),
          },
        },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
    configService = module.get<ConfigService>(ConfigService);
    addressService = module.get<ContractAddressesService>(ContractAddressesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAvailable', () => {
    it('should return false when blockchain is disabled', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    it('should return null for getAltanBalance when unavailable', async () => {
      const balance = await service.getAltanBalance('0x1234567890123456789012345678901234567890');
      expect(balance).toBeNull();
    });

    it('should return null for getSeatOwner when unavailable', async () => {
      const owner = await service.getSeatOwner('1');
      expect(owner).toBeNull();
    });

    it('should return null for getSeatMetadata when unavailable', async () => {
      const metadata = await service.getSeatMetadata('1');
      expect(metadata).toBeNull();
    });

    it('should return null for getWalletAddress when unavailable', async () => {
      const wallet = await service.getWalletAddress('1');
      expect(wallet).toBeNull();
    });

    it('should return false for isWalletUnlocked when unavailable', async () => {
      const unlocked = await service.isWalletUnlocked('1');
      expect(unlocked).toBe(false);
    });

    it('should return false for isActivated when unavailable', async () => {
      const activated = await service.isActivated('1');
      expect(activated).toBe(false);
    });
  });
});
