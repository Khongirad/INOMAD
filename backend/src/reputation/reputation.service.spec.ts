import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from './reputation.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('ReputationService', () => {
  let service: ReputationService;
  let prisma: any;

  const mockProfile = {
    userId: 'u1',
    totalDeals: 10,
    successfulDeals: 8,
    successRate: new Prisma.Decimal('80.00'),
    averageRating: new Prisma.Decimal('4.20'),
    ratingsReceived: 5,
    questsCompleted: 3,
    questsPosted: 5,
    questSuccessRate: new Prisma.Decimal('60.00'),
    contractsSigned: 2,
    activeContracts: 1,
    badges: [],
  };

  beforeEach(async () => {
    prisma = {
      reputationProfile: {
        findUnique: jest.fn().mockResolvedValue(mockProfile),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReputationService>(ReputationService);
  });

  describe('getReputationProfile', () => {
    it('should return existing profile', async () => {
      const result = await service.getReputationProfile('u1');
      expect(result.userId).toBe('u1');
    });

    it('should create profile if not found', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue(null);
      prisma.reputationProfile.create.mockResolvedValue({ userId: 'u2' });
      const result = await service.getReputationProfile('u2');
      expect(result.userId).toBe('u2');
    });
  });

  describe('updateStats', () => {
    it('should increment totalDeals and successfulDeals on success', async () => {
      prisma.reputationProfile.update.mockResolvedValue({});
      await service.updateStats({ userId: 'u1', dealType: 'quest', success: true, rating: 5 });
      expect(prisma.reputationProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalDeals: 11, successfulDeals: 9 }),
        }),
      );
    });

    it('should not increment successfulDeals on failure', async () => {
      prisma.reputationProfile.update.mockResolvedValue({});
      await service.updateStats({ userId: 'u1', dealType: 'contract', success: false });
      expect(prisma.reputationProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalDeals: 11, successfulDeals: 8 }),
        }),
      );
    });

    it('should update rating average', async () => {
      prisma.reputationProfile.update.mockResolvedValue({});
      await service.updateStats({ userId: 'u1', dealType: 'quest', success: true, rating: 5 });
      expect(prisma.reputationProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ratingsReceived: 6 }),
        }),
      );
    });
  });

  describe('incrementQuestsPosted', () => {
    it('should increment quests posted', async () => {
      prisma.reputationProfile.update.mockResolvedValue({});
      await service.incrementQuestsPosted('u1');
      expect(prisma.reputationProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { questsPosted: 6 } }),
      );
    });
  });

  describe('calculateSuccessRate', () => {
    it('should return 0 for zero total', () => {
      expect(service.calculateSuccessRate(0, 0)).toBe(0);
    });

    it('should calculate percentage', () => {
      expect(service.calculateSuccessRate(8, 10)).toBe(80);
    });
  });

  describe('awardBadge', () => {
    it('should add new badge', async () => {
      prisma.reputationProfile.update.mockResolvedValue({});
      await service.awardBadge('u1', { id: 'new_badge', name: 'New Badge' });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });

    it('should skip duplicate badge', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, badges: [{ id: 'existing', name: 'Existing' }],
      });
      const result = await service.awardBadge('u1', { id: 'existing', name: 'Existing' });
      expect(prisma.reputationProfile.update).not.toHaveBeenCalled();
    });
  });
});
