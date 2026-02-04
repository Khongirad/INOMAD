import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-migration';

@Injectable()
export class WarrantService {
  constructor(
    @Inject('MIGRATION_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Request a warrant for accessing citizen data
   */
  async requestWarrant(data: {
    requestedBy: string;
    agency: string;
    warrantNumber: string;
    courtName: string;
    judgeName: string;
    reason: string;
    targetUserId: string;
  }) {
    return this.prisma.warrant.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });
  }

  /**
   * Approve warrant (admin/migration officer)
   */
  async approveWarrant(
    warrantId: string,
    approverId: string,
    validityDays: number = 30,
  ) {
    const validFrom = new Date();
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    return this.prisma.warrant.update({
      where: { id: warrantId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        validFrom,
        validUntil,
      },
    });
  }

  /**
   * Reject warrant
   */
  async rejectWarrant(warrantId: string, approverId: string) {
    return this.prisma.warrant.update({
      where: { id: warrantId },
      data: {
        status: 'REJECTED',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Check if there's an active warrant for a user
   */
  async getActiveWarrant(targetUserId: string, requesterId: string) {
    return this.prisma.warrant.findFirst({
      where: {
        targetUserId,
        requestedBy: requesterId,
        status: 'APPROVED',
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });
  }

  /**
   * Get all pending warrants (for admin review)
   */
  async getPendingWarrants() {
    return this.prisma.warrant.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Log warrant usage (increment access count)
   */
  async logWarrantUsage(warrantId: string) {
    const warrant = await this.prisma.warrant.findUnique({
      where: { id: warrantId },
    });

    if (!warrant) {
      throw new NotFoundException('Warrant not found');
    }

    return this.prisma.warrant.update({
      where: { id: warrantId },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
  }

  /**
   * Expire old warrants (cron job)
   */
  async expireOldWarrants() {
    return this.prisma.warrant.updateMany({
      where: {
        status: 'APPROVED',
        validUntil: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
