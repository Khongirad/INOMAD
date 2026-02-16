import { Test, TestingModule } from '@nestjs/testing';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { AuthGuard } from '../auth/auth.guard';

describe('QuestController', () => {
  let controller: QuestController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      browseQuests: jest.fn().mockResolvedValue({ items: [] }),
      getMyQuests: jest.fn().mockResolvedValue([]),
      getMarketStats: jest.fn().mockResolvedValue({ total: 10 }),
      getQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      acceptQuest: jest.fn().mockResolvedValue({ accepted: true }),
      updateProgress: jest.fn().mockResolvedValue({ progress: 50 }),
      submitQuest: jest.fn().mockResolvedValue({ submitted: true }),
      approveQuest: jest.fn().mockResolvedValue({ approved: true }),
      rejectQuest: jest.fn().mockResolvedValue({ rejected: true }),
      cancelQuest: jest.fn().mockResolvedValue({ cancelled: true }),
      withdrawQuest: jest.fn().mockResolvedValue({ withdrawn: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestController],
      providers: [{ provide: QuestService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(QuestController);
    service = module.get(QuestService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('create', async () => { await controller.create(req, {} as any); expect(service.createQuest).toHaveBeenCalledWith('u1', {}); });
  it('browse', async () => { await controller.browse(req, undefined, undefined, undefined, undefined, undefined, undefined, '1', '10'); expect(service.browseQuests).toHaveBeenCalled(); });
  it('browse defaults', async () => { await controller.browse(req); expect(service.browseQuests).toHaveBeenCalled(); });
  it('myQuests', async () => { await controller.myQuests(req); expect(service.getMyQuests).toHaveBeenCalledWith('u1', 'all'); });
  it('myQuests with role', async () => { await controller.myQuests(req, 'giver'); expect(service.getMyQuests).toHaveBeenCalledWith('u1', 'giver'); });
  it('stats', async () => { await controller.stats(); expect(service.getMarketStats).toHaveBeenCalled(); });
  it('getQuest', async () => { await controller.getQuest('q1'); expect(service.getQuest).toHaveBeenCalledWith('q1'); });
  it('accept', async () => { await controller.accept('q1', req); expect(service.acceptQuest).toHaveBeenCalledWith('q1', 'u1'); });
  it('progress', async () => { await controller.progress('q1', req, { objectives: [] } as any); expect(service.updateProgress).toHaveBeenCalledWith('q1', 'u1', []); });
  it('submit', async () => { await controller.submit('q1', req, { evidence: ['e1'] } as any); expect(service.submitQuest).toHaveBeenCalledWith('q1', 'u1', ['e1']); });
  it('submit no evidence', async () => { await controller.submit('q1', req, {} as any); expect(service.submitQuest).toHaveBeenCalledWith('q1', 'u1', []); });
  it('approve', async () => { await controller.approve('q1', req, { rating: 5, feedback: 'good' } as any); expect(service.approveQuest).toHaveBeenCalledWith('q1', 'u1', 5, 'good'); });
  it('reject', async () => { await controller.reject('q1', req, { feedback: 'bad' } as any); expect(service.rejectQuest).toHaveBeenCalledWith('q1', 'u1', 'bad'); });
  it('cancel', async () => { await controller.cancel('q1', req); expect(service.cancelQuest).toHaveBeenCalledWith('q1', 'u1'); });
  it('withdraw', async () => { await controller.withdraw('q1', req); expect(service.withdrawQuest).toHaveBeenCalledWith('q1', 'u1'); });
});
