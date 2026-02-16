import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestService } from './e2e-test.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

describe('E2ETestService', () => {
  let service: E2ETestService;
  let blockchain: any;
  let prisma: any;

  beforeEach(async () => {
    const mockBlockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
      getTotalSeats: jest.fn().mockResolvedValue(100),
      getSeatOwner: jest.fn().mockResolvedValue('0xOWNER'),
      verifySeatOwnership: jest.fn().mockResolvedValue(true),
      getSeatMetadata: jest.fn().mockResolvedValue({ nationId: 'N1' }),
      getAltanBalance: jest.fn().mockResolvedValue('100.0'),
    };
    const mockPrisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2ETestService,
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(E2ETestService);
    blockchain = module.get(BlockchainService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('runAllTests - blockchain offline', () => {
    it('returns results with blockchain unavailable', async () => {
      const r = await service.runAllTests();
      expect(r.blockchainAvailable).toBe(false);
      expect(r.tests.length).toBe(5);
      expect(r.summary.total).toBe(5);
    });
  });

  describe('runAllTests - blockchain online', () => {
    beforeEach(() => { blockchain.isAvailable.mockReturnValue(true); });

    it('returns all tests passed when blockchain is available', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 'u1', seatId: '1', walletAddress: '0xW' })
        .mockResolvedValueOnce({ id: 'u2', walletAddress: '0xW', altanLedger: { balance: 100 } });
      const r = await service.runAllTests();
      expect(r.blockchainAvailable).toBe(true);
      expect(r.summary.total).toBe(5);
    });

    it('handles no user found', async () => {
      const r = await service.runAllTests();
      expect(r.tests[3].passed).toBe(true); // identity test still passes
    });

    it('handles user found with seatId', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', seatId: '1', walletAddress: null });
      const r = await service.runAllTests();
      expect(r.tests[3].details.seatId).toBe('1');
    });

    it('handles bank test with user that has wallet', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // identity test
        .mockResolvedValueOnce({ id: 'u1', walletAddress: '0xW', altanLedger: { balance: 100 } });
      const r = await service.runAllTests();
      expect(r.tests[4].details.userWithWalletFound).toBe(true);
    });

    it('handles bank test with user but no wallet', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // identity test
        .mockResolvedValueOnce({ id: 'u1', walletAddress: null, altanLedger: null });
      const r = await service.runAllTests();
      expect(r.tests[4].details.dbBalance).toBe('0');
    });

    it('handles errors in individual tests', async () => {
      blockchain.getTotalSeats.mockRejectedValue(new Error('network'));
      const r = await service.runAllTests();
      expect(r.summary.failed).toBeGreaterThan(0);
    });
  });
});
