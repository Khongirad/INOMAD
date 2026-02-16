import { Test, TestingModule } from '@nestjs/testing';
import { ContractAddressesService } from './contract-addresses.service';
import { ConfigService } from '@nestjs/config';

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path: string) => {
    if (path.includes('addresses.json')) {
      return JSON.stringify({
        CoreLock: '0xCORE',
        CitizenRegistry: '0xCITIZEN',
        SeatSBT: '0xSEAT',
      });
    }
    if (path.includes('addresses-citizen.json')) {
      return JSON.stringify({
        chainId: 31337,
        rpcUrl: 'http://localhost:8545',
        contracts: {
          ArbanCompletion: '0xARBAN',
          ZunRegistry: '0xZUN',
          ElectionRegistry: '0xELECTION',
        },
      });
    }
    if (path.includes('addresses-banking.json')) {
      return JSON.stringify({
        chainId: 31337,
        rpcUrl: 'http://localhost:8545',
        contracts: {
          Altan: '0xALTAN',
          AltanCentralBank: '0xCB',
          AltanBankOfSiberia: '0xBOS',
          TaxEngine: '0xTAX',
        },
      });
    }
    throw new Error('File not found');
  }),
}));

describe('ContractAddressesService', () => {
  let service: ContractAddressesService;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn().mockReturnValue('../chain'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractAddressesService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(ContractAddressesService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getAddress', () => {
    it('returns core address', () => {
      expect(service.getAddress('CoreLock')).toBe('0xCORE');
    });
    it('returns citizen address', () => {
      expect(service.getAddress('ArbanCompletion')).toBe('0xARBAN');
    });
    it('returns banking address', () => {
      expect(service.getAddress('Altan')).toBe('0xALTAN');
    });
    it('returns undefined for unknown', () => {
      expect(service.getAddress('Unknown' as any)).toBeUndefined();
    });
  });

  describe('getAllAddresses', () => {
    it('returns all', () => {
      const r = service.getAllAddresses();
      expect(r.CoreLock).toBe('0xCORE');
      expect(r.Altan).toBe('0xALTAN');
    });
  });

  describe('getChainId', () => {
    it('returns chain id', () => {
      expect(service.getChainId()).toBe(31337);
    });
  });

  describe('getRpcUrl', () => {
    it('returns rpc url', () => {
      expect(service.getRpcUrl()).toBe('http://localhost:8545');
    });
  });

  describe('hasContract', () => {
    it('returns true for existing', () => {
      expect(service.hasContract('CoreLock')).toBe(true);
    });
    it('returns false for missing', () => {
      expect(service.hasContract('Unknown' as any)).toBe(false);
    });
  });

  describe('getIdentityContracts', () => {
    it('returns identity contracts', () => {
      const r = service.getIdentityContracts();
      expect(r.citizenRegistry).toBe('0xCITIZEN');
      expect(r.seatSBT).toBe('0xSEAT');
    });
  });

  describe('getBankingContracts', () => {
    it('returns banking contracts', () => {
      const r = service.getBankingContracts();
      expect(r.altan).toBe('0xALTAN');
      expect(r.altanCentralBank).toBe('0xCB');
    });
  });

  describe('getGuildContracts', () => {
    it('returns guild contracts', () => {
      const r = service.getGuildContracts();
      expect(r.arbanCompletion).toBe('0xARBAN');
      expect(r.zunRegistry).toBe('0xZUN');
    });
  });
});
