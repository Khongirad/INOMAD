import { Test, TestingModule } from '@nestjs/testing';
import { CitizenDistributionService } from './citizen-distribution.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('CitizenDistributionService', () => {
  let service: CitizenDistributionService;
  let prisma: any;
  let blockchain: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
    };

    blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenDistributionService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<CitizenDistributionService>(CitizenDistributionService);
  });

  describe('hasReceivedDistribution', () => {
    it('should return false when blockchain unavailable', async () => {
      const result = await service.hasReceivedDistribution('SEAT-1');
      expect(result).toBe(false);
    });
  });

  describe('getPerCitizenAmount', () => {
    it('should return null when blockchain unavailable', async () => {
      const result = await service.getPerCitizenAmount();
      expect(result).toBeNull();
    });
  });

  describe('getTotalDistributed', () => {
    it('should return null when blockchain unavailable', async () => {
      const result = await service.getTotalDistributed();
      expect(result).toBeNull();
    });
  });

  describe('getDistributionPoolAddress', () => {
    it('should return null when blockchain unavailable', async () => {
      const result = await service.getDistributionPoolAddress();
      expect(result).toBeNull();
    });
  });

  describe('getDistributionStatus', () => {
    it('should return null status when blockchain unavailable', async () => {
      const result = await service.getDistributionStatus();
      expect(result.perCitizenAmount).toBeNull();
      expect(result.totalDistributed).toBeNull();
      expect(result.distributionPool).toBeNull();
      expect(result.sovereignFund).toBeNull();
    });
  });

  describe('checkEligibility', () => {
    it('should return ineligible for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.checkEligibility('bad');
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should return ineligible without seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: null, verificationStatus: 'VERIFIED' });
      const result = await service.checkEligibility('u1');
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('No SeatID assigned');
    });

    it('should return ineligible for unverified user', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: 'SEAT-1', verificationStatus: 'PENDING' });
      const result = await service.checkEligibility('u1');
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Not verified');
    });

    it('should return eligible for verified user with seat (blockchain offline)', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: 'SEAT-1', verificationStatus: 'VERIFIED' });
      // hasReceivedDistribution returns false when blockchain unavailable
      const result = await service.checkEligibility('u1');
      expect(result.eligible).toBe(true);
      expect(result.seatId).toBe('SEAT-1');
    });
  });
});
