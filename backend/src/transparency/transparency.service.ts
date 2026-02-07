import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from './activity-log.service';

@Injectable()
export class TransparencyService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  /**
   * Get public reports (aggregated)
   */
  async getPublicReports(powerBranch?: string) {
    return this.prisma.branchActivityReport.findMany({
      where: {
        isPublic: true,
        ...(powerBranch && { powerBranch: powerBranch as any }),
      },
      orderBy: { periodStart: 'desc' },
      take: 50,
    });
  }

  /**
   * Get transparency dashboard stats
   */
  async getDashboardStats() {
    const [
      totalActivities,
      activitiesByBranch,
      recentReports,
    ] = await Promise.all([
      this.prisma.activityEntry.count(),
      this.prisma.activityEntry.groupBy({
        by: ['powerBranch'],
        _count: true,
      }),
      this.prisma.branchActivityReport.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalActivities,
      activitiesByBranch,
      recentReports,
    };
  }
}
