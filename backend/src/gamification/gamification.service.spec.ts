import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GamificationService', () => {
  let service: GamificationService;
  let prisma: any;

  const mockCitizenLevel = {
    id: 'cl-1', userId: 'user-1', level: 1, currentXP: 0, totalXP: 0,
    title: 'Человек', dailyStreak: 0, longestStreak: 0, lastActiveAt: null,
    achievements: [], xpTransactions: [],
  };

  const mockPrisma = () => ({
    citizenLevel: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    xPTransaction: { create: jest.fn() },
    achievement: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    reputationProfile: { findUnique: jest.fn() },
    proposalVote: { count: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(GamificationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── getCitizenLevel ───────────────────
  describe('getCitizenLevel', () => {
    it('should return existing citizen level with progress info', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue({ ...mockCitizenLevel, currentXP: 50 });
      const result = await service.getCitizenLevel('user-1');
      expect(result).toHaveProperty('xpForNextLevel');
      expect(result).toHaveProperty('xpProgress');
      expect(result).toHaveProperty('isMaxLevel');
      expect(result.isMaxLevel).toBe(false);
    });

    it('should create citizen level if not found', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(null);
      prisma.citizenLevel.create.mockResolvedValue({ ...mockCitizenLevel });
      const result = await service.getCitizenLevel('new-user');
      expect(prisma.citizenLevel.create).toHaveBeenCalled();
      expect(result.level).toBe(1);
    });

    it('should show max level when level >= 32', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue({
        ...mockCitizenLevel, level: 32, currentXP: 99999,
      });
      const result = await service.getCitizenLevel('user-1');
      expect(result.isMaxLevel).toBe(true);
      expect(result.xpProgress).toBe(100);
    });
  });

  // ─── getLeaderboard ────────────────────
  describe('getLeaderboard', () => {
    it('should return leaderboard sorted by totalXP', async () => {
      prisma.citizenLevel.findMany.mockResolvedValue([
        { userId: 'u1', totalXP: 1000 },
        { userId: 'u2', totalXP: 500 },
      ]);
      const result = await service.getLeaderboard(10);
      expect(result).toHaveLength(2);
      expect(prisma.citizenLevel.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { totalXP: 'desc' },
        take: 10,
      }));
    });

    it('should default to limit 50', async () => {
      prisma.citizenLevel.findMany.mockResolvedValue([]);
      await service.getLeaderboard();
      expect(prisma.citizenLevel.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 50,
      }));
    });
  });

  // ─── awardXP ───────────────────────────
  describe('awardXP', () => {
    beforeEach(() => {
      prisma.citizenLevel.findUnique.mockResolvedValue({ ...mockCitizenLevel });
      prisma.citizenLevel.create.mockResolvedValue({ ...mockCitizenLevel });
      prisma.citizenLevel.update.mockResolvedValue({ ...mockCitizenLevel, totalXP: 50 });
      prisma.xPTransaction.create.mockResolvedValue({});
      prisma.reputationProfile.findUnique.mockResolvedValue(null);
    });

    it('should award default XP for a known action', async () => {
      const result = await service.awardXP('user-1', 'QUEST_COMPLETED');
      expect(result.xpAwarded).toBe(50); // QUEST_COMPLETED = 50
      expect(prisma.xPTransaction.create).toHaveBeenCalled();
    });

    it('should use custom amount when provided', async () => {
      const result = await service.awardXP('user-1', 'CUSTOM', { amount: 999 });
      expect(result.xpAwarded).toBe(999);
    });

    it('should fall back to 10 XP for unknown actions', async () => {
      const result = await service.awardXP('user-1', 'DOES_NOT_EXIST');
      expect(result.xpAwarded).toBe(10);
    });

    it('should detect level-up when XP exceeds threshold', async () => {
      // getXPForLevel(2) = LEVEL_THRESHOLDS[1] = 2^2 * 100 = 400
      // So to level up from 1→2, need currentXP + award >= 400
      prisma.citizenLevel.findUnique.mockResolvedValue({
        ...mockCitizenLevel, level: 1, currentXP: 390, totalXP: 390,
      });
      prisma.citizenLevel.update.mockResolvedValue({ level: 2, totalXP: 440, currentXP: 50 });
      prisma.xPTransaction.create.mockResolvedValue({});
      prisma.reputationProfile.findUnique.mockResolvedValue(null);
      const result = await service.awardXP('user-1', 'QUEST_COMPLETED'); // +50 XP
      // newCurrentXP = 390 + 50 = 440, threshold for level 2 = 400, 440 >= 400 → level up
      expect(result.leveledUp).toBe(true);
      expect(result.level).toBe(2);
    });

    it('should not exceed level 32', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue({
        ...mockCitizenLevel, level: 32, currentXP: 99999, totalXP: 999999,
      });
      prisma.citizenLevel.update.mockResolvedValue({ level: 32 });
      const result = await service.awardXP('user-1', 'DAILY_LOGIN');
      expect(result.level).toBe(32);
    });

    it('should increment daily streak when last active was yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.citizenLevel.findUnique.mockResolvedValue({
        ...mockCitizenLevel, dailyStreak: 5, longestStreak: 10, lastActiveAt: yesterday,
      });
      prisma.citizenLevel.update.mockResolvedValue({});
      const result = await service.awardXP('user-1', 'DAILY_LOGIN');
      expect(result.dailyStreak).toBe(6);
    });

    it('should reset streak if more than 1 day has passed', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      prisma.citizenLevel.findUnique.mockResolvedValue({
        ...mockCitizenLevel, dailyStreak: 10, lastActiveAt: threeDaysAgo,
      });
      prisma.citizenLevel.update.mockResolvedValue({});
      const result = await service.awardXP('user-1', 'DAILY_LOGIN');
      expect(result.dailyStreak).toBe(1);
    });

    it('should initialize streak to 1 when no lastActiveAt', async () => {
      const result = await service.awardXP('user-1', 'DAILY_LOGIN');
      expect(result.dailyStreak).toBe(1);
    });
  });

  // ─── checkAchievements ─────────────────
  describe('checkAchievements', () => {
    it('should skip if no reputation profile', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(mockCitizenLevel);
      prisma.reputationProfile.findUnique.mockResolvedValue(null);
      // Should not throw
      await service.checkAchievements('user-1', 'QUEST_COMPLETED');
    });

    it('should check quest achievements on QUEST_COMPLETED', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(mockCitizenLevel);
      prisma.reputationProfile.findUnique.mockResolvedValue({ questsCompleted: 1, contractsSigned: 0 });
      prisma.achievement.findUnique.mockResolvedValue(null);
      prisma.achievement.create.mockResolvedValue({});
      // Mock the recursive awardXP call
      prisma.citizenLevel.update.mockResolvedValue(mockCitizenLevel);
      prisma.xPTransaction.create.mockResolvedValue({});
      await service.checkAchievements('user-1', 'QUEST_COMPLETED');
      // first_quest should be awarded
      expect(prisma.achievement.create).toHaveBeenCalled();
    });

    it('should check vote achievements on VOTE_CAST', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(mockCitizenLevel);
      prisma.reputationProfile.findUnique.mockResolvedValue({ questsCompleted: 0, contractsSigned: 0 });
      prisma.proposalVote.count.mockResolvedValue(10);
      prisma.achievement.findUnique.mockResolvedValue(null);
      prisma.achievement.create.mockResolvedValue({});
      prisma.citizenLevel.update.mockResolvedValue(mockCitizenLevel);
      prisma.xPTransaction.create.mockResolvedValue({});
      await service.checkAchievements('user-1', 'VOTE_CAST');
      // first_vote and 10_votes should be checked
      expect(prisma.achievement.create).toHaveBeenCalled();
    });

    it('should not duplicate already-earned achievements', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(mockCitizenLevel);
      prisma.reputationProfile.findUnique.mockResolvedValue({ questsCompleted: 1 });
      prisma.achievement.findUnique.mockResolvedValue({ id: 'existing' }); // already earned
      await service.checkAchievements('user-1', 'QUEST_COMPLETED');
      expect(prisma.achievement.create).not.toHaveBeenCalled();
    });
  });

  // ─── getAchievementProgress ────────────
  describe('getAchievementProgress', () => {
    it('should return all achievements with earned status', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(mockCitizenLevel);
      prisma.achievement.findMany.mockResolvedValue([
        { key: 'first_vote' },
      ]);
      const result = await service.getAchievementProgress('user-1');
      const firstVote = result.find((a: any) => a.key === 'first_vote');
      expect(firstVote?.earned).toBe(true);
      const firstQuest = result.find((a: any) => a.key === 'first_quest');
      expect(firstQuest?.earned).toBe(false);
    });
  });

  // ─── ensureCitizenLevel ───────────────
  describe('ensureCitizenLevel', () => {
    it('should return existing citizenLevel', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(mockCitizenLevel);
      const result = await (service as any).ensureCitizenLevel('user-1');
      expect(result.id).toBe('cl-1');
    });

    it('should create citizenLevel if not found', async () => {
      prisma.citizenLevel.findUnique.mockResolvedValue(null);
      prisma.citizenLevel.create.mockResolvedValue(mockCitizenLevel);
      const result = await (service as any).ensureCitizenLevel('user-1');
      expect(prisma.citizenLevel.create).toHaveBeenCalled();
      expect(result.id).toBe('cl-1');
    });
  });

  // ─── getXPForLevel ────────────────────
  describe('getXPForLevel', () => {
    it('should return XP for valid level', () => {
      const xp = (service as any).getXPForLevel(1);
      expect(xp).toBeDefined();
    });

    it('should return null for out of range level', () => {
      const xp = (service as any).getXPForLevel(99);
      expect(xp).toBeNull();
    });
  });

  // ─── getTitleForLevel ─────────────────
  describe('getTitleForLevel', () => {
    it('should return title for level 1', () => {
      const title = (service as any).getTitleForLevel(1);
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('should return default title for high level', () => {
      const title = (service as any).getTitleForLevel(100);
      expect(typeof title).toBe('string');
    });
  });

  // ─── awardXP streak reset ────────────
  describe('awardXP streak reset', () => {
    it('should reset streak when last active was more than 1 day ago', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      prisma.citizenLevel.findUnique.mockResolvedValue({
        ...mockCitizenLevel, dailyStreak: 10, longestStreak: 15,
        lastActiveAt: threeDaysAgo,
      });
      prisma.citizenLevel.create.mockResolvedValue({ ...mockCitizenLevel });
      prisma.xPTransaction.create.mockResolvedValue({});
      prisma.citizenLevel.update.mockResolvedValue({ ...mockCitizenLevel, dailyStreak: 1 });
      prisma.achievement.findUnique.mockResolvedValue(null);
      prisma.achievement.create.mockResolvedValue({});
      prisma.reputationProfile.findUnique.mockResolvedValue(null);
      const result = await service.awardXP('user-1', 'DAILY_LOGIN');
      expect(result.dailyStreak).toBe(1);
    });
  });
});
