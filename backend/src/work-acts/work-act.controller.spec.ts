import { Test, TestingModule } from '@nestjs/testing';
import { WorkActController } from './work-act.controller';
import { WorkActService } from './work-act.service';
import { AuthGuard } from '../auth/auth.guard';

describe('WorkActController', () => {
  let controller: WorkActController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn().mockResolvedValue({ id: 'w1' }),
      list: jest.fn().mockResolvedValue({ items: [] }),
      getById: jest.fn().mockResolvedValue({ id: 'w1' }),
      submit: jest.fn().mockResolvedValue({ submitted: true }),
      review: jest.fn().mockResolvedValue({ reviewed: true }),
      sign: jest.fn().mockResolvedValue({ signed: true }),
      dispute: jest.fn().mockResolvedValue({ disputed: true }),
      cancel: jest.fn().mockResolvedValue({ cancelled: true }),
      recordPayment: jest.fn().mockResolvedValue({ paid: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkActController],
      providers: [{ provide: WorkActService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(WorkActController);
    service = module.get(WorkActService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('create', async () => { const body = { clientId: 'c1', title: 'T', description: 'D', deliverables: ['d'], amount: 100 }; await controller.create(req, body); expect(service.create).toHaveBeenCalledWith('u1', body); });
  it('list', async () => { await controller.list('DRAFT', '1', '10'); expect(service.list).toHaveBeenCalledWith({ status: 'DRAFT', page: 1, limit: 10 }); });
  it('list defaults', async () => { await controller.list(); expect(service.list).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 20 }); });
  it('myWorkActs', async () => { await controller.myWorkActs(req); expect(service.list).toHaveBeenCalledWith({ contractorId: 'u1' }); });
  it('reviewQueue', async () => { await controller.reviewQueue(req); expect(service.list).toHaveBeenCalledWith({ clientId: 'u1' }); });
  it('getById', async () => { await controller.getById('w1'); expect(service.getById).toHaveBeenCalledWith('w1'); });
  it('submit', async () => { await controller.submit(req, 'w1'); expect(service.submit).toHaveBeenCalledWith('w1', 'u1'); });
  it('review', async () => { await controller.review(req, 'w1'); expect(service.review).toHaveBeenCalledWith('w1', 'u1'); });
  it('sign', async () => { await controller.sign(req, 'w1', '0xSIG'); expect(service.sign).toHaveBeenCalledWith('w1', 'u1', '0xSIG'); });
  it('dispute', async () => { await controller.dispute(req, 'w1', 'reason'); expect(service.dispute).toHaveBeenCalledWith('w1', 'u1', 'reason'); });
  it('cancel', async () => { await controller.cancel(req, 'w1'); expect(service.cancel).toHaveBeenCalledWith('w1', 'u1'); });
  it('recordPayment', async () => { await controller.recordPayment('w1', '0xTX'); expect(service.recordPayment).toHaveBeenCalledWith('w1', '0xTX'); });
});
