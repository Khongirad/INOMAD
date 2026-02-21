import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let prisma: any;

  const mockActivity = {
    id: 'act-1', actionName: 'CREATE_ORG', actionDescription: 'Created organization',
    actionParameters: {}, performedByUserId: 'user-1', powerBranch: 'EXECUTIVE',
    hierarchyLevel: 'LEVEL_1', durationMinutes: 15, performedAt: new Date('2026-02-15T10:00:00Z'),
    performedBy: { seatId: 'seat-1', username: 'User' },
    orgArbad: { name: 'OrgX', powerBranch: 'EXECUTIVE' },
    template: { code: 'TPL-001', name: 'Org Template' },
  };

  const mockPrisma = () => ({
    activityEntry: {
      create: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn(),
    },
    branchActivityReport: { create: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(ActivityLogService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── logActivity ───────────────────────
  describe('logActivity', () => {
    it('should log activity with all params', async () => {
      prisma.activityEntry.create.mockResolvedValue(mockActivity);
      const result = await service.logActivity({
        actionName: 'CREATE_ORG', actionDescription: 'Created org',
        actionParameters: { orgId: 'org-1' }, performedByUserId: 'user-1',
        powerBranch: 'EXECUTIVE' as any, hierarchyLevel: 'LEVEL_1' as any,
        durationMinutes: 15,
      });
      expect(result.actionName).toBe('CREATE_ORG');
    });

    it('should include optional blockchain params', async () => {
      prisma.activityEntry.create.mockResolvedValue(mockActivity);
      await service.logActivity({
        actionName: 'TX', actionDescription: 'Blockchain tx',
        actionParameters: {}, performedByUserId: 'user-1',
        powerBranch: 'LEGISLATIVE' as any, txHash: '0xhash',
        blockNumber: 12345n, contractAddress: '0xcontract',
      });
      expect(prisma.activityEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ txHash: '0xhash' }),
      }));
    });

    it('should propagate DB errors', async () => {
      prisma.activityEntry.create.mockRejectedValue(new Error('DB error'));
      await expect(service.logActivity({
        actionName: 'X', actionDescription: 'Y',
        actionParameters: {}, performedByUserId: 'u1',
        powerBranch: 'EXECUTIVE' as any,
      })).rejects.toThrow('DB error');
    });
  });

  // ─── getActivities ─────────────────────
  describe('getActivities', () => {
    it('should return activities with filters', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([mockActivity]);
      prisma.activityEntry.count.mockResolvedValue(1);
      const result = await service.getActivities({ powerBranch: 'EXECUTIVE' as any, limit: 10 });
      expect(result.activities).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply time filters', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([]);
      prisma.activityEntry.count.mockResolvedValue(0);
      const start = new Date('2026-01-01');
      const end = new Date('2026-02-01');
      await service.getActivities({ startTime: start, endTime: end });
      expect(prisma.activityEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          performedAt: { gte: start, lte: end },
        }),
      }));
    });

    it('should use default pagination', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([]);
      prisma.activityEntry.count.mockResolvedValue(0);
      await service.getActivities({});
      expect(prisma.activityEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 50, skip: 0,
      }));
    });
  });

  // ─── getHierarchyActivities ────────────
  describe('getHierarchyActivities', () => {
    it('should filter by hierarchy level range', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([mockActivity]);
      const result = await service.getHierarchyActivities(
        'EXECUTIVE' as any, 'LEVEL_1' as any, 'LEVEL_1000' as any,
      );
      expect(result).toHaveLength(1);
      expect(prisma.activityEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          powerBranch: 'EXECUTIVE',
          hierarchyLevel: { in: ['LEVEL_1', 'LEVEL_10', 'LEVEL_100', 'LEVEL_1000'] },
        }),
      }));
    });

    it('should apply time filters', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([]);
      const start = new Date('2026-01-01');
      await service.getHierarchyActivities('LEGISLATIVE' as any, 'LEVEL_1' as any, 'LEVEL_10' as any, start);
      expect(prisma.activityEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          performedAt: expect.objectContaining({ gte: start }),
        }),
      }));
    });
  });

  // ─── generateActivitySummary ───────────
  describe('generateActivitySummary', () => {
    it('should generate summary with groupings', async () => {
      const activities = [
        { ...mockActivity, powerBranch: 'EXECUTIVE', performedAt: new Date('2026-02-15T10:00:00Z'), durationMinutes: 15 },
        { ...mockActivity, powerBranch: 'EXECUTIVE', performedAt: new Date('2026-02-15T11:00:00Z'), durationMinutes: 30 },
        { ...mockActivity, powerBranch: 'LEGISLATIVE', performedAt: new Date('2026-02-16T09:00:00Z'), durationMinutes: 10 },
      ];
      prisma.activityEntry.findMany.mockResolvedValue(activities);
      const result = await service.generateActivitySummary({
        startDate: new Date('2026-02-15'), endDate: new Date('2026-02-17'),
      });
      expect(result.totalActivities).toBe(3);
      expect(result.totalDurationMinutes).toBe(55);
      expect(result.byPowerBranch['EXECUTIVE']).toBe(2);
      expect(result.byPowerBranch['LEGISLATIVE']).toBe(1);
      expect(Object.keys(result.byDay)).toHaveLength(2);
    });

    it('should handle empty activities', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([]);
      const result = await service.generateActivitySummary({
        startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02'),
      });
      expect(result.totalActivities).toBe(0);
      expect(result.totalDurationMinutes).toBe(0);
    });
  });

  // ─── aggregateActivities ───────────────
  describe('aggregateActivities', () => {
    it('should create HOURLY report', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([mockActivity]);
      prisma.activityEntry.count.mockResolvedValue(1);
      prisma.branchActivityReport.create.mockResolvedValue({ id: 'r1', periodType: 'HOURLY' });
      prisma.activityEntry.updateMany.mockResolvedValue({});
      const result = await service.aggregateActivities('HOURLY', 'EXECUTIVE' as any);
      expect(result.periodType).toBe('HOURLY');
    });

    it('should create DAILY report', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([]);
      prisma.activityEntry.count.mockResolvedValue(0);
      prisma.branchActivityReport.create.mockResolvedValue({ id: 'r2', periodType: 'DAILY' });
      prisma.activityEntry.updateMany.mockResolvedValue({});
      const result = await service.aggregateActivities('DAILY', 'LEGISLATIVE' as any);
      expect(result.periodType).toBe('DAILY');
    });

    it('should create WEEKLY report with hierarchy level', async () => {
      prisma.activityEntry.findMany.mockResolvedValue([]);
      prisma.activityEntry.count.mockResolvedValue(0);
      prisma.branchActivityReport.create.mockResolvedValue({ id: 'r3', periodType: 'WEEKLY' });
      prisma.activityEntry.updateMany.mockResolvedValue({});
      const result = await service.aggregateActivities('WEEKLY', 'JUDICIAL' as any, 'LEVEL_100' as any);
      expect(result.periodType).toBe('WEEKLY');
    });
  });
});
