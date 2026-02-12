import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReputationActionType } from '@prisma/client';

/**
 * RegionalReputationService — Territorial reputation tracking.
 *
 * Reputation grows in the specific territory where actions occur.
 * Working in Buryad-Mongolia = reputation in Buryad-Mongolia.
 *
 * Actions that award points:
 *   QUEST_COMPLETED     +50  (quest category)
 *   TAX_PAID            +20  (tax category)
 *   CONTRACT_FULFILLED  +100 (contract category)
 *   ORGANIZATION_JOINED +10  (social category)
 *   VOTE_CAST           +5   (social category)
 *   COMMUNITY_SERVICE   var  (social category)
 *
 * Level titles:
 *   1-9   Новичок
 *   10-24 Резидент
 *   25-49 Гражданин
 *   50-74 Заслуженный
 *   75+   Почётный
 */
@Injectable()
export class RegionalReputationService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════
  //  CORE: Award reputation points
  // ═══════════════════════════════════════════════════

  /**
   * Award or deduct reputation points for a user in a specific republic.
   * Creates RegionalReputation record if it doesn't exist.
   * Logs the action in ReputationAction.
   */
  async awardPoints(
    userId: string,
    republicId: string,
    actionType: ReputationActionType,
    points: number,
    description: string,
    sourceIds?: { questId?: string; contractId?: string; orgId?: string },
  ) {
    // ── Upsert regional reputation ──
    let regional = await this.prisma.regionalReputation.findUnique({
      where: { userId_republicId: { userId, republicId } },
    });

    if (!regional) {
      regional = await this.prisma.regionalReputation.create({
        data: { userId, republicId },
      });
    }

    // ── Determine which category to update ──
    const categoryUpdate: Record<string, number> = {};
    const statsUpdate: Record<string, number> = {};

    switch (actionType) {
      case 'QUEST_COMPLETED':
        categoryUpdate.questPoints = points;
        statsUpdate.questsCompleted = 1;
        break;
      case 'TAX_PAID':
        categoryUpdate.taxPoints = points;
        statsUpdate.taxesPaid = 1;
        break;
      case 'CONTRACT_FULFILLED':
        categoryUpdate.contractPoints = points;
        statsUpdate.contractsFulfilled = 1;
        break;
      case 'VOTE_CAST':
        categoryUpdate.socialPoints = points;
        statsUpdate.votesCast = 1;
        break;
      case 'ORGANIZATION_JOINED':
      case 'COMMUNITY_SERVICE':
        categoryUpdate.socialPoints = points;
        break;
    }

    // ── Update points + totalPoints ──
    const newTotalPoints = regional.totalPoints + points;
    const newLevel = this.calculateLevel(newTotalPoints);
    const newTitle = this.getLevelTitle(newLevel);

    const incrementData: Record<string, any> = {};
    for (const [key, val] of Object.entries(categoryUpdate)) {
      incrementData[key] = val;
    }
    for (const [key, val] of Object.entries(statsUpdate)) {
      incrementData[key] = val;
    }
    incrementData.totalPoints = points;

    const updated = await this.prisma.regionalReputation.update({
      where: { id: regional.id },
      data: {
        ...Object.fromEntries(
          Object.entries(incrementData).map(([k, v]) => [k, { increment: v }]),
        ),
        level: newLevel,
        title: newTitle,
      },
      include: {
        republic: { select: { id: true, name: true, republicKey: true } },
      },
    });

    // ── Log the action ──
    await this.prisma.reputationAction.create({
      data: {
        userId,
        republicId,
        regionalReputationId: regional.id,
        actionType,
        points,
        description,
        questId: sourceIds?.questId,
        contractId: sourceIds?.contractId,
        orgId: sourceIds?.orgId,
      },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════
  //  READ: Profiles & Leaderboards
  // ═══════════════════════════════════════════════════

  /** Get a user's reputation in a specific republic */
  async getRegionalProfile(userId: string, republicId: string) {
    const rep = await this.prisma.regionalReputation.findUnique({
      where: { userId_republicId: { userId, republicId } },
      include: {
        republic: { select: { id: true, name: true, republicKey: true } },
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!rep) {
      // Return empty profile (not yet started)
      const republic = await this.prisma.republicanKhural.findUnique({
        where: { id: republicId },
        select: { id: true, name: true, republicKey: true },
      });
      if (!republic) throw new NotFoundException('Республика не найдена');
      return {
        userId,
        republic,
        questPoints: 0,
        taxPoints: 0,
        contractPoints: 0,
        socialPoints: 0,
        totalPoints: 0,
        level: 1,
        title: 'Новичок',
        actions: [],
      };
    }

    return rep;
  }

  /** Get all regions where a user has reputation */
  async getUserRegions(userId: string) {
    return this.prisma.regionalReputation.findMany({
      where: { userId },
      include: {
        republic: { select: { id: true, name: true, republicKey: true } },
      },
      orderBy: { totalPoints: 'desc' },
    });
  }

  /** Leaderboard for a specific republic */
  async getLeaderboard(
    republicId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.regionalReputation.findMany({
        where: { republicId },
        include: {
          user: { select: { id: true, username: true } },
        },
        orderBy: { totalPoints: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.regionalReputation.count({ where: { republicId } }),
    ]);

    return {
      data: entries.map((e, i) => ({
        rank: offset + i + 1,
        user: e.user,
        totalPoints: e.totalPoints,
        level: e.level,
        title: e.title,
        questPoints: e.questPoints,
        taxPoints: e.taxPoints,
        contractPoints: e.contractPoints,
        socialPoints: e.socialPoints,
      })),
      total,
    };
  }

  /** Get recent reputation actions across all users for a republic */
  async getRecentActions(republicId: string, limit = 20) {
    return this.prisma.reputationAction.findMany({
      where: { republicId },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Get all republics with aggregated reputation stats */
  async getAllRepublicsStats() {
    const republics = await this.prisma.republicanKhural.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { reputations: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Get top contributors for each
    const result = await Promise.all(
      republics.map(async (r) => {
        const topUser = await this.prisma.regionalReputation.findFirst({
          where: { republicId: r.id },
          include: { user: { select: { id: true, username: true } } },
          orderBy: { totalPoints: 'desc' },
        });
        return {
          id: r.id,
          name: r.name,
          republicKey: r.republicKey,
          activeUsers: r._count.reputations,
          topContributor: topUser
            ? { username: topUser.user.username, points: topUser.totalPoints, level: topUser.level }
            : null,
        };
      }),
    );

    return result;
  }

  // ═══════════════════════════════════════════════════
  //  HELPERS: Level calculation
  // ═══════════════════════════════════════════════════

  /**
   * Level formula: level = floor(sqrt(totalPoints / 10)) + 1, capped at 100.
   * Points needed:   1→0,  2→10,  5→160,  10→810,  25→5760,  50→24010,  75→54760,  100→98010
   */
  private calculateLevel(totalPoints: number): number {
    if (totalPoints <= 0) return 1;
    const level = Math.floor(Math.sqrt(totalPoints / 10)) + 1;
    return Math.min(level, 100);
  }

  /** Level title based on level number */
  private getLevelTitle(level: number): string {
    if (level >= 75) return 'Почётный гражданин';
    if (level >= 50) return 'Заслуженный';
    if (level >= 25) return 'Гражданин';
    if (level >= 10) return 'Резидент';
    return 'Новичок';
  }
}
