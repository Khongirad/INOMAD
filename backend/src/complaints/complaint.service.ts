import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplaintStatus, ComplaintCategory } from '@prisma/client';

@Injectable()
export class ComplaintService {
  private readonly logger = new Logger(ComplaintService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * File a new complaint
   */
  async fileComplaint(
    filerId: string,
    data: {
      category: ComplaintCategory;
      title: string;
      description: string;
      targetUserId?: string;
      targetOrgId?: string;
      evidence?: string[];
    },
  ) {
    if (!data.targetUserId && !data.targetOrgId) {
      throw new BadRequestException('A complaint must target a user or organization');
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        filerId,
        category: data.category,
        title: data.title,
        description: data.description,
        targetUserId: data.targetUserId,
        targetOrgId: data.targetOrgId,
        evidence: data.evidence || [],
        status: 'FILED',
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

    this.logger.log(`Complaint filed: ${complaint.id} by ${filerId}`);
    return complaint;
  }

  /**
   * Get complaint by ID
   */
  async getComplaint(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        filer: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        assignee: { select: { id: true, username: true } },
        responses: {
          include: { responder: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  /**
   * List complaints with filters
   */
  async listComplaints(filters?: {
    filerId?: string;
    targetUserId?: string;
    targetOrgId?: string;
    status?: ComplaintStatus;
    category?: ComplaintCategory;
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
          _count: { select: { responses: true } },
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
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) throw new NotFoundException('Complaint not found');

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

    // Update status to RESPONDED if first official response
    if (isOfficial && complaint.status === 'FILED') {
      await this.prisma.complaint.update({
        where: { id: complaintId },
        data: { status: 'RESPONDED' },
      });
    }

    // Notify filer
    await this.prisma.notification.create({
      data: {
        userId: complaint.filerId,
        type: 'COMPLAINT_RESPONSE',
        title: 'Ответ на жалобу',
        body: `Получен ответ на вашу жалобу: ${complaint.title}`,
        linkUrl: `/complaints/${complaintId}`,
        sourceUserId: responderId,
      },
    });

    return response;
  }

  /**
   * Assign a reviewer to the complaint
   */
  async assignReviewer(complaintId: string, assigneeId: string) {
    const complaint = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { assigneeId, status: 'UNDER_REVIEW' },
      include: { assignee: { select: { id: true, username: true } } },
    });

    // Notify assignee
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

    // Notify filer
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
   * Escalate complaint to court — creates a CouncilOfJustice case
   */
  async escalate(complaintId: string) {
    const complaint = await this.getComplaint(complaintId);

    if (complaint.status === 'ESCALATED') {
      throw new BadRequestException('Complaint is already escalated');
    }

    // Update complaint status
    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { status: 'ESCALATED' },
    });

    // Notify filer about escalation
    await this.prisma.notification.create({
      data: {
        userId: complaint.filerId,
        type: 'COMPLAINT_ESCALATED',
        title: 'Жалоба передана в суд',
        body: `Жалоба "${complaint.title}" передана на судебное рассмотрение`,
        linkUrl: `/complaints/${complaintId}`,
      },
    });

    this.logger.warn(`Complaint ${complaintId} escalated to court`);
    return updated;
  }

  /**
   * Get complaint statistics
   */
  async getStats() {
    const [total, filed, underReview, responded, escalated, resolved, dismissed] =
      await Promise.all([
        this.prisma.complaint.count(),
        this.prisma.complaint.count({ where: { status: 'FILED' } }),
        this.prisma.complaint.count({ where: { status: 'UNDER_REVIEW' } }),
        this.prisma.complaint.count({ where: { status: 'RESPONDED' } }),
        this.prisma.complaint.count({ where: { status: 'ESCALATED' } }),
        this.prisma.complaint.count({ where: { status: 'RESOLVED' } }),
        this.prisma.complaint.count({ where: { status: 'DISMISSED' } }),
      ]);

    return { total, filed, underReview, responded, escalated, resolved, dismissed };
  }
}
