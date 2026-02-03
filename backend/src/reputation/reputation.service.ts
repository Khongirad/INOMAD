import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get or create reputation profile for a user
   */
  async getReputationProfile(userId: string) {
    let profile = await this.prisma.reputationProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Create if doesn't exist
    if (!profile) {
      profile = await this.prisma.reputationProfile.create({
        data: { userId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
    }

    return profile;
  }

  /**
   * Update reputation statistics after a deal/quest completion
   */
  async updateStats(data: {
    userId: string;
    dealType: 'quest' | 'contract';
    success: boolean;
    rating?: number; // 1-5
  }) {
    const profile = await this.getReputationProfile(data.userId);

    // Calculate new totals
    const totalDeals = profile.totalDeals + 1;
    const successfulDeals = data.success
      ? profile.successfulDeals + 1
      : profile.successfulDeals;
    const successRate = (successfulDeals / totalDeals) * 100;

    // Calculate new rating average
    let averageRating = profile.averageRating.toNumber();
    let ratingsReceived = profile.ratingsReceived;

    if (data.rating) {
      averageRating =
        (averageRating * ratingsReceived + data.rating) /
        (ratingsReceived + 1);
      ratingsReceived += 1;
    }

    // Update quest or contract stats
    let updateData: Prisma.ReputationProfileUpdateInput = {
      totalDeals,
      successfulDeals,
      successRate: new Prisma.Decimal(successRate.toFixed(2)),
      averageRating: new Prisma.Decimal(averageRating.toFixed(2)),
      ratingsReceived,
    };

    if (data.dealType === 'quest') {
      const questsCompleted = data.success
        ? profile.questsCompleted + 1
        : profile.questsCompleted;
      const questsPosted = profile.questsPosted; // Only updated when creating quest
      const questSuccessRate =
        questsPosted > 0 ? (questsCompleted / questsPosted) * 100 : 0;

      updateData = {
        ...updateData,
        questsCompleted,
        questSuccessRate: new Prisma.Decimal(questSuccessRate.toFixed(2)),
      };
    } else if (data.dealType === 'contract') {
      const contractsSigned = profile.contractsSigned + 1;
      const activeContracts = data.success
        ? profile.activeContracts // Completed, so no change to active
        : profile.activeContracts + 1; // Still active

      updateData = {
        ...updateData,
        contractsSigned,
        activeContracts,
      };
    }

    return this.prisma.reputationProfile.update({
      where: { userId: data.userId },
      data: updateData,
    });
  }

  /**
   * Increment quests posted counter
   */
  async incrementQuestsPosted(userId: string) {
    const profile = await this.getReputationProfile(userId);

    return this.prisma.reputationProfile.update({
      where: { userId },
      data: {
        questsPosted: profile.questsPosted + 1,
      },
    });
  }

  /**
   * Get transaction history for authorized viewers
   * (visible when signing cooperation agreements)
   */
  async getTransactionHistory(
    userId: string,
    requesterId: string,
    options?: {
      limit?: number;
      includeDetails?: boolean; // Only true if signing agreement with user
    },
  ) {
    // Get user's documents and quests
    const [documents, quests] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          OR: [{ creatorId: userId }, { recipientIds: { has: userId } }],
          status: { in: ['COMPLETED', 'ACTIVE', 'ARCHIVED'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          template: {
            select: {
              name: true,
              type: true,
            },
          },
          // Only include party details if authorized
          ...(options?.includeDetails && {
            creatorId: true,
            recipientIds: true,
          }),
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 10,
      }),
      this.prisma.quest.findMany({
        where: {
          OR: [{ giverId: userId }, { takerId: userId }],
          status: { in: ['COMPLETED', 'REJECTED'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          completedAt: true,
          // Ratings
          ...(options?.includeDetails && {
            giverRating: true,
            takerRating: true,
          }),
        },
        orderBy: { completedAt: 'desc' },
        take: options?.limit || 10,
      }),
    ]);

    // Combine and sort by date
    const transactions = [
      ...documents.map((doc) => ({
        id: doc.id,
        type: 'document' as const,
        title: doc.title,
        documentType: doc.template.name,
        status: doc.status,
        date: doc.createdAt,
      })),
      ...quests.map((quest) => ({
        id: quest.id,
        type: 'quest' as const,
        title: quest.title,
        status: quest.status,
        date: quest.completedAt || new Date(),
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return transactions.slice(0, options?.limit || 10);
  }

  /**
   * Calculate success rate percentage
   */
  calculateSuccessRate(successful: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  }

  /**
   * Award achievement badge
   */
  async awardBadge(userId: string, badge: { id: string; name: string }) {
    const profile = await this.getReputationProfile(userId);

    // Check if badge already exists
    const existingBadges = (profile.badges as any[]) || [];
    const hasBadge = existingBadges.some((b: any) => b.id === badge.id);

    if (hasBadge) {
      return profile; // Already has this badge
    }

    // Add new badge
    const newBadge = {
      ...badge,
      earnedAt: new Date().toISOString(),
    };

    return this.prisma.reputationProfile.update({
      where: { userId },
      data: {
        badges: [...existingBadges, newBadge],
      },
    });
  }

  /**
   * Check and award milestone badges automatically
   */
  async checkMilestones(userId: string) {
    const profile = await this.getReputationProfile(userId);

    const badges: Array<{ id: string; name: string }> = [];

    // Quest milestones
    if (profile.questsCompleted >= 10 && profile.questsCompleted < 11) {
      badges.push({ id: 'quest_novice', name: '10 Quests Completed' });
    }
    if (profile.questsCompleted >= 50 && profile.questsCompleted < 51) {
      badges.push({ id: 'quest_veteran', name: '50 Quests Completed' });
    }
    if (profile.questsCompleted >= 100 && profile.questsCompleted < 101) {
      badges.push({ id: 'quest_master', name: '100 Quests Completed' });
    }

    // Success rate milestones
    if (
      profile.successRate.toNumber() >= 95 &&
      profile.totalDeals >= 20
    ) {
      badges.push({ id: 'reliable', name: 'Highly Reliable (95%+)' });
    }

    // Rating milestones
    if (
      profile.averageRating.toNumber() >= 4.5 &&
      profile.ratingsReceived >= 10
    ) {
      badges.push({ id: 'top_rated', name: 'Top Rated (4.5+)' });
    }

    // Award all earned badges
    for (const badge of badges) {
      await this.awardBadge(userId, badge);
    }

    return badges.length > 0;
  }
}
