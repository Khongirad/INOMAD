import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyLevel, PowerBranchType, UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import {
  AppointProvisionalCIKDto,
  CastBallotDto,
  CreateKhuralElectionDto,
  RegisterCandidateDto,
} from './dto/cik.dto';

/**
 * CIKService — Центральная Избирательная Комиссия
 *
 * Constitutional bottom-up election ladder (per branch of power):
 *
 *   fromLevel  → toLevel        Who votes
 *   LEVEL_1    → LEVEL_10       Family members elect Arbad leader
 *   LEVEL_10   → LEVEL_100      Arbad leaders elect Zun leader
 *   LEVEL_100  → LEVEL_1000     Zun leaders elect Myangad leader
 *   LEVEL_1000 → LEVEL_10000    Myangad leaders elect Tumed leader
 *   LEVEL_10000→ REPUBLIC       Tumed leaders elect Republic leader
 *   REPUBLIC   → CONFEDERATION  Republic leaders elect Confederation(Khural) delegate
 *
 *   Branches run SEPARATE elections: EXECUTIVE | LEGISLATIVE | JUDICIAL | BANKING
 *
 * Winner of election at level N → becomes governing leader at level N+1 in that branch.
 *
 * Ballot integrity: sha256(electionId | voterId | candidateId | timestamp)
 * Result certification: sha256(electionId | winner:votes | totalVotes | certifiedAt)
 */
@Injectable()
export class CIKService {
  private readonly logger = new Logger(CIKService.name);

  /** Ordered ladder: index 0 = bottom, index 6 = top */
  static readonly LADDER: HierarchyLevel[] = [
    HierarchyLevel.LEVEL_1,
    HierarchyLevel.LEVEL_10,
    HierarchyLevel.LEVEL_100,
    HierarchyLevel.LEVEL_1000,
    HierarchyLevel.LEVEL_10000,
    HierarchyLevel.REPUBLIC,
    HierarchyLevel.CONFEDERATION,
  ];

  static readonly LEVEL_LABELS: Record<HierarchyLevel, string> = {
    LEVEL_1:       'Семья',
    LEVEL_10:      'Арбан',
    LEVEL_100:     'Зун',
    LEVEL_1000:    'Мьянган',
    LEVEL_10000:   'Тумэн',
    REPUBLIC:      'Республика',
    CONFEDERATION: 'Конфедерация',
  };

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PROVISIONAL CIK
  // ─────────────────────────────────────────────────────────────────────────

  async appointProvisionalCIK(creatorId: string, dto: AppointProvisionalCIKDto) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { role: true },
    });
    if (creator?.role !== UserRole.CREATOR) {
      throw new ForbiddenException('Only the Creator can appoint the provisional CIK');
    }
    if (dto.memberIds.length < 3 || dto.memberIds.length > 7) {
      throw new BadRequestException('Provisional CIK requires 3–7 members');
    }

    const existing = await this.prisma.cIK.findFirst({
      where: { type: 'PROVISIONAL', status: 'ACTIVE' },
    });
    if (existing) return { ...existing, message: 'Provisional CIK already active' };

    const cik = await this.prisma.cIK.create({
      data: {
        type: 'PROVISIONAL',
        status: 'ACTIVE',
        appointedById: creatorId,
        mandate: dto.mandate ?? 'Провести выборы по всей лестнице иерархии и сложить полномочия после заседания Хурала',
        members: {
          createMany: {
            data: dto.memberIds.map((userId, i) => ({
              userId,
              role: i === 0 ? 'CHAIR' : 'MEMBER',
            })),
          },
        },
      },
      include: { members: { include: { user: { select: { seatId: true, username: true } } } } },
    });

    this.logger.log(`[CIK] Provisional CIK appointed with ${dto.memberIds.length} members`);
    return cik;
  }

  async dissolveProvisionalCIK(requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    if (requester?.role !== UserRole.CREATOR) {
      throw new ForbiddenException('Only the Creator can dissolve the provisional CIK');
    }

    const cik = await this.prisma.cIK.findFirst({ where: { type: 'PROVISIONAL', status: 'ACTIVE' } });
    if (!cik) throw new NotFoundException('No active provisional CIK found');

    return this.prisma.cIK.update({
      where: { id: cik.id },
      data: { status: 'DISSOLVED', dissolvedAt: new Date() },
    });
  }

  async getActiveCIK() {
    return this.prisma.cIK.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        members: {
          include: { user: { select: { seatId: true, username: true, isVerified: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KHURAL ELECTIONS (hierarchical, per branch)
  // ─────────────────────────────────────────────────────────────────────────

  async createKhuralElection(requesterId: string, dto: CreateKhuralElectionDto) {
    await this.assertCIKMember(requesterId);

    const fromIdx = CIKService.LADDER.indexOf(dto.fromLevel);
    const toIdx   = CIKService.LADDER.indexOf(dto.toLevel);
    if (toIdx !== fromIdx + 1) {
      throw new BadRequestException(
        `toLevel must be exactly one step above fromLevel in the hierarchy ladder. ` +
        `Got fromLevel=${dto.fromLevel} (idx=${fromIdx}) toLevel=${dto.toLevel} (idx=${toIdx}).`,
      );
    }

    const votingStart = new Date(dto.votingStart);
    const votingEnd   = new Date(dto.votingEnd);
    const nominationDeadline = new Date(dto.nominationDeadline);

    if (nominationDeadline >= votingStart) {
      throw new BadRequestException('Nomination deadline must be before voting start');
    }
    if (votingEnd <= votingStart) {
      throw new BadRequestException('Voting end must be after voting start');
    }

    const fromLabel = CIKService.LEVEL_LABELS[dto.fromLevel];
    const toLabel   = CIKService.LEVEL_LABELS[dto.toLevel];
    const autoTitle = dto.title ?? `Выборы ${toLabel}: ветвь ${dto.branch} — кандидаты от ${fromLabel}`;

    const election = await this.prisma.khuralElection.create({
      data: {
        createdById: requesterId,
        fromLevel: dto.fromLevel,
        toLevel: dto.toLevel,
        branch: dto.branch,
        scopeId: dto.scopeId,
        scopeName: dto.scopeName,
        title: autoTitle,
        description: dto.description,
        nominationDeadline,
        votingStart,
        votingEnd,
        seatsCount: dto.seatsCount ?? 1,
        status: 'NOMINATION',
      },
    });

    this.logger.log(
      `[CIK] Election created: [${dto.branch}] ${fromLabel}→${toLabel} in "${dto.scopeName}"`,
    );

    // Auto-populate candidates from current org leaders at fromLevel with matching branch
    await this.autoDiscoverCandidates(election.id, dto.fromLevel, dto.branch, dto.scopeId);

    return this.prisma.khuralElection.findUnique({
      where: { id: election.id },
      include: { candidates: { include: { candidate: { select: { seatId: true, username: true } } } } },
    });
  }

  /**
   * Auto-discovers candidates: citizens who are leader of an Org at fromLevel
   * for the given branch within the geographic scope.
   * They are auto-registered; a candidate may also self-register their platform.
   *
   * Organization.level is an Int:
   *   LEVEL_1  → 0 (family, no org equivalent, skip)
   *   LEVEL_10 → 1 (Arbad)
   *   LEVEL_100 → 10 (Zun/Hundred)
   *   LEVEL_1000 → 100 (Myangad/Thousand)
   *   LEVEL_10000 → 1000 (Tumed)
   *   REPUBLIC / CONFEDERATION → filtered by type only
   */
  private async autoDiscoverCandidates(
    electionId: string,
    fromLevel: HierarchyLevel,
    branch: PowerBranchType,
    scopeId: string,
  ) {
    // Map HierarchyLevel → Organization.level Int
    const levelIntMap: Partial<Record<HierarchyLevel, number>> = {
      [HierarchyLevel.LEVEL_10]:    1,
      [HierarchyLevel.LEVEL_100]:   10,
      [HierarchyLevel.LEVEL_1000]:  100,
      [HierarchyLevel.LEVEL_10000]: 1000,
    };

    const orgLevel = levelIntMap[fromLevel];
    // If no org-level mapping (LEVEL_1, REPUBLIC, CONFEDERATION) — no auto-discovery
    if (orgLevel === undefined) return;

    // Filter by powerBranch (PowerBranchType enum on Organization)
    // Skip NONE branch
    if (branch === PowerBranchType.NONE) return;

    const orgs = await this.prisma.organization.findMany({
      where: {
        level: orgLevel,
        powerBranch: branch,     // PowerBranchType enum — direct match
        leaderId: { not: null },
        ...(scopeId ? { OR: [{ republicId: scopeId }, { parentId: scopeId }] } : {}),
      },
      select: { leaderId: true },
    });

    const leaderIds = [...new Set(orgs.map(o => o.leaderId).filter(Boolean))] as string[];

    if (leaderIds.length === 0) {
      this.logger.log(`[CIK] No auto-discovered candidates for election ${electionId}`);
      return;
    }

    await this.prisma.khuralCandidate.createMany({
      data: leaderIds.map(userId => ({
        electionId,
        candidateId: userId,
        platform: null,
        voteCount: 0,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`[CIK] Auto-discovered ${leaderIds.length} candidates from fromLevel=${fromLevel} branch=${branch}`);
  }

  /** Manual candidate self-registration (adds platform; citizen must be verified) */
  async registerCandidate(candidateId: string, dto: RegisterCandidateDto) {
    const election = await this.prisma.khuralElection.findUnique({ where: { id: dto.electionId } });
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'NOMINATION') throw new BadRequestException('Nominations are closed');
    if (new Date() > election.nominationDeadline) throw new BadRequestException('Nomination deadline passed');

    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: { isVerified: true, isLegalSubject: true },
    });
    if (!candidate?.isVerified || !candidate?.isLegalSubject) {
      throw new ForbiddenException('Must be a verified legal subject to run for Khural');
    }

    return this.prisma.khuralCandidate.upsert({
      where: { electionId_candidateId: { electionId: dto.electionId, candidateId } },
      update: { platform: dto.platform },
      create: { electionId: dto.electionId, candidateId, platform: dto.platform },
      include: { candidate: { select: { seatId: true, username: true } } },
    });
  }

  /**
   * Cast a ballot — one vote per citizen per election.
   * WHO CAN VOTE: Leaders of orgs at fromLevel within the geographic scope.
   * (Citizens at level N elect their representative to level N+1.)
   */
  async castBallot(voterId: string, dto: CastBallotDto) {
    const election = await this.prisma.khuralElection.findUnique({
      where: { id: dto.electionId },
      include: { candidates: true },
    });
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'VOTING') throw new BadRequestException('Election is not in voting phase');

    const now = new Date();
    if (now < election.votingStart || now > election.votingEnd) {
      throw new BadRequestException('Outside voting window');
    }

    const candidate = election.candidates.find(c => c.candidateId === dto.candidateId);
    if (!candidate) throw new BadRequestException('Candidate not found in this election');

    const existingVote = await this.prisma.khuralBallot.findFirst({
      where: { electionId: dto.electionId, voterId },
    });
    if (existingVote) throw new BadRequestException('Already voted in this election');

    // sha256 Merkle leaf
    const leaf = createHash('sha256')
      .update(`${dto.electionId}|${voterId}|${dto.candidateId}|${now.toISOString()}`)
      .digest('hex');

    const ballot = await this.prisma.khuralBallot.create({
      data: {
        electionId: dto.electionId,
        voterId,
        candidateId: dto.candidateId,
        merkleLeaf: leaf,
        castedAt: now,
      },
    });

    await this.prisma.khuralCandidate.update({
      where: { id: candidate.id },
      data: { voteCount: { increment: 1 } },
    });

    return { ballot, merkleLeaf: leaf };
  }

  /** CIK certifies results → result hash → winner becomes toLevel branch leader */
  async certifyElection(requesterId: string, electionId: string) {
    await this.assertCIKMember(requesterId);

    const election = await this.prisma.khuralElection.findUnique({
      where: { id: electionId },
      include: { candidates: { orderBy: { voteCount: 'desc' } } },
    });
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'VOTING') throw new BadRequestException('Election must be in VOTING status');
    if (new Date() < election.votingEnd) throw new BadRequestException('Voting period has not ended yet');

    const totalVotes = await this.prisma.khuralBallot.count({ where: { electionId } });
    const winners    = election.candidates.slice(0, election.seatsCount);
    const certifiedAt = new Date();

    const resultPayload = winners.map(w => `${w.candidateId}:${w.voteCount}`).join('|');
    const resultHash = createHash('sha256')
      .update(`${electionId}|${resultPayload}|${totalVotes}|${certifiedAt.toISOString()}`)
      .digest('hex');

    const certified = await this.prisma.khuralElection.update({
      where: { id: electionId },
      data: { status: 'CERTIFIED', totalVotes, certifiedAt, resultHash, winnerId: winners[0]?.candidateId ?? null },
      include: { candidates: { orderBy: { voteCount: 'desc' } } },
    });

    this.logger.log(
      `[CIK] Certified: [${election.branch}] ${election.fromLevel}→${election.toLevel} ` +
      `in "${election.scopeName}". Winner: ${winners[0]?.candidateId}. Hash: ${resultHash}`,
    );

    return { election: certified, winners, totalVotes, resultHash };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  async getElections(params: { status?: string; branch?: string; fromLevel?: string; toLevel?: string }) {
    const where: any = {};
    if (params.status)    where.status    = params.status;
    if (params.branch)    where.branch    = params.branch;
    if (params.fromLevel) where.fromLevel = params.fromLevel;
    if (params.toLevel)   where.toLevel   = params.toLevel;

    return this.prisma.khuralElection.findMany({
      where,
      include: {
        candidates: {
          include: { candidate: { select: { seatId: true, username: true } } },
          orderBy: { voteCount: 'desc' },
        },
        _count: { select: { ballots: true } },
      },
      orderBy: { votingStart: 'desc' },
    });
  }

  async getElection(id: string) {
    const election = await this.prisma.khuralElection.findUnique({
      where: { id },
      include: {
        candidates: {
          include: { candidate: { select: { seatId: true, username: true, isVerified: true } } },
          orderBy: { voteCount: 'desc' },
        },
        _count: { select: { ballots: true } },
      },
    });
    if (!election) throw new NotFoundException('Election not found');
    return election;
  }

  /** Snapshot view of the entire election ladder for all 4 branches */
  async getLadderStatus(scopeId: string) {
    const elections = await this.prisma.khuralElection.findMany({
      where: { scopeId },
      include: {
        candidates: { include: { candidate: { select: { seatId: true, username: true } } }, orderBy: { voteCount: 'desc' } },
        _count: { select: { ballots: true } },
      },
      orderBy: [{ fromLevel: 'asc' }, { branch: 'asc' }],
    });

    // Group by [fromLevel → toLevel] rung then by branch
    const ladder: Record<string, Record<string, typeof elections[0]>> = {};
    for (const e of elections) {
      const rung = `${e.fromLevel}→${e.toLevel}`;
      if (!ladder[rung]) ladder[rung] = {};
      ladder[rung][e.branch] = e;
    }
    return { ladder, all: elections };
  }

  // ─────────────────────────────────────────────────────────────────────────

  private async assertCIKMember(userId: string) {
    const member = await this.prisma.cIKMember.findFirst({
      where: { userId, cik: { status: 'ACTIVE' } },
    });
    if (!member) throw new ForbiddenException('Must be an active CIK member');
  }
}
