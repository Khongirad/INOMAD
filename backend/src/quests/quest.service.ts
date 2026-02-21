import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { DocumentService } from '../documents/document.service'; // DISABLED - old Document table
import { TimelineService } from '../timeline/timeline.service';
import { ReputationService } from '../reputation/reputation.service';
import { QuestStatus } from '@prisma/client';

@Injectable()
export class QuestService {
  constructor(
    private prisma: PrismaService,
    // private documents: DocumentService, // DISABLED - old Document table
    private timeline: TimelineService,
    private reputation: ReputationService,
  ) {}

  /**
   * Create new quest
   */
  async createQuest(giverId: string, data: {
    title: string;
    description: string;
    objectives: Array<{ description: string }>;
    rewardAltan?: number;
    reputationGain?: number;
    deadline?: Date;
    requirements?: any;
  }) {
    const quest = await this.prisma.quest.create({
      data: {
        giverId,
        title: data.title,
        description: data.description,
        objectives: data.objectives.map(obj => ({
          ...obj,
          completed: false,
        })),
        rewardAltan: data.rewardAltan,
        reputationGain: data.reputationGain,
        deadline: data.deadline,
        requirements: data.requirements,
        status: 'OPEN',
      },
      include: {
        giver: { select: { id: true, username: true } },
      },
    });

    // Update reputation: increment quests posted
    await this.reputation.incrementQuestsPosted(giverId);

    // Timeline event
    await this.timeline.createEvent({
      type: 'QUEST_CREATED',
      actorId: giverId,
      title: `Posted quest: ${data.title}`,
      metadata: { questId: quest.id },
    });

    return quest;
  }

  /**
   * Accept quest
   */
  async acceptQuest(questId: string, takerId: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new Error('Quest not found');
    }

    if (quest.status !== 'OPEN') {
      throw new Error('Quest not available');
    }

    // Validate quest requirements
    if (quest.requirements) {
      const requirements = quest.requirements as any;
      
      // Check minimum reputation requirement
      if (requirements.minReputation !== undefined) {
        const userProfile = await this.prisma.reputationProfile.findUnique({
          where: { userId: takerId },
          select: { averageRating: true, totalDeals: true },
        });
        
        // Use average rating as reputation score (0-5 scale)
        const currentReputation = userProfile?.averageRating ? Number(userProfile.averageRating) : 0;
        if (currentReputation < requirements.minReputation) {
          throw new Error(
            `Insufficient reputation. Required: ${requirements.minReputation}, Current: ${currentReputation.toFixed(2)}`
          );
        }
      }
      
      // Check required verification level
      if (requirements.verificationLevel) {
        const user = await this.prisma.user.findUnique({
          where: { id: takerId },
          select: { verificationLevel: true },
        });
        
        const levelOrder = ['UNVERIFIED', 'ARBAD_VERIFIED', 'ZUN_VERIFIED', 'FULLY_VERIFIED'];
        const requiredIndex = levelOrder.indexOf(requirements.verificationLevel);
        const currentIndex = levelOrder.indexOf(user?.verificationLevel || 'UNVERIFIED');
        
        if (currentIndex < requiredIndex) {
          throw new Error(
            `Insufficient verification level. Required: ${requirements.verificationLevel}`
          );
        }
      }
      
      // Future: Check required skills when skill system is implemented
      if (requirements.skills && requirements.skills.length > 0) {
        // Skill checking placeholder for future enhancement
      }
    }

    // Update quest
    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        takerId,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
      },
    });

    // Timeline event
    await this.timeline.createEvent({
      type: 'QUEST_ACCEPTED',
      actorId: takerId,
      targetId: quest.giverId,
      title: `Accepted quest: ${quest.title}`,
      metadata: { questId },
    });

    return updated;
  }

  /**
   * Update quest progress
   */
  async updateProgress(questId: string, takerId: string, objectives: any[]) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest || quest.takerId !== takerId) {
      throw new Error('Not your quest');
    }

    // Calculate progress
    const completed = objectives.filter(obj => obj.completed).length;
    const progress = Math.round((completed / objectives.length) * 100);

    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        objectives,
        progress,
        status: progress === 100 ? 'IN_PROGRESS' : quest.status,
      },
    });
  }

  /**
   * Submit quest for review
   */
  async submitQuest(questId: string, takerId: string, evidence: any[]) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest || quest.takerId !== takerId) {
      throw new Error('Not your quest');
    }

    if (quest.progress < 100) {
      throw new Error('Quest not complete');
    }

    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submissions: evidence,
      },
    });

    // Timeline event
    await this.timeline.createEvent({
      type: 'QUEST_SUBMITTED',
      actorId: takerId,
      targetId: quest.giverId,
      title: `Submitted quest: ${quest.title}`,
      metadata: { questId },
    });

    return updated;
  }

  /**
   * Approve quest completion
   */
  async approveQuest(
    questId: string,
    giverId: string,
    rating: number,
    feedback?: string,
  ) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      include: { taker: true },
    });

    if (!quest || quest.giverId !== giverId) {
      throw new Error('Not your quest');
    }

    if (quest.status !== 'SUBMITTED') {
      throw new Error('Quest not submitted');
    }

    // Update quest
    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        takerRating: rating,
        giverFeedback: feedback,
      },
    });

    // Update reputation for quest taker
    await this.reputation.updateStats({
      userId: quest.takerId!,
      dealType: 'quest',
      success: true,
      rating,
    });

    // Check milestones
    await this.reputation.checkMilestones(quest.takerId!);

    // TODO: Pay reward (ALTAN transfer)
    // if (quest.rewardAltan) {
    //   await this.wallet.transfer(giverId, quest.takerId, quest.rewardAltan);
    // }

    // Timeline event
    await this.timeline.createEvent({
      type: 'QUEST_COMPLETED',
      actorId: giverId,
      targetId: quest.takerId,
      title: `Approved quest: ${quest.title}`,
      metadata: { questId, rating },
    });

    return updated;
  }

  /**
   * Reject quest submission
   */
  async rejectQuest(
    questId: string,
    giverId: string,
    feedback: string,
  ) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest || quest.giverId !== giverId) {
      throw new Error('Not your quest');
    }

    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: 'REJECTED',
        giverFeedback: feedback,
      },
    });

    // Timeline event
    await this.timeline.createEvent({
      type: 'QUEST_REJECTED',
      actorId: giverId,
      targetId: quest.takerId,
      title: `Rejected quest: ${quest.title}`,
      metadata: { questId },
    });

    return updated;
  }

  /**
   * Get available quests
   */
  async getAvailableQuests(filters?: {
    minReward?: number;
    maxDistance?: number;
  }) {
    return this.prisma.quest.findMany({
      where: {
        status: 'OPEN',
        ...(filters?.minReward && {
          rewardAltan: { gte: filters.minReward },
        }),
      },
      include: {
        giver: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get my quests (given or taken)
   */
  async getMyQuests(userId: string, role: 'giver' | 'taker' | 'all' = 'all') {
    return this.prisma.quest.findMany({
      where: {
        ...(role === 'giver' && { giverId: userId }),
        ...(role === 'taker' && { takerId: userId }),
        ...(role === 'all' && {
          OR: [{ giverId: userId }, { takerId: userId }],
        }),
      },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get quest by ID
   */
  async getQuest(questId: string) {
    return this.prisma.quest.findUnique({
      where: { id: questId },
      include: {
        giver: { select: { id: true, username: true } },
        taker: { select: { id: true, username: true } },
      },
    });
  }
}
