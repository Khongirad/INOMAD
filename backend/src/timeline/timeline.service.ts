import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, EventScope } from '@prisma/client';

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a timeline event
   */
  async createEvent(data: {
    type: EventType;
    scope?: EventScope;
    title: string;
    description?: string;
    actorId?: string;
    targetId?: string;
    location?: string;
    timezone?: string;
    familyId?: string;
    clanId?: string;
    arbanId?: string;
    hordeId?: string;
    nationId?: string;
    isLegalContract?: boolean;
    contractHash?: string;
    witnessIds?: string[];
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    taskId?: string;
  }) {
    return this.prisma.timelineEvent.create({
      data: {
        type: data.type,
        scope: data.scope || EventScope.INDIVIDUAL,
        title: data.title,
        description: data.description,
        actorId: data.actorId,
        targetId: data.targetId,
        location: data.location,
        timezone: data.timezone || 'UTC',
        familyId: data.familyId,
        clanId: data.clanId,
        arbanId: data.arbanId,
        hordeId: data.hordeId,
        nationId: data.nationId,
        isLegalContract: data.isLegalContract || false,
        contractHash: data.contractHash,
        witnessIds: data.witnessIds || [],
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        taskId: data.taskId,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get user's timeline
   */
  async getUserTimeline(
    userId: string,
    options?: {
      scope?: EventScope[];
      types?: EventType[];
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ) {
    const where: any = {
      OR: [
        { actorId: userId },
        { targetId: userId },
      ],
    };

    if (options?.scope?.length) {
      where.scope = { in: options.scope };
    }

    if (options?.types?.length) {
      where.type = { in: options.types };
    }

    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    return this.prisma.timelineEvent.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 100,
    });
  }

  /**
   * Get hierarchical timeline (family/clan/arban/etc)
   */
  async getHierarchicalTimeline(
    scope: EventScope,
    scopeId: string,
    options?: {
      types?: EventType[];
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ) {
    const where: any = {
      scope,
    };

    // Match based on scope
    switch (scope) {
      case EventScope.FAMILY:
        where.familyId = scopeId;
        break;
      case EventScope.CLAN:
        where.clanId = scopeId;
        break;
      case EventScope.ARBAN:
        where.arbanId = scopeId;
        break;
      case EventScope.HORDE:
        where.hordeId = scopeId;
        break;
      case EventScope.NATION:
        where.nationId = scopeId;
        break;
      case EventScope.CONFEDERATION:
        // All events at confederation level
        where.scope = EventScope.CONFEDERATION;
        break;
    }

    if (options?.types?.length) {
      where.type = { in: options.types };
    }

    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    return this.prisma.timelineEvent.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 100,
    });
  }

  /**
   * Record a legal contract event
   */
  async recordContract(data: {
    type: EventType;
    actorId: string;
    targetId?: string;
    title: string;
    description?: string;
    contractHash: string;
    witnessIds: string[];
    location?: string;
    scope?: EventScope;
    metadata?: any;
  }) {
    return this.createEvent({
      ...data,
      isLegalContract: true,
      scope: data.scope || EventScope.INDIVIDUAL,
    });
  }

  /**
   * Get all legal contracts for a user
   */
  async getUserContracts(userId: string) {
    return this.prisma.timelineEvent.findMany({
      where: {
        isLegalContract: true,
        OR: [
          { actorId: userId },
          { targetId: userId },
          {
            witnessIds: {
              has: userId,
            },
          },
        ],
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string) {
    return this.prisma.timelineEvent.findUnique({
      where: { id: eventId },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
          },
        },
        verification: true,
      },
    });
  }
}
