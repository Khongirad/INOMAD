import { Test, TestingModule } from '@nestjs/testing';
import { ParliamentController } from './parliament.controller';
import { ParliamentService } from './parliament.service';
import { AuthGuard } from '../auth/auth.guard';

describe('ParliamentController', () => {
  let controller: ParliamentController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createSession: jest.fn().mockResolvedValue({ id: 's1' }),
      listSessions: jest.fn().mockResolvedValue([]),
      getSession: jest.fn().mockResolvedValue({ id: 's1' }),
      startSession: jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
      completeSession: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
      castVote: jest.fn().mockResolvedValue({ voted: true }),
      getVoteResults: jest.fn().mockResolvedValue({ for: 5, against: 2 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParliamentController],
      providers: [{ provide: ParliamentService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(ParliamentController);
    service = module.get(ParliamentService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('createSession', async () => { await controller.createSession(req, { level: 'ARBAN' }); expect(service.createSession).toHaveBeenCalledWith('u1', { level: 'ARBAN' }); });
  it('listSessions', async () => { await controller.listSessions('ARBAN', 'e1', 'PLANNED'); expect(service.listSessions).toHaveBeenCalledWith('ARBAN', 'e1', 'PLANNED'); });
  it('getSession', async () => { await controller.getSession('s1'); expect(service.getSession).toHaveBeenCalledWith('s1'); });
  it('startSession', async () => { await controller.startSession('s1', req); expect(service.startSession).toHaveBeenCalledWith('s1', 'u1'); });
  it('completeSession', async () => { await controller.completeSession('s1', req, 'resolved'); expect(service.completeSession).toHaveBeenCalledWith('s1', 'u1', 'resolved'); });
  it('castVote', async () => { await controller.castVote('s1', req, { vote: 'FOR' }); expect(service.castVote).toHaveBeenCalledWith('s1', 'u1', { vote: 'FOR' }); });
  it('getResults', async () => { await controller.getResults('s1'); expect(service.getVoteResults).toHaveBeenCalledWith('s1'); });
});
