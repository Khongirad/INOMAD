import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CareerRole,
  CareerStatus,
  CareerType,
  Prisma,
} from '@prisma/client';

// ────────────────────────────────────────────────────────────────────────────
// DTOs
// ────────────────────────────────────────────────────────────────────────────

export interface InaugurateDto {
  /** The user being inaugurated as Leader */
  leaderUserId: string;
  role: CareerRole;
  /** IDs of the 9 Arbad members who become the Personal Guard (Apparatus) */
  staffUserIds: string[];
  /** LawArticle IDs the leader & staff swear to uphold */
  lawArticleIds: string[];
  /** Optional: org entity this position is within */
  orgRef?: {
    arbadId?: string;
    zunId?: string;
    myangadId?: string;
    tumedId?: string;
  };
}

export interface LegalTraceResponse {
  leader: {
    userId: string;
    careerLogId: string;
    role: CareerRole;
    contractHash: string;
    inaugurationAt: Date;
    expiresAt: Date;
    laws: Array<{ code: string; title: string; source: string; id: string }>;
  };
  staff: Array<{
    userId: string;
    careerLogId: string;
    role: CareerRole;
    laws: Array<{ code: string; title: string; source: string; id: string }>;
  }>;
  sharedLaws: Array<{ id: string; code: string; title: string; source: string }>;
  graphEdges: Array<{ from: string; to: string; type: 'leader_staff' | 'swears_to_law' }>;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * InaugurationService — Personal Guard & Legal-Trace
 *
 * Core mechanic (Personal Guard / Личная Охрана):
 *   When a Leader is promoted to a higher hierarchy level, their original
 *   9 Arbad members MUST transition with them as STAFF (Management Apparatus).
 *   This creates a legally-binding group record: all 10 share the same oath hash.
 *
 * Legal integrity:
 *   - contractHash = SHA-256(leaderId|staffIds|lawIds|timestamp)
 *   - Term = exactly 2 years from inaugurationAt
 *   - REVOKE leader → all staff cascade to REVOKED
 *   - No self-guard: leaderUserId must not be in staffUserIds
 */
@Injectable()
export class InaugurationService {
  private readonly logger = new Logger(InaugurationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // 1. INAUGURATE — main entry point
  // ──────────────────────────────────────────────

  /**
   * Inaugurate a Leader and bind their 9-member Personal Guard (Apparatus).
   *
   * Steps (all inside Serializable $transaction):
   *   1. Validate: exactly 9 staff, no circularity, laws exist
   *   2. Close previous ACTIVE CareerLogs for leader + staff as COMPLETED ("Promotion")
   *   3. Create Leader CareerLog
   *   4. Create 9 Staff CareerLogs linked to Leader
   *   5. Attach law references to all 10 logs
   *   6. Return oath hash + careerLog IDs
   */
  async inaugurate(dto: InaugurateDto): Promise<{
    contractHash: string;
    leaderCareerLogId: string;
    staffCareerLogIds: string[];
  }> {
    const { leaderUserId, role, staffUserIds, lawArticleIds, orgRef } = dto;

    // ── Pre-validation ──
    if (staffUserIds.length !== 9) {
      throw new BadRequestException(
        `Personal Guard requires exactly 9 Staff members. Got ${staffUserIds.length}. ` +
        `(The decimal unit is 10: 1 Leader + 9 Staff)`,
      );
    }
    if (staffUserIds.includes(leaderUserId)) {
      throw new ForbiddenException(
        `Circularity violation: a Leader cannot be a member of their own Personal Guard.`,
      );
    }
    const uniqueStaff = new Set(staffUserIds);
    if (uniqueStaff.size !== 9) {
      throw new BadRequestException('Staff list contains duplicate user IDs.');
    }

    // Verify all law articles exist
    const laws = await this.prisma.lawArticle.findMany({
      where: { id: { in: lawArticleIds }, isActive: true },
    });
    if (laws.length !== lawArticleIds.length) {
      throw new NotFoundException(
        `Some lawArticleIds not found or inactive. ` +
        `Requested ${lawArticleIds.length}, found ${laws.length}.`,
      );
    }

    const now = new Date();
    const contractHash = this.generateOathHash(leaderUserId, staffUserIds, lawArticleIds, now);
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 2); // Strict 2-year term

    const result = await this.prisma.$transaction(
      async (tx) => {
        // ── Close previous active terms ──
        const allUserIds = [leaderUserId, ...staffUserIds];
        await tx.careerLog.updateMany({
          where: { userId: { in: allUserIds }, status: CareerStatus.ACTIVE },
          data: { status: CareerStatus.COMPLETED, exitReason: 'Promotion' },
        });

        // ── Create Leader CareerLog ──
        const leaderLog = await tx.careerLog.create({
          data: {
            userId: leaderUserId,
            role,
            type: CareerType.LEADER,
            status: CareerStatus.ACTIVE,
            contractHash,
            inaugurationAt: now,
            expiresAt,
            ...(orgRef ?? {}),
            lawRefs: {
              create: lawArticleIds.map((id) => ({ lawArticleId: id })),
            },
          },
        });

        // ── Create 9 Staff CareerLogs linked to Leader ──
        const staffLogs = await Promise.all(
          staffUserIds.map((staffUserId) =>
            tx.careerLog.create({
              data: {
                userId: staffUserId,
                role,
                type: CareerType.STAFF,
                status: CareerStatus.ACTIVE,
                leaderId: leaderLog.id,
                contractHash: this.generateOathHash(
                  staffUserId,
                  [leaderUserId],
                  lawArticleIds,
                  now,
                ),
                inaugurationAt: now,
                expiresAt,
                ...(orgRef ?? {}),
                lawRefs: {
                  create: lawArticleIds.map((id) => ({ lawArticleId: id })),
                },
              },
            }),
          ),
        );

        return {
          contractHash,
          leaderCareerLogId: leaderLog.id,
          staffCareerLogIds: staffLogs.map((s) => s.id),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      `✓ Inaugurated: leader=${leaderUserId} role=${role} ` +
      `staff=[${staffUserIds.join(',')}] hash=${contractHash.slice(0, 16)}...`,
    );

    return result;
  }

  // ──────────────────────────────────────────────
  // 2. REVOKE — cascade REVOKED to all Staff
  // ──────────────────────────────────────────────

  /**
   * Revoke a Leader's active CareerLog and cascade REVOKED to their entire Staff.
   * Their authority is derived from the Leader — it falls when the Leader falls.
   */
  async revokeLeader(
    leaderCareerLogId: string,
    reason = 'Recall',
  ): Promise<{ revokedLeader: string; revokedStaffCount: number }> {
    const leaderLog = await this.prisma.careerLog.findUnique({
      where: { id: leaderCareerLogId },
      include: { staff: { select: { id: true } } },
    });

    if (!leaderLog) throw new NotFoundException(`CareerLog ${leaderCareerLogId} not found.`);
    if (leaderLog.type !== CareerType.LEADER) {
      throw new BadRequestException(`CareerLog is not a LEADER record — only leaders can be revoked directly.`);
    }
    if (leaderLog.status !== CareerStatus.ACTIVE) {
      throw new BadRequestException(`CareerLog is already ${leaderLog.status} — cannot revoke inactive record.`);
    }

    const staffIds = leaderLog.staff.map((s) => s.id);

    await this.prisma.$transaction(
      async (tx) => {
        // Revoke all staff first
        if (staffIds.length > 0) {
          await tx.careerLog.updateMany({
            where: { id: { in: staffIds } },
            data: { status: CareerStatus.REVOKED, exitReason: `${reason} (Leader revoked)` },
          });
        }
        // Then revoke the leader
        await tx.careerLog.update({
          where: { id: leaderCareerLogId },
          data: { status: CareerStatus.REVOKED, exitReason: reason },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      `✓ Revoked: leader=${leaderCareerLogId} staff_count=${staffIds.length} reason="${reason}"`,
    );

    return {
      revokedLeader: leaderCareerLogId,
      revokedStaffCount: staffIds.length,
    };
  }

  // ──────────────────────────────────────────────
  // 3. LEGAL TRACE — graph for visualization
  // ──────────────────────────────────────────────

  /**
   * Returns structured data for the Legal Graph visualization:
   *   - Leader node + their sworn laws
   *   - 9 Staff nodes + their sworn laws
   *   - sharedLaws (laws sworn by all 10)
   *   - graphEdges for rendering connections
   */
  async getLegalTrace(userId: string): Promise<LegalTraceResponse> {
    const leaderLog = await this.prisma.careerLog.findFirst({
      where: { userId, type: CareerType.LEADER, status: CareerStatus.ACTIVE },
      include: {
        lawRefs: { include: { law: true } },
        staff: {
          include: { lawRefs: { include: { law: true } } },
        },
      },
      orderBy: { inaugurationAt: 'desc' },
    });

    if (!leaderLog) {
      throw new NotFoundException(
        `No active Leader CareerLog found for user ${userId}.`,
      );
    }

    const leaderLaws = leaderLog.lawRefs.map((r) => r.law);
    const leaderLawIds = new Set(leaderLaws.map((l) => l.id));

    const staffNodes = leaderLog.staff.map((staffLog) => {
      const staffLaws = staffLog.lawRefs.map((r) => r.law);
      return {
        userId: staffLog.userId,
        careerLogId: staffLog.id,
        role: staffLog.role,
        laws: staffLaws.map((l) => ({ id: l.id, code: l.code, title: l.title, source: l.source })),
      };
    });

    // sharedLaws = laws that every staff member also swears to (intersection)
    const sharedLaws = leaderLaws.filter((law) =>
      leaderLog.staff.every((s) =>
        s.lawRefs.some((r) => r.lawArticleId === law.id),
      ),
    );

    // Build graph edges
    const edges: LegalTraceResponse['graphEdges'] = [];
    // Leader → Staff edges
    for (const s of staffNodes) {
      edges.push({ from: userId, to: s.userId, type: 'leader_staff' });
    }
    // Leader → Law edges
    for (const law of leaderLaws) {
      edges.push({ from: userId, to: law.id, type: 'swears_to_law' });
    }
    // Staff → Law edges (only laws not already shown from leader, to reduce clutter)
    for (const s of staffNodes) {
      for (const law of s.laws) {
        if (!leaderLawIds.has(law.id)) {
          edges.push({ from: s.userId, to: law.id, type: 'swears_to_law' });
        }
      }
    }

    return {
      leader: {
        userId,
        careerLogId: leaderLog.id,
        role: leaderLog.role,
        contractHash: leaderLog.contractHash,
        inaugurationAt: leaderLog.inaugurationAt,
        expiresAt: leaderLog.expiresAt,
        laws: leaderLaws.map((l) => ({ id: l.id, code: l.code, title: l.title, source: l.source })),
      },
      staff: staffNodes,
      sharedLaws: sharedLaws.map((l) => ({ id: l.id, code: l.code, title: l.title, source: l.source })),
      graphEdges: edges,
    };
  }

  // ──────────────────────────────────────────────
  // 4. USER HISTORY — Career "Work Book"
  // ──────────────────────────────────────────────

  /**
   * Returns a full career timeline for a user — the "Work Book".
   * Includes quest counts completed during each 2-year term.
   */
  async getUserHistory(userId: string) {
    const logs = await this.prisma.careerLog.findMany({
      where: { userId },
      orderBy: { inaugurationAt: 'desc' },
      include: {
        lawRefs: { include: { law: { select: { id: true, code: true, title: true } } } },
        leader: {
          select: { userId: true, role: true, contractHash: true },
        },
      },
    });

    if (logs.length === 0) {
      throw new NotFoundException(`No career history found for user ${userId}.`);
    }

    // Attach quest summary: quests assigned to user & created within each term window
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const questCount = await this.prisma.quest.count({
          where: {
            takerId: userId,
            createdAt: { gte: log.inaugurationAt, lte: log.expiresAt },
            status: 'COMPLETED' as any,
          },
        });

        return {
          careerLogId: log.id,
          role: log.role,
          type: log.type,
          status: log.status,
          contractHash: log.contractHash,
          inaugurationAt: log.inaugurationAt,
          expiresAt: log.expiresAt,
          exitReason: log.exitReason,
          questsCompleted: questCount,
          swornLaws: log.lawRefs.map((r) => r.law),
          leaderOf: log.type === CareerType.STAFF && log.leader
            ? { userId: log.leader.userId, role: log.leader.role }
            : null,
        };
      }),
    );

    return {
      userId,
      totalTerms: logs.length,
      activeTerms: logs.filter((l) => l.status === CareerStatus.ACTIVE).length,
      history: enriched,
    };
  }

  // ──────────────────────────────────────────────
  // 5. LAW ARTICLES — list (for oath ceremony seed)
  // ──────────────────────────────────────────────

  async getLawArticles(source?: string) {
    return this.prisma.lawArticle.findMany({
      where: { isActive: true, ...(source ? { source } : {}) },
      orderBy: [{ source: 'asc' }, { code: 'asc' }],
    });
  }

  // ──────────────────────────────────────────────
  // 6. OATH HASH — deterministic SHA-256
  // ──────────────────────────────────────────────

  /**
   * SHA-256([leaderId | staffIds.sort() | lawIds.sort() | timestamp.ISO])
   * Deterministic: same inputs always produce same hash.
   * Used as the "Digital Oath Contract" reference.
   */
  generateOathHash(
    subjectId: string,
    associateIds: string[],
    lawIds: string[],
    timestamp: Date,
  ): string {
    const input = [
      subjectId,
      [...associateIds].sort().join(','),
      [...lawIds].sort().join(','),
      timestamp.toISOString(),
    ].join('|');
    return createHash('sha256').update(input, 'utf8').digest('hex');
  }

  // ──────────────────────────────────────────────
  // 7. CRON — daily expiry check
  // ──────────────────────────────────────────────

  /**
   * Runs daily at midnight UTC.
   * Finds ACTIVE CareerLogs where expiresAt < now() and marks them COMPLETED.
   * Cascade: if a Leader expires, their Staff are also COMPLETED.
   * Fires a "History Archive" event log for UI notification.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkAndExpireTerms(): Promise<void> {
    const now = new Date();
    this.logger.log(`[Cron] checkAndExpireTerms @ ${now.toISOString()}`);

    // Find expired LEADER logs first (staff cascade from them)
    const expiredLeaders = await this.prisma.careerLog.findMany({
      where: {
        type: CareerType.LEADER,
        status: CareerStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      select: { id: true, userId: true, role: true },
    });

    if (expiredLeaders.length > 0) {
      this.logger.log(`[Cron] Expiring ${expiredLeaders.length} leader term(s)`);

      await this.prisma.$transaction(async (tx) => {
        const leaderIds = expiredLeaders.map((l) => l.id);

        // Expire their staff first
        await tx.careerLog.updateMany({
          where: {
            leaderId: { in: leaderIds },
            status: CareerStatus.ACTIVE,
          },
          data: { status: CareerStatus.COMPLETED, exitReason: 'Term Expired' },
        });

        // Then expire leaders
        await tx.careerLog.updateMany({
          where: { id: { in: leaderIds } },
          data: { status: CareerStatus.COMPLETED, exitReason: 'Term Expired' },
        });
      });
    }

    // Also catch any orphaned STAFF with expired terms (edge case)
    const expiredOrphanStaff = await this.prisma.careerLog.count({
      where: {
        type: CareerType.STAFF,
        status: CareerStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    if (expiredOrphanStaff > 0) {
      this.logger.warn(`[Cron] ${expiredOrphanStaff} orphaned expired staff — expiring`);
      await this.prisma.careerLog.updateMany({
        where: {
          type: CareerType.STAFF,
          status: CareerStatus.ACTIVE,
          expiresAt: { lte: now },
        },
        data: { status: CareerStatus.COMPLETED, exitReason: 'Term Expired' },
      });
    }

    this.logger.log(
      `[Cron] checkAndExpireTerms done — ` +
      `${expiredLeaders.length} leaders + staff expired, ${expiredOrphanStaff} orphan staff expired`,
    );
  }
}
