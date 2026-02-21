import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplaintStatus, ComplaintCategory, DisputeSourceType } from '@prisma/client';

/**
 * Hierarchy levels for complaint escalation:
 * 1 = Arbad (Family/Org)
 * 2 = Zun (Company of 100)
 * 3 = Myangad (Battalion of 1000)
 * 4 = Tumed (Division of 10000)
 * 5 = Republic (Republican Khural)
 * 6 = Confederation (Confederative Khural)
 * 7 = Court (CouncilOfJustice)
 */
const LEVEL_NAMES: Record<number, string> = {
  1: 'Арбан',
  2: 'Цзун',
  3: 'Мянган',
  4: 'Тумен',
  5: 'Республика',
  6: 'Конфедерация',
  7: 'Суд',
};

const LEVEL_STATUS: Record<number, ComplaintStatus> = {
  2: 'ESCALATED_L2',
  3: 'ESCALATED_L3',
  4: 'ESCALATED_L4',
  5: 'ESCALATED_L5',
  6: 'ESCALATED_L6',
  7: 'IN_COURT',
};

const ESCALATION_DEADLINE_DAYS = 7;

@Injectable()
export class ComplaintService {
  private readonly logger = new Logger(ComplaintService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * File a new complaint — MUST be bound to a source (contract/quest/work-act)
   */
  async fileComplaint(
    filerId: string,
    data: {
      sourceType: DisputeSourceType;
      sourceId: string;
      category: ComplaintCategory;
      title: string;
      description: string;
      targetUserId?: string;
      targetOrgId?: string;
      evidence?: string[];
      disputeId?: string;
    },
  ) {
    if (!data.targetUserId && !data.targetOrgId) {
      throw new BadRequestException('Жалоба должна быть направлена на пользователя или организацию');
    }

    // Verify the source exists
    await this.verifySource(data.sourceType, data.sourceId);

    // Calculate deadline (7 days from now)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + ESCALATION_DEADLINE_DAYS);

    const complaint = await this.prisma.complaint.create({
      data: {
        filerId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        disputeId: data.disputeId,
        category: data.category,
        title: data.title,
        description: data.description,
        targetUserId: data.targetUserId,
        targetOrgId: data.targetOrgId,
        evidence: data.evidence || [],
        status: 'FILED',
        currentLevel: 1,
        deadline,
      },
      include: {
        filer: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
      },
    });

    // Notify the target
    if (data.targetUserId) {
      await this.prisma.notification.create({
        data: {
          userId: data.targetUserId,
          type: 'COMPLAINT_FILED',
          title: 'Новая жалоба',
          body: `На вас подана жалоба: ${data.title}`,
          linkUrl: `/complaints/${complaint.id}`,
          sourceUserId: filerId,
        },
      });
    }

    this.logger.log(`Complaint filed: ${complaint.id} by ${filerId} (source: ${data.sourceType}/${data.sourceId})`);
    return complaint;
  }

  /**
   * Verify that the source document exists
   */
  private async verifySource(sourceType: DisputeSourceType, sourceId: string) {
    let exists = false;
    switch (sourceType) {
      case 'CONTRACT':
        exists = !!(await this.prisma.documentContract.findUnique({ where: { id: sourceId } }));
        break;
      case 'QUEST':
        exists = !!(await this.prisma.quest.findUnique({ where: { id: sourceId } }));
        break;
      case 'WORK_ACT':
        exists = !!(await this.prisma.workAct.findUnique({ where: { id: sourceId } }));
        break;
    }
    if (!exists) {
      throw new BadRequestException(`Источник не найден: ${sourceType}/${sourceId}`);
    }
  }

  /**
   * Get complaint by ID with full details
   */
  async getComplaint(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        filer: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        assignee: { select: { id: true, username: true } },
        dispute: true,
        responses: {
          include: { responder: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
        escalationHistory: {
          include: { escalatedBy: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) throw new NotFoundException('Жалоба не найдена');
    return complaint;
  }

  /**
   * List complaints with filters (includes hierarchy level filter)
   */
  async listComplaints(filters?: {
    filerId?: string;
    targetUserId?: string;
    targetOrgId?: string;
    status?: ComplaintStatus;
    category?: ComplaintCategory;
    currentLevel?: number;
    levelEntityId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.filerId) where.filerId = filters.filerId;
    if (filters?.targetUserId) where.targetUserId = filters.targetUserId;
    if (filters?.targetOrgId) where.targetOrgId = filters.targetOrgId;
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.currentLevel) where.currentLevel = filters.currentLevel;
    if (filters?.levelEntityId) where.levelEntityId = filters.levelEntityId;

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          filer: { select: { id: true, username: true } },
          targetUser: { select: { id: true, username: true } },
          assignee: { select: { id: true, username: true } },
          _count: { select: { responses: true, escalationHistory: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return { complaints, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Respond to a complaint
   */
  async respond(
    complaintId: string,
    responderId: string,
    body: string,
    isOfficial: boolean = false,
    attachments?: string[],
  ) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Жалоба не найдена');

    const response = await this.prisma.complaintResponse.create({
      data: {
        complaintId,
        responderId,
        body,
        isOfficial,
        attachments: attachments || [],
      },
      include: { responder: { select: { id: true, username: true } } },
    });

    if (isOfficial && complaint.status === 'FILED') {
      await this.prisma.complaint.update({
        where: { id: complaintId },
        data: { status: 'RESPONDED' },
      });
    }

    await this.prisma.notification.create({
      data: {
        userId: complaint.filerId,
        type: 'COMPLAINT_RESPONSE',
        title: 'Ответ на жалобу',
        body: `Получен ответ на жалобу: ${complaint.title}`,
        linkUrl: `/complaints/${complaintId}`,
        sourceUserId: responderId,
      },
    });

    return response;
  }

  /**
   * Assign a reviewer to the complaint (typically the leader at current hierarchy level)
   */
  async assignReviewer(complaintId: string, assigneeId: string) {
    const complaint = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { assigneeId, status: 'UNDER_REVIEW' },
      include: { assignee: { select: { id: true, username: true } } },
    });

    await this.prisma.notification.create({
      data: {
        userId: assigneeId,
        type: 'COMPLAINT_FILED',
        title: 'Жалоба назначена вам',
        body: `Вам назначена жалоба для рассмотрения: ${complaint.title}`,
        linkUrl: `/complaints/${complaintId}`,
      },
    });

    return complaint;
  }

  /**
   * Escalate complaint to the NEXT hierarchy level
   * If at level 6 (Confederation), the next step is Court (level 7)
   */
  async escalateToNextLevel(
    complaintId: string,
    escalatedById: string,
    reason: string,
  ) {
    const complaint = await this.getComplaint(complaintId);

    if (complaint.currentLevel >= 7) {
      throw new BadRequestException('Жалоба уже в суде — дальше эскалировать нельзя');
    }

    if (['RESOLVED', 'DISMISSED', 'IN_COURT'].includes(complaint.status)) {
      throw new BadRequestException('Жалоба уже закрыта или в суде');
    }

    const fromLevel = complaint.currentLevel;
    const toLevel = fromLevel + 1;
    const newStatus = LEVEL_STATUS[toLevel] || 'UNDER_REVIEW';

    // Calculate new deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + ESCALATION_DEADLINE_DAYS);

    // Create escalation record
    await this.prisma.escalationRecord.create({
      data: {
        complaintId,
        fromLevel,
        toLevel,
        fromEntityId: complaint.levelEntityId,
        reason,
        escalatedById,
        isAutomatic: false,
      },
    });

    // Update complaint
    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        currentLevel: toLevel,
        status: newStatus,
        assigneeId: null, // Clear assignee for new level
        levelEntityId: null, // Will be set when leader claims it
        deadline,
      },
    });

    // Notify filer
    await this.prisma.notification.create({
      data: {
        userId: complaint.filerId,
        type: 'COMPLAINT_ESCALATED',
        title: `Жалоба передана на уровень: ${LEVEL_NAMES[toLevel]}`,
        body: `Жалоба "${complaint.title}" передана на рассмотрение: ${LEVEL_NAMES[toLevel]}`,
        linkUrl: `/complaints/${complaintId}`,
      },
    });

    this.logger.warn(
      `Complaint ${complaintId} escalated: ${LEVEL_NAMES[fromLevel]} → ${LEVEL_NAMES[toLevel]}`,
    );

    // If escalated to court (level 7), handle court filing
    if (toLevel === 7) {
      await this.fileToCourt(complaintId);
    }

    return updated;
  }

  /**
   * Escalate directly to court (bypass hierarchy) — the "hard path"
   */
  async escalateToCourt(complaintId: string) {
    const complaint = await this.getComplaint(complaintId);

    if (complaint.status === 'IN_COURT') {
      throw new BadRequestException('Жалоба уже в суде');
    }

    const fromLevel = complaint.currentLevel;

    // Create escalation record
    await this.prisma.escalationRecord.create({
      data: {
        complaintId,
        fromLevel,
        toLevel: 7,
        fromEntityId: complaint.levelEntityId,
        reason: 'Прямая передача в суд',
        isAutomatic: false,
      },
    });

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'IN_COURT',
        currentLevel: 7,
      },
    });

    await this.fileToCourt(complaintId);

    await this.prisma.notification.create({
      data: {
        userId: complaint.filerId,
        type: 'COMPLAINT_ESCALATED',
        title: 'Жалоба передана в суд',
        body: `Жалоба "${complaint.title}" передана на судебное рассмотрение`,
        linkUrl: `/complaints/${complaintId}`,
      },
    });

    this.logger.warn(`Complaint ${complaintId} escalated directly to court from level ${fromLevel}`);
    return updated;
  }

  /**
   * Internal: file complaint as a CouncilOfJustice case
   */
  private async fileToCourt(complaintId: string) {
    // This will be connected to justice.fileCase() in a future integration
    this.logger.log(`Court case should be created for complaint: ${complaintId}`);
  }

  /**
   * Resolve a complaint
   */
  async resolve(complaintId: string, resolution: string) {
    const complaint = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date(),
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: complaint.filerId,
        type: 'COMPLAINT_RESOLVED',
        title: 'Жалоба решена',
        body: `Ваша жалоба "${complaint.title}" решена`,
        linkUrl: `/complaints/${complaintId}`,
      },
    });

    return complaint;
  }

  /**
   * Dismiss a complaint
   */
  async dismiss(complaintId: string, reason: string) {
    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'DISMISSED',
        resolution: `Отклонено: ${reason}`,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Get complaint statistics with hierarchy breakdown
   */
  async getStats() {
    const [total, filed, underReview, responded, inCourt, resolved, dismissed] =
      await Promise.all([
        this.prisma.complaint.count(),
        this.prisma.complaint.count({ where: { status: 'FILED' } }),
        this.prisma.complaint.count({ where: { status: 'UNDER_REVIEW' } }),
        this.prisma.complaint.count({ where: { status: 'RESPONDED' } }),
        this.prisma.complaint.count({ where: { status: 'IN_COURT' } }),
        this.prisma.complaint.count({ where: { status: 'RESOLVED' } }),
        this.prisma.complaint.count({ where: { status: 'DISMISSED' } }),
      ]);

    // Count by level
    const byLevel = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7].map(async (level) => ({
        level,
        name: LEVEL_NAMES[level],
        count: await this.prisma.complaint.count({
          where: { currentLevel: level, status: { notIn: ['RESOLVED', 'DISMISSED'] } },
        }),
      })),
    );

    return { total, filed, underReview, responded, inCourt, resolved, dismissed, byLevel };
  }

  /**
   * Get complaint book — complaints visible at a specific hierarchy level
   * Leaders at each level see only complaints in their jurisdiction
   */
  async getComplaintBook(level: number, entityId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      currentLevel: level,
      status: { notIn: ['RESOLVED', 'DISMISSED'] },
    };
    if (entityId) {
      where.levelEntityId = entityId;
    }

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        include: {
          filer: { select: { id: true, username: true } },
          targetUser: { select: { id: true, username: true } },
          assignee: { select: { id: true, username: true } },
          _count: { select: { responses: true, escalationHistory: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      level,
      levelName: LEVEL_NAMES[level],
      complaints,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Auto-escalate overdue complaints (called by scheduler)
   */
  async autoEscalateOverdue() {
    const overdue = await this.prisma.complaint.findMany({
      where: {
        deadline: { lt: new Date() },
        status: { notIn: ['RESOLVED', 'DISMISSED', 'IN_COURT'] },
        currentLevel: { lt: 7 },
      },
    });

    let escalated = 0;
    for (const complaint of overdue) {
      try {
        const toLevel = complaint.currentLevel + 1;
        const newStatus = LEVEL_STATUS[toLevel] || 'UNDER_REVIEW';

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + ESCALATION_DEADLINE_DAYS);

        await this.prisma.escalationRecord.create({
          data: {
            complaintId: complaint.id,
            fromLevel: complaint.currentLevel,
            toLevel,
            fromEntityId: complaint.levelEntityId,
            reason: `Авто-эскалация: срок рассмотрения истёк (${ESCALATION_DEADLINE_DAYS} дней)`,
            isAutomatic: true,
          },
        });

        await this.prisma.complaint.update({
          where: { id: complaint.id },
          data: {
            currentLevel: toLevel,
            status: newStatus,
            assigneeId: null,
            levelEntityId: null,
            deadline,
          },
        });

        if (toLevel === 7) {
          await this.fileToCourt(complaint.id);
        }

        await this.prisma.notification.create({
          data: {
            userId: complaint.filerId,
            type: 'COMPLAINT_ESCALATED',
            title: `Жалоба авто-передана: ${LEVEL_NAMES[toLevel]}`,
            body: `Жалоба "${complaint.title}" автоматически передана выше из-за истечения срока`,
            linkUrl: `/complaints/${complaint.id}`,
          },
        });

        escalated++;
      } catch (e) {
        this.logger.error(`Failed to auto-escalate complaint ${complaint.id}: ${e.message}`);
      }
    }

    if (escalated > 0) {
      this.logger.log(`Auto-escalated ${escalated} overdue complaints`);
    }

    return { escalated, total: overdue.length };
  }
}
