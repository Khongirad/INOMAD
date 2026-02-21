import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PowerBranchType, HierarchyLevel, Prisma } from '@prisma/client';

export interface LogActivityParams {
  actionName: string;
  actionDescription: string;
  actionParameters: Record<string, any>;
  performedByUserId: string;
  powerBranch: PowerBranchType;
  orgArbadId?: string;
  hierarchyLevel?: HierarchyLevel;
  templateId?: string;
  txHash?: string;
  blockNumber?: bigint;
  contractAddress?: string;
  durationMinutes?: number;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a new activity entry with minute-level precision
   */
  async logActivity(params: LogActivityParams) {
    try {
      const activity = await this.prisma.activityEntry.create({
        data: {
          actionName: params.actionName,
          actionDescription: params.actionDescription,
          actionParameters: params.actionParameters as Prisma.InputJsonValue,
          performedByUserId: params.performedByUserId,
          powerBranch: params.powerBranch,
          orgArbadId: params.orgArbadId,
          hierarchyLevel: params.hierarchyLevel,
          templateId: params.templateId,
          txHash: params.txHash,
          blockNumber: params.blockNumber,
          contractAddress: params.contractAddress,
          durationMinutes: params.durationMinutes,
          performedAt: new Date(),
        },
        include: {
          performedBy: { select: { seatId: true, username: true } },
          orgArbad: { select: { name: true, powerBranch: true } },
          template: { select: { code: true, name: true } },
        },
      });

      this.logger.log(
        `Activity logged: ${params.actionName} by user ${params.performedByUserId}`,
      );
      return activity;
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get activity timeline (minute-by-minute)
   */
  async getActivities(options: {
    powerBranch?: PowerBranchType;
    hierarchyLevel?: HierarchyLevel;
    orgArbadId?: string;
    startTime?: Date;
    endTime?: Date;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ActivityEntryWhereInput = {};

    if (options.powerBranch) where.powerBranch = options.powerBranch;
    if (options.hierarchyLevel) where.hierarchyLevel = options.hierarchyLevel;
    if (options.orgArbadId) where.orgArbadId = options.orgArbadId;
    if (options.userId) where.performedByUserId = options.userId;
    if (options.startTime || options.endTime) {
      where.performedAt = {};
      if (options.startTime) where.performedAt.gte = options.startTime;
      if (options.endTime) where.performedAt.lte = options.endTime;
    }

    const [activities, total] = await Promise.all([
      this.prisma.activityEntry.findMany({
        where,
        include: {
          performedBy: { select: { seatId: true, username: true } },
          orgArbad: { select: { name: true, powerBranch: true } },
          template: { select: { code: true, name: true } },
        },
        orderBy: { performedAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.activityEntry.count({ where }),
    ]);

    return { activities, total };
  }

  /**
   * Get activities for specific hierarchy rollup (e.g., all activities from Arbad to Republic)
   */
  async getHierarchyActivities(
    powerBranch: PowerBranchType,
    startLevel: HierarchyLevel,
    endLevel: HierarchyLevel,
    startTime?: Date,
    endTime?: Date,
  ) {
    const levelOrder = [
      'LEVEL_1',
      'LEVEL_10',
      'LEVEL_100',
      'LEVEL_1000',
      'LEVEL_10000',
      'REPUBLIC',
      'CONFEDERATION',
    ];
    const startIdx = levelOrder.indexOf(startLevel);
    const endIdx = levelOrder.indexOf(endLevel);
    const levelsInRange = levelOrder.slice(startIdx, endIdx + 1) as HierarchyLevel[];

    const where: Prisma.ActivityEntryWhereInput = {
      powerBranch,
      hierarchyLevel: { in: levelsInRange },
    };

    if (startTime || endTime) {
      where.performedAt = {};
      if (startTime) where.performedAt.gte = startTime;
      if (endTime) where.performedAt.lte = endTime;
    }

    return this.prisma.activityEntry.findMany({
      where,
      include: {
        performedBy: { select: { seatId: true, username: true } },
        orgArbad: { select: { name: true, powerBranch: true } },
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { performedAt: 'desc' }],
    });
  }

  /**
   * Generate activity summary (резюме работы) for export
   */
  async generateActivitySummary(options: {
    orgArbadId?: string;
    userId?: string;
    startDate: Date;
    endDate: Date;
    powerBranch?: PowerBranchType;
  }) {
    const where: Prisma.ActivityEntryWhereInput = {
      performedAt: {
        gte: options.startDate,
        lte: options.endDate,
      },
    };

    if (options.orgArbadId) where.orgArbadId = options.orgArbadId;
    if (options.userId) where.performedByUserId = options.userId;
    if (options.powerBranch) where.powerBranch = options.powerBranch;

    const activities = await this.prisma.activityEntry.findMany({
      where,
      include: {
        performedBy: { select: { seatId: true, username: true } },
        template: { select: { code: true, name: true } },
      },
      orderBy: { performedAt: 'asc' },
    });

    const summary = {
      period: {
        start: options.startDate,
        end: options.endDate,
      },
      totalActivities: activities.length,
      totalDurationMinutes: activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0),
      byPowerBranch: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
      activities: activities.map((a) => ({
        date: a.performedAt.toISOString(),
        action: a.actionName,
        description: a.actionDescription,
        duration: a.durationMinutes,
        template: a.template?.name,
      })),
    };

    // Group by power branch
    activities.forEach((a) => {
      summary.byPowerBranch[a.powerBranch] = (summary.byPowerBranch[a.powerBranch] || 0) + 1;
    });

    // Group by day
    activities.forEach((a) => {
      const day = a.performedAt.toISOString().split('T')[0];
      summary.byDay[day] = (summary.byDay[day] || 0) + 1;
    });

    return summary;
  }

  /**
   * Auto-aggregate activities into hourly/daily reports
   */
  async aggregateActivities(
    periodType: 'HOURLY' | 'DAILY' | 'WEEKLY',
    powerBranch: PowerBranchType,
    hierarchyLevel?: HierarchyLevel,
  ) {
    // Implementation for auto-aggregation
    // This would be called by a cron job or on-demand
    const now = new Date();
    const periodStart = new Date(now);
    
    if (periodType === 'HOURLY') {
      periodStart.setHours(now.getHours() - 1);
    } else if (periodType === 'DAILY') {
      periodStart.setDate(now.getDate() - 1);
    } else if (periodType === 'WEEKLY') {
      periodStart.setDate(now.getDate() - 7);
    }

    const { activities, total } = await this.getActivities({
      powerBranch,
      hierarchyLevel,
      startTime: periodStart,
      endTime: now,
    });

    const summary = `${total} activities performed in ${powerBranch} branch${
      hierarchyLevel ? ` at ${hierarchyLevel} level` : ''
    } during this ${periodType.toLowerCase()} period.`;

    // Create aggregated report
    const report = await this.prisma.branchActivityReport.create({
      data: {
        powerBranch,
        hierarchyLevel,
        periodStart,
        periodEnd: now,
        periodType,
        title: `${powerBranch} ${periodType} Report`,
        summary,
        totalActivities: total,
      },
    });

    // Link activities to report
    await this.prisma.activityEntry.updateMany({
      where: {
        id: { in: activities.map((a) => a.id) },
      },
      data: {
        reportId: report.id,
      },
    });

    return report;
  }
}
