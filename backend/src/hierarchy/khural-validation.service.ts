import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * KhuralValidationService — законодательные ограничения Курултая
 *
 * Republican Khural Chairman:
 *   • Max 2 terms of 4 years each
 *   • Must wait until term ends before re-election to 2nd term
 *   • After 2 terms: permanently barred from chairmanship in that Republic
 *
 * Confederative Secretary:
 *   • 1-year term, strict rotation
 *   • @@unique([confederationId, userId]) at DB level — enforces NO REPEAT
 *   • Each republic sends a different representative each cycle
 */
@Injectable()
export class KhuralValidationService {
  private readonly logger = new Logger(KhuralValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // REPUBLICAN KHURAL — Chairman Term Limit (2 × 4 years)
  // ─────────────────────────────────────────────────────────────

  /**
   * Validate that a candidate can serve as Republican Khural Chairman.
   * Throws BadRequestException if they have already served 2 terms.
   */
  async validateChairmanTermLimit(
    republicId: string,
    candidateUserId: string,
  ): Promise<void> {
    const termCount = await this.prisma.khuralChairmanTerm.count({
      where: { republicId, userId: candidateUserId },
    });

    if (termCount >= 2) {
      throw new BadRequestException(
        `User ${candidateUserId} has already served 2 chairman terms in this Republican Khural. ` +
        `Maximum is 2 terms of 4 years each. (Максимум 2 срока по 4 года)`,
      );
    }

    this.logger.log(
      `Chairman term validation passed for user ${candidateUserId} in republic ${republicId}: ` +
      `${termCount}/2 terms served`,
    );
  }

  /**
   * Install a new chairman. Atomically:
   * 1. Validates term limit
   * 2. Closes previous term (if any active)
   * 3. Creates new term record
   * 4. Updates RepublicanKhural fields
   */
  async electChairman(
    republicId: string,
    userId: string,
    seatId?: string,
  ): Promise<void> {
    await this.validateChairmanTermLimit(republicId, userId);

    const termStart = new Date();
    const termEnd = new Date(termStart);
    termEnd.setFullYear(termEnd.getFullYear() + 4); // 4-year term

    await this.prisma.$transaction(async (tx) => {
      // Close any existing active term (termEnd = null means active)
      await tx.khuralChairmanTerm.updateMany({
        where: { republicId, termEnd: null },
        data: { termEnd: termStart, endReason: 'replaced' },
      });

      // Get new term number (1 or 2)
      const prevTerms = await tx.khuralChairmanTerm.count({
        where: { republicId, userId },
      });

      // Create new term
      await tx.khuralChairmanTerm.create({
        data: {
          republicId,
          userId,
          seatId,
          termNumber: prevTerms + 1,
          termStart,
          termEnd,
        },
      });

      // Update the Khural's active chairman fields
      await tx.republicanKhural.update({
        where: { id: republicId },
        data: {
          chairmanUserId: userId,
          chairmanSeatId: seatId ?? null,
          chairmanTermStart: termStart,
          chairmanTermEnd: termEnd,
          chairmanTermCount: { increment: 1 },
        },
      });
    });

    this.logger.log(
      `✓ Chairman elected: user=${userId} republic=${republicId} ` +
      `term=${termStart.toISOString()} → ${termEnd.toISOString()}`,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CONFEDERATIVE KHURAL — Secretary Rotation (1 × 1 year, no repeat)
  // ─────────────────────────────────────────────────────────────

  /**
   * Validate that a candidate can serve as Confederative Secretary.
   * Throws BadRequestException if they have served before (strict rotation).
   * The @@unique constraint at DB level provides a safety net.
   */
  async validateSecretaryRotation(
    confederationId: string,
    candidateUserId: string,
    fromRepublicId: string,
  ): Promise<void> {
    const existingTerm = await this.prisma.khuralSecretaryTerm.findUnique({
      where: { confederationId_userId: { confederationId, userId: candidateUserId } },
    });

    if (existingTerm) {
      throw new BadRequestException(
        `User ${candidateUserId} has already served as Confederative Secretary. ` +
        `Strict rotation policy prohibits repeat service. (Строгая ротация: повтор запрещён)`,
      );
    }

    // Also verify the republic hasn't served recently-enough (within last full cycle)
    // This is softer validation: log warning if same republic sent 2 consecutive secretaries
    const lastFromRepublic = await this.prisma.khuralSecretaryTerm.findFirst({
      where: { confederationId },
      orderBy: { termStart: 'desc' },
    });

    if (lastFromRepublic?.republicId === fromRepublicId) {
      this.logger.warn(
        `Republic ${fromRepublicId} sent consecutive secretaries. ` +
        `This may violate rotation spirit — consider a different republic's representative.`,
      );
    }

    this.logger.log(
      `Secretary rotation validation passed for user ${candidateUserId} ` +
      `from republic ${fromRepublicId}`,
    );
  }

  /**
   * Install a new rotating secretary. Atomically:
   * 1. Validates no-repeat rotation rule
   * 2. Closes current term
   * 3. Creates new term record
   * 4. Updates ConfederativeKhural fields
   */
  async electSecretary(
    confederationId: string,
    userId: string,
    fromRepublicId: string,
  ): Promise<void> {
    await this.validateSecretaryRotation(confederationId, userId, fromRepublicId);

    const termStart = new Date();
    const termEnd = new Date(termStart);
    termEnd.setFullYear(termEnd.getFullYear() + 1); // 1-year term

    await this.prisma.$transaction(async (tx) => {
      // Close current active secretary term
      await tx.khuralSecretaryTerm.updateMany({
        where: { confederationId, termEnd: null },
        data: { termEnd: termStart, endReason: 'rotated' },
      });

      // Create new term (will throw unique constraint if userId already served)
      await tx.khuralSecretaryTerm.create({
        data: {
          confederationId,
          userId,
          republicId: fromRepublicId,
          termStart,
          termEnd,
        },
      });

      // Update the Confederation's active secretary fields
      await tx.confederativeKhural.update({
        where: { id: confederationId },
        data: {
          secretaryUserId: userId,
          secretaryRepublicId: fromRepublicId,
          secretaryTermStart: termStart,
          secretaryTermEnd: termEnd,
        },
      });
    });

    this.logger.log(
      `✓ Secretary elected: user=${userId} confederation=${confederationId} ` +
      `republic=${fromRepublicId} term=${termStart.toISOString()} → ${termEnd.toISOString()}`,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CRON — Daily check for expired terms (runs at midnight UTC)
  // ─────────────────────────────────────────────────────────────

  /**
   * Runs daily at midnight. Expires any chairman or secretary terms
   * whose termEnd has passed, clearing the active-chairman/secretary
   * fields on the parent Khural records.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkAndExpireTerms(): Promise<void> {
    const now = new Date();
    this.logger.log(`[Cron] checkAndExpireTerms — checking at ${now.toISOString()}`);

    // ── Expire chairman terms ──
    const expiredChairmanTerms = await this.prisma.khuralChairmanTerm.findMany({
      where: { termEnd: { lte: now }, endReason: null },
      select: { id: true, republicId: true },
    });

    if (expiredChairmanTerms.length > 0) {
      this.logger.log(`[Cron] Expiring ${expiredChairmanTerms.length} chairman term(s)`);

      await this.prisma.$transaction(async (tx) => {
        // Mark terms as expired
        await tx.khuralChairmanTerm.updateMany({
          where: { id: { in: expiredChairmanTerms.map((t) => t.id) } },
          data: { endReason: 'term_expired' },
        });

        // Clear active chairman on affected Republics
        const republicIds = [...new Set(expiredChairmanTerms.map((t) => t.republicId))];
        await tx.republicanKhural.updateMany({
          where: { id: { in: republicIds } },
          data: {
            chairmanUserId: null,
            chairmanSeatId: null,
            chairmanTermStart: null,
            chairmanTermEnd: null,
          },
        });
      });
    }

    // ── Expire secretary terms ──
    const expiredSecretaryTerms = await this.prisma.khuralSecretaryTerm.findMany({
      where: { termEnd: { lte: now }, endReason: null },
      select: { id: true, confederationId: true },
    });

    if (expiredSecretaryTerms.length > 0) {
      this.logger.log(`[Cron] Expiring ${expiredSecretaryTerms.length} secretary term(s)`);

      await this.prisma.$transaction(async (tx) => {
        await tx.khuralSecretaryTerm.updateMany({
          where: { id: { in: expiredSecretaryTerms.map((t) => t.id) } },
          data: { endReason: 'term_expired' },
        });

        const confederationIds = [...new Set(expiredSecretaryTerms.map((t) => t.confederationId))];
        await tx.confederativeKhural.updateMany({
          where: { id: { in: confederationIds } },
          data: {
            secretaryUserId: null,
            secretaryRepublicId: null,
            secretaryTermStart: null,
            secretaryTermEnd: null,
          },
        });
      });
    }

    this.logger.log(
      `[Cron] checkAndExpireTerms complete — ` +
      `${expiredChairmanTerms.length} chairman(s), ${expiredSecretaryTerms.length} secretary(s) expired`,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────

  async getChairmanTermHistory(republicId: string) {
    return this.prisma.khuralChairmanTerm.findMany({
      where: { republicId },
      orderBy: { termStart: 'desc' },
      include: { user: { select: { id: true, seatId: true, fullName: true } } },
    });
  }

  async getSecretaryTermHistory(confederationId: string) {
    return this.prisma.khuralSecretaryTerm.findMany({
      where: { confederationId },
      orderBy: { termStart: 'desc' },
      include: { user: { select: { id: true, seatId: true, fullName: true } } },
    });
  }

  /** Returns which republic's turn it is next for secretary rotation */
  async getNextSecretaryRotationCandidate(confederationId: string) {
    const servedRepublics = await this.prisma.khuralSecretaryTerm.findMany({
      where: { confederationId },
      select: { republicId: true },
      distinct: ['republicId'],
    });

    const servedIds = new Set(servedRepublics.map((r) => r.republicId));

    const allRepublics = await this.prisma.republicanKhural.findMany({
      where: { confederationId, isActive: true },
      select: { id: true, name: true, republicKey: true },
    });

    const nextRepublic = allRepublics.find((r) => !servedIds.has(r.id));

    return {
      nextRepublic: nextRepublic ?? null,
      servedCount: servedIds.size,
      totalRepublics: allRepublics.length,
      cycleComplete: !nextRepublic,
    };
  }
}
