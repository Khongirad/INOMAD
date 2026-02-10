import { Test, TestingModule } from '@nestjs/testing';
import { QuestService } from './quest.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { ReputationService } from '../reputation/reputation.service';

describe('QuestService', () => {
  let service: QuestService;
  let prisma: any;
  let timeline: any;
  let reputation: any;

  beforeEach(async () => {
    prisma = {
      quest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      reputationProfile: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    timeline = { createEvent: jest.fn().mockResolvedValue({}) };
    reputation = {
      incrementQuestsPosted: jest.fn().mockResolvedValue({}),
      updateStats: jest.fn().mockResolvedValue({}),
      checkMilestones: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: timeline },
        { provide: ReputationService, useValue: reputation },
      ],
    }).compile();

    service = module.get<QuestService>(QuestService);
  });

  describe('createQuest', () => {
    it('should create quest and track reputation', async () => {
      prisma.quest.create.mockResolvedValue({ id: 'q1', title: 'Fix pipe', status: 'OPEN' });
      const result = await service.createQuest('u1', {
        title: 'Fix pipe', description: 'Plumbing quest',
        objectives: [{ description: 'Fix leak' }], rewardAltan: 50,
      });
      expect(result.id).toBe('q1');
      expect(reputation.incrementQuestsPosted).toHaveBeenCalledWith('u1');
      expect(timeline.createEvent).toHaveBeenCalled();
    });
  });

  describe('acceptQuest', () => {
    it('should reject non-OPEN quest', async () => {
      prisma.quest.findUnique.mockResolvedValue({ id: 'q1', status: 'IN_PROGRESS', giverId: 'u1' });
      await expect(service.acceptQuest('q1', 'u2')).rejects.toThrow();
    });

    it('should accept quest successfully', async () => {
      prisma.quest.findUnique.mockResolvedValue({ id: 'q1', status: 'OPEN', giverId: 'u1', title: 'Fix' });
      prisma.quest.update.mockResolvedValue({ id: 'q1', status: 'ACCEPTED', takerId: 'u2' });
      const result = await service.acceptQuest('q1', 'u2');
      expect(result.takerId).toBe('u2');
      expect(timeline.createEvent).toHaveBeenCalled();
    });
  });

  describe('getAvailableQuests', () => {
    it('should return open quests', async () => {
      prisma.quest.findMany.mockResolvedValue([{ id: 'q1', status: 'OPEN' }]);
      const result = await service.getAvailableQuests();
      expect(result).toHaveLength(1);
    });
  });

  describe('getMyQuests', () => {
    it('should return quests for giver role', async () => {
      await service.getMyQuests('u1', 'giver');
      expect(prisma.quest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { giverId: 'u1' } }),
      );
    });

    it('should return quests for taker role', async () => {
      await service.getMyQuests('u1', 'taker');
      expect(prisma.quest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { takerId: 'u1' } }),
      );
    });
  });

  describe('getQuest', () => {
    it('should return quest by ID', async () => {
      prisma.quest.findUnique.mockResolvedValue({ id: 'q1', title: 'Fix pipe' });
      const result = await service.getQuest('q1');
      expect(result.id).toBe('q1');
    });
  });
});
