import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a system action (Internal/Security)
   */
  async logAction(userId: string | null, action: string, resourceType?: string, resourceId?: string, metadata?: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          metadata: metadata ? metadata : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log action: ${action}`, error);
      // Fail-safe: Don't crash main thread if logging fails, but maybe alert admin
    }
  }

  /**
   * Log a high-level Governance Event (Public History)
   */
  async logEvent(type: 'SESSION_START' | 'DECREE_SIGNED' | 'APPOINTMENT' | 'AMENDMENT' | 'EMERGENCY', title: string, description: string, relatedProposalId?: string) {
    return this.prisma.khuralEvent.create({
      data: {
        type,
        title,
        description,
        relatedProposalId,
      },
    });
  }

  /**
   * Get internal audit logs (Admin only)
   */
  async getLogs(limit = 50, offset = 0) {
    return this.prisma.auditLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, seatId: true } } },
    });
  }

  /**
   * Get public history (Archives)
   */
  async getPublicHistory(limit = 50, offset = 0) {
    return this.prisma.khuralEvent.findMany({
      take: limit,
      skip: offset,
      orderBy: { date: 'desc' },
    });
  }
}
