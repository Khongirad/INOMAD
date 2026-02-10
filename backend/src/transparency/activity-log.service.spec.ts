import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activityEntry: {
        create: jest.fn().mockResolvedValue({ id: 'ae-1', actionName: 'TEST' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn(),
      },
      branchActivityReport: {
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ActivityLogService>(ActivityLogService);
  });

  it('logActivity creates entry', async () => {
    const r = await service.logActivity({
      actionName: 'VOTE', actionDescription: 'Voted', actionParameters: {},
      performedByUserId: 'u1', powerBranch: 'LEGISLATIVE' as any,
    });
    expect(r.actionName).toBe('TEST');
  });

  it('getActivities returns paginated results', async () => {
    const r = await service.getActivities({});
    expect(r).toHaveProperty('activities');
    expect(r).toHaveProperty('total');
  });

  it('generateActivitySummary returns summary', async () => {
    const r = await service.generateActivitySummary({
      startDate: new Date(), endDate: new Date(),
    });
    expect(r.totalActivities).toBe(0);
  });
});
