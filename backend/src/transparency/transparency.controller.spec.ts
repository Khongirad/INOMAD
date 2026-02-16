import { Test, TestingModule } from '@nestjs/testing';
import { TransparencyController } from './transparency.controller';
import { ActivityLogService } from './activity-log.service';
import { TransparencyService } from './transparency.service';

describe('TransparencyController', () => {
  let controller: TransparencyController;

  beforeEach(async () => {
    const mockActivity = {
      getActivities: jest.fn().mockResolvedValue([]),
      getHierarchyActivities: jest.fn().mockResolvedValue([]),
      generateActivitySummary: jest.fn().mockResolvedValue({ totalActivities: 10 }),
    };
    const mockTransparency = {
      getPublicReports: jest.fn().mockResolvedValue([]),
      getDashboardStats: jest.fn().mockResolvedValue({ totalVotes: 100 }),
    };
    const module = await Test.createTestingModule({
      controllers: [TransparencyController],
      providers: [
        { provide: ActivityLogService, useValue: mockActivity },
        { provide: TransparencyService, useValue: mockTransparency },
      ],
    }).compile();
    controller = module.get(TransparencyController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('gets activities', async () => { await controller.getActivities(); });
  it('gets activities with filters', async () => {
    await controller.getActivities('LEGISLATIVE' as any, 'NATIONAL' as any, '2025-01-01', '2025-12-31', '10', '0');
  });
  it('gets reports', async () => { await controller.getReports(); });
  it('gets reports with branch', async () => { await controller.getReports('LEGISLATIVE'); });
  it('gets legislative activities', async () => { await controller.getLegislativeActivities(); });
  it('gets legislative with dates', async () => { await controller.getLegislativeActivities('2025-01-01', '2025-12-31'); });
  it('gets executive activities', async () => { await controller.getExecutiveActivities(); });
  it('gets judicial activities', async () => { await controller.getJudicialActivities(); });
  it('gets banking activities', async () => { await controller.getBankingActivities(); });
  it('gets hierarchy activities', async () => {
    await controller.getHierarchyActivities('LEGISLATIVE' as any, 'NATIONAL' as any, 'ARBAN' as any);
  });
  it('gets dashboard', async () => { await controller.getDashboard(); });
  it('exports summary', async () => { await controller.exportSummary(); });
  it('exports summary with filters', async () => {
    await controller.exportSummary('org1', '2025-01-01', '2025-12-31', 'EXECUTIVE' as any);
  });
});
