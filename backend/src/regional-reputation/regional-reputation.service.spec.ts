import { Test, TestingModule } from '@nestjs/testing';
import { RegionalReputationService } from './regional-reputation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RegionalReputationService', () => {
  let service: RegionalReputationService;
  let prisma: any;

  const mockRegional = {
    id: 'rr1', userId: 'u1', republicId: 'rep1',
    questPoints: 0, taxPoints: 0, contractPoints: 0, socialPoints: 0,
    totalPoints: 0, level: 1, title: 'Новичок',
    republic: { id: 'rep1', name: 'Test Republic', republicKey: 'test' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      regionalReputation: {
        findUnique: jest.fn().mockResolvedValue(mockRegional),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(mockRegional),
        update: jest.fn().mockResolvedValue({ ...mockRegional, totalPoints: 50 }),
        count: jest.fn().mockResolvedValue(0),
      },
      reputationAction: {
        create: jest.fn().mockResolvedValue({ id: 'ra1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      republicanKhural: {
        findUnique: jest.fn().mockResolvedValue({ id: 'rep1', name: 'Test Republic', republicKey: 'test' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation((args) => {
        // Handle array of promises (batch transaction)
        if (Array.isArray(args)) {
          return Promise.all(args);
        }
        // Handle callback transaction
        return args(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionalReputationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(RegionalReputationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('awardPoints', () => {
    it('awards quest points to existing regional record', async () => {
      const r = await service.awardPoints('u1', 'rep1', 'QUEST_COMPLETED' as any, 50, 'Completed quest');
      expect(prisma.regionalReputation.update).toHaveBeenCalled();
      expect(prisma.reputationAction.create).toHaveBeenCalled();
    });
    it('creates new regional record if not exists', async () => {
      prisma.regionalReputation.findUnique.mockResolvedValue(null);
      prisma.regionalReputation.create.mockResolvedValue({
        ...mockRegional, id: 'rr_new',
      });
      const r = await service.awardPoints('u1', 'rep1', 'TAX_PAID' as any, 20, 'Paid tax');
      expect(prisma.regionalReputation.create).toHaveBeenCalled();
    });
    it('awards tax points', async () => {
      await service.awardPoints('u1', 'rep1', 'TAX_PAID' as any, 20, 'Paid tax');
      expect(prisma.regionalReputation.update).toHaveBeenCalled();
    });
    it('awards contract points', async () => {
      await service.awardPoints('u1', 'rep1', 'CONTRACT_FULFILLED' as any, 100, 'Fulfilled contract');
      expect(prisma.regionalReputation.update).toHaveBeenCalled();
    });
    it('awards social points for vote', async () => {
      await service.awardPoints('u1', 'rep1', 'VOTE_CAST' as any, 5, 'Cast vote');
      expect(prisma.regionalReputation.update).toHaveBeenCalled();
    });
    it('awards social points for org join', async () => {
      await service.awardPoints('u1', 'rep1', 'ORGANIZATION_JOINED' as any, 10, 'Joined org');
      expect(prisma.regionalReputation.update).toHaveBeenCalled();
    });
    it('awards social points for community service', async () => {
      await service.awardPoints('u1', 'rep1', 'COMMUNITY_SERVICE' as any, 30, 'Community service');
      expect(prisma.regionalReputation.update).toHaveBeenCalled();
    });
    it('passes source IDs', async () => {
      await service.awardPoints('u1', 'rep1', 'QUEST_COMPLETED' as any, 50, 'Quest', { questId: 'q1' });
      expect(prisma.reputationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ questId: 'q1' }),
        }),
      );
    });
  });

  describe('getRegionalProfile', () => {
    it('returns existing profile', async () => {
      const r = await service.getRegionalProfile('u1', 'rep1');
      expect((r as any).id).toBe('rr1');
    });
    it('returns empty profile when not found', async () => {
      prisma.regionalReputation.findUnique.mockResolvedValue(null);
      const r = await service.getRegionalProfile('u1', 'rep1');
      expect(r.totalPoints).toBe(0);
      expect(r.level).toBe(1);
      expect(r.title).toBe('Новичок');
    });
    it('throws when republic not found', async () => {
      prisma.regionalReputation.findUnique.mockResolvedValue(null);
      prisma.republicanKhural.findUnique.mockResolvedValue(null);
      await expect(service.getRegionalProfile('u1', 'bad')).rejects.toThrow();
    });
  });

  describe('getUserRegions', () => {
    it('returns user regions', async () => {
      const r = await service.getUserRegions('u1');
      expect(r).toEqual([]);
    });
  });

  describe('getLeaderboard', () => {
    it('returns leaderboard', async () => {
      // $transaction resolves array of promises
      prisma.$transaction.mockResolvedValue([
        [{ user: { id: 'u1', username: 'user1' }, totalPoints: 100, level: 2, title: 'Новичок',
           questPoints: 50, taxPoints: 20, contractPoints: 30, socialPoints: 0 }],
        1,
      ]);
      const r = await service.getLeaderboard('rep1');
      expect(r.data).toHaveLength(1);
      expect(r.total).toBe(1);
    });
    it('returns with options', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const r = await service.getLeaderboard('rep1', { limit: 10, offset: 5 });
      expect(r.data).toEqual([]);
      expect(r.total).toBe(0);
    });
  });

  describe('getRecentActions', () => {
    it('returns recent actions', async () => {
      const r = await service.getRecentActions('rep1');
      expect(r).toEqual([]);
    });
    it('respects limit', async () => {
      await service.getRecentActions('rep1', 5);
      expect(prisma.reputationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('getAllRepublicsStats', () => {
    it('returns empty stats', async () => {
      const r = await service.getAllRepublicsStats();
      expect(r).toEqual([]);
    });
    it('returns stats with republics', async () => {
      prisma.republicanKhural.findMany.mockResolvedValue([
        { id: 'rep1', name: 'Test', republicKey: 'test', _count: { reputations: 5 } },
      ]);
      prisma.regionalReputation.findFirst.mockResolvedValue({
        user: { id: 'u1', username: 'user1' }, totalPoints: 500, level: 8,
      });
      const r = await service.getAllRepublicsStats();
      expect(r).toHaveLength(1);
      expect(r[0].activeUsers).toBe(5);
      expect(r[0].topContributor).toBeDefined();
    });
  });

  describe('calculateLevel (private)', () => {
    it('returns 1 for 0 points', () => {
      expect((service as any).calculateLevel(0)).toBe(1);
    });
    it('returns 2 for 10 points', () => {
      expect((service as any).calculateLevel(10)).toBe(2);
    });
    it('caps at 100', () => {
      expect((service as any).calculateLevel(1000000)).toBe(100);
    });
  });

  describe('getLevelTitle (private)', () => {
    it('returns Новичок for level 1', () => {
      expect((service as any).getLevelTitle(1)).toBe('Новичок');
    });
    it('returns Резидент for level 10', () => {
      expect((service as any).getLevelTitle(10)).toBe('Резидент');
    });
    it('returns Почётный гражданин for level 75', () => {
      expect((service as any).getLevelTitle(75)).toBe('Почётный гражданин');
    });
    it('returns Гражданин for level 25', () => {
      expect((service as any).getLevelTitle(25)).toBe('Гражданин');
    });
    it('returns Заслуженный for level 50', () => {
      expect((service as any).getLevelTitle(50)).toBe('Заслуженный');
    });
  });
});
