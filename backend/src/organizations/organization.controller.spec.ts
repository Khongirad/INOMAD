import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      createOrganization: jest.fn().mockResolvedValue({ id: 'org1' }),
      getLeaderboard: jest.fn().mockResolvedValue([]),
      getFullNetworkMap: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getArbadNetwork: jest.fn().mockResolvedValue({ nodes: [] }),
      getOrganization: jest.fn().mockResolvedValue({ id: 'org1', ratings: [{ score: 5 }] }),
      updateOrganization: jest.fn().mockResolvedValue({ id: 'org1' }),
      deleteOrganization: jest.fn().mockResolvedValue({ id: 'org1' }),
      addMember: jest.fn().mockResolvedValue({ id: 'm1' }),
      removeMember: jest.fn().mockResolvedValue({ id: 'm1' }),
      transferLeadership: jest.fn().mockResolvedValue({ id: 'org1' }),
      rateOrganization: jest.fn().mockResolvedValue({ id: 'r1' }),
      addRevenue: jest.fn().mockResolvedValue({ id: 'rev1' }),
    };
    const module = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [{ provide: OrganizationService, useValue: mockService }],
    }).compile();
    controller = module.get(OrganizationController);
    service = module.get(OrganizationService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('creates org', async () => { await controller.create({ name: 'Org', type: 'COMPANY' as any, leaderId: 'u1', level: 1 }); });
  it('gets leaderboard', async () => { await controller.getLeaderboard('COMPANY' as any, '10'); });
  it('gets leaderboard without filters', async () => { await controller.getLeaderboard(); });
  it('gets network map', async () => { await controller.getNetworkMap(); });
  it('gets arbad network', async () => { await controller.getArbadNetwork('a1'); });
  it('gets org by id', async () => { await controller.get('org1'); });
  it('updates org', async () => { await controller.update('org1', { name: 'New' }); });
  it('deletes org', async () => { await controller.delete('org1'); });
  it('adds member', async () => { await controller.addMember('org1', { userId: 'u2' }); });
  it('removes member', async () => { await controller.removeMember('org1', 'u2'); });
  it('transfers leadership', async () => { await controller.transferLeadership('org1', { newLeaderId: 'u2' }); });
  it('rates org', async () => {
    await controller.rate('org1', { raterId: 'u1', category: 'SERVICE_QUALITY' as any, score: 5 });
  });
  it('gets ratings', async () => {
    const r = await controller.getRatings('org1');
    expect(r.length).toBe(1);
  });
  it('adds revenue', async () => { await controller.addRevenue('org1', { amount: 1000, source: 'sales' }); });
});
