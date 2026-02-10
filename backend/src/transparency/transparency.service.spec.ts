import { Test, TestingModule } from '@nestjs/testing';
import { TransparencyService } from './transparency.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from './activity-log.service';

describe('TransparencyService', () => {
  let service: TransparencyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      branchActivityReport: { findMany: jest.fn().mockResolvedValue([]) },
      activityEntry: { count: jest.fn().mockResolvedValue(42), groupBy: jest.fn().mockResolvedValue([]) },
    };
    const activityLog = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransparencyService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogService, useValue: activityLog },
      ],
    }).compile();
    service = module.get<TransparencyService>(TransparencyService);
  });

  it('getPublicReports returns reports', async () => {
    await service.getPublicReports();
    expect(prisma.branchActivityReport.findMany).toHaveBeenCalled();
  });

  it('getDashboardStats returns stats', async () => {
    const r = await service.getDashboardStats();
    expect(r.totalActivities).toBe(42);
  });
});
