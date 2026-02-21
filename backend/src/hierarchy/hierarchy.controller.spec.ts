import { Test, TestingModule } from '@nestjs/testing';
import { HierarchyController } from './hierarchy.controller';
import { HierarchyService } from './hierarchy.service';
import { AuthGuard } from '../auth/auth.guard';

describe('HierarchyController', () => {
  let controller: HierarchyController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getHierarchyTree: jest.fn().mockResolvedValue({}),
      listZuns: jest.fn().mockResolvedValue([]),
      getZun: jest.fn().mockResolvedValue({ id: 'z1' }),
      joinZun: jest.fn().mockResolvedValue({ joined: true }),
      leaveZun: jest.fn().mockResolvedValue({ left: true }),
      listMyangads: jest.fn().mockResolvedValue([]),
      getMyangad: jest.fn().mockResolvedValue({ id: 'm1' }),
      joinMyangad: jest.fn().mockResolvedValue({ joined: true }),
      listTumeds: jest.fn().mockResolvedValue([]),
      getTumed: jest.fn().mockResolvedValue({ id: 't1' }),
      joinTumed: jest.fn().mockResolvedValue({ joined: true }),
      proposeCooperation: jest.fn().mockResolvedValue({ id: 'coop1' }),
      respondToCooperation: jest.fn().mockResolvedValue({ accepted: true }),
      dissolveCooperation: jest.fn().mockResolvedValue({ dissolved: true }),
      listCooperations: jest.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HierarchyController],
      providers: [{ provide: HierarchyService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(HierarchyController);
    service = module.get(HierarchyService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getTree', async () => { await controller.getTree(); expect(service.getHierarchyTree).toHaveBeenCalled(); });
  it('listZuns', async () => { await controller.listZuns('m1'); expect(service.listZuns).toHaveBeenCalledWith('m1'); });
  it('getZun', async () => { await controller.getZun('z1'); expect(service.getZun).toHaveBeenCalledWith('z1'); });
  it('joinZun', async () => { await controller.joinZun('z1', '1'); expect(service.joinZun).toHaveBeenCalledWith(BigInt(1), 'z1'); });
  it('leaveZun', async () => { await controller.leaveZun('1'); expect(service.leaveZun).toHaveBeenCalledWith(BigInt(1)); });
  it('listMyangads', async () => { await controller.listMyangads('t1'); expect(service.listMyangads).toHaveBeenCalledWith('t1'); });
  it('getMyangad', async () => { await controller.getMyangad('m1'); expect(service.getMyangad).toHaveBeenCalledWith('m1'); });
  it('joinMyangad', async () => { await controller.joinMyangad('m1', 'z1'); expect(service.joinMyangad).toHaveBeenCalledWith('z1', 'm1'); });
  it('listTumeds', async () => { await controller.listTumeds(); expect(service.listTumeds).toHaveBeenCalled(); });
  it('getTumed', async () => { await controller.getTumed('t1'); expect(service.getTumed).toHaveBeenCalledWith('t1'); });
  it('joinTumed', async () => { await controller.joinTumed('t1', 'm1'); expect(service.joinTumed).toHaveBeenCalledWith('m1', 't1'); });
  it('proposeCooperation', async () => { await controller.proposeCooperation('t1', req, { targetTumedId: 't2', title: 'T' }); expect(service.proposeCooperation).toHaveBeenCalled(); });
  it('respondToCooperation', async () => { await controller.respondToCooperation('c1', req, true); expect(service.respondToCooperation).toHaveBeenCalledWith('c1', 'u1', true); });
  it('dissolveCooperation', async () => { await controller.dissolveCooperation('c1', req); expect(service.dissolveCooperation).toHaveBeenCalledWith('c1', 'u1'); });
  it('listCooperations', async () => { await controller.listCooperations('t1'); expect(service.listCooperations).toHaveBeenCalledWith('t1'); });
});
