import {
  Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import {
  AcceptCaseDto, AddHearingDto, FileJudicialCaseDto, IssueVerdictDto,
} from './dto/judicial.dto';

/**
 * JudicialService — Судебная система
 *
 * Case lifecycle:
 *   FILED → ACCEPTED (judge assigned) → HEARING (proceedings) → VERDICT_ISSUED → CLOSED
 *   At any point: APPEALED → loops back to HEARING at a higher level
 *
 * Verdict integrity:
 *   verdictHash = sha256(caseId | verdict | judgeId | issuedAt)
 */
@Injectable()
export class JudicialService {
  private readonly logger = new Logger(JudicialService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── File case  ─────────────────────────────────────────────────────────────

  async fileCase(plaintiffId: string, dto: FileJudicialCaseDto) {
    if (!dto.defendantId && !dto.defendantOrgId) {
      throw new BadRequestException('Either defendantId or defendantOrgId must be provided');
    }
    if (dto.defendantId === plaintiffId) {
      throw new BadRequestException('Cannot sue yourself');
    }

    const judicialCase = await this.prisma.judicialCase.create({
      data: {
        plaintiffId,
        defendantId:      dto.defendantId,
        defendantOrgId:   dto.defendantOrgId,
        defendantOrgName: dto.defendantOrgName,
        title:       dto.title,
        description: dto.description,
        evidence:    dto.evidence,
        level:       dto.level,
        scopeId:     dto.scopeId,
        status: 'FILED',
      },
      include: {
        plaintiff: { select: { seatId: true, username: true } },
        defendant: { select: { seatId: true, username: true } },
      },
    });

    this.logger.log(`[COURT] Case filed: "${dto.title}" by ${plaintiffId}`);
    return judicialCase;
  }

  // ── Accept & assign judge ─────────────────────────────────────────────────

  /**
   * A verified judge (user with JUDICIAL role in an org) accepts a case.
   * A judge may not preside over a case they are party to.
   */
  async acceptCase(judgeId: string, dto: AcceptCaseDto) {
    const judicialCase = await this.prisma.judicialCase.findUnique({
      where: { id: dto.caseId },
    });
    if (!judicialCase) throw new NotFoundException('Case not found');
    if (judicialCase.status !== 'FILED') throw new BadRequestException('Case is not in FILED status');
    if (judicialCase.plaintiffId === judgeId || judicialCase.defendantId === judgeId) {
      throw new ForbiddenException('Cannot preside over a case you are party to');
    }

    const updated = await this.prisma.judicialCase.update({
      where: { id: dto.caseId },
      data: { judgeId, status: 'ACCEPTED', acceptedAt: new Date() },
      include: {
        plaintiff: { select: { seatId: true, username: true } },
        defendant: { select: { seatId: true, username: true } },
        judge:     { select: { seatId: true, username: true } },
      },
    });

    this.logger.log(`[COURT] Case "${dto.caseId}" accepted by judge ${judgeId}`);
    return updated;
  }

  // ── Hearing ───────────────────────────────────────────────────────────────

  async addHearing(judgeId: string, dto: AddHearingDto) {
    const judicialCase = await this.prisma.judicialCase.findUnique({ where: { id: dto.caseId } });
    if (!judicialCase) throw new NotFoundException('Case not found');
    if (judicialCase.judgeId !== judgeId) throw new ForbiddenException('Not assigned to this case');
    if (!['ACCEPTED', 'HEARING'].includes(judicialCase.status)) {
      throw new BadRequestException('Case must be ACCEPTED or HEARING to add a hearing');
    }

    await this.prisma.judicialCase.update({
      where: { id: dto.caseId },
      data: { status: 'HEARING' },
    });

    const hearing = await this.prisma.judicialHearing.create({
      data: {
        caseId:      dto.caseId,
        scheduledAt: new Date(dto.scheduledAt),
        notes:       dto.notes,
      },
    });

    this.logger.log(`[COURT] Hearing scheduled for case "${dto.caseId}" on ${dto.scheduledAt}`);
    return hearing;
  }

  // ── Issue verdict ─────────────────────────────────────────────────────────

  async issueVerdict(judgeId: string, dto: IssueVerdictDto) {
    const judicialCase = await this.prisma.judicialCase.findUnique({ where: { id: dto.caseId } });
    if (!judicialCase) throw new NotFoundException('Case not found');
    if (judicialCase.judgeId !== judgeId) throw new ForbiddenException('Not assigned to this case');
    if (judicialCase.status === 'VERDICT_ISSUED' || judicialCase.status === 'CLOSED') {
      throw new BadRequestException('Verdict already issued');
    }

    const issuedAt = new Date();
    const verdictHash = createHash('sha256')
      .update(`${dto.caseId}|${dto.verdict}|${judgeId}|${issuedAt.toISOString()}`)
      .digest('hex');

    const [verdict] = await this.prisma.$transaction([
      this.prisma.judicialVerdict.create({
        data: {
          caseId:      dto.caseId,
          judgeId,
          verdict:     dto.verdict,
          reasoning:   dto.reasoning,
          penalty:     dto.penalty,
          verdictHash,
          issuedAt,
        },
      }),
      this.prisma.judicialCase.update({
        where: { id: dto.caseId },
        data: { status: 'VERDICT_ISSUED' },
      }),
    ]);

    this.logger.log(
      `[COURT] Verdict issued: case "${dto.caseId}" → ${dto.verdict}. Hash: ${verdictHash}`,
    );

    return { verdict, verdictHash };
  }

  // ── Close / appeal ────────────────────────────────────────────────────────

  async closeCase(judgeId: string, caseId: string) {
    const judicialCase = await this.prisma.judicialCase.findUnique({ where: { id: caseId } });
    if (!judicialCase) throw new NotFoundException('Case not found');
    if (judicialCase.judgeId !== judgeId) throw new ForbiddenException('Not assigned to this case');

    return this.prisma.judicialCase.update({
      where: { id: caseId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async appealCase(userId: string, caseId: string) {
    const judicialCase = await this.prisma.judicialCase.findUnique({ where: { id: caseId } });
    if (!judicialCase) throw new NotFoundException('Case not found');
    if (judicialCase.plaintiffId !== userId && judicialCase.defendantId !== userId) {
      throw new ForbiddenException('Only a party to the case may appeal');
    }
    if (judicialCase.status !== 'VERDICT_ISSUED') {
      throw new BadRequestException('Can only appeal after a verdict has been issued');
    }

    return this.prisma.judicialCase.update({
      where: { id: caseId },
      data: { status: 'APPEALED' },
    });
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getCases(params: { status?: string; level?: string; limit?: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.level)  where.level  = params.level;

    return this.prisma.judicialCase.findMany({
      where,
      include: {
        plaintiff: { select: { seatId: true, username: true } },
        defendant: { select: { seatId: true, username: true } },
        judge:     { select: { seatId: true, username: true } },
        verdicts:  { orderBy: { issuedAt: 'desc' }, take: 1 },
        _count:    { select: { hearings: true, verdicts: true } },
      },
      orderBy: { filedAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async getCase(id: string) {
    const judicialCase = await this.prisma.judicialCase.findUnique({
      where: { id },
      include: {
        plaintiff: { select: { seatId: true, username: true, isVerified: true } },
        defendant: { select: { seatId: true, username: true } },
        judge:     { select: { seatId: true, username: true } },
        hearings:  { orderBy: { scheduledAt: 'asc' } },
        verdicts:  { orderBy: { issuedAt: 'desc' } },
      },
    });
    if (!judicialCase) throw new NotFoundException('Case not found');
    return judicialCase;
  }

  async getMyCases(userId: string) {
    return this.prisma.judicialCase.findMany({
      where: {
        OR: [
          { plaintiffId: userId },
          { defendantId: userId },
          { judgeId:     userId },
        ],
      },
      include: {
        plaintiff: { select: { seatId: true, username: true } },
        defendant: { select: { seatId: true, username: true } },
        verdicts:  { take: 1, orderBy: { issuedAt: 'desc' } },
        _count:    { select: { hearings: true } },
      },
      orderBy: { filedAt: 'desc' },
    });
  }
}
