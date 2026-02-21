import { Test, TestingModule } from '@nestjs/testing';
import { LegislativeController } from './legislative.controller';
import { LegislativeService } from './legislative.service';
import { AuthGuard } from '../auth/auth.guard';

describe('LegislativeController', () => {
  let controller: LegislativeController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createProposal: jest.fn().mockResolvedValue({ id: 'p1' }),
      listProposals: jest.fn().mockResolvedValue({ items: [] }),
      getProposal: jest.fn().mockResolvedValue({ id: 'p1' }),
      submitProposal: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }),
      openDebate: jest.fn().mockResolvedValue({ status: 'DEBATING' }),
      addDebateEntry: jest.fn().mockResolvedValue({ id: 'e1' }),
      openVoting: jest.fn().mockResolvedValue({ status: 'VOTING' }),
      castVote: jest.fn().mockResolvedValue({ voted: true }),
      finalizeVoting: jest.fn().mockResolvedValue({ result: 'PASSED' }),
      signLaw: jest.fn().mockResolvedValue({ signed: true }),
      archiveLaw: jest.fn().mockResolvedValue({ archived: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegislativeController],
      providers: [{ provide: LegislativeService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(LegislativeController);
    service = module.get(LegislativeService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('createProposal', async () => { const dto = { title: 'T', description: 'D', fullText: 'F', category: 'C', khuralLevel: 'ARBAD', entityId: 'e1' }; await controller.createProposal(req, dto); expect(service.createProposal).toHaveBeenCalledWith('u1', dto); });
  it('listProposals', async () => { await controller.listProposals('DRAFT', 'ARBAD', undefined, undefined, '1', '10'); expect(service.listProposals).toHaveBeenCalled(); });
  it('getProposal', async () => { await controller.getProposal('p1'); expect(service.getProposal).toHaveBeenCalledWith('p1'); });
  it('submitProposal', async () => { await controller.submitProposal('p1', req); expect(service.submitProposal).toHaveBeenCalledWith('p1', 'u1'); });
  it('openDebate', async () => { await controller.openDebate('p1'); expect(service.openDebate).toHaveBeenCalledWith('p1'); });
  it('addDebateEntry', async () => { await controller.addDebateEntry('p1', req, { content: 'text' }); expect(service.addDebateEntry).toHaveBeenCalledWith('p1', 'u1', 'text', undefined); });
  it('openVoting', async () => { await controller.openVoting('p1'); expect(service.openVoting).toHaveBeenCalledWith('p1'); });
  it('castVote', async () => { await controller.castVote('p1', req, { vote: 'FOR' }); expect(service.castVote).toHaveBeenCalledWith('p1', 'u1', 'FOR', undefined); });
  it('finalizeVoting', async () => { await controller.finalizeVoting('p1'); expect(service.finalizeVoting).toHaveBeenCalledWith('p1'); });
  it('signLaw', async () => { await controller.signLaw('p1', req); expect(service.signLaw).toHaveBeenCalledWith('p1', 'u1'); });
  it('archiveLaw', async () => { await controller.archiveLaw('p1', { documentId: 'd1' }); expect(service.archiveLaw).toHaveBeenCalledWith('p1', 'd1'); });
});
