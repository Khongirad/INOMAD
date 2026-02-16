import { Test, TestingModule } from '@nestjs/testing';
import { OrgQuestController } from './org-quest.controller';
import { OrgQuestService } from './org-quest.service';
import { AuthGuard } from '../auth/auth.guard';

describe('OrgQuestController', () => {
  let controller: OrgQuestController;
  let service: any;
  const req = { user: { sub: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createTask: jest.fn().mockResolvedValue({ id: 't1' }),
      getOrgTaskBoard: jest.fn().mockResolvedValue({ tasks: [] }),
      browseAvailableTasks: jest.fn().mockResolvedValue({ tasks: [] }),
      getMyTasks: jest.fn().mockResolvedValue([]),
      getTask: jest.fn().mockResolvedValue({ id: 't1' }),
      acceptTask: jest.fn().mockResolvedValue({ accepted: true }),
      updateProgress: jest.fn().mockResolvedValue({ progress: 50 }),
      submitTask: jest.fn().mockResolvedValue({ submitted: true }),
      approveTask: jest.fn().mockResolvedValue({ approved: true }),
      rejectTask: jest.fn().mockResolvedValue({ rejected: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgQuestController],
      providers: [{ provide: OrgQuestService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(OrgQuestController);
    service = module.get(OrgQuestService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('createTask', async () => { const body = { title: 'T', description: 'D', objectives: [], category: 'DEV' }; await controller.createTask('org1', req, body); expect(service.createTask).toHaveBeenCalledWith('org1', 'u1', body); });
  it('getOrgTaskBoard', async () => { await controller.getOrgTaskBoard('org1', req, 'DEV', undefined, '1', '10'); expect(service.getOrgTaskBoard).toHaveBeenCalled(); });
  it('browseAvailableTasks', async () => { await controller.browseAvailableTasks(req); expect(service.browseAvailableTasks).toHaveBeenCalled(); });
  it('getMyTasks', async () => { await controller.getMyTasks(req); expect(service.getMyTasks).toHaveBeenCalledWith('u1', 'all'); });
  it('getTask', async () => { await controller.getTask('t1'); expect(service.getTask).toHaveBeenCalledWith('t1'); });
  it('acceptTask', async () => { await controller.acceptTask('t1', req); expect(service.acceptTask).toHaveBeenCalledWith('t1', 'u1'); });
  it('updateProgress', async () => { await controller.updateProgress('t1', req, { objectives: [] }); expect(service.updateProgress).toHaveBeenCalledWith('t1', 'u1', []); });
  it('submitTask', async () => { await controller.submitTask('t1', req, { evidence: [] }); expect(service.submitTask).toHaveBeenCalledWith('t1', 'u1', []); });
  it('approveTask', async () => { await controller.approveTask('t1', req, { rating: 5 }); expect(service.approveTask).toHaveBeenCalledWith('t1', 'u1', 5, undefined); });
  it('rejectTask', async () => { await controller.rejectTask('t1', req, { feedback: 'redo' }); expect(service.rejectTask).toHaveBeenCalledWith('t1', 'u1', 'redo'); });
});
