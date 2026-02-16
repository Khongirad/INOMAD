import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: any;

  const mockOrg = {
    id: 'org1', name: 'Test Org', type: 'EXECUTIVE', leaderId: 'u1',
    level: 1, maxMembers: 10, contractsCompleted: 5, contractsActive: 1,
    totalRevenue: 1000, treasury: 500, totalEarned: 1000, overallRating: 7.5,
    currentRank: 1,
    leader: { id: 'u1', username: 'leader' },
    members: [
      { id: 'm1', userId: 'u1', leftAt: null, role: 'LEADER' },
    ],
    ratings: [],
    achievements: [],
    parent: null,
    children: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1', role: 'CITIZEN', ethnicity: 'Buryad-Mongol',
        }),
      },
      organization: {
        create: jest.fn().mockResolvedValue(mockOrg),
        findUnique: jest.fn().mockResolvedValue(mockOrg),
        findMany: jest.fn().mockResolvedValue([mockOrg]),
        update: jest.fn().mockResolvedValue(mockOrg),
        delete: jest.fn().mockResolvedValue(mockOrg),
        aggregate: jest.fn().mockResolvedValue({ _avg: { totalRevenue: 1000 } }),
      },
      organizationMember: {
        create: jest.fn().mockResolvedValue({ id: 'm2', userId: 'u2', user: { id: 'u2' } }),
        findFirst: jest.fn().mockResolvedValue({ id: 'm1', userId: 'u1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      organizationRating: {
        create: jest.fn().mockResolvedValue({ id: 'r1', score: 8 }),
      },
      organizationAchievement: {
        create: jest.fn().mockResolvedValue({}),
      },
      arbanNetwork: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(OrganizationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createOrganization', () => {
    it('creates org', async () => {
      const r = await service.createOrganization({
        name: 'Test', type: 'EXECUTIVE' as any, leaderId: 'u1', level: 1,
      });
      expect(r.id).toBe('org1');
    });
    it('throws when leader not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createOrganization({
        name: 'Test', type: 'EXECUTIVE' as any, leaderId: 'bad', level: 1,
      })).rejects.toThrow('not found');
    });
  });

  describe('getOrganization', () => {
    it('returns org', async () => {
      const r = await service.getOrganization('org1');
      expect(r.id).toBe('org1');
    });
    it('throws when not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getOrganization('bad')).rejects.toThrow('not found');
    });
  });

  describe('updateOrganization', () => {
    it('updates org', async () => {
      const r = await service.updateOrganization('org1', { name: 'New Name' });
      expect(r).toBeDefined();
    });
  });

  describe('deleteOrganization', () => {
    it('deletes org', async () => {
      const r = await service.deleteOrganization('org1');
      expect(r).toBeDefined();
    });
  });

  describe('addMember', () => {
    it('adds member', async () => {
      // Org with no existing member for u2
      prisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        members: [{ id: 'm1', userId: 'u1', leftAt: null }],
      });
      const r = await service.addMember('org1', 'u2');
      expect(prisma.organizationMember.create).toHaveBeenCalled();
    });
    it('throws when already member', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        members: [{ id: 'm1', userId: 'u2', leftAt: null }],
      });
      await expect(service.addMember('org1', 'u2')).rejects.toThrow('already a member');
    });
    it('throws when at max capacity', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        maxMembers: 1,
        members: [{ id: 'm1', userId: 'u1', leftAt: null }],
      });
      await expect(service.addMember('org1', 'u2')).rejects.toThrow('maximum capacity');
    });
    it('throws when org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.addMember('bad', 'u2')).rejects.toThrow('not found');
    });
  });

  describe('removeMember', () => {
    it('removes member', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u2' });
      await service.removeMember('org1', 'u2');
      expect(prisma.organizationMember.update).toHaveBeenCalled();
    });
    it('throws when member not found', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.removeMember('org1', 'bad')).rejects.toThrow('not found');
    });
  });

  describe('transferLeadership', () => {
    it('transfers leadership', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ id: 'm2', userId: 'u2' });
      await service.transferLeadership('org1', 'u2');
      expect(prisma.organization.update).toHaveBeenCalled();
    });
    it('throws when not a member', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.transferLeadership('org1', 'bad')).rejects.toThrow('existing member');
    });
  });

  describe('rateOrganization', () => {
    it('rates org', async () => {
      const r = await service.rateOrganization('org1', 'u2', 'TRUST' as any, 8);
      expect(r.id).toBe('r1');
    });
    it('throws when score out of range', async () => {
      await expect(service.rateOrganization('org1', 'u2', 'TRUST' as any, 11)).rejects.toThrow('between 1 and 10');
    });
  });

  describe('recalculateRatings', () => {
    it('recalculates', async () => {
      await service.recalculateRatings('org1');
      expect(prisma.organization.update).toHaveBeenCalled();
    });
    it('does nothing when org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await service.recalculateRatings('bad');
    });
  });

  describe('getAvgRevenueForType (private)', () => {
    it('returns avg', async () => {
      const r = await (service as any).getAvgRevenueForType('EXECUTIVE' as any);
      expect(r).toBe(1000);
    });
  });

  describe('calculateRankings', () => {
    it('calculates rankings', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org1', currentRank: 1 },
      ]);
      await service.calculateRankings();
      expect(prisma.organization.update).toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('returns leaderboard', async () => {
      const r = await service.getLeaderboard();
      expect(r).toBeDefined();
    });
    it('returns filtered leaderboard', async () => {
      const r = await service.getLeaderboard('EXECUTIVE' as any, 10);
      expect(r).toBeDefined();
    });
  });

  describe('addRevenue', () => {
    it('adds revenue', async () => {
      await service.addRevenue('org1', 500, 'test');
      expect(prisma.organization.update).toHaveBeenCalled();
    });
    it('throws when org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.addRevenue('bad', 500, 'test')).rejects.toThrow('not found');
    });
  });

  describe('validateLegislativeAccess (private)', () => {
    it('allows user with matching ethnicity', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', role: 'CITIZEN', ethnicity: 'Buryad-Mongol',
      });
      await (service as any).validateLegislativeAccess('u1', 'buryad-mongol');
    });
    it('throws when ethnicity mismatch', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', role: 'CITIZEN', ethnicity: 'Other',
      });
      await expect((service as any).validateLegislativeAccess('u1', 'buryad-mongol')).rejects.toThrow('exclusive');
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect((service as any).validateLegislativeAccess('bad')).rejects.toThrow('not found');
    });
  });

  describe('getArbanNetwork', () => {
    it('returns network', async () => {
      const r = await service.getArbanNetwork('a1');
      expect(r).toBeNull();
    });
  });

  describe('getFullNetworkMap', () => {
    it('returns empty map', async () => {
      const r = await service.getFullNetworkMap();
      expect(r.nodes).toEqual([]);
      expect(r.links).toEqual([]);
    });

    it('returns map with nodes and links', async () => {
      prisma.arbanNetwork.findMany.mockResolvedValue([
        {
          arbanId: 'a1',
          arban: { name: 'Arban 1', type: 'FAMILY', overallRating: '8.5', leader: {} },
          layer: 1, positionX: 10, positionY: 20,
          clusterColor: '#FF0000', importance: 5,
          connectedTo: ['a2'],
        },
        {
          arbanId: 'a2',
          arban: { name: 'Arban 2', type: 'ORGANIZATIONAL', overallRating: '7.0', leader: {} },
          layer: 1, positionX: 30, positionY: 40,
          clusterColor: '#00FF00', importance: 3,
          connectedTo: [],
        },
      ]);
      const r = await service.getFullNetworkMap();
      expect(r.nodes).toHaveLength(2);
      expect(r.links).toHaveLength(1);
      expect(r.links[0].source).toBe('a1');
      expect(r.links[0].target).toBe('a2');
    });
  });

  // ─── awardTopPerformers ─────────────────
  describe('awardTopPerformers (private)', () => {
    it('awards rank 1 performer', async () => {
      const topOrgs = [{ id: 'org1' }];
      await (service as any).awardTopPerformers(topOrgs);
      expect(prisma.organizationAchievement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rank: 1, rewardAltan: 100000 }),
        }),
      );
    });

    it('awards top 10 performer', async () => {
      const topOrgs = Array.from({ length: 5 }, (_, i) => ({ id: `org${i + 1}` }));
      await (service as any).awardTopPerformers(topOrgs);
      // Rank 1 gets 100000, ranks 2-5 get 50000
      expect(prisma.organizationAchievement.create).toHaveBeenCalledTimes(5);
    });

    it('skips org beyond rank 100', async () => {
      const topOrgs = Array.from({ length: 101 }, (_, i) => ({ id: `org${i + 1}` }));
      prisma.organization.findUnique.mockResolvedValue(mockOrg); // for addRevenue
      await (service as any).awardTopPerformers(topOrgs);
      // 1 (rank 1) + 9 (rank 2-10) + 40 (rank 11-50) + 50 (rank 51-100) = 100
      expect(prisma.organizationAchievement.create).toHaveBeenCalledTimes(100);
    });
  });

  // ─── rateOrganization edge cases ────────
  describe('rateOrganization edge cases', () => {
    it('throws when score below range', async () => {
      await expect(service.rateOrganization('org1', 'u2', 'TRUST' as any, 0))
        .rejects.toThrow('between 1 and 10');
    });
  });

  // ─── validateLegislativeAccess without republic ──
  describe('validateLegislativeAccess without republic', () => {
    it('allows access when no republic specified', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN', ethnicity: 'Any' });
      await (service as any).validateLegislativeAccess('u1');
      // should not throw
    });
  });

  // ─── calculateRankings edge cases ────────
  describe('calculateRankings edge cases', () => {
    it('handles multiple orgs with different scores', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org1', currentRank: 0 },
        { id: 'org2', currentRank: 0 },
      ]);
      await service.calculateRankings();
      // Should be called with rank updates for both orgs
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org1' },
          data: expect.objectContaining({ currentRank: 1 }),
        }),
      );
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org2' },
          data: expect.objectContaining({ currentRank: 2 }),
        }),
      );
    });
  });
});

