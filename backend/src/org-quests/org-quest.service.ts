import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestStatus } from '@prisma/client';
import { RegionalReputationService } from '../regional-reputation/regional-reputation.service';

/**
 * OrgQuestService — Unified task board for organizations.
 *
 * Every organization — guilds, courts, banks, ministries — gets the same
 * standardized task interface. Tasks are specialized by category and can
 * be executed via smart contracts.
 *
 * Flow: Create → Browse → Accept → Work → Submit → Approve/Reject
 */
@Injectable()
export class OrgQuestService {
  private readonly logger = new Logger(OrgQuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regionalReputation: RegionalReputationService,
  ) {}

  // ────────────────────────────────────
  // CREATE TASK
  // ────────────────────────────────────

  async createTask(
    orgId: string,
    creatorId: string,
    data: {
      title: string;
      description: string;
      objectives: Array<{ description: string }>;
      category: string;
      visibility?: 'ORG_ONLY' | 'BRANCH' | 'PUBLIC';
      requiredRole?: string;
      requiredSkills?: any;
      minReputation?: number;
      rewardAltan?: number;
      reputationGain?: number;
      deadline?: string;
      estimatedDuration?: number;
    },
  ) {
    // Verify org exists and user is a member with canCreateTasks
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Организация не найдена');

    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: creatorId } },
    });
    if (!membership) throw new ForbiddenException('Вы не являетесь членом организации');

    // Check permission
    const perms = await this.prisma.orgPermission.findUnique({
      where: { organizationId_role: { organizationId: orgId, role: membership.role } },
    });
    if (!perms || !(perms as any).canCreateTasks) {
      throw new ForbiddenException('У вас нет права создавать задачи (роль: ' + membership.role + ')');
    }

    const objectives = data.objectives.map((o) => ({
      description: o.description,
      completed: false,
    }));

    // ── Auto-detect republicId from org leader's Tumed ──
    let republicId: string | undefined;
    if (org.leaderId) {
      // Check if the org leader is also a Tumed leader
      const tumed = await this.prisma.tumed.findFirst({
        where: { leaderUserId: org.leaderId },
        select: { republicId: true },
      });
      if (tumed?.republicId) republicId = tumed.republicId;
    }

    const task = await this.prisma.orgQuest.create({
      data: {
        organizationId: orgId,
        creatorId,
        republicId,
        title: data.title,
        description: data.description,
        objectives,
        category: data.category.toUpperCase(),
        visibility: data.visibility || 'ORG_ONLY',
        requiredRole: data.requiredRole,
        requiredSkills: data.requiredSkills,
        minReputation: data.minReputation,
        rewardAltan: data.rewardAltan,
        reputationGain: data.reputationGain,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        estimatedDuration: data.estimatedDuration,
      },
      include: {
        organization: { select: { id: true, name: true, type: true, powerBranch: true } },
        creator: { select: { id: true, username: true } },
      },
    });

    this.logger.log(`OrgQuest created: "${task.title}" in ${org.name} [${data.category}] republic=${republicId || 'none'}`);
    return task;
  }

  // ────────────────────────────────────
  // TASK BOARD — browse available tasks
  // ────────────────────────────────────

  /**
   * Get the task board for an organization — visible tasks based on membership
   */
  async getOrgTaskBoard(
    orgId: string,
    userId?: string,
    filters?: { category?: string; status?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId };
    if (filters?.category) where.category = filters.category.toUpperCase();
    if (filters?.status) where.status = filters.status;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.orgQuest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true } },
          assignee: { select: { id: true, username: true } },
          organization: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.orgQuest.count({ where }),
    ]);

    return { data: tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Browse all available tasks across organizations (public + branch-visible)
   */
  async browseAvailableTasks(
    userId: string,
    filters?: {
      category?: string;
      powerBranch?: string;
      orgType?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    // Find user's memberships to include ORG_ONLY tasks from their orgs
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const memberOrgIds = memberships.map((m) => m.organizationId);

    // Build WHERE: public tasks + user's org tasks
    const where: any = {
      status: 'OPEN',
      assigneeId: null,
      OR: [
        { visibility: 'PUBLIC' },
        { organizationId: { in: memberOrgIds } },
      ],
    };

    if (filters?.category) where.category = filters.category.toUpperCase();
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
    if (filters?.powerBranch) {
      where.organization = { powerBranch: filters.powerBranch };
    }

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.orgQuest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true } },
          organization: { select: { id: true, name: true, type: true, powerBranch: true } },
        },
      }),
      this.prisma.orgQuest.count({ where }),
    ]);

    return { data: tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ────────────────────────────────────
  // ACCEPT TASK
  // ────────────────────────────────────

  async acceptTask(taskId: string, userId: string) {
    // Pre-check: visibility access for ORG_ONLY tasks
    const task = await this.prisma.orgQuest.findUnique({
      where: { id: taskId },
      include: { organization: true },
    });
    if (!task) throw new NotFoundException('Задача не найдена');

    if (task.visibility === 'ORG_ONLY') {
      const membership = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: task.organizationId, userId } },
      });
      if (!membership) throw new ForbiddenException('Задача доступна только для членов организации');
    }

    // Atomic update: only succeeds if still OPEN + no assignee
    const result = await this.prisma.orgQuest.updateMany({
      where: {
        id: taskId,
        status: 'OPEN',
        assigneeId: null,
        creatorId: { not: userId },
      },
      data: {
        assigneeId: userId,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    if (result.count === 0) {
      if (task.creatorId === userId) throw new BadRequestException('Нельзя взять свою задачу');
      if (task.assigneeId) throw new BadRequestException('Задача уже назначена');
      throw new BadRequestException('Задача уже занята');
    }

    const updated = await this.prisma.orgQuest.findUnique({
      where: { id: taskId },
      include: {
        organization: { select: { id: true, name: true } },
        assignee: { select: { id: true, username: true } },
      },
    });

    this.logger.log(`Task accepted: "${task.title}" by user ${userId}`);
    return updated;
  }

  // ────────────────────────────────────
  // WORK ON TASK — update progress
  // ────────────────────────────────────

  async updateProgress(taskId: string, userId: string, objectives: any[]) {
    const task = await this.prisma.orgQuest.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.assigneeId !== userId) throw new ForbiddenException('Вы не исполнитель');
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(task.status)) {
      throw new BadRequestException('Задача не в процессе');
    }

    const completed = objectives.filter((o: any) => o.completed).length;
    const progress = objectives.length > 0
      ? Math.round((completed / objectives.length) * 100)
      : 0;

    return this.prisma.orgQuest.update({
      where: { id: taskId },
      data: {
        objectives,
        progress,
        status: progress > 0 && task.status === 'ACCEPTED' ? 'IN_PROGRESS' : task.status,
        startedAt: task.startedAt || new Date(),
      },
    });
  }

  // ────────────────────────────────────
  // SUBMIT / APPROVE / REJECT
  // ────────────────────────────────────

  async submitTask(taskId: string, userId: string, evidence: any[]) {
    const task = await this.prisma.orgQuest.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.assigneeId !== userId) throw new ForbiddenException('Вы не исполнитель');

    return this.prisma.orgQuest.update({
      where: { id: taskId },
      data: { status: 'SUBMITTED', submissions: evidence, submittedAt: new Date() },
    });
  }

  async approveTask(taskId: string, userId: string, rating: number, feedback?: string) {
    const task = await this.prisma.orgQuest.findUnique({
      where: { id: taskId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.creatorId !== userId) throw new ForbiddenException('Только создатель может одобрить');
    if (task.status !== 'SUBMITTED') throw new BadRequestException('Задача не на проверке');

    const updated = await this.prisma.orgQuest.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        creatorRating: rating,
        creatorFeedback: feedback,
        completedAt: new Date(),
      },
    });

    // ── Award regional reputation to assignee ──
    if (task.assigneeId && task.republicId) {
      const points = task.reputationGain || 50; // Default 50 points per quest
      try {
        await this.regionalReputation.awardPoints(
          task.assigneeId,
          task.republicId,
          'QUEST_COMPLETED',
          points,
          `Квест «${task.title}» выполнен в ${task.organization.name}`,
          { questId: task.id, orgId: task.organizationId },
        );
        this.logger.log(`Reputation +${points} awarded to ${task.assigneeId} in republic ${task.republicId}`);
      } catch (err) {
        this.logger.error(`Failed to award reputation: ${err}`);
      }
    }

    return updated;
  }

  async rejectTask(taskId: string, userId: string, feedback: string) {
    const task = await this.prisma.orgQuest.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.creatorId !== userId) throw new ForbiddenException('Только создатель может отклонить');
    if (task.status !== 'SUBMITTED') throw new BadRequestException('Задача не на проверке');

    return this.prisma.orgQuest.update({
      where: { id: taskId },
      data: { status: 'REJECTED', creatorFeedback: feedback },
    });
  }

  // ────────────────────────────────────
  // MY TASKS
  // ────────────────────────────────────

  async getMyTasks(userId: string, role: 'creator' | 'assignee' | 'all' = 'all') {
    const where: any = {};
    if (role === 'creator') where.creatorId = userId;
    else if (role === 'assignee') where.assigneeId = userId;
    else where.OR = [{ creatorId: userId }, { assigneeId: userId }];

    return this.prisma.orgQuest.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, type: true, powerBranch: true } },
        creator: { select: { id: true, username: true } },
        assignee: { select: { id: true, username: true } },
      },
    });
  }

  async getTask(taskId: string) {
    const task = await this.prisma.orgQuest.findUnique({
      where: { id: taskId },
      include: {
        organization: { select: { id: true, name: true, type: true, powerBranch: true } },
        creator: { select: { id: true, username: true } },
        assignee: { select: { id: true, username: true } },
      },
    });
    if (!task) throw new NotFoundException('Задача не найдена');
    return task;
  }
}
