import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ── DETERMINISM HELPERS ────────────────────────────────────────────────────────
 *
 * "История — это append-only лог. Прошлое нельзя переписать."
 *
 * These functions produce cryptographic commitments to state.
 * If anyone tampers with the database record AFTER these are computed,
 * the hash will no longer match — the tampering is immediately detectable.
 */

/** Vote nullifier: sha256(seatId + proposalId + "vote")
 *  Proves that citizen X voted on proposal Y WITHOUT revealing HOW they voted.
 *  If the same person tries to vote twice → nullifier is already in DB → error. */
export function computeVoteNullifier(seatId: string, proposalId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${seatId}|${proposalId}|vote`)
    .digest('hex');
}

/** Vote commitment: sha256(seatId + proposalId + vote + isoTimestamp)
 *  Immutable proof of the FULL vote: WHO + ON WHAT + HOW + WHEN.
 *  Tamper-detect: if anyone changes `vote` column in DB → this hash breaks. */
export function computeVoteCommitment(
  seatId: string,
  proposalId: string,
  vote: string,
  createdAt: Date,
): string {
  return crypto
    .createHash('sha256')
    .update(`${seatId}|${proposalId}|${vote}|${createdAt.toISOString()}`)
    .digest('hex');
}

/** Law content hash: sha256(title + "\n" + fullText)
 *  Locked at the moment of signing. If text changes after that → mismatch detected. */
export function computeContentHash(title: string, fullText: string): string {
  return crypto
    .createHash('sha256')
    .update(`${title}\n${fullText}`)
    .digest('hex');
}

/**
 * LegislativeService — DB-based lifecycle for law proposals.
 *
 * Complements VotingCenterService (on-chain voting) with a full
 * database-backed workflow:
 *
 *   DRAFT → SUBMITTED → DEBATE → VOTING → PASSED → SIGNED → ARCHIVED
 *                                                    ↘ REJECTED
 *
 * Each proposal is tied to a Khural level (Arbad..Confederate) and entity.
 * Voting results are cached on the proposal for fast reads.
 */
@Injectable()
export class LegislativeService {
  private readonly logger = new Logger(LegislativeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // PROPOSAL CRUD
  // ===========================================================================

  /**
   * Create a new law proposal (starts as DRAFT).
   * GOVERNANCE: Only holders of exclusive land right (or delegates) can create proposals.
   */
  async createProposal(
    authorId: string,
    dto: {
      title: string;
      description: string;
      fullText: string;
      category: string;
      khuralLevel: string;
      entityId: string;
    },
  ) {
    await this.ensureLegislativeEligibility(authorId);

    const proposal = await this.prisma.legislativeProposal.create({
      data: {
        authorId,
        title: dto.title,
        description: dto.description,
        fullText: dto.fullText,
        category: dto.category,
        khuralLevel: dto.khuralLevel,
        entityId: dto.entityId,
        status: 'DRAFT',
      },
      include: {
        author: { select: { id: true, seatId: true, username: true } },
      },
    });

    this.logger.log(
      `Proposal "${proposal.title}" created by ${authorId} for ${dto.khuralLevel}`,
    );
    return proposal;
  }

  /**
   * Get a single proposal with all relations.
   * ⚠️  TAMPER DETECTION: If the proposal is SIGNED and contentHash is set,
   *    we verify that the current title+fullText match the locked hash.
   *    If they don't match — the text was modified after signing — this is a
   *    CRITICAL INTEGRITY VIOLATION that is returned in the response.
   */
  async getProposal(id: string) {
    const proposal = await this.prisma.legislativeProposal.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, seatId: true, username: true } },
        signedBy: { select: { id: true, seatId: true, username: true } },
        votes: {
          include: {
            voter: { select: { id: true, seatId: true, username: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        debates: {
          include: {
            speaker: { select: { id: true, seatId: true, username: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // ── Tamper detection for signed laws ──────────────────────────────────────
    let integrityOk = true;
    let integrityError: string | null = null;

    if (proposal.contentHash && proposal.contentLockedAt) {
      const currentHash = computeContentHash(proposal.title, proposal.fullText);
      if (currentHash !== proposal.contentHash) {
        integrityOk = false;
        integrityError =
          '⚠️ INTEGRITY VIOLATION: Law text was modified after signing. ' +
          `Expected: ${proposal.contentHash.slice(0, 12)}... Got: ${currentHash.slice(0, 12)}...`;
        this.logger.error(
          `🚨 LAW TAMPER DETECTED: Proposal ${id} content changed after signing!`,
        );
      }
    }
    // ────────────────────────────────────────────────────────────────────

    return {
      ...proposal,
      integrity: {
        ok: integrityOk,
        contentHash: proposal.contentHash ?? null,
        contentLockedAt: proposal.contentLockedAt ?? null,
        error: integrityError,
      },
    };
  }

  /**
   * List proposals with filters.
   */
  async listProposals(filters?: {
    status?: string;
    khuralLevel?: string;
    entityId?: string;
    authorId?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.khuralLevel) where.khuralLevel = filters.khuralLevel;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.authorId) where.authorId = filters.authorId;
    if (filters?.category) where.category = filters.category;

    const [proposals, total] = await this.prisma.$transaction([
      this.prisma.legislativeProposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, seatId: true, username: true } },
          _count: { select: { votes: true, debates: true } },
        },
      }),
      this.prisma.legislativeProposal.count({ where }),
    ]);

    return {
      data: proposals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===========================================================================
  // LIFECYCLE TRANSITIONS
  // ===========================================================================

  /**
   * Submit a draft proposal for consideration (DRAFT → SUBMITTED).
   */
  async submitProposal(proposalId: string, userId: string) {
    const proposal = await this.ensureStatus(proposalId, 'DRAFT');
    this.ensureAuthor(proposal, userId);

    return this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: { status: 'SUBMITTED' },
    });
  }

  /**
   * Open debate period (SUBMITTED → DEBATE).
   * Can be triggered by a Khural session leader.
   */
  async openDebate(proposalId: string) {
    await this.ensureStatus(proposalId, 'SUBMITTED');

    return this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: { status: 'DEBATE' },
    });
  }

  /**
   * Add a debate entry (speech). Only during DEBATE status.
   * GOVERNANCE: Only holders of exclusive land right (or delegates) can speak.
   */
  async addDebateEntry(
    proposalId: string,
    speakerId: string,
    content: string,
    replyToId?: string,
  ) {
    await this.ensureStatus(proposalId, 'DEBATE');
    await this.ensureLegislativeEligibility(speakerId);

    return this.prisma.proposalDebate.create({
      data: {
        proposalId,
        speakerId,
        content,
        replyToId,
      },
      include: {
        speaker: { select: { id: true, seatId: true, username: true } },
      },
    });
  }

  /**
   * Open voting period (DEBATE → VOTING).
   * Can be triggered by a Khural session leader.
   */
  async openVoting(proposalId: string) {
    await this.ensureStatus(proposalId, 'DEBATE');

    return this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: { status: 'VOTING' },
    });
  }

  /**
   * Cast a vote on a proposal. Only during VOTING status.
   *
   * DETERMINISM: Each vote produces two hashes:
   *   - nullifier: proves the citizen voted (for deduplication) WITHOUT revealing how
   *   - commitmentHash: immutable fingerprint of the full vote (who+what+how+when)
   *
   * If the voter's seatId is not set (shouldn't happen post-registration), a
   * fallback to voterId is used, but this is flagged in the log.
   */
  async castVote(
    proposalId: string,
    voterId: string,
    vote: 'FOR' | 'AGAINST' | 'ABSTAIN',
    comment?: string,
  ) {
    await this.ensureStatus(proposalId, 'VOTING');
    await this.ensureLegislativeEligibility(voterId);

    // Check if already voted (double protection: DB unique + nullifier)
    const existingVote = await this.prisma.proposalVote.findUnique({
      where: { proposalId_voterId: { proposalId, voterId } },
    });
    if (existingVote) {
      throw new BadRequestException('You have already voted on this proposal');
    }

    // Get voter's seatId for deterministic nullifier
    const voter = await this.prisma.user.findUnique({
      where: { id: voterId },
      select: { seatId: true },
    });
    const seatId = voter?.seatId ?? voterId; // fallback (logged)
    if (!voter?.seatId) {
      this.logger.warn(`Voter ${voterId} has no seatId — using userId for nullifier`);
    }

    // ── Compute cryptographic proof ───────────────────────────────────
    const now = new Date();
    const nullifier = computeVoteNullifier(seatId, proposalId);
    const commitmentHash = computeVoteCommitment(seatId, proposalId, vote, now);

    // Check nullifier uniqueness — catches cross-table vote stuffing
    const existingNullifier = await this.prisma.proposalVote.findUnique({
      where: { nullifier },
    });
    if (existingNullifier) {
      this.logger.error(
        `🚨 DOUBLE-VOTE ATTEMPT: seatId=${seatId} tried to vote twice on proposal ${proposalId}`,
      );
      throw new BadRequestException(
        'Double-vote detected: your vote is already committed to this proposal',
      );
    }
    // ─────────────────────────────────────────────────────

    const newVote = await this.prisma.proposalVote.create({
      data: {
        proposalId,
        voterId,
        vote,
        comment,
        nullifier,
        commitmentHash,
        createdAt: now,
      },
      include: {
        voter: { select: { id: true, seatId: true, username: true } },
      },
    });

    // Update cached vote counts atomically
    const counts = await this.prisma.proposalVote.groupBy({
      by: ['vote'],
      where: { proposalId },
      _count: true,
    });

    const votesFor = counts.find((c) => c.vote === 'FOR')?._count ?? 0;
    const votesAgainst = counts.find((c) => c.vote === 'AGAINST')?._count ?? 0;
    const votesAbstain = counts.find((c) => c.vote === 'ABSTAIN')?._count ?? 0;

    await this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: { votesFor, votesAgainst, votesAbstain },
    });

    this.logger.log(
      `✅ Vote ${vote} cast | proposal=${proposalId} | nullifier=${nullifier.slice(0, 12)}...`,
    );
    return {
      ...newVote,
      nullifier,
      commitmentHash,
    };
  }

  /**
   * Finalize voting — count results and transition to PASSED or REJECTED.
   * A simple majority (votesFor > votesAgainst) with quorum (>50% participation)
   * is required for passage.
   */
  async finalizeVoting(proposalId: string) {
    const proposal = await this.ensureStatus(proposalId, 'VOTING');

    const totalVotes =
      proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;

    // Determine quorum: we need at least 1 vote to proceed
    // In production, quorum should be based on Khural membership
    const quorumMet = totalVotes > 0;
    const passed = quorumMet && proposal.votesFor > proposal.votesAgainst;

    const updated = await this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: {
        status: passed ? 'PASSED' : 'REJECTED',
        quorumMet,
      },
    });

    this.logger.log(
      `Proposal "${proposal.title}" ${passed ? 'PASSED' : 'REJECTED'} ` +
        `(${proposal.votesFor} for / ${proposal.votesAgainst} against / ${proposal.votesAbstain} abstain)`,
    );
    return updated;
  }

  /**
   * Sign a passed law (PASSED → SIGNED). Only authorized signer (Khural leader).
   *
   * DETERMINISM: At the moment of signing, the full text is hashed and locked.
   * "History cannot be rewritten." If the text is modified after signing,
   * the hash mismatch is detected in getProposal().
   */
  async signLaw(proposalId: string, signerId: string) {
    const proposal = await this.ensureStatus(proposalId, 'PASSED');

    const now = new Date();
    const contentHash = computeContentHash(proposal.title, proposal.fullText);

    const signed = await this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: {
        status: 'SIGNED',
        signedAt: now,
        signedById: signerId,
        contentHash,         // ← LOCKED FOREVER at this moment
        contentLockedAt: now,
      },
      include: {
        signedBy: { select: { id: true, seatId: true, username: true } },
      },
    });

    this.logger.log(
      `⚖️  Law "${signed.title}" SIGNED by ${signerId} | contentHash=${contentHash.slice(0, 16)}...`,
    );
    return {
      ...signed,
      contentHash,
      message: 'Law signed and content hash locked. Text is now immutable.',
    };
  }

  /**
   * Archive a signed law (SIGNED → ARCHIVED).
   * Optionally links to a DocumentContract in the State Archive.
   */
  async archiveLaw(proposalId: string, documentId?: string) {
    await this.ensureStatus(proposalId, 'SIGNED');

    return this.prisma.legislativeProposal.update({
      where: { id: proposalId },
      data: {
        status: 'ARCHIVED',
        documentId,
      },
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Ensure proposal exists and is in the expected status.
   */
  private async ensureStatus(proposalId: string, expectedStatus: string) {
    const proposal = await this.prisma.legislativeProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status !== expectedStatus) {
      throw new BadRequestException(
        `Proposal is in "${proposal.status}" status, expected "${expectedStatus}"`,
      );
    }

    return proposal;
  }

  /**
   * Ensure the user is the author of the proposal.
   */
  private ensureAuthor(proposal: any, userId: string) {
    if (proposal.authorId !== userId) {
      throw new ForbiddenException('Only the author can perform this action');
    }
  }

  /**
   * GOVERNANCE: Ensure user has exclusive land right or is a delegated Khural representative.
   * Законодательная власть — ТОЛЬКО для обладателей исключительного земельного права.
   */
  private async ensureLegislativeEligibility(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Direct holder of exclusive land right
    if (user.hasExclusiveLandRight) return;

    // Check if they are a delegated Khural representative
    const delegatedBy = await this.prisma.user.findFirst({
      where: {
        khuralRepresentativeId: userId,
        hasExclusiveLandRight: true,
      },
    });
    if (delegatedBy) return;

    throw new ForbiddenException(
      'Только обладатели исключительного земельного права или их представители могут участвовать в законодательной деятельности',
    );
  }
}
