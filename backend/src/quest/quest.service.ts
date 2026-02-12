import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestCategory } from '@prisma/client';
import { RegionalReputationService } from '../regional-reputation/regional-reputation.service';

/**
 * QuestService — Universal Work System.
 *
 * All economic activity is structured as Quests.
 * Citizens, residents, and companies create work assignments.
 * Payment in ALTAN is mandatory.
 * Tax 10%: 7% → republic (state) + 3% → Confederation Treasury.
 *
 * Flow: Create → Browse → Accept → Work → Submit → Approve → Pay + Rep + Tax
 */
@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regionalReputation: RegionalReputationService,
  ) {}

  // ═══════════════════════════════════════════════════
  //  CREATE QUEST — citizen or organization
  // ═══════════════════════════════════════════════════

  async createQuest(
    giverId: string,
    data: {
      title: string;
      description: string;
      objectives: Array<{ description: string }>;
      category: QuestCategory;
      rewardAltan: number;
      reputationGain?: number;
      deadline?: string;
      estimatedDuration?: number;
      organizationId?: string;
      requirements?: any;
      minReputation?: number;
    },
  ) {
    if (data.rewardAltan <= 0) {
      throw new BadRequestException('Оплата в АЛТАН обязательна (минимум > 0)');
    }

    // If org quest, verify membership
    if (data.organizationId) {
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: data.organizationId,
            userId: giverId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException('Вы не член этой организации');
      }
    }

    // ── Auto-detect republicId from giver's Tumen ──
    let republicId: string | undefined;
    const tumen = await this.prisma.tumen.findFirst({
      where: { leaderUserId: giverId },
      select: { republicId: true },
    });
    if (tumen?.republicId) {
      republicId = tumen.republicId;
    }

    // Calculate tax split: 10% total (7% republic + 3% confederation)
    const taxRate = 0.10;
    const republicTaxRate = 0.07;
    const confederationTaxRate = 0.03;
    const taxAmount = data.rewardAltan * taxRate;
    const republicTaxAmount = data.rewardAltan * republicTaxRate;
    const confederationTaxAmount = data.rewardAltan * confederationTaxRate;

    const objectives = data.objectives.map((o) => ({
      description: o.description,
      completed: false,
    }));

    const quest = await this.prisma.quest.create({
      data: {
        giverId,
        organizationId: data.organizationId,
        republicId,
        title: data.title,
        description: data.description,
        objectives,
        category: data.category,
        rewardAltan: data.rewardAltan,
        reputationGain: data.reputationGain ?? 50,
        taxRate,
        republicTaxRate,
        confederationTaxRate,
        taxAmount,
        republicTaxAmount,
        confederationTaxAmount,
        requirements: data.requirements,
        minReputation: data.minReputation,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        estimatedDuration: data.estimatedDuration,
      },
      include: {
        giver: { select: { id: true, username: true } },
        organization: { select: { id: true, name: true, type: true } },
        republic: { select: { id: true, name: true, republicKey: true } },
      },
    });

    this.logger.log(
      `Quest created: "${quest.title}" [${data.category}] ${data.rewardAltan} ALTAN (tax ${taxAmount}: ${republicTaxAmount} republic + ${confederationTaxAmount} confederation)`,
    );
    return quest;
  }

  // ═══════════════════════════════════════════════════
  //  BROWSE — search quests with filters
  // ═══════════════════════════════════════════════════

  async browseQuests(
    userId: string,
    filters?: {
      category?: QuestCategory;
      republicId?: string;
      minReward?: number;
      maxReward?: number;
      search?: string;
      organizationId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'OPEN',
      takerId: null,
      giverId: { not: userId }, // Can't accept own quests
    };

    if (filters?.category) where.category = filters.category;
    if (filters?.republicId) where.republicId = filters.republicId;
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    if (filters?.minReward || filters?.maxReward) {
      where.rewardAltan = {};
      if (filters.minReward) where.rewardAltan.gte = filters.minReward;
      if (filters.maxReward) where.rewardAltan.lte = filters.maxReward;
    }
    if (filters?.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [quests, total] = await this.prisma.$transaction([
      this.prisma.quest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          giver: { select: { id: true, username: true } },
          organization: { select: { id: true, name: true, type: true } },
          republic: { select: { id: true, name: true, republicKey: true } },
        },
      }),
      this.prisma.quest.count({ where }),
    ]);

    return {
      data: quests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════
  //  ACCEPT / ASSIGN
  // ═══════════════════════════════════════════════════

  async acceptQuest(questId: string, userId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Задание не найдено');
    if (quest.status !== 'OPEN') throw new BadRequestException('Задание уже занято');
    if (quest.takerId) throw new BadRequestException('Задание уже назначено');
    if (quest.giverId === userId) throw new BadRequestException('Нельзя принять своё задание');

    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        takerId: userId,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
        republic: { select: { id: true, name: true } },
      },
    });
  }

  // ═══════════════════════════════════════════════════
  //  PROGRESS
  // ═══════════════════════════════════════════════════

  async updateProgress(questId: string, userId: string, objectives: any[]) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Задание не найдено');
    if (quest.takerId !== userId) throw new ForbiddenException('Вы не исполнитель');
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(quest.status)) {
      throw new BadRequestException('Задание не в процессе');
    }

    const completed = objectives.filter((o: any) => o.completed).length;
    const progress = Math.round((completed / objectives.length) * 100);

    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        objectives,
        progress,
        status: progress > 0 && quest.status === 'ACCEPTED' ? 'IN_PROGRESS' : quest.status,
        startedAt: quest.startedAt || new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════
  //  SUBMIT / APPROVE / REJECT
  // ═══════════════════════════════════════════════════

  async submitQuest(questId: string, userId: string, evidence: any[]) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Задание не найдено');
    if (quest.takerId !== userId) throw new ForbiddenException('Вы не исполнитель');

    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: 'SUBMITTED',
        submissions: evidence,
        submittedAt: new Date(),
        progress: 100,
      },
    });
  }

  /**
   * Approve quest — the core economic action:
   * 1. Mark COMPLETED
   * 2. Log ALTAN payment (giver → taker)
   * 3. Calculate & record tax split: 7% republic + 3% confederation
   * 4. Award regional reputation to taker
   */
  async approveQuest(
    questId: string,
    userId: string,
    rating: number,
    feedback?: string,
  ) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
        republic: { select: { id: true, name: true } },
      },
    });
    if (!quest) throw new NotFoundException('Задание не найдено');
    if (quest.giverId !== userId) throw new ForbiddenException('Только заказчик может одобрить');
    if (quest.status !== 'SUBMITTED') throw new BadRequestException('Задание не на проверке');
    if (!quest.takerId) throw new BadRequestException('Нет исполнителя');

    // ── Determine taker's tax republic (citizenship) ──
    let taxRepublicId = quest.taxRepublicId;
    if (!taxRepublicId) {
      const takerTumen = await this.prisma.tumen.findFirst({
        where: { leaderUserId: quest.takerId },
        select: { republicId: true },
      });
      if (takerTumen?.republicId) taxRepublicId = takerTumen.republicId;
    }

    // ── 1. Mark completed + record tax info ──
    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: 'COMPLETED',
        giverRating: rating,
        giverFeedback: feedback,
        completedAt: new Date(),
        taxPaid: true,
        taxRepublicId: taxRepublicId || undefined,
      },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
        republic: { select: { id: true, name: true } },
      },
    });

    // ── 2. Log payment ──
    this.logger.log(
      `💰 Payment: ${quest.rewardAltan} ALTAN from ${quest.giver.username} → ${quest.taker!.username}`,
    );

    // ── 3. Tax split: 7% republic + 3% confederation ──
    if (Number(quest.taxAmount) > 0) {
      this.logger.log(
        `🏛 Tax: ${quest.republicTaxAmount} ALTAN (7%) → republic ${taxRepublicId || 'unknown'} | ${quest.confederationTaxAmount} ALTAN (3%) → Confederation Treasury`,
      );
    }

    // ── 4. Award regional reputation ──
    if (quest.republicId) {
      try {
        await this.regionalReputation.awardPoints(
          quest.takerId!,
          quest.republicId,
          'QUEST_COMPLETED',
          quest.reputationGain,
          `Задание «${quest.title}» выполнено`,
          { questId: quest.id },
        );
        this.logger.log(
          `🏅 Reputation +${quest.reputationGain} to ${quest.taker!.username} in ${quest.republic!.name}`,
        );
      } catch (err) {
        this.logger.error(`Reputation award failed: ${err}`);
      }
    }

    return updated;
  }

  async rejectQuest(questId: string, userId: string, feedback: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Задание не найдено');
    if (quest.giverId !== userId) throw new ForbiddenException('Только заказчик может отклонить');
    if (quest.status !== 'SUBMITTED') throw new BadRequestException('Задание не на проверке');

    return this.prisma.quest.update({
      where: { id: questId },
      data: { status: 'REJECTED', giverFeedback: feedback },
    });
  }

  // ═══════════════════════════════════════════════════
  //  MY QUESTS
  // ═══════════════════════════════════════════════════

  async getMyQuests(userId: string, role: 'giver' | 'taker' | 'all' = 'all') {
    const where: any = {};
    if (role === 'giver') where.giverId = userId;
    else if (role === 'taker') where.takerId = userId;
    else where.OR = [{ giverId: userId }, { takerId: userId }];

    return this.prisma.quest.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
        organization: { select: { id: true, name: true, type: true } },
        republic: { select: { id: true, name: true, republicKey: true } },
      },
    });
  }

  async getQuest(questId: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
        organization: { select: { id: true, name: true, type: true } },
        republic: { select: { id: true, name: true, republicKey: true } },
      },
    });
    if (!quest) throw new NotFoundException('Задание не найдено');
    return quest;
  }

  // ═══════════════════════════════════════════════════
  //  STATS — marketplace statistics
  // ═══════════════════════════════════════════════════

  async getMarketStats() {
    const [totalQuests, openQuests, completedQuests, totalVolume] =
      await this.prisma.$transaction([
        this.prisma.quest.count(),
        this.prisma.quest.count({ where: { status: 'OPEN' } }),
        this.prisma.quest.count({ where: { status: 'COMPLETED' } }),
        this.prisma.quest.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { rewardAltan: true },
        }),
      ]);

    return {
      totalQuests,
      openQuests,
      completedQuests,
      totalVolumeAltan: totalVolume._sum.rewardAltan || 0,
    };
  }
}
