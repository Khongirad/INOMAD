import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * XP thresholds for each level (1-32).
 * Formula: level^2 * 100 (so level 1 = 100 XP, level 10 = 10000 XP, level 32 = 102400 XP)
 */
const LEVEL_THRESHOLDS: number[] = Array.from({ length: 32 }, (_, i) =>
  Math.pow(i + 1, 2) * 100,
);

/**
 * Localized titles for level ranges.
 */
const LEVEL_TITLES: Array<{ minLevel: number; title: string }> = [
  { minLevel: 1, title: 'Человек' },         // Human — starting point
  { minLevel: 8, title: 'Иностранец' },      // Foreigner — early engagement
  { minLevel: 16, title: 'Гражданин' },      // Citizen — active participant
  { minLevel: 24, title: 'Коренной' },       // Indigenous — deep roots
  { minLevel: 30, title: 'Кочевник' },       // Nomad — highest honor (like Paladin / Jedi)
];

/**
 * XP rewards for various actions.
 */
const XP_REWARDS: Record<string, number> = {
  QUEST_COMPLETED: 50,
  QUEST_CREATED: 10,
  VOTE_CAST: 20,
  TAX_PAID: 15,
  CONTRACT_SIGNED: 30,
  CONTRACT_FULFILLED: 50,
  ORGANIZATION_JOINED: 25,
  ORGANIZATION_CREATED: 100,
  PROPOSAL_SUBMITTED: 40,
  PROPOSAL_DEBATE: 10,
  MARRIAGE_REGISTERED: 50,
  ARBAN_JOINED: 30,
  DAILY_LOGIN: 5,
  ACHIEVEMENT_EARNED: 0, // Varies per achievement
};

/**
 * Predefined achievements.
 */
const ACHIEVEMENTS = [
  // Governance
  { key: 'first_vote', name: 'Первый Голос', description: 'Проголосуйте в первом голосовании', category: 'GOVERNANCE', icon: '🗳️', xpReward: 25 },
  { key: '10_votes', name: 'Активный Избиратель', description: 'Проголосуйте 10 раз', category: 'GOVERNANCE', icon: '🏛️', xpReward: 50 },
  { key: '100_votes', name: 'Столп Демократии', description: 'Проголосуйте 100 раз', category: 'GOVERNANCE', icon: '⚖️', xpReward: 200 },
  { key: 'first_proposal', name: 'Законотворец', description: 'Подайте первый законопроект', category: 'GOVERNANCE', icon: '📜', xpReward: 50 },
  { key: 'proposal_passed', name: 'Законодатель', description: 'Ваш законопроект принят', category: 'GOVERNANCE', icon: '🏆', xpReward: 200 },

  // Economic
  { key: 'first_quest', name: 'Первое Задание', description: 'Выполните первый квест', category: 'ECONOMIC', icon: '⚔️', xpReward: 25 },
  { key: '10_quests', name: 'Охотник за Заданиями', description: 'Выполните 10 квестов', category: 'ECONOMIC', icon: '🎯', xpReward: 100 },
  { key: '100_quests', name: 'Мастер Квестов', description: 'Выполните 100 квестов', category: 'ECONOMIC', icon: '💎', xpReward: 500 },
  { key: 'first_contract', name: 'Первая Сделка', description: 'Подпишите первый контракт', category: 'ECONOMIC', icon: '📝', xpReward: 25 },
  { key: 'first_tax', name: 'Налогоплательщик', description: 'Заплатите первый налог', category: 'ECONOMIC', icon: '💰', xpReward: 25 },

  // Social
  { key: 'first_org', name: 'Первая Организация', description: 'Вступите в организацию', category: 'SOCIAL', icon: '🏢', xpReward: 25 },
  { key: 'org_leader', name: 'Лидер', description: 'Станьте лидером организации', category: 'SOCIAL', icon: '👑', xpReward: 100 },
  { key: 'married', name: 'Семейная Жизнь', description: 'Заключите брак или гражданский союз', category: 'SOCIAL', icon: '💍', xpReward: 50 },
  { key: 'first_arban', name: 'Десятник', description: 'Вступите в Арбан', category: 'SOCIAL', icon: '🐴', xpReward: 30 },

  // Streaks
  { key: '7_day_streak', name: 'Неделя Активности', description: 'Активность 7 дней подряд', category: 'CULTURAL', icon: '🔥', xpReward: 50 },
  { key: '30_day_streak', name: 'Месяц Усердия', description: 'Активность 30 дней подряд', category: 'CULTURAL', icon: '🌟', xpReward: 200 },
  { key: '100_day_streak', name: 'Столетие Упорства', description: 'Активность 100 дней подряд', category: 'CULTURAL', icon: '🏅', xpReward: 500 },
];

/**
 * GamificationService — Central service for citizen progression.
 *
 * Integrates with:
 * - Quests → awardXP('QUEST_COMPLETED')
 * - Voting → awardXP('VOTE_CAST')
 * - Organizations → awardXP('ORGANIZATION_JOINED')
 * - Contracts → awardXP('CONTRACT_SIGNED')
 * - ZAGS → awardXP('MARRIAGE_REGISTERED')
 *
 * Automatically handles level-ups, title updates, and achievement unlocking.
 */
@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // CITIZEN LEVEL — CRUD & QUERIES
  // ===========================================================================

  /**
   * Get or create a citizen's level profile.
   */
  async getCitizenLevel(userId: string) {
    let citizenLevel = await this.prisma.citizenLevel.findUnique({
      where: { userId },
      include: {
        achievements: { orderBy: { earnedAt: 'desc' } },
        xpTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!citizenLevel) {
      citizenLevel = await this.prisma.citizenLevel.create({
        data: { userId },
        include: {
          achievements: { orderBy: { earnedAt: 'desc' } },
          xpTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      });
    }

    const xpForNextLevel = this.getXPForLevel(citizenLevel.level + 1);
    const xpProgress = xpForNextLevel
      ? Math.min(100, Math.round((citizenLevel.currentXP / xpForNextLevel) * 100))
      : 100;

    return {
      ...citizenLevel,
      xpForNextLevel,
      xpProgress,
      isMaxLevel: citizenLevel.level >= 32,
    };
  }

  /**
   * Get leaderboard sorted by totalXP.
   */
  async getLeaderboard(limit = 50) {
    return this.prisma.citizenLevel.findMany({
      orderBy: { totalXP: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, seatId: true, username: true } },
        _count: { select: { achievements: true } },
      },
    });
  }

  // ===========================================================================
  // XP SYSTEM
  // ===========================================================================

  /**
   * Award XP for an action. This is THE main entry point for all gamification.
   * Handles: XP logging, level-up checks, title updates, and achievement checks.
   */
  async awardXP(
    userId: string,
    action: string,
    options?: {
      amount?: number; // Override default XP for this action
      reason?: string; // Custom reason text
      sourceId?: string; // Reference entity ID (questId, etc.)
    },
  ) {
    const citizenLevel = await this.ensureCitizenLevel(userId);
    const xpAmount = options?.amount ?? XP_REWARDS[action] ?? 10;
    const reason =
      options?.reason ?? `${action.replace(/_/g, ' ').toLowerCase()}`;

    // Record XP transaction
    await this.prisma.xPTransaction.create({
      data: {
        citizenLevelId: citizenLevel.id,
        amount: xpAmount,
        reason,
        action,
        sourceId: options?.sourceId,
      },
    });

    // Calculate new XP and level
    const newTotalXP = citizenLevel.totalXP + xpAmount;
    let newCurrentXP = citizenLevel.currentXP + xpAmount;
    let newLevel = citizenLevel.level;

    // Check for level-up(s)
    while (newLevel < 32) {
      const threshold = this.getXPForLevel(newLevel + 1);
      if (threshold && newCurrentXP >= threshold) {
        newCurrentXP -= threshold;
        newLevel++;
        this.logger.log(
          `🎉 User ${userId} leveled up to ${newLevel}!`,
        );
      } else {
        break;
      }
    }

    // Update title if level changed
    const newTitle =
      newLevel !== citizenLevel.level
        ? this.getTitleForLevel(newLevel)
        : citizenLevel.title;

    // Update daily streak
    const now = new Date();
    const lastActive = citizenLevel.lastActiveAt;
    let dailyStreak = citizenLevel.dailyStreak;
    let longestStreak = citizenLevel.longestStreak;

    if (lastActive) {
      const daysSinceLastActive = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceLastActive === 1) {
        dailyStreak++;
        longestStreak = Math.max(longestStreak, dailyStreak);
      } else if (daysSinceLastActive > 1) {
        dailyStreak = 1;
      }
    } else {
      dailyStreak = 1;
    }

    // Save all changes
    const updated = await this.prisma.citizenLevel.update({
      where: { id: citizenLevel.id },
      data: {
        currentXP: newCurrentXP,
        totalXP: newTotalXP,
        level: newLevel,
        title: newTitle,
        dailyStreak,
        longestStreak,
        lastActiveAt: now,
      },
    });

    // Check achievements asynchronously
    this.checkAchievements(userId, action).catch((err) =>
      this.logger.error(`Achievement check failed: ${err.message}`),
    );

    // Check streak achievements
    if (dailyStreak === 7 || dailyStreak === 30 || dailyStreak === 100) {
      this.checkStreakAchievements(userId, dailyStreak).catch((err) =>
        this.logger.error(`Streak achievement check failed: ${err.message}`),
      );
    }

    return {
      xpAwarded: xpAmount,
      totalXP: newTotalXP,
      level: newLevel,
      title: newTitle,
      leveledUp: newLevel !== citizenLevel.level,
      dailyStreak,
    };
  }

  // ===========================================================================
  // ACHIEVEMENTS
  // ===========================================================================

  /**
   * Check and award achievements based on the action and user's stats.
   */
  async checkAchievements(userId: string, action: string) {
    const citizenLevel = await this.ensureCitizenLevel(userId);
    const profile = await this.prisma.reputationProfile.findUnique({
      where: { userId },
    });

    if (!profile) return;

    const achievementsToCheck: Array<{
      key: string;
      condition: boolean;
    }> = [];

    // Quest achievements
    if (action === 'QUEST_COMPLETED') {
      achievementsToCheck.push(
        { key: 'first_quest', condition: profile.questsCompleted >= 1 },
        { key: '10_quests', condition: profile.questsCompleted >= 10 },
        { key: '100_quests', condition: profile.questsCompleted >= 100 },
      );
    }

    // Vote achievements
    if (action === 'VOTE_CAST') {
      const voteCount = await this.prisma.proposalVote.count({
        where: { voterId: userId },
      });
      achievementsToCheck.push(
        { key: 'first_vote', condition: voteCount >= 1 },
        { key: '10_votes', condition: voteCount >= 10 },
        { key: '100_votes', condition: voteCount >= 100 },
      );
    }

    // Proposal achievements
    if (action === 'PROPOSAL_SUBMITTED') {
      achievementsToCheck.push({ key: 'first_proposal', condition: true });
    }

    // Contract achievements
    if (action === 'CONTRACT_SIGNED') {
      achievementsToCheck.push(
        { key: 'first_contract', condition: profile.contractsSigned >= 1 },
      );
    }

    // Tax achievements
    if (action === 'TAX_PAID') {
      achievementsToCheck.push({ key: 'first_tax', condition: true });
    }

    // Org achievements
    if (action === 'ORGANIZATION_JOINED') {
      achievementsToCheck.push({ key: 'first_org', condition: true });
    }
    if (action === 'ORGANIZATION_CREATED') {
      achievementsToCheck.push({ key: 'org_leader', condition: true });
    }

    // Marriage achievements
    if (action === 'MARRIAGE_REGISTERED') {
      achievementsToCheck.push({ key: 'married', condition: true });
    }

    // Arban achievements
    if (action === 'ARBAN_JOINED') {
      achievementsToCheck.push({ key: 'first_arban', condition: true });
    }

    // Try to award each achievement
    for (const { key, condition } of achievementsToCheck) {
      if (!condition) continue;

      const def = ACHIEVEMENTS.find((a) => a.key === key);
      if (!def) continue;

      await this.tryAwardAchievement(citizenLevel.id, userId, def);
    }
  }

  /**
   * Check streak-based achievements.
   */
  private async checkStreakAchievements(userId: string, streak: number) {
    const citizenLevel = await this.ensureCitizenLevel(userId);
    const streakAchievements = [
      { key: '7_day_streak', minStreak: 7 },
      { key: '30_day_streak', minStreak: 30 },
      { key: '100_day_streak', minStreak: 100 },
    ];

    for (const sa of streakAchievements) {
      if (streak >= sa.minStreak) {
        const def = ACHIEVEMENTS.find((a) => a.key === sa.key);
        if (def) {
          await this.tryAwardAchievement(citizenLevel.id, userId, def);
        }
      }
    }
  }

  /**
   * Try to award an achievement (idempotent — won't duplicate).
   */
  private async tryAwardAchievement(
    citizenLevelId: string,
    userId: string,
    def: (typeof ACHIEVEMENTS)[0],
  ) {
    // Check if already earned
    const existing = await this.prisma.achievement.findUnique({
      where: {
        citizenLevelId_key: { citizenLevelId, key: def.key },
      },
    });

    if (existing) return; // Already earned

    await this.prisma.achievement.create({
      data: {
        citizenLevelId,
        key: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        xpReward: def.xpReward,
      },
    });

    // Award bonus XP for the achievement
    if (def.xpReward > 0) {
      await this.awardXP(userId, 'ACHIEVEMENT_EARNED', {
        amount: def.xpReward,
        reason: `Достижение: ${def.name}`,
      });
    }

    this.logger.log(
      `🏆 Achievement "${def.name}" earned by user ${userId}`,
    );
  }

  /**
   * Get all available achievements and which ones the user has earned.
   */
  async getAchievementProgress(userId: string) {
    const citizenLevel = await this.ensureCitizenLevel(userId);
    const earned = await this.prisma.achievement.findMany({
      where: { citizenLevelId: citizenLevel.id },
    });

    const earnedKeys = new Set(earned.map((a) => a.key));

    return ACHIEVEMENTS.map((def) => ({
      ...def,
      earned: earnedKeys.has(def.key),
      earnedAt: earned.find((a) => a.key === def.key)?.earnedAt,
    }));
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private async ensureCitizenLevel(userId: string) {
    let cl = await this.prisma.citizenLevel.findUnique({
      where: { userId },
    });

    if (!cl) {
      cl = await this.prisma.citizenLevel.create({
        data: { userId },
      });
    }

    return cl;
  }

  private getXPForLevel(level: number): number | null {
    if (level < 1 || level > 32) return null;
    return LEVEL_THRESHOLDS[level - 1];
  }

  private getTitleForLevel(level: number): string {
    let title = 'Человек';
    for (const t of LEVEL_TITLES) {
      if (level >= t.minLevel) title = t.title;
    }
    return title;
  }
}
