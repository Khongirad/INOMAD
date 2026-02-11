import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification for a user
   */
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    icon?: string;
    linkUrl?: string;
    sourceOrgId?: string;
    sourceUserId?: string;
    resourceId?: string;
    resourceType?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Send notification to all members of an organization
   */
  async notifyOrganization(
    orgId: string,
    data: {
      type: NotificationType;
      title: string;
      body: string;
      icon?: string;
      linkUrl?: string;
      sourceUserId?: string;
      resourceId?: string;
      resourceType?: string;
    },
    excludeUserId?: string,
  ) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: { userId: true },
    });

    const notifications = members
      .filter((m) => m.userId !== excludeUserId)
      .map((m) => ({
        userId: m.userId,
        ...data,
        sourceOrgId: orgId,
      }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }

    return { sent: notifications.length };
  }

  /**
   * Get notifications for a user (paginated)
   */
  async getForUser(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      type?: NotificationType;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.unreadOnly) where.isRead = false;
    if (options?.type) where.type = options.type;

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { markedAsRead: result.count };
  }

  /**
   * Dismiss a notification
   */
  async dismiss(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isDismissed: true, dismissedAt: new Date() },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }
}
