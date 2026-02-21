import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import {
  CreateKhuralElectionDto,
  RegisterCandidateDto,
  CastBallotDto,
  AppointProvisionalCIKDto,
  KhuralElectionType,
} from './dto/cik.dto';

/**
 * CIK (Центральная Избирательная Комиссия) — Electoral Commission Service
 *
 * Lifecycle:
 * 1. Creator appoints PROVISIONAL CIK (3–7 trusted citizens) to run first Khural election
 * 2. Provisional CIK creates the Khural election, manages nominations, controls voting
 * 3. After first Khural is seated:
 *    - Khural appoints PERMANENT CIK by vote
 *    - Provisional CIK is marked DISSOLVED (self-destructs)
 * 4. All future elections are administered by the permanent CIK
 *
 * Ballot integrity: each vote produces a Merkle-leaf hash.
 * Final results are anchored with a result hash (same pattern as ElectionService).
 */
@Injectable()
export class CIKService {
  private readonly logger = new Logger(CIKService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PROVISIONAL CIK — Creator only
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creator appoints initial provisional CIK.
   * Can only be done once (idempotent guard).
   */
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

    // Idempotency — check if already appointed
    const existing = await this.prisma.cIK.findFirst({
      where: { type: 'PROVISIONAL', status: 'ACTIVE' },
    });
    if (existing) {
      return { ...existing, message: 'Provisional CIK already active' };
    }

    const cik = await this.prisma.cIK.create({
      data: {
        type: 'PROVISIONAL',
        status: 'ACTIVE',
        appointedById: creatorId,
        mandate: dto.mandate ?? 'Conduct first Khural elections and dissolve upon seating',
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

    this.logger.log(`[CIK] Provisional CIK appointed by Creator with ${dto.memberIds.length} members`);
    return cik;
  }

  /**
   * Dissolve provisional CIK (called automatically after first Khural is seated,
   * or manually by Creator/Khural).
   */
  async dissolveProvisionalCIK(requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    if (requester?.role !== UserRole.CREATOR) {
      throw new ForbiddenException('Only the Creator can dissolve the provisional CIK at this stage');
    }

    const cik = await this.prisma.cIK.findFirst({ where: { type: 'PROVISIONAL', status: 'ACTIVE' } });
    if (!cik) throw new NotFoundException('No active provisional CIK found');

    return this.prisma.cIK.update({
      where: { id: cik.id },
      data: { status: 'DISSOLVED', dissolvedAt: new Date() },
    });
  }

  /** Get current active CIK (provisional or permanent) */
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
  // KHURAL ELECTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * CIK creates a Khural election.
   * Called by a CIK member.
   */
  async createKhuralElection(requesterId: string, dto: CreateKhuralElectionDto) {
    await this.assertCIKMember(requesterId);

    const votingStart = new Date(dto.votingStart);
    const votingEnd = new Date(dto.votingEnd);
    const nominationDeadline = new Date(dto.nominationDeadline);

    if (nominationDeadline >= votingStart) {
      throw new BadRequestException('Nomination deadline must be before voting start');
    }
    if (votingEnd <= votingStart) {
      throw new BadRequestException('Voting end must be after voting start');
    }

    const election = await this.prisma.khuralElection.create({
      data: {
        createdById: requesterId,
        electionType: dto.electionType,
        scopeId: dto.scopeId,
        title: dto.title,
        description: dto.description,
        nominationDeadline,
        votingStart,
        votingEnd,
        seatsCount: dto.seatsCount ?? 1,
        status: 'NOMINATION',
      },
    });

    this.logger.log(`[CIK] Khural election created: "${dto.title}" (${dto.electionType})`);
    return election;
  }

  /**
   * Verified citizen registers as a candidate.
   */
  async registerCandidate(candidateId: string, dto: RegisterCandidateDto) {
    const election = await this.prisma.khuralElection.findUnique({
      where: { id: dto.electionId },
    });
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'NOMINATION') {
      throw new BadRequestException('Nominations are closed');
    }
    if (new Date() > election.nominationDeadline) {
      throw new BadRequestException('Nomination deadline has passed');
    }

    // Verify candidate eligibility
    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: { isVerified: true, isLegalSubject: true },
    });
    if (!candidate?.isVerified || !candidate?.isLegalSubject) {
      throw new ForbiddenException('Must be a verified legal subject to run for Khural');
    }

    // Idempotent
    const existing = await this.prisma.khuralCandidate.findFirst({
      where: { electionId: dto.electionId, candidateId },
    });
    if (existing) return existing;

    return this.prisma.khuralCandidate.create({
      data: {
        electionId: dto.electionId,
        candidateId,
        platform: dto.platform,
      },
      include: { candidate: { select: { seatId: true, username: true } } },
    });
  }

  /**
   * Cast a ballot — each ballot produces a Merkle leaf hash.
   */
  async castBallot(voterId: string, dto: CastBallotDto) {
    const election = await this.prisma.khuralElection.findUnique({
      where: { id: dto.electionId },
      include: { candidates: true },
    });
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'VOTING') {
      throw new BadRequestException('Election is not in voting phase');
    }
    const now = new Date();
    if (now < election.votingStart || now > election.votingEnd) {
      throw new BadRequestException('Outside voting window');
    }

    // Check candidate exists in this election
    const candidate = election.candidates.find(c => c.candidateId === dto.candidateId);
    if (!candidate) throw new BadRequestException('Candidate not found in this election');

    // One vote per citizen per election
    const existingVote = await this.prisma.khuralBallot.findFirst({
      where: { electionId: dto.electionId, voterId },
    });
    if (existingVote) throw new BadRequestException('Already voted in this election');

    // Merkle leaf = sha256(electionId | voterId | candidateId | timestamp)
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

    // Increment candidate vote count
    await this.prisma.khuralCandidate.update({
      where: { id: candidate.id },
      data: { voteCount: { increment: 1 } },
    });

    return { ballot, merkleLeaf: leaf };
  }

  /**
   * CIK certifies election result, computes result hash.
   * Elects top N candidates (by seatsCount).
   * Optionally auto-dissolves provisional CIK after first Khural seating.
   */
  async certifyElection(requesterId: string, electionId: string) {
    await this.assertCIKMember(requesterId);

    const election = await this.prisma.khuralElection.findUnique({
      where: { id: electionId },
      include: { candidates: { orderBy: { voteCount: 'desc' } } },
    });
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'VOTING') {
      throw new BadRequestException('Election must be in VOTING status to certify');
    }
    if (new Date() < election.votingEnd) {
      throw new BadRequestException('Voting period has not ended yet');
    }

    const totalVotes = await this.prisma.khuralBallot.count({ where: { electionId } });
    const winners = election.candidates.slice(0, election.seatsCount);
    const certifiedAt = new Date();

    // Result hash: certify the outcome
    const resultPayload = winners.map(w => `${w.candidateId}:${w.voteCount}`).join('|');
    const resultHash = createHash('sha256')
      .update(`${electionId}|${resultPayload}|${totalVotes}|${certifiedAt.toISOString()}`)
      .digest('hex');

    const certified = await this.prisma.khuralElection.update({
      where: { id: electionId },
      data: {
        status: 'CERTIFIED',
        totalVotes,
        certifiedAt,
        resultHash,
        winnerId: winners[0]?.candidateId ?? null,
      },
      include: { candidates: { orderBy: { voteCount: 'desc' } } },
    });

    this.logger.log(
      `[CIK] Election "${election.title}" certified. ${winners.length} seat(s) filled. Hash: ${resultHash}`,
    );

    return { election: certified, winners, totalVotes, resultHash };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────────────────

  async getElections(status?: string) {
    return this.prisma.khuralElection.findMany({
      where: status ? { status } : undefined,
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

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async assertCIKMember(userId: string) {
    const member = await this.prisma.cIKMember.findFirst({
      where: {
        userId,
        cik: { status: 'ACTIVE' },
      },
    });
    if (!member) throw new ForbiddenException('Must be an active CIK member');
  }
}
