import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventScope, UserRole } from '@prisma/client';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create historical record
   */
  async createRecord(data: {
    scope: EventScope;
    scopeId: string;
    periodStart: Date;
    periodEnd?: Date;
    title: string;
    narrative: string;
    authorId: string;
    eventIds: string[];
  }) {
    return this.prisma.historicalRecord.create({
      data: {
        scope: data.scope,
        scopeId: data.scopeId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        title: data.title,
        narrative: data.narrative,
        authorId: data.authorId,
        eventIds: data.eventIds,
        isPublished: false,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get historical records for scope
   */
  async getHistory(scope: EventScope, scopeId: string, publishedOnly = true) {
    return this.prisma.historicalRecord.findMany({
      where: {
        scope,
        scopeId,
        ...(publishedOnly && { isPublished: true }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });
  }

  /**
   * Get user's authored narratives
   */
  async getUserNarratives(userId: string) {
    return this.prisma.historicalRecord.findMany({
      where: {
        authorId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Publish historical record (specialists/admin only)
   */
  async publishRecord(recordId: string, reviewerId: string) {
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
    });

    if (!reviewer) {
      throw new NotFoundException('Reviewer not found');
    }

    // Check if user has permission (admin or specialist role)
    // For now, admins can publish
    if (!([UserRole.ADMIN, UserRole.CREATOR] as const).includes(reviewer.role as any)) {
      throw new ForbiddenException('Only admins can publish historical records');
    }

    const record = await this.prisma.historicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Historical record not found');
    }

    return this.prisma.historicalRecord.update({
      where: { id: recordId },
      data: {
        isPublished: true,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Update historical record
   */
  async updateRecord(
    recordId: string,
    userId: string,
    data: {
      title?: string;
      narrative?: string;
      periodStart?: Date;
      periodEnd?: Date;
      eventIds?: string[];
    },
  ) {
    const record = await this.prisma.historicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Historical record not found');
    }

    if (record.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own records');
    }

    if (record.isPublished) {
      throw new ForbiddenException('Cannot edit published records');
    }

    return this.prisma.historicalRecord.update({
      where: { id: recordId },
      data,
    });
  }

  /**
   * Delete historical record
   */
  async deleteRecord(recordId: string, userId: string) {
    const record = await this.prisma.historicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Historical record not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Can delete if: 1) author and unpublished, or 2) admin
    const isAdmin = user && ([UserRole.ADMIN, UserRole.CREATOR] as const).includes(user.role as any);
    const isAuthorUnpublished = record.authorId === userId && !record.isPublished;

    if (!isAdmin && !isAuthorUnpublished) {
      throw new ForbiddenException('Cannot delete this record');
    }

    await this.prisma.historicalRecord.delete({
      where: { id: recordId },
    });

    return { success: true };
  }

  /**
   * Get record by ID
   */
  async getRecord(recordId: string) {
    const record = await this.prisma.historicalRecord.findUnique({
      where: { id: recordId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Historical record not found');
    }

    return record;
  }
}
