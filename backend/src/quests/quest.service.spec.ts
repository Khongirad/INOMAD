import { Test, TestingModule } from '@nestjs/testing';
import { QuestService } from './quest.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { ReputationService } from '../reputation/reputation.service';

describe('QuestService', () => {
  let service: QuestService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      quest: {
        create: jest.fn().mockResolvedValue({
          id: 'q1', title: 'Test Quest', status: 'OPEN', giverId: 'u1',
          rewardAltan: 100, objectives: [{ description: 'do something' }],
          giver: { id: 'u1', username: 'user1' },
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'q1', title: 'Test Quest', status: 'OPEN', giverId: 'u1', takerId: null,
          rewardAltan: 100, reputationGain: 10, progress: 0,
          objectives: [{ description: 'do something', completed: false }],
          giver: { id: 'u1', username: 'user1' },
          taker: null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({
          id: 'q1', status: 'ACCEPTED', takerId: 'u2',
        }),
      },
      reputationProfile: {
        findUnique: jest.fn().mockResolvedValue({ averageRating: 4.0, totalDeals: 5 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ verificationLevel: 'FULLY_VERIFIED' }),
      },
    };
    const mockTimeline = {
      createEvent: jest.fn().mockResolvedValue({ id: 'te1' }),
    };
    const mockReputation = {
      incrementQuestsPosted: jest.fn().mockResolvedValue({}),
      addPoints: jest.fn().mockResolvedValue({}),
      updateStats: jest.fn().mockResolvedValue({}),
      checkMilestones: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TimelineService, useValue: mockTimeline },
        { provide: ReputationService, useValue: mockReputation },
      ],
    }).compile();
    service = module.get(QuestService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createQuest', () => {
    it('creates quest', async () => {
      const r = await service.createQuest('u1', {
        title: 'Test', description: 'test', objectives: [{ description: 'obj1' }], rewardAltan: 100,
      });
      expect(r.id).toBe('q1');
    });
  });

  describe('acceptQuest', () => {
    it('accepts quest', async () => {
      const r = await service.acceptQuest('q1', 'u2');
      expect(prisma.quest.update).toHaveBeenCalled();
    });
    it('throws when quest not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.acceptQuest('bad', 'u2')).rejects.toThrow('not found');
    });
    it('throws when not OPEN', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'IN_PROGRESS', takerId: 'u3', giverId: 'u1',
      });
      await expect(service.acceptQuest('q1', 'u2')).rejects.toThrow('not available');
    });
    it('checks min reputation requirement', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'OPEN', giverId: 'u1', takerId: null,
        requirements: { minReputation: 5.0 },
      });
      prisma.reputationProfile.findUnique.mockResolvedValue({ averageRating: 3.0 });
      await expect(service.acceptQuest('q1', 'u2')).rejects.toThrow('Insufficient reputation');
    });
    it('checks verification level requirement', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'OPEN', giverId: 'u1', takerId: null,
        requirements: { verificationLevel: 'FULLY_VERIFIED' },
      });
      prisma.user.findUnique.mockResolvedValue({ verificationLevel: 'UNVERIFIED' });
      await expect(service.acceptQuest('q1', 'u2')).rejects.toThrow('Insufficient verification');
    });
  });

  describe('updateProgress', () => {
    it('updates progress', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'ACCEPTED', takerId: 'u2', giverId: 'u1',
      });
      await service.updateProgress('q1', 'u2', [{ description: 'obj1', completed: true }]);
      expect(prisma.quest.update).toHaveBeenCalled();
    });
    it('throws when not taker', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'ACCEPTED', takerId: 'u2', giverId: 'u1',
      });
      await expect(service.updateProgress('q1', 'u3', [])).rejects.toThrow('Not your quest');
    });
  });

  describe('submitQuest', () => {
    it('submits quest', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'IN_PROGRESS', takerId: 'u2', giverId: 'u1',
        progress: 100, title: 'Test',
      });
      await service.submitQuest('q1', 'u2', [{ type: 'screenshot', url: 'http://test' }]);
      expect(prisma.quest.update).toHaveBeenCalled();
    });
    it('throws when not taker', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'IN_PROGRESS', takerId: 'u2', giverId: 'u1', progress: 100,
      });
      await expect(service.submitQuest('q1', 'u3', [])).rejects.toThrow('Not your quest');
    });
    it('throws when not complete', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'IN_PROGRESS', takerId: 'u2', giverId: 'u1', progress: 50,
      });
      await expect(service.submitQuest('q1', 'u2', [])).rejects.toThrow('not complete');
    });
  });

  describe('approveQuest', () => {
    it('approves quest', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'SUBMITTED', takerId: 'u2', giverId: 'u1',
        rewardAltan: 100, reputationGain: 10, title: 'Test',
        taker: { id: 'u2', username: 'user2' },
      });
      await service.approveQuest('q1', 'u1', 5, 'Good job');
      expect(prisma.quest.update).toHaveBeenCalled();
    });
    it('throws when not giver', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'SUBMITTED', takerId: 'u2', giverId: 'u1',
      });
      await expect(service.approveQuest('q1', 'u3', 5)).rejects.toThrow('Not your quest');
    });
    it('throws when not submitted', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'OPEN', takerId: null, giverId: 'u1',
      });
      await expect(service.approveQuest('q1', 'u1', 5)).rejects.toThrow('not submitted');
    });
  });

  describe('rejectQuest', () => {
    it('rejects quest', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'SUBMITTED', takerId: 'u2', giverId: 'u1', title: 'Test',
      });
      await service.rejectQuest('q1', 'u1', 'Not complete');
      expect(prisma.quest.update).toHaveBeenCalled();
    });
    it('throws when not giver', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        id: 'q1', status: 'SUBMITTED', takerId: 'u2', giverId: 'u1',
      });
      await expect(service.rejectQuest('q1', 'u3', 'bad')).rejects.toThrow('Not your quest');
    });
  });

  describe('getAvailableQuests', () => {
    it('returns available quests', async () => {
      const r = await service.getAvailableQuests();
      expect(r).toEqual([]);
    });
    it('returns with filters', async () => {
      const r = await service.getAvailableQuests({ minReward: 100 });
      expect(r).toEqual([]);
    });
  });

  describe('getMyQuests', () => {
    it('returns all quests', async () => {
      const r = await service.getMyQuests('u1');
      expect(r).toEqual([]);
    });
    it('returns giver quests', async () => {
      const r = await service.getMyQuests('u1', 'giver');
      expect(r).toEqual([]);
    });
    it('returns taker quests', async () => {
      const r = await service.getMyQuests('u1', 'taker');
      expect(r).toEqual([]);
    });
  });

  describe('getQuest', () => {
    it('returns quest', async () => {
      const r = await service.getQuest('q1');
      expect(r.id).toBe('q1');
    });
  });
});
