import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationType, BranchType, MemberRole, RatingCategory } from '@prisma/client';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // ============== CRUD Operations ==============

  async createOrganization(data: {
    name: string;
    type: OrganizationType;
    branch?: BranchType;
    description?: string;
    leaderId: string;
    level: number;
    republicId?: string;
    republic?: string;
    parentId?: string;
  }) {
    // Validate leader exists
    const leader = await this.prisma.user.findUnique({
      where: { id: data.leaderId },
    });

    if (!leader) {
      throw new NotFoundException('Leader not found');
    }

    // Validate Legislative branch restrictions
    if (data.branch === 'LEGISLATIVE') {
      await this.validateLegislativeAccess(data.leaderId, data.republic);
    }

    return this.prisma.organization.create({
      data,
      include: {
        leader: true,
        members: true,
      },
    });
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        leader: true,
        members: {
          include: {
            user: true,
          },
        },
        ratings: {
          include: {
            rater: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        achievements: {
          orderBy: {
            awardedAt: 'desc',
          },
        },
        parent: true,
        children: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(id: string, data: any) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async deleteOrganization(id: string) {
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  // ============== Membership Management ==============

  async addMember(orgId: string, userId: string, role: MemberRole = 'MEMBER') {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check if already a member
    const existingMember = org.members.find((m) => m.userId === userId && !m.leftAt);
    if (existingMember) {
      throw new ForbiddenException('User is already a member');
    }

    // Check member limit
    if (org.members.filter((m) => !m.leftAt).length >= org.maxMembers) {
      throw new ForbiddenException('Organization is at maximum capacity');
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId,
        role,
      },
      include: {
        user: true,
      },
    });
  }

  async removeMember(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId,
        leftAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.organizationMember.update({
      where: { id: member.id },
      data: {
        leftAt: new Date(),
      },
    });
  }

  async transferLeadership(orgId: string, newLeaderId: string) {
    // Verify new leader is a member
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: newLeaderId,
        leftAt: null,
      },
    });

    if (!member) {
      throw new ForbiddenException('New leader must be an existing member');
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        leaderId: newLeaderId,
      },
    });
  }

  // ============== Rating System ==============

  async rateOrganization(
    orgId: string,
    raterId: string,
    category: RatingCategory,
    score: number,
    comment?: string,
    contractId?: string,
  ) {
    if (score < 1 || score > 10) {
      throw new ForbiddenException('Score must be between 1 and 10');
    }

    const rating = await this.prisma.organizationRating.create({
      data: {
        organizationId: orgId,
        raterId,
        category,
        score,
        comment,
        contractId,
      },
    });

    // Recalculate ratings
    await this.recalculateRatings(orgId);

    return rating;
  }

  async recalculateRatings(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        ratings: true,
        members: true,
      },
    });

    if (!org) return;

    // 1. Trust Score (average of trust ratings)
    const trustRatings = org.ratings.filter((r) => r.category === 'TRUST');
    const trustScore =
      trustRatings.length > 0
        ? trustRatings.reduce((sum, r) => sum + r.score, 0) / trustRatings.length
        : 5.0;

    // 2. Quality Score (completion rate + quality ratings)
    const completionRate =
      org.contractsCompleted / Math.max(1, org.contractsCompleted + org.contractsActive);
    const qualityRatings = org.ratings.filter((r) => r.category === 'QUALITY');
    const avgQualityRating =
      qualityRatings.length > 0
        ? qualityRatings.reduce((sum, r) => sum + r.score, 0) / qualityRatings.length
        : 5.0;
    const qualityScore = completionRate * 10 * 0.5 + avgQualityRating * 0.5;

    // 3. Financial Score (revenue normalized)
    const avgRevenue = await this.getAvgRevenueForType(org.type);
    const financialScore = Math.min(
      10,
      (Number(org.totalRevenue) / Math.max(1, avgRevenue)) * 5,
    );

    // 4. Overall Rating (weighted: financial 40%, trust 30%, quality 30%)
    const overallRating = financialScore * 0.4 + trustScore * 0.3 + qualityScore * 0.3;

    // Update
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        trustScore,
        qualityScore,
        financialScore,
        overallRating,
      },
    });
  }

  private async getAvgRevenueForType(type: OrganizationType): Promise<number> {
    const result = await this.prisma.organization.aggregate({
      where: { type },
      _avg: {
        totalRevenue: true,
      },
    });

    return Number(result._avg.totalRevenue) || 1;
  }

  // ============== Rankings & Leaderboard ==============

  async calculateRankings() {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { overallRating: 'desc' },
    });

    for (let i = 0; i < organizations.length; i++) {
      await this.prisma.organization.update({
        where: { id: organizations[i].id },
        data: {
          previousRank: organizations[i].currentRank,
          currentRank: i + 1,
        },
      });
    }

    // Award Top 100
    await this.awardTopPerformers(organizations.slice(0, 100));
  }

  private async awardTopPerformers(topOrgs: any[]) {
    const rewards = {
      1: { altan: 100000, badge: '🥇 Champion', category: 'Top 1' },
      10: { altan: 50000, badge: '🥈 Elite', category: 'Top 10' },
      50: { altan: 20000, badge: '🥉 Distinguished', category: 'Top 50' },
      100: { altan: 10000, badge: '⭐ Recognized', category: 'Top 100' },
    };

    for (let i = 0; i < topOrgs.length; i++) {
      const rank = i + 1;
      let reward = null;

      if (rank === 1) reward = rewards[1];
      else if (rank <= 10) reward = rewards[10];
      else if (rank <= 50) reward = rewards[50];
      else if (rank <= 100) reward = rewards[100];

      if (reward) {
        await this.prisma.organizationAchievement.create({
          data: {
            organizationId: topOrgs[i].id,
            title: `${reward.badge} - Rank #${rank}`,
            description: `Achieved rank #${rank} in monthly rankings`,
            category: reward.category,
            rank,
            rewardAltan: reward.altan,
            badge: reward.badge,
          },
        });

        // Add reward to treasury
        await this.addRevenue(topOrgs[i].id, reward.altan, 'Monthly ranking reward');
      }
    }
  }

  async getLeaderboard(type?: OrganizationType, limit = 100) {
    return this.prisma.organization.findMany({
      where: type ? { type } : {},
      orderBy: { overallRating: 'desc' },
      take: limit,
      include: {
        leader: true,
        _count: {
          select: {
            members: true,
            achievements: true,
          },
        },
      },
    });
  }

  // ============== Financial ==============

  async addRevenue(orgId: string, amount: number, source: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        treasury: Number(org.treasury) + amount,
        totalEarned: Number(org.totalEarned) + amount,
        totalRevenue: Number(org.totalRevenue) + amount,
      },
    });

    // Recalculate ratings
    await this.recalculateRatings(orgId);
  }

  // ============== Access Control ==============

  private async validateLegislativeAccess(userId: string, republic?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user's ethnicity matches republic's native ethnicity
    // This is a simplified check - in production, you'd have a Republic model with nativeEthnicity
    if (republic === 'russian' && !user.ethnicity.includes('Russian')) {
      throw new ForbiddenException(
        'Legislative branch is exclusive to native Russian families',
      );
    }

    if (republic === 'buryad-mongol' && !user.ethnicity.includes('Buryad-Mongol')) {
      throw new ForbiddenException(
        'Legislative branch is exclusive to native Buryad-Mongol families',
      );
    }

    // TODO: Additional family lineage verification
  }

  // ============== Network Visualization ==============

  async getArbanNetwork(arbanId: string) {
    return this.prisma.arbanNetwork.findUnique({
      where: { arbanId },
      include: {
        arban: {
          include: {
            leader: true,
            members: true,
          },
        },
      },
    });
  }

  async getFullNetworkMap() {
    const networks = await this.prisma.arbanNetwork.findMany({
      include: {
        arban: {
          include: {
            leader: true,
          },
        },
      },
      orderBy: {
        layer: 'asc',
      },
    });

    // Transform to D3.js graph format
    return {
      nodes: networks.map((n) => ({
        id: n.arbanId,
        name: n.arban.name,
        type: n.arban.type,
        rating: Number(n.arban.overallRating),
        layer: n.layer,
        x: n.positionX,
        y: n.positionY,
        color: n.clusterColor || '#FFFFFF',
        importance: n.importance,
      })),
      links: networks.flatMap((n) =>
        n.connectedTo.map((targetId) => ({
          source: n.arbanId,
          target: targetId,
        })),
      ),
    };
  }
}
