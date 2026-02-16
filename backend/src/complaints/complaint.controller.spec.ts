import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { AuthGuard } from '../auth/auth.guard';

describe('ComplaintController', () => {
  let controller: ComplaintController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      fileComplaint: jest.fn().mockResolvedValue({ id: 'c1' }),
      listComplaints: jest.fn().mockResolvedValue({ items: [] }),
      getStats: jest.fn().mockResolvedValue({ total: 0 }),
      getComplaintBook: jest.fn().mockResolvedValue({ items: [] }),
      getComplaint: jest.fn().mockResolvedValue({ id: 'c1' }),
      respond: jest.fn().mockResolvedValue({ id: 'r1' }),
      assignReviewer: jest.fn().mockResolvedValue({ assigned: true }),
      escalateToNextLevel: jest.fn().mockResolvedValue({ escalated: true }),
      escalateToCourt: jest.fn().mockResolvedValue({ escalated: true }),
      resolve: jest.fn().mockResolvedValue({ resolved: true }),
      dismiss: jest.fn().mockResolvedValue({ dismissed: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplaintController],
      providers: [{ provide: ComplaintService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(ComplaintController);
    service = module.get(ComplaintService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('fileComplaint', async () => { const body = { sourceType: 'CONTRACT' as any, sourceId: 's1', category: 'FRAUD' as any, title: 'T', description: 'D' }; await controller.fileComplaint(req, body); expect(service.fileComplaint).toHaveBeenCalledWith('u1', body); });
  it('listComplaints', async () => { await controller.listComplaints(undefined, undefined, undefined, '1', '10'); expect(service.listComplaints).toHaveBeenCalled(); });
  it('myComplaints', async () => { await controller.myComplaints(req); expect(service.listComplaints).toHaveBeenCalledWith(expect.objectContaining({ filerId: 'u1' })); });
  it('getStats', async () => { await controller.getStats(); expect(service.getStats).toHaveBeenCalled(); });
  it('getComplaintBook', async () => { await controller.getComplaintBook('1', 'e1', '1', '10'); expect(service.getComplaintBook).toHaveBeenCalledWith(1, 'e1', 1, 10); });
  it('getComplaint', async () => { await controller.getComplaint('c1'); expect(service.getComplaint).toHaveBeenCalledWith('c1'); });
  it('respond', async () => { await controller.respond('c1', req, { body: 'reply' }); expect(service.respond).toHaveBeenCalledWith('c1', 'u1', 'reply', undefined, undefined); });
  it('assignReviewer', async () => { await controller.assignReviewer('c1', 'rev1'); expect(service.assignReviewer).toHaveBeenCalledWith('c1', 'rev1'); });
  it('escalateToNextLevel', async () => { await controller.escalateToNextLevel('c1', req, 'slow'); expect(service.escalateToNextLevel).toHaveBeenCalledWith('c1', 'u1', 'slow'); });
  it('escalateToCourt', async () => { await controller.escalateToCourt('c1'); expect(service.escalateToCourt).toHaveBeenCalledWith('c1'); });
  it('resolve', async () => { await controller.resolve('c1', 'fixed'); expect(service.resolve).toHaveBeenCalledWith('c1', 'fixed'); });
  it('dismiss', async () => { await controller.dismiss('c1', 'invalid'); expect(service.dismiss).toHaveBeenCalledWith('c1', 'invalid'); });
});
