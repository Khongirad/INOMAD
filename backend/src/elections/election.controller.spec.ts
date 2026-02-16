import { Test, TestingModule } from '@nestjs/testing';
import { ElectionController } from './election.controller';
import { ElectionService } from './election.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('ElectionController', () => {
  let controller: ElectionController;
  let service: any;
  const req = { user: { id: 'u1', userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createElection: jest.fn().mockResolvedValue({ id: 'e1' }),
      addCandidate: jest.fn().mockResolvedValue({ id: 'c1' }),
      vote: jest.fn().mockResolvedValue(undefined),
      completeElection: jest.fn().mockResolvedValue({ id: 'e1', status: 'COMPLETED' }),
      cancelElection: jest.fn().mockResolvedValue({ id: 'e1', status: 'CANCELLED' }),
      getElection: jest.fn().mockResolvedValue({ id: 'e1' }),
      getOrganizationElections: jest.fn().mockResolvedValue([]),
      getActiveElections: jest.fn().mockResolvedValue([]),
      getUpcomingElections: jest.fn().mockResolvedValue([]),
      activateUpcomingElections: jest.fn().mockResolvedValue(3),
      autoCompleteElections: jest.fn().mockResolvedValue(2),
    };
    const module = await Test.createTestingModule({
      controllers: [ElectionController],
      providers: [{ provide: ElectionService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ElectionController);
    service = module.get(ElectionService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('creates election', async () => {
    const r = await controller.createElection(req, { organizationId: 'o1', startDate: '2025-01-01', endDate: '2025-01-07' } as any);
    expect(r.id).toBe('e1');
  });
  it('adds candidate', async () => {
    const r = await controller.addCandidate('e1', { candidateId: 'u2', platform: 'Reform' } as any);
    expect(r.id).toBe('c1');
  });
  it('casts vote', async () => {
    const r = await controller.vote(req, 'e1', { candidateId: 'u2' } as any);
    expect(r.success).toBe(true);
  });
  it('completes election', async () => { await controller.completeElection(req, 'e1'); });
  it('cancels election', async () => { await controller.cancelElection(req, 'e1'); });
  it('gets election', async () => { await controller.getElection('e1'); });
  it('gets org elections', async () => { await controller.getOrganizationElections('o1'); });
  it('gets active elections', async () => { await controller.getActiveElections(); });
  it('gets upcoming elections', async () => { await controller.getUpcomingElections(); });
  it('activates elections', async () => {
    const r = await controller.activateElections();
    expect(r.activated).toBe(3);
  });
  it('auto-completes elections', async () => {
    const r = await controller.autoCompleteElections();
    expect(r.completed).toBe(2);
  });
});
