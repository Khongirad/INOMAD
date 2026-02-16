import { Test, TestingModule } from '@nestjs/testing';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('TimelineController', () => {
  let controller: TimelineController;
  let service: any;
  const req = { user: { sub: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getUserTimeline: jest.fn().mockResolvedValue([]),
      getHierarchicalTimeline: jest.fn().mockResolvedValue([]),
      createEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
      getUserContracts: jest.fn().mockResolvedValue([]),
      getEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimelineController],
      providers: [{ provide: TimelineService, useValue: mockService }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(TimelineController);
    service = module.get(TimelineService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getUserTimeline', async () => { await controller.getUserTimeline('u1', undefined, undefined, undefined, undefined, '10'); expect(service.getUserTimeline).toHaveBeenCalledWith('u1', expect.objectContaining({ limit: 10 })); });
  it('getUserTimeline with filters', async () => { await controller.getUserTimeline('u1', 'NATIONAL', 'ELECTION', '2025-01-01', '2025-12-31'); expect(service.getUserTimeline).toHaveBeenCalled(); });
  it('getHierarchicalTimeline', async () => { await controller.getHierarchicalTimeline('NATIONAL' as any, 'id1'); expect(service.getHierarchicalTimeline).toHaveBeenCalled(); });
  it('createEvent', async () => { await controller.createEvent(req, { type: 'GOVERNANCE' }); expect(service.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'GOVERNANCE', actorId: 'u1' })); });
  it('getMyContracts', async () => { await controller.getMyContracts(req); expect(service.getUserContracts).toHaveBeenCalledWith('u1'); });
  it('getEvent', async () => { await controller.getEvent('e1'); expect(service.getEvent).toHaveBeenCalledWith('e1'); });
});
