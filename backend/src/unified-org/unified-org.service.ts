import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrganizationType,
  BranchType,
  MemberRole,
  RatingCategory,
  PowerBranchType,
  Prisma,
} from '@prisma/client';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  ChangeMemberRoleDto,
  SetPermissionsDto,
  CreateMyangadDto,
  CreateTumedDto,
  CreateRepublicDto,
} from './dto/unified-org.dto';

/**
 * UnifiedOrganizationService
 *
 * A facade over all 4 existing organization systems:
 * - Guild (simple guilds/clans)
 * - Organization (hierarchical orgs with ratings)
 * - OrganizationalArbad (4 branches of power)
 * - KhuralGroup (parliamentary seats)
 *
 * Provides a SINGLE standardized API for ALL organization types.
 * Every organization — from a builder's guild to the Confederate Khural —
 * is managed through the same interface.
 */
@Injectable()
export class UnifiedOrgService {
  private readonly logger = new Logger(UnifiedOrgService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // ORGANIZATION CRUD
  // ===========================================================================

  /**
   * Create a new organization with default permissions for each role
   */
  async createOrganization(leaderId: string, dto: CreateOrganizationDto) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        branch: dto.branch,
        description: dto.description,
        level: dto.level ?? 10,
        parentId: dto.parentId,
        republicId: dto.republicId,
        republic: dto.republic,
        leaderId,
        minMembers: dto.minMembers ?? 10,
        maxMembers: dto.maxMembers ?? 10,
        requiresEducation: dto.requiresEducation ?? false,
        fieldOfStudy: dto.fieldOfStudy,
        // Leader auto-joins as first member
        members: {
          create: {
            userId: leaderId,
            role: MemberRole.LEADER,
          },
        },
      },
      include: {
        leader: { select: { id: true, seatId: true, username: true } },
        members: {
          include: {
            user: { select: { id: true, seatId: true, username: true } },
          },
        },
      },
    });

    // Create default permissions for all roles
    await this.createDefaultPermissions(org.id);

    // Auto-create operating bank account for the organization
    const accountNumber = `ORG-${org.id.substring(0, 8).toUpperCase()}-001`;
    const bankAccount = await this.prisma.orgBankAccount.create({
      data: {
        organizationId: org.id,
        accountName: 'Операционный счёт',
        accountNumber,
        accountType: 'OPERATING',
        balance: 0,
        currency: 'ALTAN',
      },
    });
    this.logger.log(
      `Bank account ${accountNumber} created for org "${org.name}"`,
    );

    this.logger.log(`Organization "${org.name}" created by ${leaderId}`);
    return { ...org, bankAccount };
  }

  /**
   * Get full organization dashboard data
   */
  async getOrganizationDashboard(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        leader: { select: { id: true, seatId: true, username: true, role: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                seatId: true,
                username: true,
                role: true,
                verificationLevel: true,
                reputationProfile: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        parent: { select: { id: true, name: true, type: true } },
        children: {
          select: {
            id: true,
            name: true,
            type: true,
            overallRating: true,
            members: { select: { id: true } },
          },
        },
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            rater: { select: { id: true, seatId: true, username: true } },
          },
        },
        achievements: {
          orderBy: { awardedAt: 'desc' },
          take: 5,
        },
        elections: {
          orderBy: { startDate: 'desc' },
          take: 3,
          include: {
            candidates: {
              include: {
                candidate: { select: { id: true, seatId: true, username: true } },
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Fetch permissions for this org
    const permissions = await this.prisma.orgPermission.findMany({
      where: { organizationId: orgId },
      orderBy: { role: 'asc' },
    });

    // Compute role distribution
    const roleDistribution = org.members.reduce(
      (acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...org,
      permissions,
      roleDistribution,
      memberCount: org.members.length,
      childCount: org.children.length,
      isFull: org.members.length >= org.maxMembers,
    };
  }

  /**
   * Update organization info (Leader/Deputy only)
   */
  async updateOrganization(orgId: string, requestingUserId: string, dto: UpdateOrganizationDto) {
    await this.requirePermission(orgId, requestingUserId, 'canEditOrgInfo');

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        description: dto.description,
        republicId: dto.republicId,
        republic: dto.republic,
        minMembers: dto.minMembers,
        maxMembers: dto.maxMembers,
      },
    });
  }

  // ===========================================================================
  // MEMBER MANAGEMENT
  // ===========================================================================

  /**
   * Add a member to the organization (via invitation)
   */
  async addMember(orgId: string, requestingUserId: string, dto: AddMemberDto) {
    await this.requirePermission(orgId, requestingUserId, 'canInviteMembers');

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organization not found');
    if (org.members.length >= org.maxMembers) {
      throw new BadRequestException(`Organization is full (${org.maxMembers}/${org.maxMembers})`);
    }

    // Check not already a member
    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: dto.userId } },
    });
    if (existing) throw new BadRequestException('User is already a member');

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: dto.userId,
        role: dto.role ?? MemberRole.MEMBER,
        invitedBy: dto.invitedBy ?? requestingUserId,
      },
      include: {
        user: { select: { id: true, seatId: true, username: true } },
      },
    });

    // Send notification
    await this.notifyUser(dto.userId, {
      type: 'ORG_MEMBER_JOINED',
      title: `You joined ${org.name}`,
      body: `You have been added to ${org.name} as ${dto.role ?? 'MEMBER'}`,
      linkUrl: `/org/${orgId}`,
      sourceOrgId: orgId,
      sourceUserId: requestingUserId,
    });

    return member;
  }

  /**
   * Remove a member
   */
  async removeMember(orgId: string, requestingUserId: string, targetUserId: string) {
    await this.requirePermission(orgId, requestingUserId, 'canRemoveMembers');

    // Cannot remove leader
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (org?.leaderId === targetUserId) {
      throw new ForbiddenException('Cannot remove the leader; transfer leadership first');
    }

    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });

    await this.notifyUser(targetUserId, {
      type: 'ORG_MEMBER_LEFT',
      title: `Removed from ${org?.name}`,
      body: `You have been removed from ${org?.name}`,
      linkUrl: '/organizations',
      sourceOrgId: orgId,
      sourceUserId: requestingUserId,
    });

    return { success: true, removedUserId: targetUserId };
  }

  /**
   * Change a member's role
   */
  async changeMemberRole(orgId: string, requestingUserId: string, dto: ChangeMemberRoleDto) {
    await this.requirePermission(orgId, requestingUserId, 'canManageRoles');

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: dto.userId } },
    });
    if (!member) throw new NotFoundException('Member not found in this organization');

    // Cannot change leader's role (must transfer leadership instead)
    if (member.role === MemberRole.LEADER) {
      throw new ForbiddenException('Cannot change leader role; use transfer leadership');
    }
    // Cannot promote to LEADER (must use election or transfer)
    if (dto.newRole === MemberRole.LEADER) {
      throw new ForbiddenException('Use election or leadership transfer to appoint a leader');
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { role: dto.newRole },
      include: {
        user: { select: { id: true, seatId: true, username: true } },
      },
    });

    await this.notifyUser(dto.userId, {
      type: 'ORG_ROLE_CHANGED',
      title: 'Role Updated',
      body: `Your role has been changed to ${dto.newRole}`,
      linkUrl: `/org/${orgId}`,
      sourceOrgId: orgId,
      sourceUserId: requestingUserId,
    });

    return updated;
  }

  /**
   * Transfer leadership to another member
   */
  async transferLeadership(orgId: string, currentLeaderId: string, newLeaderId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.leaderId !== currentLeaderId) {
      throw new ForbiddenException('Only the current leader can transfer leadership');
    }

    // Swap roles
    await this.prisma.$transaction([
      this.prisma.organizationMember.updateMany({
        where: { organizationId: orgId, userId: currentLeaderId },
        data: { role: MemberRole.MEMBER },
      }),
      this.prisma.organizationMember.updateMany({
        where: { organizationId: orgId, userId: newLeaderId },
        data: { role: MemberRole.LEADER },
      }),
      this.prisma.organization.update({
        where: { id: orgId },
        data: { leaderId: newLeaderId },
      }),
    ]);

    return { success: true, newLeaderId };
  }

  /**
   * List members of an organization
   */
  async listMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            seatId: true,
            username: true,
            role: true,
            verificationLevel: true,
            reputationProfile: true,
          },
        },
      },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
    });
  }

  // ===========================================================================
  // PERMISSIONS
  // ===========================================================================

  /**
   * Create default permissions for all 7 roles in an organization
   */
  async createDefaultPermissions(orgId: string) {
    const defaults: Record<MemberRole, Partial<Record<string, boolean>>> = {
      LEADER: {
        canInviteMembers: true,
        canRemoveMembers: true,
        canCreateTasks: true,
        canAssignTasks: true,
        canVote: true,
        canCreateProposal: true,
        canManageTreasury: true,
        canSignDocuments: true,
        canCallElection: true,
        canEditOrgInfo: true,
        canViewReports: true,
        canCreateReports: true,
        canManageRoles: true,
        canArchive: true,
      },
      DEPUTY: {
        canInviteMembers: true,
        canRemoveMembers: true,
        canCreateTasks: true,
        canAssignTasks: true,
        canVote: true,
        canCreateProposal: true,
        canManageTreasury: false,
        canSignDocuments: true,
        canCallElection: false,
        canEditOrgInfo: true,
        canViewReports: true,
        canCreateReports: true,
        canManageRoles: true,
        canArchive: false,
      },
      TREASURER: {
        canInviteMembers: false,
        canRemoveMembers: false,
        canCreateTasks: false,
        canAssignTasks: false,
        canVote: true,
        canCreateProposal: true,
        canManageTreasury: true,
        canSignDocuments: true,
        canCallElection: false,
        canEditOrgInfo: false,
        canViewReports: true,
        canCreateReports: true,
        canManageRoles: false,
        canArchive: false,
      },
      SECRETARY: {
        canInviteMembers: false,
        canRemoveMembers: false,
        canCreateTasks: true,
        canAssignTasks: false,
        canVote: true,
        canCreateProposal: true,
        canManageTreasury: false,
        canSignDocuments: true,
        canCallElection: false,
        canEditOrgInfo: false,
        canViewReports: true,
        canCreateReports: true,
        canManageRoles: false,
        canArchive: true,
      },
      OFFICER: {
        canInviteMembers: true,
        canRemoveMembers: false,
        canCreateTasks: true,
        canAssignTasks: true,
        canVote: true,
        canCreateProposal: true,
        canManageTreasury: false,
        canSignDocuments: false,
        canCallElection: false,
        canEditOrgInfo: false,
        canViewReports: true,
        canCreateReports: false,
        canManageRoles: false,
        canArchive: false,
      },
      MEMBER: {
        canInviteMembers: false,
        canRemoveMembers: false,
        canCreateTasks: false,
        canAssignTasks: false,
        canVote: true,
        canCreateProposal: true,
        canManageTreasury: false,
        canSignDocuments: false,
        canCallElection: false,
        canEditOrgInfo: false,
        canViewReports: true,
        canCreateReports: false,
        canManageRoles: false,
        canArchive: false,
      },
      APPRENTICE: {
        canInviteMembers: false,
        canRemoveMembers: false,
        canCreateTasks: false,
        canAssignTasks: false,
        canVote: false,
        canCreateProposal: false,
        canManageTreasury: false,
        canSignDocuments: false,
        canCallElection: false,
        canEditOrgInfo: false,
        canViewReports: true,
        canCreateReports: false,
        canManageRoles: false,
        canArchive: false,
      },
    };

    const permissionData = Object.entries(defaults).map(([role, perms]) => ({
      organizationId: orgId,
      role: role as MemberRole,
      ...perms,
    }));

    await this.prisma.orgPermission.createMany({ data: permissionData });
  }

  /**
   * Get permissions for a specific role in an organization
   */
  async getPermissions(orgId: string) {
    return this.prisma.orgPermission.findMany({
      where: { organizationId: orgId },
      orderBy: { role: 'asc' },
    });
  }

  /**
   * Update permissions for a specific role
   */
  async setPermissions(orgId: string, requestingUserId: string, dto: SetPermissionsDto) {
    await this.requirePermission(orgId, requestingUserId, 'canManageRoles');

    return this.prisma.orgPermission.upsert({
      where: { organizationId_role: { organizationId: orgId, role: dto.role } },
      update: {
        canInviteMembers: dto.canInviteMembers,
        canRemoveMembers: dto.canRemoveMembers,
        canCreateTasks: dto.canCreateTasks,
        canAssignTasks: dto.canAssignTasks,
        canVote: dto.canVote,
        canCreateProposal: dto.canCreateProposal,
        canManageTreasury: dto.canManageTreasury,
        canSignDocuments: dto.canSignDocuments,
        canCallElection: dto.canCallElection,
        canEditOrgInfo: dto.canEditOrgInfo,
        canViewReports: dto.canViewReports,
        canCreateReports: dto.canCreateReports,
        canManageRoles: dto.canManageRoles,
        canArchive: dto.canArchive,
      },
      create: {
        organizationId: orgId,
        role: dto.role,
        canInviteMembers: dto.canInviteMembers ?? false,
        canRemoveMembers: dto.canRemoveMembers ?? false,
        canCreateTasks: dto.canCreateTasks ?? false,
        canAssignTasks: dto.canAssignTasks ?? false,
        canVote: dto.canVote ?? true,
        canCreateProposal: dto.canCreateProposal ?? false,
        canManageTreasury: dto.canManageTreasury ?? false,
        canSignDocuments: dto.canSignDocuments ?? false,
        canCallElection: dto.canCallElection ?? false,
        canEditOrgInfo: dto.canEditOrgInfo ?? false,
        canViewReports: dto.canViewReports ?? true,
        canCreateReports: dto.canCreateReports ?? false,
        canManageRoles: dto.canManageRoles ?? false,
        canArchive: dto.canArchive ?? false,
      },
    });
  }

  // ===========================================================================
  // HIERARCHY — Myangad, Tumed, Republic, Confederation
  // ===========================================================================

  /**
   * Create a Myangad from existing Zuns
   */
  async createMyangad(dto: CreateMyangadDto) {
    return this.prisma.myangad.create({
      data: {
        name: dto.name,
        region: dto.region,
        description: dto.description,
      },
      include: { memberZuns: true },
    });
  }

  /**
   * Assign a Zun to a Myangad — B1 FIX: Serializable $transaction + FOR UPDATE
   */
  async assignZunToMyangad(zunId: string, myangadId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock Myangad row to prevent concurrent over-assignment
      const [row] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Myangad" WHERE id = ${myangadId}::uuid FOR UPDATE`;
      if (!row) throw new NotFoundException('Myangad not found');

      const count = await tx.zun.count({ where: { myangadId } });
      if (count >= 10) {
        throw new BadRequestException(`Myangad is full: ${count}/10 Zuns`);
      }

      const zun = await tx.zun.findUnique({ where: { id: zunId } });
      if (!zun) throw new NotFoundException('Zun not found');
      if (zun.myangadId) throw new BadRequestException('Zun is already assigned to a Myangad');

      return tx.zun.update({ where: { id: zunId }, data: { myangadId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Create a Tumed from existing Myangads
   */
  async createTumed(dto: CreateTumedDto) {
    return this.prisma.tumed.create({
      data: {
        name: dto.name,
        region: dto.region,
        description: dto.description,
      },
      include: { memberMyangads: true },
    });
  }

  /**
   * Assign a Myangad to a Tumed — B1 FIX: Serializable $transaction + FOR UPDATE
   */
  async assignMyangadToTumed(myangadId: string, tumedId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock Tumed row to prevent concurrent over-assignment
      const [row] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Tumed" WHERE id = ${tumedId}::uuid FOR UPDATE`;
      if (!row) throw new NotFoundException('Tumed not found');

      const count = await tx.myangad.count({ where: { tumedId } });
      if (count >= 10) {
        throw new BadRequestException(`Tumed is full: ${count}/10 Myangads`);
      }

      const myangad = await tx.myangad.findUnique({ where: { id: myangadId } });
      if (!myangad) throw new NotFoundException('Myangad not found');
      if (myangad.tumedId) throw new BadRequestException('Myangad is already assigned to a Tumed');

      return tx.myangad.update({ where: { id: myangadId }, data: { tumedId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Create a Republican Khural
   */
  async createRepublic(dto: CreateRepublicDto) {
    return this.prisma.republicanKhural.create({
      data: {
        name: dto.name,
        republicKey: dto.republicKey,
        description: dto.description,
      },
      include: { memberTumeds: true },
    });
  }

  /**
   * Get hierarchy tree — lightweight paginated version (no 200MB payloads)
   * Use query params to drill down: tumedId → myangadId → zunId
   */
  async getHierarchyTree(opts: { tumedId?: string; myangadId?: string; take?: number } = {}) {
    const { take = 10 } = opts;

    if (opts.myangadId) {
      return this.prisma.myangad.findUnique({
        where: { id: opts.myangadId },
        include: {
          memberZuns: { select: { id: true, name: true, isActive: true, _count: { select: { memberArbads: true } } }, take },
          tumed: { select: { id: true, name: true } },
        },
      });
    }

    if (opts.tumedId) {
      return this.prisma.tumed.findUnique({
        where: { id: opts.tumedId },
        include: {
          memberMyangads: {
            select: { id: true, name: true, region: true, totalMembers: true, totalArbads: true,
              _count: { select: { memberZuns: true } } },
            take,
          },
          republic: { select: { id: true, name: true } },
        },
      });
    }

    // Top level: Confederation → Republics → Tumed summaries only
    const confederation = await this.prisma.confederativeKhural.findFirst({
      select: { id: true, name: true, totalMembers: true, totalRepublics: true,
        memberRepublics: {
          select: { id: true, name: true, republicKey: true, totalMembers: true, totalTumens: true,
            memberTumeds: { select: { id: true, name: true, region: true, totalMembers: true }, take } },
        },
      },
    });

    const standaloneRepublics = await this.prisma.republicanKhural.findMany({ where: { confederationId: null }, take });
    const standaloneTumeds = await this.prisma.tumed.findMany({ where: { republicId: null }, take });
    const standaloneMyangads = await this.prisma.myangad.findMany({ where: { tumedId: null }, take });
    const standaloneZuns = await this.prisma.zun.findMany({ where: { myangadId: null }, take });

    return { confederation, standalone: { republics: standaloneRepublics, tumeds: standaloneTumeds, myangads: standaloneMyangads, zuns: standaloneZuns } };
  }

  // ===========================================================================
  // ORGANIZATION SEARCH & LISTING
  // ===========================================================================

  /**
   * List organizations with filters
   */
  async listOrganizations(filters?: {
    type?: OrganizationType;
    branch?: BranchType;
    republic?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.branch) where.branch = filters.branch;
    if (filters?.republic) where.republic = filters.republic;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { overallRating: 'desc' },
        include: {
          leader: { select: { id: true, seatId: true, username: true } },
          _count: { select: { members: true, children: true } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get leaderboard sorted by rating
   */
  async getLeaderboard(type?: OrganizationType, limit = 50) {
    return this.prisma.organization.findMany({
      where: type ? { type } : undefined,
      orderBy: { overallRating: 'desc' },
      take: limit,
      include: {
        leader: { select: { id: true, seatId: true, username: true } },
        _count: { select: { members: true } },
      },
    });
  }

  // ===========================================================================
  // RATING SYSTEM
  // ===========================================================================

  /**
   * Rate an organization (after completing a contract/quest)
   */
  async rateOrganization(
    orgId: string,
    raterId: string,
    category: RatingCategory,
    score: number,
    comment?: string,
  ) {
    if (score < 1 || score > 10) {
      throw new BadRequestException('Score must be between 1 and 10');
    }

    const rating = await this.prisma.organizationRating.create({
      data: {
        organizationId: orgId,
        raterId,
        category,
        score,
        comment,
      },
    });

    // Recalculate average ratings
    await this.recalculateRatings(orgId);

    return rating;
  }

  /**
   * Recalculate organization ratings from all rating records
   */
  private async recalculateRatings(orgId: string) {
    const ratings = await this.prisma.organizationRating.findMany({
      where: { organizationId: orgId },
    });

    if (ratings.length === 0) return;

    const byCategory = ratings.reduce(
      (acc, r) => {
        if (!acc[r.category]) acc[r.category] = [];
        acc[r.category].push(r.score);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const trustScores = byCategory['TRUST'] || [];
    const qualityScores = byCategory['QUALITY'] || [];
    const financialScores = byCategory['FINANCIAL'] || [];

    const trustScore = trustScores.length > 0 ? avg(trustScores) : 5.0;
    const qualityScore = qualityScores.length > 0 ? avg(qualityScores) : 5.0;
    const financialScore = financialScores.length > 0 ? avg(financialScores) : 5.0;

    // Weighted average: trust 40%, quality 35%, financial 25%
    const overallRating = trustScore * 0.4 + qualityScore * 0.35 + financialScore * 0.25;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { trustScore, qualityScore, financialScore, overallRating },
    });
  }

  // ===========================================================================
  // BRANCH MEMBERSHIP VALIDATION
  // ===========================================================================

  /**
   * Validate whether a user can join an organization in a specific power branch.
   *
   * LEGISLATIVE:  Only family representatives (one spouse from a FamilyArbad).
   * EXECUTIVE:    One family member OR any single adult (18+).
   * JUDICIAL:     One family member OR any single adult (18+).
   * BANKING:      One family member OR any single adult (18+).
   */
  async validateBranchMembership(userId: string, powerBranch: PowerBranchType) {
    if (powerBranch === 'NONE') return; // No restriction for NONE

    // Get user to check age
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, dateOfBirth: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (powerBranch === 'LEGISLATIVE') {
      // LEGISLATIVE: must be a spouse in a FamilyArbad
      const familyArbad = await this.prisma.familyArbad.findFirst({
        where: {
          OR: [
            { husbandSeatId: userId },
            { wifeSeatId: userId },
          ],
        },
      });
      if (!familyArbad) {
        throw new ForbiddenException(
          'В Законодательной ветви могут быть только представители Семьи (один из супругов)',
        );
      }
    } else {
      // EXECUTIVE / JUDICIAL / BANKING:
      // One family member OR any single adult (18+)
      const familyArbad = await this.prisma.familyArbad.findFirst({
        where: {
          OR: [
            { husbandSeatId: userId },
            { wifeSeatId: userId },
          ],
        },
      });

      if (!familyArbad) {
        // Not a family member — must be a single adult 18+
        if (!user.dateOfBirth) {
          throw new ForbiddenException(
            'Для вступления необходимо указать дату рождения (возраст 18+)',
          );
        }
        const age = Math.floor(
          (Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        if (age < 18) {
          throw new ForbiddenException(
            'В Исполнительной/Судебной/Банковской ветви могут участвовать только совершеннолетние (18+)',
          );
        }
      }
      // If they are a family member, they can join — no age restriction needed
    }

    this.logger.log(`Branch membership validated: user ${userId} → ${powerBranch}`);
  }

  // ===========================================================================
  // ORGANIZATION BANKING
  // ===========================================================================

  /**
   * Create a bank account for an organization (operating, treasury, or shared vault)
   */
  async createOrgBankAccount(
    orgId: string,
    requestingUserId: string,
    data: { accountName: string; accountType?: 'OPERATING' | 'TREASURY' | 'SHARED_VAULT'; currency?: string },
  ) {
    await this.requirePermission(orgId, requestingUserId, 'canManageTreasury');

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    // Generate account number: ORG-{branch}-{short-uuid}
    const branchPrefix = org.powerBranch?.substring(0, 3)?.toUpperCase() || 'GEN';
    const accountNumber = `ORG-${branchPrefix}-${orgId.substring(0, 8).toUpperCase()}`;

    // Check if account already exists with this type
    const existing = await this.prisma.orgBankAccount.findFirst({
      where: { organizationId: orgId, accountType: data.accountType || 'OPERATING' },
    });
    if (existing) {
      throw new BadRequestException(
        `Organization already has a ${data.accountType || 'OPERATING'} account`,
      );
    }

    const account = await this.prisma.orgBankAccount.create({
      data: {
        organizationId: orgId,
        accountName: data.accountName,
        accountNumber: `${accountNumber}-${Date.now()}`,
        accountType: data.accountType || 'OPERATING',
        currency: data.currency || 'ALTAN',
        clientSignaturesRequired: data.accountType === 'SHARED_VAULT' ? 2 : 1,
      },
    });

    this.logger.log(`Org bank account created: ${account.id} (${account.accountType}) for org ${orgId}`);
    return account;
  }

  /**
   * List bank accounts for an organization
   */
  async listOrgBankAccounts(orgId: string) {
    return this.prisma.orgBankAccount.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ===========================================================================
  // ORGANIZATION CONTRACTS (Smart Contracts)
  // ===========================================================================

  /**
   * Create a smart contract entry for an organization
   */
  async createOrgContract(
    orgId: string,
    requestingUserId: string,
    data: {
      title: string;
      description?: string;
      counterpartyOrgId?: string;
      documentContractId?: string;
    },
  ) {
    await this.requirePermission(orgId, requestingUserId, 'canSignDocuments');

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const contract = await this.prisma.orgContract.create({
      data: {
        organizationId: orgId,
        title: data.title,
        description: data.description,
        powerBranch: org.powerBranch || 'NONE',
        documentContractId: data.documentContractId,
        counterpartyOrgId: data.counterpartyOrgId,
      },
    });

    this.logger.log(`Org contract created: ${contract.id} for org ${orgId}`);
    return contract;
  }

  /**
   * List contracts for an organization
   */
  async listOrgContracts(orgId: string, status?: string) {
    return this.prisma.orgContract.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Check if a user has a specific permission in an organization
   */
  private async requirePermission(orgId: string, userId: string, permission: string) {
    // Find user's membership
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Get permissions for this role
    const perms = await this.prisma.orgPermission.findUnique({
      where: { organizationId_role: { organizationId: orgId, role: member.role } },
    });

    if (!perms || !perms[permission as keyof typeof perms]) {
      throw new ForbiddenException(`You do not have ${permission} permission (role: ${member.role})`);
    }
  }

  /**
   * Helper to create a notification
   */
  private async notifyUser(
    userId: string,
    data: {
      type: string;
      title: string;
      body: string;
      linkUrl?: string;
      sourceOrgId?: string;
      sourceUserId?: string;
    },
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: data.type as Prisma.NotificationCreateInput['type'],
          title: data.title,
          body: data.body,
          linkUrl: data.linkUrl,
          sourceOrgId: data.sourceOrgId,
          sourceUserId: data.sourceUserId,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create notification for user ${userId}: ${e}`);
    }
  }
}
