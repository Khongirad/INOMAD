import { Test, TestingModule } from '@nestjs/testing';
import { QuestService } from './quest.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegionalReputationService } from '../regional-reputation/regional-reputation.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('QuestService', () => {
  let service: QuestService;
  let prisma: any;

  const mockQuest = {
    id: 'q-1', giverId: 'giver-1', takerId: null, title: 'Test Quest',
    description: 'Desc', category: 'GENERAL', rewardAltan: 100,
    reputationGain: 50, status: 'OPEN', progress: 0, taxAmount: 10,
    republicTaxAmount: 7, confederationTaxAmount: 3,
    giver: { id: 'giver-1', username: 'giver' },
    taker: null, organization: null, republic: null,
    objectives: [], submissions: null, taxRepublicId: null,
    republicId: 'rep-1',
  };

  const mockPrisma = () => ({
    quest: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(),
      count: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    organizationMember: { findUnique: jest.fn() },
    tumen: { findFirst: jest.fn() },
    $transaction: jest.fn((args) => Promise.all(args)),
  });

  const mockReputation = () => ({
    awardPoints: jest.fn().mockResolvedValue({}),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: RegionalReputationService, useFactory: mockReputation },
      ],
    }).compile();
    service = module.get(QuestService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createQuest ───────────────────────
  describe('createQuest', () => {
    it('should create quest with tax calculation', async () => {
      prisma.tumen.findFirst.mockResolvedValue(null);
      prisma.quest.create.mockResolvedValue({ ...mockQuest, taxAmount: 10, republicTaxAmount: 7, confederationTaxAmount: 3 });
      const result = await service.createQuest('giver-1', {
        title: 'Test', description: 'Desc', category: 'GENERAL' as any,
        rewardAltan: 100,
      } as any);
      expect(result.taxAmount).toBe(10);
    });
    it('should throw BadRequestException without reward', async () => {
      await expect(service.createQuest('giver-1', { rewardAltan: 0 } as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException with negative reward', async () => {
      await expect(service.createQuest('giver-1', { rewardAltan: -5 } as any)).rejects.toThrow(BadRequestException);
    });
    it('should verify org membership for org quests', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.createQuest('giver-1', {
        title: 'Test', rewardAltan: 100, organizationId: 'org-1',
      } as any)).rejects.toThrow(ForbiddenException);
    });
    it('should allow org quest when member', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
      prisma.tumen.findFirst.mockResolvedValue(null);
      prisma.quest.create.mockResolvedValue(mockQuest);
      const result = await service.createQuest('giver-1', {
        title: 'Test', description: 'D', category: 'GENERAL' as any,
        rewardAltan: 100, organizationId: 'org-1',
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ─── browseQuests ──────────────────────
  describe('browseQuests', () => {
    it('should return paginated results', async () => {
      prisma.quest.findMany.mockResolvedValue([mockQuest]);
      prisma.quest.count.mockResolvedValue(1);
      const result = await service.browseQuests('user-2');
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toHaveProperty('total');
    });
    it('should apply category filter', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      prisma.quest.count.mockResolvedValue(0);
      await service.browseQuests('user-2', { category: 'SERVICES' as any });
      expect(prisma.quest.findMany).toHaveBeenCalled();
    });
    it('should apply search filter', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      prisma.quest.count.mockResolvedValue(0);
      await service.browseQuests('user-2', { search: 'test' });
      expect(prisma.quest.findMany).toHaveBeenCalled();
    });
    it('should apply reward range filter', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      prisma.quest.count.mockResolvedValue(0);
      await service.browseQuests('user-2', { minReward: 50, maxReward: 200 });
      expect(prisma.quest.findMany).toHaveBeenCalled();
    });
  });

  // ─── acceptQuest ───────────────────────
  describe('acceptQuest', () => {
    it('should accept an open quest', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 1 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, status: 'ACCEPTED', takerId: 'user-2' });
      const result = await service.acceptQuest('q-1', 'user-2');
      expect(result?.status).toBe('ACCEPTED');
    });
    it('should throw NotFoundException when quest missing', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.acceptQuest('q-bad', 'user-2')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when giver tries to accept own quest', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'user-2' });
      await expect(service.acceptQuest('q-1', 'user-2')).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException when already taken', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'other' });
      await expect(service.acceptQuest('q-1', 'user-2')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateProgress ────────────────────
  describe('updateProgress', () => {
    it('should update progress and objectives', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'user-2', status: 'ACCEPTED' });
      prisma.quest.update.mockResolvedValue({ ...mockQuest, progress: 50 });
      const objectives = [
        { description: 'Step 1', completed: true },
        { description: 'Step 2', completed: false },
      ];
      const result = await service.updateProgress('q-1', 'user-2', objectives);
      expect(result.progress).toBe(50);
    });
    it('should throw ForbiddenException if not taker', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'other' });
      await expect(service.updateProgress('q-1', 'user-2', [])).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not in progress', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'user-2', status: 'COMPLETED' });
      await expect(service.updateProgress('q-1', 'user-2', [])).rejects.toThrow(BadRequestException);
    });
  });

  // ─── submitQuest ───────────────────────
  describe('submitQuest', () => {
    it('should submit quest with evidence', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'user-2', status: 'IN_PROGRESS' });
      prisma.quest.update.mockResolvedValue({ ...mockQuest, status: 'SUBMITTED', progress: 100 });
      const result = await service.submitQuest('q-1', 'user-2', [{ url: 'proof.jpg' }]);
      expect(result.status).toBe('SUBMITTED');
    });
    it('should throw ForbiddenException if not taker', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'other', status: 'IN_PROGRESS' });
      await expect(service.submitQuest('q-1', 'user-2', [])).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── approveQuest ──────────────────────
  describe('approveQuest', () => {
    it('should approve and award reputation', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        ...mockQuest, giverId: 'giver-1', takerId: 'taker-1', status: 'SUBMITTED',
        taker: { id: 'taker-1', username: 'taker' }, republic: { id: 'rep-1', name: 'Rep1' },
      });
      prisma.quest.update.mockResolvedValue({ ...mockQuest, status: 'COMPLETED' });
      prisma.tumen.findFirst.mockResolvedValue(null);
      const result = await service.approveQuest('q-1', 'giver-1', 5, 'Great');
      expect(result.status).toBe('COMPLETED');
    });
    it('should throw BadRequestException for invalid rating', async () => {
      await expect(service.approveQuest('q-1', 'giver-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.approveQuest('q-1', 'giver-1', 6)).rejects.toThrow(BadRequestException);
    });
    it('should throw ForbiddenException if not giver', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'other', status: 'SUBMITTED' });
      await expect(service.approveQuest('q-1', 'giver-1', 5)).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not SUBMITTED', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'giver-1', status: 'OPEN' });
      await expect(service.approveQuest('q-1', 'giver-1', 5)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── rejectQuest ───────────────────────
  describe('rejectQuest', () => {
    it('should reject submitted quest', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'giver-1', status: 'SUBMITTED' });
      prisma.quest.update.mockResolvedValue({ ...mockQuest, status: 'REJECTED' });
      const result = await service.rejectQuest('q-1', 'giver-1', 'Not good');
      expect(result.status).toBe('REJECTED');
    });
    it('should throw ForbiddenException if not giver', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'other', status: 'SUBMITTED' });
      await expect(service.rejectQuest('q-1', 'user-2', 'Bad')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── cancelQuest ───────────────────────
  describe('cancelQuest', () => {
    it('should cancel open quest', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 1 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, status: 'CANCELLED' });
      const result = await service.cancelQuest('q-1', 'giver-1');
      expect(result?.status).toBe('CANCELLED');
    });
    it('should throw NotFoundException for missing quest', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.cancelQuest('q-bad', 'giver-1')).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException if not giver', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'other' });
      await expect(service.cancelQuest('q-1', 'giver-1')).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if quest has taker', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'giver-1', takerId: 'taker-1' });
      await expect(service.cancelQuest('q-1', 'giver-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── withdrawQuest ─────────────────────
  describe('withdrawQuest', () => {
    it('should withdraw taker from accepted quest', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        ...mockQuest, takerId: 'user-2', status: 'ACCEPTED', objectives: [{ description: 'a', completed: true }],
      });
      prisma.quest.update.mockResolvedValue({ ...mockQuest, takerId: null, status: 'OPEN' });
      const result = await service.withdrawQuest('q-1', 'user-2');
      expect(result.status).toBe('OPEN');
    });
    it('should throw ForbiddenException if not taker', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'other', status: 'ACCEPTED' });
      await expect(service.withdrawQuest('q-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not in acceptable status', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'user-2', status: 'SUBMITTED' });
      await expect(service.withdrawQuest('q-1', 'user-2')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getMyQuests ───────────────────────
  describe('getMyQuests', () => {
    it('should return quests as giver', async () => {
      prisma.quest.findMany.mockResolvedValue([mockQuest]);
      const result = await service.getMyQuests('giver-1', 'giver');
      expect(result).toHaveLength(1);
    });
    it('should return quests as taker', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      await service.getMyQuests('user-2', 'taker');
      expect(prisma.quest.findMany).toHaveBeenCalled();
    });
    it('should return all quests by default', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      await service.getMyQuests('user-1');
      expect(prisma.quest.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }));
    });
  });

  // ─── getQuest ──────────────────────────
  describe('getQuest', () => {
    it('should return quest when found', async () => {
      prisma.quest.findUnique.mockResolvedValue(mockQuest);
      expect(await service.getQuest('q-1')).toEqual(mockQuest);
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.getQuest('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getMarketStats ────────────────────
  describe('getMarketStats', () => {
    it('should return market statistics', async () => {
      prisma.quest.count.mockResolvedValue(100);
      prisma.quest.aggregate.mockResolvedValue({ _sum: { rewardAltan: 50000 } });
      // $transaction returns the array of results
      const result = await service.getMarketStats();
      expect(result).toHaveProperty('totalQuests');
      expect(result).toHaveProperty('openQuests');
      expect(result).toHaveProperty('completedQuests');
      expect(result).toHaveProperty('totalVolumeAltan');
    });
  });

  // ─── detectRepublicId (private) ───────
  describe('detectRepublicId (private)', () => {
    it('should return republicId when tumen found', async () => {
      prisma.tumen.findFirst.mockResolvedValue({ republicId: 'rep-1' });
      const result = await (service as any).detectRepublicId('user-1');
      expect(result).toBe('rep-1');
    });
    it('should return undefined when no tumen', async () => {
      prisma.tumen.findFirst.mockResolvedValue(null);
      const result = await (service as any).detectRepublicId('user-1');
      expect(result).toBeUndefined();
    });
  });

  // ─── submitQuest edge cases ───────────
  describe('submitQuest edge cases', () => {
    it('should throw NotFoundException when quest not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.submitQuest('bad', 'u1', [])).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when quest not in progress', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, takerId: 'user-2', status: 'COMPLETED' });
      await expect(service.submitQuest('q-1', 'user-2', [])).rejects.toThrow(BadRequestException);
    });
  });

  // ─── rejectQuest edge cases ───────────
  describe('rejectQuest edge cases', () => {
    it('should throw NotFoundException when quest not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.rejectQuest('bad', 'u1', 'reason')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when not SUBMITTED', async () => {
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'giver-1', status: 'OPEN' });
      await expect(service.rejectQuest('q-1', 'giver-1', 'reason')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancelQuest status conflict ──────
  describe('cancelQuest status conflict', () => {
    it('should throw BadRequestException when quest is in non-cancellable status', async () => {
      prisma.quest.updateMany.mockResolvedValue({ count: 0 });
      prisma.quest.findUnique.mockResolvedValue({ ...mockQuest, giverId: 'giver-1', takerId: null, status: 'COMPLETED' });
      await expect(service.cancelQuest('q-1', 'giver-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approveQuest no taker ────────────
  describe('approveQuest no taker', () => {
    it('should throw BadRequestException if no taker assigned', async () => {
      prisma.quest.findUnique.mockResolvedValue({
        ...mockQuest, giverId: 'giver-1', takerId: null, status: 'SUBMITTED',
        taker: null, republic: null,
      });
      await expect(service.approveQuest('q-1', 'giver-1', 5)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approveQuest NotFoundException ────
  describe('approveQuest NotFoundException', () => {
    it('should throw when quest not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.approveQuest('bad', 'u1', 5)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── withdrawQuest NotFoundException ───
  describe('withdrawQuest NotFoundException', () => {
    it('should throw when quest not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.withdrawQuest('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateProgress NotFoundException ──
  describe('updateProgress NotFoundException', () => {
    it('should throw when quest not found', async () => {
      prisma.quest.findUnique.mockResolvedValue(null);
      await expect(service.updateProgress('bad', 'u1', [])).rejects.toThrow(NotFoundException);
    });
  });

  // ─── browseQuests with org/republic ────
  describe('browseQuests with orgId and republicId', () => {
    it('should apply organizationId filter', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      prisma.quest.count.mockResolvedValue(0);
      await service.browseQuests('user-2', { organizationId: 'org-1' });
      expect(prisma.quest.findMany).toHaveBeenCalled();
    });
    it('should apply republicId filter', async () => {
      prisma.quest.findMany.mockResolvedValue([]);
      prisma.quest.count.mockResolvedValue(0);
      await service.browseQuests('user-2', { republicId: 'rep-1' });
      expect(prisma.quest.findMany).toHaveBeenCalled();
    });
  });

  // ─── createQuest with tumen-based republic ─
  describe('createQuest with tumen republic', () => {
    it('should auto-detect republicId from tumen', async () => {
      prisma.tumen.findFirst.mockResolvedValue({ republicId: 'rep-1' });
      prisma.quest.create.mockResolvedValue({ ...mockQuest, republicId: 'rep-1' });
      const result = await service.createQuest('giver-1', {
        title: 'Test', description: 'D', category: 'GENERAL' as any,
        rewardAltan: 100,
      } as any);
      expect(result.republicId).toBe('rep-1');
    });
  });
});

