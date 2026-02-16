import { Test, TestingModule } from '@nestjs/testing';
import { ChancelleryController } from './chancellery.controller';
import { ChancelleryService } from './chancellery.service';
import { AuthGuard } from '../auth/auth.guard';

describe('ChancelleryController', () => {
  let controller: ChancelleryController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getRegistry: jest.fn().mockResolvedValue({ items: [] }),
      getContractDetails: jest.fn().mockResolvedValue({ id: 'd1' }),
      getRegistryDisputes: jest.fn().mockResolvedValue({ items: [] }),
      getRegistryComplaints: jest.fn().mockResolvedValue({ items: [] }),
      getStats: jest.fn().mockResolvedValue({ total: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChancelleryController],
      providers: [{ provide: ChancelleryService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(ChancelleryController);
    service = module.get(ChancelleryService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('getRegistry', async () => {
    await controller.getRegistry(req, 'ACTIVE', 'DRAFT', 'test', '1', '10');
    expect(service.getRegistry).toHaveBeenCalledWith('u1', { status: 'ACTIVE', stage: 'DRAFT', search: 'test', page: 1, limit: 10 });
  });

  it('getContractDetails', async () => {
    await controller.getContractDetails(req, 'd1');
    expect(service.getContractDetails).toHaveBeenCalledWith('u1', 'd1');
  });

  it('getRegistryDisputes', async () => {
    await controller.getRegistryDisputes(req, '1', '10');
    expect(service.getRegistryDisputes).toHaveBeenCalledWith('u1', 1, 10);
  });

  it('getRegistryComplaints', async () => {
    await controller.getRegistryComplaints(req, '2', '20');
    expect(service.getRegistryComplaints).toHaveBeenCalledWith('u1', 2, 20);
  });

  it('getStats', async () => {
    await controller.getStats(req);
    expect(service.getStats).toHaveBeenCalledWith('u1');
  });
});
