import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedOrgController } from './unified-org.controller';
import { UnifiedOrgService } from './unified-org.service';
import { AuthGuard } from '../auth/auth.guard';

describe('UnifiedOrgController', () => {
  let controller: UnifiedOrgController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createOrganization: jest.fn().mockResolvedValue({ id: 'org1' }),
      listOrganizations: jest.fn().mockResolvedValue({ items: [] }),
      getLeaderboard: jest.fn().mockResolvedValue([]),
      getHierarchyTree: jest.fn().mockResolvedValue({}),
      getOrganizationDashboard: jest.fn().mockResolvedValue({ id: 'org1' }),
      updateOrganization: jest.fn().mockResolvedValue({ updated: true }),
      listMembers: jest.fn().mockResolvedValue([]),
      addMember: jest.fn().mockResolvedValue({ added: true }),
      removeMember: jest.fn().mockResolvedValue({ removed: true }),
      changeMemberRole: jest.fn().mockResolvedValue({ changed: true }),
      transferLeadership: jest.fn().mockResolvedValue({ transferred: true }),
      getPermissions: jest.fn().mockResolvedValue({}),
      setPermissions: jest.fn().mockResolvedValue({ set: true }),
      rateOrganization: jest.fn().mockResolvedValue({ rated: true }),
      createMyangan: jest.fn().mockResolvedValue({ id: 'm1' }),
      assignZunToMyangan: jest.fn().mockResolvedValue({ assigned: true }),
      createTumen: jest.fn().mockResolvedValue({ id: 't1' }),
      assignMyanganToTumen: jest.fn().mockResolvedValue({ assigned: true }),
      createRepublic: jest.fn().mockResolvedValue({ id: 'r1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnifiedOrgController],
      providers: [{ provide: UnifiedOrgService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(UnifiedOrgController);
    service = module.get(UnifiedOrgService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('createOrganization', async () => { await controller.createOrganization(req, {} as any); expect(service.createOrganization).toHaveBeenCalledWith('u1', {}); });
  it('listOrganizations', async () => { await controller.listOrganizations(undefined, undefined, undefined, undefined, '1', '10'); expect(service.listOrganizations).toHaveBeenCalled(); });
  it('listOrganizations defaults', async () => { await controller.listOrganizations(); expect(service.listOrganizations).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 })); });
  it('getLeaderboard', async () => { await controller.getLeaderboard(undefined, '10'); expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, 10); });
  it('getHierarchyTree', async () => { await controller.getHierarchyTree(); expect(service.getHierarchyTree).toHaveBeenCalled(); });
  it('getOrganization', async () => { await controller.getOrganization('org1'); expect(service.getOrganizationDashboard).toHaveBeenCalledWith('org1'); });
  it('updateOrganization', async () => { await controller.updateOrganization('org1', req, {} as any); expect(service.updateOrganization).toHaveBeenCalledWith('org1', 'u1', {}); });
  it('listMembers', async () => { await controller.listMembers('org1'); expect(service.listMembers).toHaveBeenCalledWith('org1'); });
  it('addMember', async () => { await controller.addMember('org1', req, {} as any); expect(service.addMember).toHaveBeenCalledWith('org1', 'u1', {}); });
  it('removeMember', async () => { await controller.removeMember('org1', 'u2', req); expect(service.removeMember).toHaveBeenCalledWith('org1', 'u1', 'u2'); });
  it('changeMemberRole', async () => { await controller.changeMemberRole('org1', req, {} as any); expect(service.changeMemberRole).toHaveBeenCalledWith('org1', 'u1', {}); });
  it('transferLeadership', async () => { await controller.transferLeadership('org1', req, 'u2'); expect(service.transferLeadership).toHaveBeenCalledWith('org1', 'u1', 'u2'); });
  it('getPermissions', async () => { await controller.getPermissions('org1'); expect(service.getPermissions).toHaveBeenCalledWith('org1'); });
  it('setPermissions', async () => { await controller.setPermissions('org1', req, {} as any); expect(service.setPermissions).toHaveBeenCalledWith('org1', 'u1', {}); });
  it('rateOrganization', async () => { await controller.rateOrganization('org1', req, { category: 'SERVICE' as any, score: 5 } as any); expect(service.rateOrganization).toHaveBeenCalled(); });
  it('createMyangan', async () => { await controller.createMyangan({} as any); expect(service.createMyangan).toHaveBeenCalled(); });
  it('assignZunToMyangan', async () => { await controller.assignZunToMyangan('m1', 'z1'); expect(service.assignZunToMyangan).toHaveBeenCalledWith('z1', 'm1'); });
  it('createTumen', async () => { await controller.createTumen({} as any); expect(service.createTumen).toHaveBeenCalled(); });
  it('assignMyanganToTumen', async () => { await controller.assignMyanganToTumen('t1', 'm1'); expect(service.assignMyanganToTumen).toHaveBeenCalledWith('m1', 't1'); });
  it('createRepublic', async () => { await controller.createRepublic({} as any); expect(service.createRepublic).toHaveBeenCalled(); });
});
