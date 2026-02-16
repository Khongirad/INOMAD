import { Test, TestingModule } from '@nestjs/testing';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { AuthGuard } from '../auth/auth.guard';

describe('DisputeController', () => {
  let controller: DisputeController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      openDispute: jest.fn().mockResolvedValue({ id: 'd1' }),
      listDisputes: jest.fn().mockResolvedValue({ items: [] }),
      getDispute: jest.fn().mockResolvedValue({ id: 'd1' }),
      startNegotiation: jest.fn().mockResolvedValue({ status: 'NEGOTIATING' }),
      settle: jest.fn().mockResolvedValue({ status: 'SETTLED' }),
      escalateToComplaint: jest.fn().mockResolvedValue({ escalated: true }),
      escalateToCourt: jest.fn().mockResolvedValue({ escalated: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputeController],
      providers: [{ provide: DisputeService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(DisputeController);
    service = module.get(DisputeService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('openDispute', async () => { const body = { partyBId: 'u2', sourceType: 'CONTRACT' as any, sourceId: 's1', title: 'T', description: 'D' }; await controller.openDispute(req, body); expect(service.openDispute).toHaveBeenCalledWith('u1', body); });
  it('listDisputes', async () => { await controller.listDisputes(req, 'OPEN' as any, '1', '10'); expect(service.listDisputes).toHaveBeenCalledWith('u1', 'OPEN', 1, 10); });
  it('getDispute', async () => { await controller.getDispute('d1'); expect(service.getDispute).toHaveBeenCalledWith('d1'); });
  it('startNegotiation', async () => { await controller.startNegotiation('d1'); expect(service.startNegotiation).toHaveBeenCalledWith('d1'); });
  it('settle', async () => { await controller.settle('d1', 'agreed'); expect(service.settle).toHaveBeenCalledWith('d1', 'agreed'); });
  it('escalateToComplaint', async () => { await controller.escalateToComplaint('d1'); expect(service.escalateToComplaint).toHaveBeenCalledWith('d1'); });
  it('escalateToCourt', async () => { await controller.escalateToCourt('d1'); expect(service.escalateToCourt).toHaveBeenCalledWith('d1'); });
});
