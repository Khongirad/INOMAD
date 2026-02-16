import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from './reputation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReputationService', () => {
  let service: ReputationService;
  let prisma: any;

  const makeDecimal = (val: number) => ({ toNumber: () => val });

  const mockProfile = {
    userId: 'u1', totalDeals: 10, successfulDeals: 9,
    successRate: makeDecimal(90), averageRating: makeDecimal(4.5),
    ratingsReceived: 5, questsCompleted: 8, questsPosted: 10,
    questSuccessRate: makeDecimal(80), contractsSigned: 3, activeContracts: 1,
    badges: [], user: { id: 'u1', username: 'user1' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      reputationProfile: {
        findUnique: jest.fn().mockResolvedValue(mockProfile),
        create: jest.fn().mockResolvedValue(mockProfile),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockProfile, ...data }),
        ),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ReputationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getReputationProfile', () => {
    it('returns existing profile', async () => {
      const r = await service.getReputationProfile('u1');
      expect(r.userId).toBe('u1');
    });
    it('creates profile when not exists', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue(null);
      await service.getReputationProfile('u1');
      expect(prisma.reputationProfile.create).toHaveBeenCalled();
    });
  });

  describe('updateStats', () => {
    it('updates quest success', async () => {
      await service.updateStats({ userId: 'u1', dealType: 'quest', success: true, rating: 5 });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
    it('updates quest failure', async () => {
      await service.updateStats({ userId: 'u1', dealType: 'quest', success: false });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
    it('updates contract success', async () => {
      await service.updateStats({ userId: 'u1', dealType: 'contract', success: true });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
    it('updates contract failure', async () => {
      await service.updateStats({ userId: 'u1', dealType: 'contract', success: false });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
    it('updates without rating', async () => {
      await service.updateStats({ userId: 'u1', dealType: 'quest', success: true });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
  });

  describe('incrementQuestsPosted', () => {
    it('increments', async () => {
      await service.incrementQuestsPosted('u1');
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
  });

  describe('calculateSuccessRate', () => {
    it('calculates rate', () => expect(service.calculateSuccessRate(9, 10)).toBe(90));
    it('returns 0 for no deals', () => expect(service.calculateSuccessRate(0, 0)).toBe(0));
  });

  describe('awardBadge', () => {
    it('awards new badge', async () => {
      await service.awardBadge('u1', { id: 'b1', name: 'Test' });
      expect(prisma.reputationProfile.update).toHaveBeenCalled();
    });
    it('skips existing badge', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, badges: [{ id: 'b1', name: 'X' }],
      });
      await service.awardBadge('u1', { id: 'b1', name: 'Test' });
      expect(prisma.reputationProfile.update).not.toHaveBeenCalled();
    });
  });

  describe('checkMilestones', () => {
    it('awards quest_novice at 10', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, questsCompleted: 10, badges: [],
      });
      expect(await service.checkMilestones('u1')).toBe(true);
    });
    it('awards quest_veteran at 50', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, questsCompleted: 50, badges: [],
      });
      expect(await service.checkMilestones('u1')).toBe(true);
    });
    it('awards reliable badge', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, questsCompleted: 5, successRate: makeDecimal(96),
        totalDeals: 25, badges: [],
      });
      expect(await service.checkMilestones('u1')).toBe(true);
    });
    it('awards top_rated badge', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, questsCompleted: 5, averageRating: makeDecimal(4.8),
        ratingsReceived: 15, badges: [],
      });
      expect(await service.checkMilestones('u1')).toBe(true);
    });
    it('returns false when no milestones', async () => {
      prisma.reputationProfile.findUnique.mockResolvedValue({
        ...mockProfile, questsCompleted: 5, successRate: makeDecimal(50),
        totalDeals: 5, averageRating: makeDecimal(3.0),
        ratingsReceived: 2, badges: [],
      });
      expect(await service.checkMilestones('u1')).toBe(false);
    });
  });
});
