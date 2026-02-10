import { Test, TestingModule } from '@nestjs/testing';
import { FounderService } from './founder.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FounderService', () => {
  let service: FounderService;
  let blockchain: any;
  let prisma: any;

  beforeEach(async () => {
    blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
    };
    prisma = {
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FounderService,
        { provide: BlockchainService, useValue: blockchain },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FounderService>(FounderService);
  });

  describe('isBootstrapActive', () => {
    it('should return false when blockchain unavailable', async () => {
      expect(await service.isBootstrapActive()).toBe(false);
    });
  });

  describe('getFounderAddress', () => {
    it('should return null when blockchain unavailable', async () => {
      expect(await service.getFounderAddress()).toBeNull();
    });
  });

  describe('isFounder', () => {
    it('should return false for user without wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletAddress: null, seatId: '1' });
      expect(await service.isFounder('u1')).toBe(false);
    });

    it('should return false for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.isFounder('bad')).toBe(false);
    });
  });

  describe('getBootstrapStatus', () => {
    it('should return inactive status when blockchain unavailable', async () => {
      const result = await service.getBootstrapStatus();
      expect(result.isActive).toBe(false);
      expect(result.founder).toBeNull();
      expect(result.verifiedCount).toBe(0);
    });
  });

  describe('wasVerifiedByFounder', () => {
    it('should return false when blockchain unavailable', async () => {
      expect(await service.wasVerifiedByFounder('S1')).toBe(false);
    });
  });
});
