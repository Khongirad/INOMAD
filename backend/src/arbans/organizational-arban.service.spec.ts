import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationalArbanService } from './organizational-arban.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';

describe('OrganizationalArbanService', () => {
  let service: OrganizationalArbanService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organizationalArban: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      orgArbanMember: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn() },
    };
    const allocation = { allocateLevel2: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationalArbanService,
        { provide: PrismaService, useValue: prisma },
        { provide: CitizenAllocationService, useValue: allocation },
      ],
    }).compile();
    service = module.get<OrganizationalArbanService>(OrganizationalArbanService);
  });

  it('getOrgArban returns org', async () => {
    prisma.organizationalArban.findUnique.mockResolvedValue({ id: 1, arbanId: 1, name: 'Test Org', members: [{ seatId: 'S1' }], leaderSeatId: 'S1', orgType: 'GUILD', powerBranch: 'EXECUTIVE', hierarchyLevel: 'LEVEL_10', isActive: true, parentId: null });
    const r = await service.getOrgArban(1);
    expect(r.name).toBe('Test Org');
  });

  it('getOrgsByType returns list', async () => {
    const r = await service.getOrgsByType('GUILD' as any);
    expect(prisma.organizationalArban.findMany).toHaveBeenCalled();
  });
});
