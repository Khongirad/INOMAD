import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { ConfigService } from '@nestjs/config';
import { ContractAddressesService } from './contract-addresses.service';

// Mock ethers
jest.mock('ethers', () => {
  const mockContract = {
    ownerOf: jest.fn(),
    balanceOf: jest.fn(),
    tokenOfOwnerByIndex: jest.fn(),
    decimals: jest.fn(),
    metaOf: jest.fn(),
    walletOf: jest.fn(),
    unlocked: jest.fn(),
    isActivated: jest.fn(),
    totalSupply: jest.fn(),
  };
  return {
    ethers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBlockNumber: jest.fn().mockResolvedValue(100),
        broadcastTransaction: jest.fn().mockResolvedValue({ hash: '0xTX' }),
        getBlock: jest.fn().mockResolvedValue({ timestamp: 1000 }),
        estimateGas: jest.fn().mockResolvedValue(BigInt(21000)),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000) }),
      })),
      Contract: jest.fn().mockImplementation(() => ({ ...mockContract })),
      ContractFactory: jest.fn().mockImplementation(() => ({
        deploy: jest.fn().mockResolvedValue({
          deploymentTransaction: () => ({ hash: '0xDEPLOY' }),
          waitForDeployment: jest.fn().mockResolvedValue(undefined),
          getAddress: jest.fn().mockResolvedValue('0xCONTRACT'),
        }),
      })),
      Wallet: jest.fn().mockImplementation((pk, provider) => ({
        signTransaction: jest.fn().mockResolvedValue('0xSIGNED'),
      })),
      formatUnits: jest.fn().mockReturnValue('100.0'),
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

describe('BlockchainService', () => {
  let service: BlockchainService;
  let configService: any;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn().mockImplementation((key, defaultVal) => {
        if (key === 'BLOCKCHAIN_ENABLED') return 'true';
        if (key === 'ALTAN_RPC_URL') return 'http://localhost:8545';
        return defaultVal || null;
      }),
    };
    const mockAddresses = {
      getRpcUrl: jest.fn().mockReturnValue('http://localhost:8545'),
      getChainId: jest.fn().mockReturnValue(31337),
      getAllAddresses: jest.fn().mockReturnValue({ SeatSBT: '0x1' }),
      getIdentityContracts: jest.fn().mockReturnValue({
        seatSBT: '0xSEAT',
        citizenRegistry: '0xCITIZEN',
        activationRegistry: '0xACTIVATION',
      }),
      getBankingContracts: jest.fn().mockReturnValue({
        altanCoreLedger: '0xALTAN',
        altanWalletRegistry: '0xWALLET_REG',
        taxEngine: '0xTAX',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: ContractAddressesService, useValue: mockAddresses },
      ],
    }).compile();
    service = module.get(BlockchainService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('onModuleInit', () => {
    it('initializes provider and contracts', async () => {
      await service.onModuleInit();
      expect(service.isAvailable()).toBe(true);
    });

    it('disables when BLOCKCHAIN_ENABLED is false', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'BLOCKCHAIN_ENABLED') return 'false';
        return null;
      });
      await service.onModuleInit();
      expect(service.isAvailable()).toBe(false);
    });

    it('stays offline when no RPC URL', async () => {
      configService.get.mockReturnValue(null);
      const mockAddresses = { getRpcUrl: jest.fn().mockReturnValue(null) } as any;
      (service as any).contractAddresses = mockAddresses;
      // Force re-init with no enabled flag & no url
      configService.get.mockImplementation((key, def) => {
        if (key === 'BLOCKCHAIN_ENABLED') return 'true';
        return null;
      });
      (service as any).contractAddresses.getRpcUrl = jest.fn().mockReturnValue(null);
      await service.onModuleInit();
    });

    it('handles connection error gracefully', async () => {
      const { ethers } = require('ethers');
      ethers.JsonRpcProvider.mockImplementationOnce(() => ({
        getBlockNumber: jest.fn().mockRejectedValue(new Error('connection failed')),
      }));
      await service.onModuleInit();
    });
  });

  describe('after initialization', () => {
    beforeEach(async () => { await service.onModuleInit(); });

    it('isAvailable returns true', () => expect(service.isAvailable()).toBe(true));
    it('getProvider returns provider', () => expect(service.getProvider()).toBeTruthy());
    it('getAltanCoreLedgerContract', () => expect(service.getAltanCoreLedgerContract()).toBeTruthy());
    it('getActivationRegistryContract', () => expect(service.getActivationRegistryContract()).toBeTruthy());
    it('getTaxEngineContract', () => expect(service.getTaxEngineContract()).toBeTruthy());

    it('getSeatOwner success', async () => {
      const contract = (service as any).seatSBTContract;
      contract.ownerOf = jest.fn().mockResolvedValue('0xOWNER');
      expect(await service.getSeatOwner('1')).toBe('0xOWNER');
    });
    it('getSeatOwner error', async () => {
      const contract = (service as any).seatSBTContract;
      contract.ownerOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getSeatOwner('1')).toBeNull();
    });

    it('verifySeatOwnership true', async () => {
      const contract = (service as any).seatSBTContract;
      contract.ownerOf = jest.fn().mockResolvedValue('0xOwner');
      expect(await service.verifySeatOwnership('1', '0xowner')).toBe(true);
    });
    it('verifySeatOwnership false (no owner)', async () => {
      const contract = (service as any).seatSBTContract;
      contract.ownerOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.verifySeatOwnership('1', '0xowner')).toBe(false);
    });

    it('getSeatsOwnedBy', async () => {
      const contract = (service as any).seatSBTContract;
      contract.balanceOf = jest.fn().mockResolvedValue(BigInt(2));
      contract.tokenOfOwnerByIndex = jest.fn().mockResolvedValue(BigInt(1));
      const seats = await service.getSeatsOwnedBy('0x1');
      expect(seats).toHaveLength(2);
    });
    it('getSeatsOwnedBy error', async () => {
      const contract = (service as any).seatSBTContract;
      contract.balanceOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getSeatsOwnedBy('0x1')).toEqual([]);
    });

    it('getAltanBalance success', async () => {
      const contract = (service as any).altanCoreLedgerContract;
      contract.balanceOf = jest.fn().mockResolvedValue(BigInt(100));
      contract.decimals = jest.fn().mockResolvedValue(18);
      expect(await service.getAltanBalance('0x1')).toBe('100.0');
    });
    it('getAltanBalance error', async () => {
      const contract = (service as any).altanCoreLedgerContract;
      contract.balanceOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getAltanBalance('0x1')).toBeNull();
    });

    it('getSeatMetadata success', async () => {
      const contract = (service as any).citizenRegistryContract;
      contract.metaOf = jest.fn().mockResolvedValue(['N1', BigInt(1), BigInt(2), BigInt(3), BigInt(4), BigInt(5), true]);
      const meta = await service.getSeatMetadata('1');
      expect(meta.nationId).toBe('N1');
    });
    it('getSeatMetadata error', async () => {
      const contract = (service as any).citizenRegistryContract;
      contract.metaOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getSeatMetadata('1')).toBeNull();
    });

    it('getWalletAddress success', async () => {
      const contract = (service as any).altanWalletRegistryContract;
      contract.walletOf = jest.fn().mockResolvedValue('0xWALLET');
      expect(await service.getWalletAddress('1')).toBe('0xWALLET');
    });
    it('getWalletAddress zero', async () => {
      const contract = (service as any).altanWalletRegistryContract;
      const { ethers } = require('ethers');
      contract.walletOf = jest.fn().mockResolvedValue(ethers.ZeroAddress);
      expect(await service.getWalletAddress('1')).toBeNull();
    });
    it('getWalletAddress error', async () => {
      const contract = (service as any).altanWalletRegistryContract;
      contract.walletOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getWalletAddress('1')).toBeNull();
    });

    it('isWalletUnlocked success', async () => {
      const contract = (service as any).altanWalletRegistryContract;
      contract.walletOf = jest.fn().mockResolvedValue('0xWALLET');
      // The new contract instance created for the wallet will have unlocked mock
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({ unlocked: jest.fn().mockResolvedValue(true) }));
      expect(await service.isWalletUnlocked('1')).toBe(true);
    });
    it('isWalletUnlocked no wallet', async () => {
      const contract = (service as any).altanWalletRegistryContract;
      contract.walletOf = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.isWalletUnlocked('1')).toBe(false);
    });

    it('isActivated success', async () => {
      const contract = (service as any).activationRegistryContract;
      contract.isActivated = jest.fn().mockResolvedValue(true);
      expect(await service.isActivated('1')).toBe(true);
    });
    it('isActivated error', async () => {
      const contract = (service as any).activationRegistryContract;
      contract.isActivated = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.isActivated('1')).toBe(false);
    });

    it('getTotalSeats success', async () => {
      const contract = (service as any).seatSBTContract;
      contract.totalSupply = jest.fn().mockResolvedValue(BigInt(500));
      expect(await service.getTotalSeats()).toBe(500);
    });
    it('getTotalSeats error', async () => {
      const contract = (service as any).seatSBTContract;
      contract.totalSupply = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getTotalSeats()).toBe(0);
    });

    it('broadcastTransaction success', async () => {
      const result = await service.broadcastTransaction('0xSIGNED_TX');
      expect(result.hash).toBe('0xTX');
    });
    it('broadcastTransaction error', async () => {
      (service as any).provider.broadcastTransaction = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(service.broadcastTransaction('0xSIGNED_TX')).rejects.toThrow();
    });

    it('getCurrentBlock success', async () => {
      const block = await service.getCurrentBlock();
      expect(block).toBe(100);
    });
    it('getCurrentBlock error', async () => {
      (service as any).provider.getBlockNumber = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getCurrentBlock()).toBe(0);
    });

    it('getBlockTimestamp success', async () => {
      expect(await service.getBlockTimestamp(1)).toBe(1000);
    });
    it('getBlockTimestamp null block', async () => {
      (service as any).provider.getBlock = jest.fn().mockResolvedValue(null);
      expect(await service.getBlockTimestamp(999)).toBe(0);
    });
    it('getBlockTimestamp error', async () => {
      (service as any).provider.getBlock = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getBlockTimestamp(1)).toBe(0);
    });

    it('getWallet success', () => {
      expect(service.getWallet('0xPK')).toBeTruthy();
    });
    it('getWallet error', () => {
      const { ethers } = require('ethers');
      ethers.Wallet.mockImplementationOnce(() => { throw new Error('invalid'); });
      expect(() => service.getWallet('bad')).toThrow('Invalid private key');
    });

    it('signTransaction success', async () => {
      expect(await service.signTransaction({} as any, '0xPK')).toBe('0xSIGNED');
    });

    it('deployContract success', async () => {
      const contract = await service.deployContract([], '0x', '0xPK');
      expect(contract).toBeTruthy();
    });

    it('estimateGas', async () => {
      expect(await service.estimateGas({} as any)).toBe(BigInt(21000));
    });
    it('estimateGas error', async () => {
      (service as any).provider.estimateGas = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(service.estimateGas({} as any)).rejects.toThrow();
    });

    it('getContractWithSigner', () => {
      expect(service.getContractWithSigner('0x1', [], '0xPK')).toBeTruthy();
    });

    it('getGasPrice', async () => {
      expect(await service.getGasPrice()).toBe(BigInt(1000));
    });
    it('getGasPrice null', async () => {
      (service as any).provider.getFeeData = jest.fn().mockResolvedValue({ gasPrice: null });
      expect(await service.getGasPrice()).toBe(BigInt(0));
    });
    it('getGasPrice error', async () => {
      (service as any).provider.getFeeData = jest.fn().mockRejectedValue(new Error('fail'));
      expect(await service.getGasPrice()).toBe(BigInt(0));
    });
  });

  describe('when not available', () => {
    it('getSeatOwner returns null', async () => expect(await service.getSeatOwner('1')).toBeNull());
    it('getSeatsOwnedBy returns []', async () => expect(await service.getSeatsOwnedBy('0x1')).toEqual([]));
    it('getAltanBalance returns null', async () => expect(await service.getAltanBalance('0x1')).toBeNull());
    it('getSeatMetadata returns null', async () => expect(await service.getSeatMetadata('1')).toBeNull());
    it('getWalletAddress returns null', async () => expect(await service.getWalletAddress('1')).toBeNull());
    it('isActivated returns false', async () => expect(await service.isActivated('1')).toBe(false));
    it('getTotalSeats returns 0', async () => expect(await service.getTotalSeats()).toBe(0));
    it('broadcastTransaction throws', async () => await expect(service.broadcastTransaction('0x')).rejects.toThrow());
    it('getCurrentBlock returns 0', async () => expect(await service.getCurrentBlock()).toBe(0));
    it('getBlockTimestamp returns 0', async () => expect(await service.getBlockTimestamp(1)).toBe(0));
    it('getWallet throws', () => expect(() => service.getWallet('0x')).toThrow());
    it('signTransaction throws', async () => await expect(service.signTransaction({} as any, '0x')).rejects.toThrow());
    it('deployContract throws', async () => await expect(service.deployContract([], '0x', '0x')).rejects.toThrow());
    it('estimateGas throws', async () => await expect(service.estimateGas({} as any)).rejects.toThrow());
    it('getContractWithSigner throws', () => expect(() => service.getContractWithSigner('0x', [], '0x')).toThrow());
    it('getGasPrice returns 0', async () => expect(await service.getGasPrice()).toBe(BigInt(0)));
    it('getProvider returns null', () => expect(service.getProvider()).toBeNull());
    it('getAltanCoreLedgerContract returns null', () => expect(service.getAltanCoreLedgerContract()).toBeNull());
    it('getActivationRegistryContract returns null', () => expect(service.getActivationRegistryContract()).toBeNull());
    it('getTaxEngineContract returns null', () => expect(service.getTaxEngineContract()).toBeNull());
  });
});
