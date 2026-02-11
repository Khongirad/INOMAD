import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ParliamentService — Khural sessions and voting.
 *
 * Republican Khural: лидеры Тумэнов голосуют на уровне Республики.
 * Confederative Khural: лидеры Тумэнов всех Республик голосуют на уровне Конфедерации.
 *
 * Только лидеры Тумэнов имеют право голоса.
 */
@Injectable()
export class ParliamentService {
  private readonly logger = new Logger(ParliamentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // SESSIONS
  // ────────────────────────────────────

  async createSession(
    userId: string,
    data: {
      level: 'REPUBLICAN' | 'CONFEDERATIVE';
      entityId: string;
      title: string;
      description?: string;
      agenda?: string;
      sessionDate: string;
      quorumRequired?: number;
    },
  ) {
    // Verify the entity exists
    if (data.level === 'REPUBLICAN') {
      const republic = await this.prisma.republicanKhural.findUnique({
        where: { id: data.entityId },
        include: { memberTumens: true },
      });
      if (!republic) throw new NotFoundException('Республика не найдена');

      // Only chairman can convene
      if (republic.chairmanUserId && republic.chairmanUserId !== userId) {
        // Also allow Tumen leaders to convene
        const isTumenLeader = republic.memberTumens.some(t => t.leaderUserId === userId);
        if (!isTumenLeader) {
          throw new ForbiddenException('Только председатель или лидер Тумэна может созвать сессию');
        }
      }
    } else {
      const confederation = await this.prisma.confederativeKhural.findFirst({
        where: { id: data.entityId },
      });
      if (!confederation) throw new NotFoundException('Конфедерация не найдена');
    }

    const session = await this.prisma.khuralSession.create({
      data: {
        level: data.level,
        entityId: data.entityId,
        title: data.title,
        description: data.description,
        agenda: data.agenda,
        sessionDate: new Date(data.sessionDate),
        quorumRequired: data.quorumRequired || 0,
        convenedById: userId,
      },
    });

    this.logger.log(`Khural session created: ${session.id} (${data.level})`);
    return session;
  }

  async listSessions(level?: string, entityId?: string, status?: string) {
    const where: any = {};
    if (level) where.level = level;
    if (entityId) where.entityId = entityId;
    if (status) where.status = status;

    return this.prisma.khuralSession.findMany({
      where,
      include: {
        convenedBy: { select: { id: true, username: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.khuralSession.findUnique({
      where: { id: sessionId },
      include: {
        convenedBy: { select: { id: true, username: true } },
        votes: {
          include: {
            voter: { select: { id: true, username: true } },
            tumen: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    return session;
  }

  async startSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId);
    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException('Сессия уже начата или завершена');
    }
    if (session.convenedById !== userId) {
      throw new ForbiddenException('Только организатор может начать сессию');
    }

    return this.prisma.khuralSession.update({
      where: { id: sessionId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  async completeSession(sessionId: string, userId: string, resolution?: string) {
    const session = await this.getSession(sessionId);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Сессия не в процессе');
    }
    if (session.convenedById !== userId) {
      throw new ForbiddenException('Только организатор может завершить сессию');
    }

    // Calculate quorum
    const voteCount = session.votes.length;
    const quorumMet = voteCount >= session.quorumRequired;

    return this.prisma.khuralSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        quorumMet,
        resolution,
      },
    });
  }

  // ────────────────────────────────────
  // VOTING — only Tumen leaders
  // ────────────────────────────────────

  async castVote(
    sessionId: string,
    userId: string,
    data: { vote: 'FOR' | 'AGAINST' | 'ABSTAIN'; comment?: string },
  ) {
    const session = await this.prisma.khuralSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Голосование доступно только во время сессии');
    }

    // Find the Tumen this user leads
    const tumen = await this.prisma.tumen.findFirst({
      where: { leaderUserId: userId, isActive: true },
    });
    if (!tumen) {
      throw new ForbiddenException('Только лидеры Тумэнов имеют право голоса в Хурале');
    }

    // For Republican level, verify this Tumen belongs to the republic
    if (session.level === 'REPUBLICAN') {
      if (tumen.republicId !== session.entityId) {
        throw new ForbiddenException('Ваш Тумэн не входит в эту Республику');
      }
    }

    // Check for existing vote
    const existing = await this.prisma.khuralVote.findUnique({
      where: { sessionId_voterUserId: { sessionId, voterUserId: userId } },
    });
    if (existing) {
      throw new BadRequestException('Вы уже проголосовали в этой сессии');
    }

    const vote = await this.prisma.khuralVote.create({
      data: {
        sessionId,
        voterUserId: userId,
        tumenId: tumen.id,
        vote: data.vote,
        comment: data.comment,
      },
    });

    this.logger.log(`Vote cast: user ${userId} → ${data.vote} (session ${sessionId})`);
    return vote;
  }

  async getVoteResults(sessionId: string) {
    const session = await this.prisma.khuralSession.findUnique({
      where: { id: sessionId },
      include: {
        votes: {
          include: {
            voter: { select: { id: true, username: true } },
            tumen: { select: { id: true, name: true, totalMembers: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Сессия не найдена');

    const forVotes = session.votes.filter(v => v.vote === 'FOR');
    const againstVotes = session.votes.filter(v => v.vote === 'AGAINST');
    const abstainVotes = session.votes.filter(v => v.vote === 'ABSTAIN');

    return {
      session: {
        id: session.id,
        title: session.title,
        level: session.level,
        status: session.status,
        quorumRequired: session.quorumRequired,
        quorumMet: session.quorumMet,
        resolution: session.resolution,
      },
      results: {
        total: session.votes.length,
        for: forVotes.length,
        against: againstVotes.length,
        abstain: abstainVotes.length,
        passed: forVotes.length > againstVotes.length && session.quorumMet,
      },
      votes: session.votes,
    };
  }
}
