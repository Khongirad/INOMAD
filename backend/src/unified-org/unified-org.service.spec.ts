import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedOrgService } from './unified-org.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';

describe('UnifiedOrgService', () => {
  let service: UnifiedOrgService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organization: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      organizationMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      orgPermission: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      orgBankAccount: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      orgContract: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      organizationRating: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      myangad: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      tumed: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      zun: {
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      republicanKhural: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      confederativeKhural: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      familyArbad: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn().mockImplementation((cbOrArr: any, _opts?: any) => {
        if (typeof cbOrArr === 'function') return cbOrArr(prisma);
        return Promise.all(cbOrArr.map((q: any) => q));
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedOrgService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UnifiedOrgService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // =============================================================
  // ORGANIZATION CRUD
  // =============================================================

  describe('createOrganization', () => {
    it('creates org with bank account and permissions', async () => {
      const mockOrg = { id: 'org1', name: 'Test Org', members: [] };
      prisma.organization.create.mockResolvedValue(mockOrg);
      prisma.orgPermission.createMany.mockResolvedValue({ count: 7 });
      prisma.orgBankAccount.create.mockResolvedValue({ id: 'ba1', accountNumber: 'ORG-ORG1-001' });

      const result = await service.createOrganization('leader1', {
        name: 'Test Org',
        type: 'GUILD' as any,
        description: 'A test org',
      });
      expect(result.id).toBe('org1');
      expect(result.bankAccount).toBeDefined();
      expect(prisma.orgPermission.createMany).toHaveBeenCalled();
    });
  });

  describe('getOrganizationDashboard', () => {
    it('returns full dashboard data', async () => {
      const mockOrg = {
        id: 'org1',
        members: [{ role: 'LEADER' }, { role: 'MEMBER' }, { role: 'MEMBER' }],
        children: [{ id: 'c1' }],
        maxMembers: 10,
      };
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.orgPermission.findMany.mockResolvedValue([]);

      const result = await service.getOrganizationDashboard('org1');
      expect(result.memberCount).toBe(3);
      expect(result.childCount).toBe(1);
      expect(result.isFull).toBe(false);
      expect(result.roleDistribution).toEqual({ LEADER: 1, MEMBER: 2 });
    });

    it('throws if org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getOrganizationDashboard('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrganization', () => {
    it('updates org after permission check', async () => {
      // Setup requirePermission to pass
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'LEADER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canEditOrgInfo: true });
      prisma.organization.update.mockResolvedValue({ id: 'org1', name: 'Updated' });

      const result = await service.updateOrganization('org1', 'leader1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws ForbiddenException without permission', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      await expect(
        service.updateOrganization('org1', 'nobody', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =============================================================
  // MEMBER MANAGEMENT
  // =============================================================

  describe('addMember', () => {
    beforeEach(() => {
      prisma.organizationMember.findUnique.mockImplementation((args: any) => {
        // First call is requirePermission (returns member), second is exists check (returns null)
        if (args.where.organizationId_userId?.userId === 'requester') {
          return { role: 'LEADER' };
        }
        return null; // new user not yet member
      });
      prisma.orgPermission.findUnique.mockResolvedValue({ canInviteMembers: true });
    });

    it('adds member to org', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Org', maxMembers: 10, members: [] });
      prisma.organizationMember.create.mockResolvedValue({ userId: 'newUser', role: 'MEMBER' });
      prisma.notification.create.mockResolvedValue({});

      const result = await service.addMember('org1', 'requester', { userId: 'newUser' });
      expect(result.userId).toBe('newUser');
    });

    it('throws if org full', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org1', name: 'Org', maxMembers: 2, members: [{}, {}],
      });
      await expect(
        service.addMember('org1', 'requester', { userId: 'newUser' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        service.addMember('org1', 'requester', { userId: 'newUser' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if user already a member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Org', maxMembers: 10, members: [] });
      // Override to return existing for the second call
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
      await expect(
        service.addMember('org1', 'requester', { userId: 'existingUser' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeMember', () => {
    beforeEach(() => {
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'LEADER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canRemoveMembers: true });
    });

    it('removes member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Org', leaderId: 'leader1' });
      prisma.organizationMember.delete.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.removeMember('org1', 'leader1', 'member1');
      expect(result.success).toBe(true);
      expect(result.removedUserId).toBe('member1');
    });

    it('throws if trying to remove leader', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Org', leaderId: 'leader1' });
      await expect(
        service.removeMember('org1', 'leader1', 'leader1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changeMemberRole', () => {
    beforeEach(() => {
      prisma.organizationMember.findUnique.mockImplementation((args: any) => {
        if (args.where.organizationId_userId) return { id: 'm1', role: 'MEMBER' };
        return { role: 'LEADER' }; // for requirePermission
      });
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageRoles: true });
    });

    it('changes member role', async () => {
      prisma.organizationMember.update.mockResolvedValue({ userId: 'u1', role: 'OFFICER' });
      prisma.notification.create.mockResolvedValue({});

      const result = await service.changeMemberRole('org1', 'leader1', {
        userId: 'u1', newRole: 'OFFICER' as any,
      });
      expect(result.role).toBe('OFFICER');
    });

    it('throws if changing leader role', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({ id: 'm1', role: MemberRole.LEADER });
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageRoles: true });

      await expect(
        service.changeMemberRole('org1', 'leader1', { userId: 'u1', newRole: 'OFFICER' as any }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws if promoting to LEADER', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({ id: 'm1', role: 'MEMBER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageRoles: true });

      await expect(
        service.changeMemberRole('org1', 'leader1', { userId: 'u1', newRole: MemberRole.LEADER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws if member not found', async () => {
      prisma.organizationMember.findUnique.mockImplementation((args: any) => {
        if (args.where.organizationId_userId?.userId === 'leader1') return { role: 'LEADER' };
        return null; // target not found
      });
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageRoles: true });

      await expect(
        service.changeMemberRole('org1', 'leader1', { userId: 'nobody', newRole: 'OFFICER' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transferLeadership', () => {
    it('transfers leadership', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', leaderId: 'leader1' });
      prisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const result = await service.transferLeadership('org1', 'leader1', 'newLeader');
      expect(result.success).toBe(true);
      expect(result.newLeaderId).toBe('newLeader');
    });

    it('throws if org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        service.transferLeadership('org1', 'leader1', 'newLeader'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if not current leader', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', leaderId: 'realLeader' });
      await expect(
        service.transferLeadership('org1', 'fakeLeader', 'newLeader'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listMembers', () => {
    it('lists members', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([{ userId: 'u1' }]);
      const result = await service.listMembers('org1');
      expect(result).toHaveLength(1);
    });
  });

  // =============================================================
  // PERMISSIONS
  // =============================================================

  describe('createDefaultPermissions', () => {
    it('creates 7 role permissions', async () => {
      prisma.orgPermission.createMany.mockResolvedValue({ count: 7 });
      await service.createDefaultPermissions('org1');
      expect(prisma.orgPermission.createMany).toHaveBeenCalled();
      const data = prisma.orgPermission.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(7);
    });
  });

  describe('getPermissions', () => {
    it('gets permissions for org', async () => {
      prisma.orgPermission.findMany.mockResolvedValue([{ role: 'LEADER' }]);
      const result = await service.getPermissions('org1');
      expect(result).toHaveLength(1);
    });
  });

  describe('setPermissions', () => {
    it('upserts permissions after check', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'LEADER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageRoles: true });
      prisma.orgPermission.upsert.mockResolvedValue({ role: 'MEMBER', canVote: true });

      const result = await service.setPermissions('org1', 'leader1', {
        role: 'MEMBER' as any, canVote: true,
      });
      expect(result.canVote).toBe(true);
    });
  });

  // =============================================================
  // HIERARCHY
  // =============================================================

  describe('createMyangad', () => {
    it('creates myangad', async () => {
      prisma.myangad.create.mockResolvedValue({ id: 'm1', name: 'Myangad1', memberZuns: [] });
      const result = await service.createMyangad({ name: 'Myangad1', region: 'North' });
      expect(result.name).toBe('Myangad1');
    });
  });

  describe('assignZunToMyangad', () => {
    it('assigns zun via Serializable $transaction', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'm1' }]); // FOR UPDATE lock
      prisma.zun.count.mockResolvedValue(5); // 5/10 — not full
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', myangadId: null }); // unassigned
      prisma.zun.update.mockResolvedValue({ id: 'z1', myangadId: 'm1' });

      const result = await service.assignZunToMyangad('z1', 'm1');
      expect(result.myangadId).toBe('m1');
    });

    it('throws NotFoundException if myangad not found by FOR UPDATE', async () => {
      prisma.$queryRaw.mockResolvedValue([]); // empty = not found
      await expect(service.assignZunToMyangad('z1', 'm-bad')).rejects.toThrow(NotFoundException);
    });

    it('throws if myangad full (10 zuns)', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'm1' }]);
      prisma.zun.count.mockResolvedValue(10);
      await expect(service.assignZunToMyangad('z1', 'm1')).rejects.toThrow(BadRequestException);
    });

    it('throws if zun already assigned', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'm1' }]);
      prisma.zun.count.mockResolvedValue(5);
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', myangadId: 'm-other' });
      await expect(service.assignZunToMyangad('z1', 'm1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTumed', () => {
    it('creates tumed', async () => {
      prisma.tumed.create.mockResolvedValue({ id: 't1', name: 'Tumed1', memberMyangads: [] });
      const result = await service.createTumed({ name: 'Tumed1', region: 'East' });
      expect(result.name).toBe('Tumed1');
    });
  });

  describe('assignMyangadToTumed', () => {
    it('assigns myangad via Serializable $transaction', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1' }]); // FOR UPDATE lock
      prisma.myangad.count.mockResolvedValue(5); // 5/10 — not full
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', tumedId: null }); // unassigned
      prisma.myangad.update.mockResolvedValue({ id: 'm1', tumedId: 't1' });

      const result = await service.assignMyangadToTumed('m1', 't1');
      expect(result.tumedId).toBe('t1');
    });

    it('throws NotFoundException if tumed not found by FOR UPDATE', async () => {
      prisma.$queryRaw.mockResolvedValue([]); // empty = not found
      await expect(service.assignMyangadToTumed('m1', 't-bad')).rejects.toThrow(NotFoundException);
    });

    it('throws if tumed full (10 myangads)', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1' }]);
      prisma.myangad.count.mockResolvedValue(10);
      await expect(service.assignMyangadToTumed('m1', 't1')).rejects.toThrow(BadRequestException);
    });

    it('throws if myangad already assigned', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 't1' }]);
      prisma.myangad.count.mockResolvedValue(5);
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', tumedId: 't-other' });
      await expect(service.assignMyangadToTumed('m1', 't1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createRepublic', () => {
    it('creates republic', async () => {
      prisma.republicanKhural.create.mockResolvedValue({ id: 'r1', name: 'Republic1', memberTumeds: [] });
      const result = await service.createRepublic({ name: 'Republic1', republicKey: 'REP1' });
      expect(result.name).toBe('Republic1');
    });
  });

  describe('getHierarchyTree', () => {
    it('returns hierarchy with standalone entities', async () => {
      prisma.confederativeKhural.findFirst.mockResolvedValue({ id: 'conf1', memberRepublics: [] });
      prisma.republicanKhural.findMany.mockResolvedValue([]);
      prisma.tumed.findMany.mockResolvedValue([]);
      prisma.myangad.findMany.mockResolvedValue([]);
      prisma.zun.findMany.mockResolvedValue([{ id: 'z1' }]);

      const result = await service.getHierarchyTree() as any;
      expect(result.confederation).toBeDefined();
      expect(result.standalone.zuns).toHaveLength(1);
    });
  });

  // =============================================================
  // SEARCH & LISTING
  // =============================================================

  describe('listOrganizations', () => {
    it('lists with default pagination', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 'o1' }], 1]);
      const result = await service.listOrganizations();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
    });

    it('lists with type and search filter', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.listOrganizations({
        type: 'GUILD' as any,
        search: 'builders',
        page: 2,
        limit: 10,
      });
      expect(result.pagination.page).toBe(2);
    });

    it('lists with branch and republic filter', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.listOrganizations({
        branch: 'LEGISLATIVE' as any,
        republic: 'REP1',
      });
      expect(result.data).toEqual([]);
    });
  });

  describe('getLeaderboard', () => {
    it('gets leaderboard without type filter', async () => {
      prisma.organization.findMany.mockResolvedValue([{ id: 'o1', overallRating: 9 }]);
      const result = await service.getLeaderboard();
      expect(result).toHaveLength(1);
    });

    it('gets leaderboard with type filter', async () => {
      prisma.organization.findMany.mockResolvedValue([]);
      const result = await service.getLeaderboard('GUILD' as any, 10);
      expect(result).toEqual([]);
    });
  });

  // =============================================================
  // RATING SYSTEM
  // =============================================================

  describe('rateOrganization', () => {
    it('rates org and recalculates', async () => {
      prisma.organizationRating.create.mockResolvedValue({ id: 'r1', score: 8 });
      prisma.organizationRating.findMany.mockResolvedValue([
        { category: 'TRUST', score: 8 },
        { category: 'QUALITY', score: 7 },
        { category: 'FINANCIAL', score: 6 },
      ]);
      prisma.organization.update.mockResolvedValue({});

      const result = await service.rateOrganization('org1', 'rater1', 'TRUST' as any, 8, 'Great');
      expect(result.score).toBe(8);
      expect(prisma.organization.update).toHaveBeenCalled();
    });

    it('throws for score below 1', async () => {
      await expect(
        service.rateOrganization('org1', 'rater1', 'TRUST' as any, 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws for score above 10', async () => {
      await expect(
        service.rateOrganization('org1', 'rater1', 'TRUST' as any, 11),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles recalculate with no ratings gracefully', async () => {
      prisma.organizationRating.create.mockResolvedValue({ id: 'r1', score: 5 });
      prisma.organizationRating.findMany.mockResolvedValue([]);

      await service.rateOrganization('org1', 'rater1', 'TRUST' as any, 5);
      // Should not call update if no ratings
      expect(prisma.organization.update).not.toHaveBeenCalled();
    });
  });

  // =============================================================
  // BRANCH MEMBERSHIP VALIDATION
  // =============================================================

  describe('validateBranchMembership', () => {
    it('skips validation for NONE branch', async () => {
      await service.validateBranchMembership('u1', 'NONE' as any);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('allows legislative member who is spouse', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', dateOfBirth: null });
      prisma.familyArbad.findFirst.mockResolvedValue({ husbandSeatId: 'u1' });

      await expect(
        service.validateBranchMembership('u1', 'LEGISLATIVE' as any),
      ).resolves.not.toThrow();
    });

    it('rejects legislative member without family', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', dateOfBirth: null });
      prisma.familyArbad.findFirst.mockResolvedValue(null);

      await expect(
        service.validateBranchMembership('u1', 'LEGISLATIVE' as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows executive member with family', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', dateOfBirth: null });
      prisma.familyArbad.findFirst.mockResolvedValue({ wifeSeatId: 'u1' });

      await expect(
        service.validateBranchMembership('u1', 'EXECUTIVE' as any),
      ).resolves.not.toThrow();
    });

    it('allows executive single adult 18+', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 20); // 20 years old
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', dateOfBirth: dob });
      prisma.familyArbad.findFirst.mockResolvedValue(null);

      await expect(
        service.validateBranchMembership('u1', 'EXECUTIVE' as any),
      ).resolves.not.toThrow();
    });

    it('rejects executive single minor', async () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 16); // 16 years old
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', dateOfBirth: dob });
      prisma.familyArbad.findFirst.mockResolvedValue(null);

      await expect(
        service.validateBranchMembership('u1', 'EXECUTIVE' as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects if no dateOfBirth for non-family single user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', dateOfBirth: null });
      prisma.familyArbad.findFirst.mockResolvedValue(null);

      await expect(
        service.validateBranchMembership('u1', 'JUDICIAL' as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.validateBranchMembership('bad', 'EXECUTIVE' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =============================================================
  // ORGANIZATION BANKING
  // =============================================================

  describe('createOrgBankAccount', () => {
    beforeEach(() => {
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'LEADER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageTreasury: true });
    });

    it('creates bank account', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', powerBranch: 'EXECUTIVE' });
      prisma.orgBankAccount.findFirst.mockResolvedValue(null);
      prisma.orgBankAccount.create.mockResolvedValue({ id: 'ba1', accountType: 'OPERATING' });

      const result = await service.createOrgBankAccount('org1', 'leader1', { accountName: 'Main' });
      expect(result.id).toBe('ba1');
    });

    it('sets 2 signatures for SHARED_VAULT', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', powerBranch: null });
      prisma.orgBankAccount.findFirst.mockResolvedValue(null);
      prisma.orgBankAccount.create.mockResolvedValue({ id: 'ba1', accountType: 'SHARED_VAULT' });

      await service.createOrgBankAccount('org1', 'leader1', {
        accountName: 'Vault', accountType: 'SHARED_VAULT',
      });
      const createData = prisma.orgBankAccount.create.mock.calls[0][0].data;
      expect(createData.clientSignaturesRequired).toBe(2);
    });

    it('throws if org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        service.createOrgBankAccount('org1', 'leader1', { accountName: 'Main' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if account type already exists', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', powerBranch: 'EXECUTIVE' });
      prisma.orgBankAccount.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createOrgBankAccount('org1', 'leader1', { accountName: 'Main' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listOrgBankAccounts', () => {
    it('lists active accounts', async () => {
      prisma.orgBankAccount.findMany.mockResolvedValue([{ id: 'ba1' }]);
      const result = await service.listOrgBankAccounts('org1');
      expect(result).toHaveLength(1);
    });
  });

  // =============================================================
  // ORGANIZATION CONTRACTS
  // =============================================================

  describe('createOrgContract', () => {
    it('creates a contract', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'LEADER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canSignDocuments: true });
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', powerBranch: 'EXECUTIVE' });
      prisma.orgContract.create.mockResolvedValue({ id: 'c1', title: 'Contract A' });

      const result = await service.createOrgContract('org1', 'leader1', { title: 'Contract A' });
      expect(result.title).toBe('Contract A');
    });

    it('throws if org not found', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'LEADER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canSignDocuments: true });
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrgContract('org1', 'leader1', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listOrgContracts', () => {
    it('lists contracts without status filter', async () => {
      prisma.orgContract.findMany.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.listOrgContracts('org1');
      expect(result).toHaveLength(1);
    });

    it('lists contracts with status filter', async () => {
      prisma.orgContract.findMany.mockResolvedValue([]);
      const result = await service.listOrgContracts('org1', 'ACTIVE');
      expect(result).toEqual([]);
    });
  });
});
