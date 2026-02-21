import { Test, TestingModule } from '@nestjs/testing';
import { BankHierarchyService } from './bank-hierarchy.service';
import { ConfigService } from '@nestjs/config';

jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Wallet: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => ({
      registerEmployee: jest.fn(),
      getEmployee: jest.fn(),
      getHierarchyPath: jest.fn(),
      updatePerformance: jest.fn(),
      canBePromoted: jest.fn(),
      interface: { parseLog: jest.fn() },
    })),
  },
}));

describe('BankHierarchyService', () => {
  let service: BankHierarchyService;
  let configService: any;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'BLOCKCHAIN_ENABLED': return 'true';
          case 'ALTAN_RPC_URL': return 'http://localhost:8545';
          case 'BANK_HIERARCHY_ADDRESS': return '0xHIERARCHY';
          case 'ARBAD_COMPLETION_ADDRESS': return '0xARBAD';
          case 'BANK_ADMIN_PRIVATE_KEY': return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
          default: return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankHierarchyService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(BankHierarchyService);
    configService = module.get(ConfigService);

    // Set up mocks on contracts
    (service as any).contract = {
      registerEmployee: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({
          logs: [{ name: 'EmployeeRegistered' }],
        }),
      }),
      getEmployee: jest.fn().mockResolvedValue({
        id: BigInt(1), wallet: '0x1', seatId: BigInt(42), arbadId: BigInt(1),
        joinedAt: BigInt(1700000000), lastActiveAt: BigInt(1700000000),
        performanceScore: BigInt(80), isActive: true,
      }),
      getHierarchyPath: jest.fn().mockResolvedValue([BigInt(1), BigInt(2), BigInt(3), BigInt(4)]),
      updatePerformance: jest.fn().mockResolvedValue({ wait: jest.fn() }),
      canBePromoted: jest.fn().mockResolvedValue(true),
      interface: {
        parseLog: jest.fn().mockReturnValue({
          name: 'EmployeeRegistered', args: [BigInt(1)],
        }),
      },
    };
    (service as any).arbadCompletionContract = {
      getArbadTypeForSeat: jest.fn().mockResolvedValue([1, BigInt(1)]),
    };
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('constructor', () => {
    it('handles disabled blockchain', () => {
      configService.get = jest.fn().mockReturnValue(undefined);
      const s = new BankHierarchyService(configService);
      expect(s).toBeDefined();
    });
  });

  describe('registerEmployee', () => {
    it('registers', async () => {
      const r = await service.registerEmployee({ seatId: 42, wallet: '0x1', bankArbadId: 1 });
      expect(r).toBe(1);
    });
    it('throws when contract not initialized', async () => {
      (service as any).contract = null;
      await expect(service.registerEmployee({ seatId: 42, wallet: '0x1', bankArbadId: 1 })).rejects.toThrow('not initialized');
    });
    it('throws when not a citizen', async () => {
      (service as any).arbadCompletionContract.getArbadTypeForSeat.mockResolvedValue([0, BigInt(0)]);
      await expect(service.registerEmployee({ seatId: 42, wallet: '0x1', bankArbadId: 1 })).rejects.toThrow('citizen');
    });
  });

  describe('getEmployee', () => {
    it('returns employee', async () => {
      const r = await service.getEmployee(1);
      expect(r.id).toBe(1);
      expect(r.wallet).toBe('0x1');
    });
    it('throws when not initialized', async () => {
      (service as any).contract = null;
      await expect(service.getEmployee(1)).rejects.toThrow('not initialized');
    });
  });

  describe('getHierarchyPath', () => {
    it('returns path', async () => {
      const r = await service.getHierarchyPath(1);
      expect(r.arbadId).toBe(1);
      expect(r.zunId).toBe(2);
    });
    it('throws when not initialized', async () => {
      (service as any).contract = null;
      await expect(service.getHierarchyPath(1)).rejects.toThrow('not initialized');
    });
  });

  describe('updatePerformance', () => {
    it('updates', async () => {
      await service.updatePerformance(1, 85);
    });
    it('throws on invalid score', async () => {
      await expect(service.updatePerformance(1, 101)).rejects.toThrow('0-100');
    });
    it('throws on negative score', async () => {
      await expect(service.updatePerformance(1, -1)).rejects.toThrow('0-100');
    });
    it('throws when not initialized', async () => {
      (service as any).contract = null;
      await expect(service.updatePerformance(1, 50)).rejects.toThrow('not initialized');
    });
  });

  describe('canBePromoted', () => {
    it('returns true', async () => {
      const r = await service.canBePromoted(1);
      expect(r).toBe(true);
    });
    it('throws when not initialized', async () => {
      (service as any).contract = null;
      await expect(service.canBePromoted(1)).rejects.toThrow('not initialized');
    });
  });

  // ─── verifyArbadMembership ───────────────
  describe('verifyArbadMembership (private)', () => {
    it('returns ORGANIZATIONAL type', async () => {
      (service as any).arbadCompletionContract.getArbadTypeForSeat.mockResolvedValue([2, BigInt(5)]);
      const r = await (service as any).verifyArbadMembership(42);
      expect(r.isCitizen).toBe(true);
      expect(r.arbadType).toBe('ORGANIZATIONAL');
      expect(r.arbadId).toBe(5);
    });

    it('returns NONE for non-citizen', async () => {
      (service as any).arbadCompletionContract.getArbadTypeForSeat.mockResolvedValue([0, BigInt(0)]);
      const r = await (service as any).verifyArbadMembership(99);
      expect(r.isCitizen).toBe(false);
      expect(r.arbadType).toBe('NONE');
    });

    it('throws when arbadCompletion not initialized', async () => {
      (service as any).arbadCompletionContract = null;
      await expect((service as any).verifyArbadMembership(42)).rejects.toThrow('not initialized');
    });
  });

  // ─── registerEmployee event parsing ──────
  describe('registerEmployee edge cases', () => {
    it('throws when event not found in receipt', async () => {
      (service as any).contract.registerEmployee.mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ logs: [] }),
      });
      (service as any).contract.interface.parseLog.mockReturnValue(null);
      await expect(service.registerEmployee({ seatId: 42, wallet: '0x1', bankArbadId: 1 }))
        .rejects.toThrow('EmployeeRegistered event not found');
    });
  });

  // ─── constructor edge cases ──────────────
  describe('constructor edge cases', () => {
    it('handles missing contract addresses', () => {
      const config = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'BLOCKCHAIN_ENABLED') return 'true';
          if (key === 'ALTAN_RPC_URL') return 'http://localhost:8545';
          return undefined; // missing addresses
        }),
      };
      const s = new BankHierarchyService(config as any);
      expect(s).toBeDefined();
    });
  });
});

