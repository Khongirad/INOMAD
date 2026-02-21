import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  HierarchyLevel,
  SquarePostType,
  SquareStatus,
} from '@prisma/client';
import { CreatePublicSquarePostDto, VotePublicSquareDto } from './dto/public-square.dto';

/**
 * PublicSquareService — Народная площадь
 *
 * Citizens can post debates, petitions, and proposals at any hierarchy level.
 * Petitions that cross the requiredSupport threshold are automatically escalated
 * to the next hierarchy level, until they reach CONFEDERATION → Khural proposal.
 *
 * Escalation ladder:
 *   LEVEL_10 (Arbad) → LEVEL_100 (Zun) → LEVEL_1000 (Myangad)
 *   → LEVEL_10000 (Tumed) → REPUBLIC → CONFEDERATION
 *   → Khural legislative proposal
 */
@Injectable()
export class PublicSquareService {
  private readonly logger = new Logger(PublicSquareService.name);

  // Escalation order
  private readonly ESCALATION_ORDER: HierarchyLevel[] = [
    HierarchyLevel.LEVEL_10,
    HierarchyLevel.LEVEL_100,
    HierarchyLevel.LEVEL_1000,
    HierarchyLevel.LEVEL_10000,
    HierarchyLevel.REPUBLIC,
    HierarchyLevel.CONFEDERATION,
  ];

  constructor(private readonly prisma: PrismaService) {}

  // ── Create Post ────────────────────────────────────────────────────────

  async createPost(authorId: string, dto: CreatePublicSquarePostDto) {
    // Only verified citizens can post
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { isVerified: true, isLegalSubject: true },
    });
    if (!author?.isVerified || !author?.isLegalSubject) {
      throw new ForbiddenException('Must be a verified legal subject to post in Public Square');
    }

    return this.prisma.publicSquarePost.create({
      data: {
        authorId,
        level: dto.level,
        scopeId: dto.scopeId,
        scopeName: dto.scopeName,
        postType: dto.postType,
        title: dto.title,
        content: dto.content,
        requiredSupport: dto.requiredSupport ?? this.defaultThreshold(dto.level),
        status: SquareStatus.OPEN,
      },
      include: {
        author: { select: { seatId: true, username: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  // ── Vote (support / oppose) ────────────────────────────────────────────

  async vote(voterId: string, dto: VotePublicSquareDto) {
    const post = await this.prisma.publicSquarePost.findUnique({
      where: { id: dto.postId },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== SquareStatus.OPEN && post.status !== SquareStatus.VOTING) {
      throw new BadRequestException('Post is no longer accepting votes');
    }

    // Upsert vote
    await this.prisma.publicSquareVote.upsert({
      where: { postId_voterId: { postId: dto.postId, voterId } },
      update: { support: dto.support },
      create: { postId: dto.postId, voterId, support: dto.support },
    });

    // Recount support
    const supportCount = await this.prisma.publicSquareVote.count({
      where: { postId: dto.postId, support: true },
    });

    const updated = await this.prisma.publicSquarePost.update({
      where: { id: dto.postId },
      data: { supportCount },
    });

    // Auto-escalate if threshold crossed (for PETITIONs)
    if (
      updated.postType === SquarePostType.PETITION &&
      updated.requiredSupport > 0 &&
      supportCount >= updated.requiredSupport &&
      updated.status === SquareStatus.OPEN
    ) {
      await this.escalatePost(dto.postId);
    }

    return { supportCount, post: updated };
  }

  // ── Escalate ───────────────────────────────────────────────────────────

  async escalatePost(postId: string) {
    const post = await this.prisma.publicSquarePost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const currentIdx = this.ESCALATION_ORDER.indexOf(post.level);
    const nextLevel = this.ESCALATION_ORDER[currentIdx + 1];

    if (!nextLevel) {
      // Reached CONFEDERATION → convert to Khural legislative proposal (stub)
      await this.prisma.publicSquarePost.update({
        where: { id: postId },
        data: { status: SquareStatus.LEGISLATIVE, escalatedAt: new Date() },
      });
      this.logger.log(`[PUBLIC_SQUARE] Post ${postId} reached CONFEDERATION → sent to Khural`);
      return { escalated: true, reachedKhural: true };
    }

    // Mark current as ESCALATED and create shadow post at next level
    const shadow = await this.prisma.publicSquarePost.create({
      data: {
        authorId: post.authorId,
        level: nextLevel,
        scopeId: post.scopeId, // propagate same geographic scope
        scopeName: `[Эскалировано] ${post.scopeName}`,
        postType: post.postType,
        title: post.title,
        content: post.content,
        requiredSupport: this.defaultThreshold(nextLevel),
        status: SquareStatus.OPEN,
        escalatedTo: post.id,
      },
    });

    await this.prisma.publicSquarePost.update({
      where: { id: postId },
      data: {
        status: SquareStatus.ESCALATED,
        escalatedAt: new Date(),
        escalatedTo: shadow.id,
      },
    });

    this.logger.log(
      `[PUBLIC_SQUARE] Post "${post.title}" escalated from ${post.level} → ${nextLevel}`,
    );

    return { escalated: true, reachedKhural: false, shadowPostId: shadow.id, nextLevel };
  }

  // ── Query ──────────────────────────────────────────────────────────────

  async getPosts(params: {
    level?: HierarchyLevel;
    scopeId?: string;
    postType?: SquarePostType;
    status?: SquareStatus;
    page?: number;
    limit?: number;
  }) {
    const { level, scopeId, postType, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (level) where.level = level;
    if (scopeId) where.scopeId = scopeId;
    if (postType) where.postType = postType;
    if (status) where.status = status;
    else where.status = { not: SquareStatus.CLOSED }; // default: exclude closed

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.publicSquarePost.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ supportCount: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { seatId: true, username: true } },
          _count: { select: { votes: true } },
        },
      }),
      this.prisma.publicSquarePost.count({ where }),
    ]);

    return { data: posts, total, page, limit };
  }

  async getPost(postId: string) {
    const post = await this.prisma.publicSquarePost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { seatId: true, username: true } },
        votes: { select: { voterId: true, support: true, createdAt: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  /** Get top petitions approaching escalation threshold */
  async getTrending(limit = 10) {
    return this.prisma.publicSquarePost.findMany({
      where: {
        postType: SquarePostType.PETITION,
        status: SquareStatus.OPEN,
        requiredSupport: { gt: 0 },
      },
      orderBy: { supportCount: 'desc' },
      take: limit,
      include: {
        author: { select: { seatId: true, username: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private defaultThreshold(level: HierarchyLevel): number {
    const thresholds: Record<HierarchyLevel, number> = {
      LEVEL_1: 0,
      LEVEL_10: 5,         // Arbad: 5 signatures → Zun
      LEVEL_100: 25,       // Zun: 25 → Myangad
      LEVEL_1000: 100,     // Myangad: 100 → Tumed
      LEVEL_10000: 500,    // Tumed: 500 → Republic
      REPUBLIC: 2000,      // Republic: 2000 → Confederation
      CONFEDERATION: 10000, // Confederation: 10000 → Khural
    };
    return thresholds[level] ?? 0;
  }
}
