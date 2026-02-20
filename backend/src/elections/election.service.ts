import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ElectionStatus, Election } from '@prisma/client';

/**
 * Result hash: sha256(electionId + winnerId + winnerVotes + totalVotes + certifiedAt)
 * Computed ATOMICALLY when the winner is declared.
 * If winnerId or counts change afterward → hash mismatch on next verification.
 * "The ancestor's vote cannot be changed retroactively."
 */
function computeResultHash(
  electionId: string,
  winnerId: string,
  winnerVotes: number,
  totalVotes: number,
  certifiedAt: Date,
): string {
  const data = `${electionId}|${winnerId}|${winnerVotes}|${totalVotes}|${certifiedAt.toISOString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

interface CreateElectionDto {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  creatorId: string;
  termMonths?: number;
  isAnonymous?: boolean;
}

interface VoteDto {
  electionId: string;
  voterId: string;
  candidateId: string;
}

@Injectable()
export class ElectionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create election for organization
   * Auto-discovers candidates (leaders of child organizations)
   */
  async createElection(data: CreateElectionDto): Promise<Election> {
    const { organizationId, startDate, endDate, creatorId } = data;

    // 1. Get organization
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        children: {
          include: {
            leader: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // 2. Check creator has permission (must be leader or deputy)
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: creatorId,
        role: 'LEADER',
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only leaders can create elections');
    }

    // 3. Check for existing active election
    const existingElection = await this.prisma.election.findFirst({
      where: {
        organizationId,
        status: { in: ['UPCOMING', 'ACTIVE'] },
      },
    });

    if (existingElection) {
      throw new BadRequestException('An election is already scheduled/active');
    }

    // 4. Create election
    const status = startDate > new Date() ? 'UPCOMING' : 'ACTIVE';
    
    const election = await this.prisma.election.create({
      data: {
        organizationId,
        startDate,
        endDate,
        status,
        termMonths: data.termMonths ?? 12,
        isAnonymous: data.isAnonymous ?? true,
      },
      include: {
        organization: true,
      },
    });

    // 5. Auto-add candidates (child organization leaders)
    if (organization.children.length > 0) {
      const candidatesData = organization.children.map((child) => ({
        electionId: election.id,
        candidateId: child.leaderId,
      }));

      await this.prisma.electionCandidate.createMany({
        data: candidatesData,
      });
    }

    return election;
  }

  /**
   * Add candidate manually (if no automatic candidates)
   */
  async addCandidate(
    electionId: string,
    candidateId: string,
    platform?: string
  ) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundException('Election not found');
    }

    if (election.status === 'COMPLETED') {
      throw new BadRequestException('Election already completed');
    }

    // Check if candidate is organization member
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: election.organizationId,
        userId: candidateId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Candidate must be organization member');
    }

    // Add candidate
    return this.prisma.electionCandidate.create({
      data: {
        electionId,
        candidateId,
        platform,
      },
      include: {
        candidate: {
          select: {
            id: true,
            username: true,
            
          },
        },
      },
    });
  }

  /**
   * Cast vote
   */
  async vote(data: VoteDto): Promise<void> {
    const { electionId, voterId, candidateId } = data;

    // 1. Get election
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: true,
      },
    });

    if (!election) {
      throw new NotFoundException('Election not found');
    }

    // 2. Check election is active
    if (election.status !== 'ACTIVE') {
      throw new BadRequestException('Election is not active');
    }

    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      throw new BadRequestException('Voting period has not started or has ended');
    }

    // 3. Check voter is organization member
    const voterMembership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: election.organizationId,
        userId: voterId,
      },
    });

    if (!voterMembership) {
      throw new ForbiddenException('Only organization members can vote');
    }

    // GOVERNANCE: Only CITIZEN or INDIGENOUS can vote (RESIDENT not yet accepted by indigenous)
    const voter = await this.prisma.user.findUnique({ where: { id: voterId } });
    if (!voter || (voter as any).citizenType === 'RESIDENT') {
      throw new ForbiddenException(
        'Только граждане (CITIZEN или INDIGENOUS) могут голосовать на выборах. Жители (RESIDENT) должны быть сначала приняты.',
      );
    }

    // 4. Check candidate exists
    const candidate = await this.prisma.electionCandidate.findFirst({
      where: {
        electionId,
        candidateId,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // 5. Determine vote weight based on organization ownership type
    let voteWeight = 1;

    if (election.organization.ownershipType === 'PRIVATE') {
      // PRIVATE org: vote weight = shareholder ownership %
      const shareholding = await this.prisma.orgShareholder.findUnique({
        where: {
          organizationId_userId: {
            organizationId: election.organizationId,
            userId: voterId,
          },
        },
      });
      if (!shareholding) {
        throw new ForbiddenException(
          'Only shareholders can vote in a private organization',
        );
      }
      voteWeight = Number(shareholding.voteWeight);
    }
    // PUBLIC / MUNICIPAL: 1 member = 1 vote (default voteWeight = 1)

    // 6. Increment vote count with weight
    await this.prisma.electionCandidate.update({
      where: { id: candidate.id },
      data: {
        votes: {
          increment: Math.round(voteWeight),
        },
      },
    });

    // Increment total votes
    await this.prisma.election.update({
      where: { id: electionId },
      data: {
        totalVotes: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Complete election (declare winner).
   *
   * DETERMINISM: resultHash is computed atomically with the winner declaration.
   * Anyone can recompute the hash from the public data and verify independently.
   */
  async completeElection(electionId: string, adminId: string): Promise<Election> {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: { orderBy: { votes: 'desc' } },
        organization: true,
      },
    });

    if (!election) throw new NotFoundException('Election not found');
    if (election.status === 'COMPLETED') throw new BadRequestException('Election already completed');

    const winner = election.candidates[0];
    if (!winner) throw new BadRequestException('No candidates in election');

    const totalMembers = await this.prisma.organizationMember.count({
      where: { organizationId: election.organizationId },
    });
    const turnoutRate = totalMembers > 0
      ? (election.totalVotes / totalMembers) * 100
      : 0;

    // ── Compute result certification hash ────────────────────────────────
    const certifiedAt = new Date();
    const resultHash = computeResultHash(
      electionId,
      winner.candidateId,
      winner.votes,
      election.totalVotes,
      certifiedAt,
    );
    // ───────────────────────────────────────────────────────────────

    const completedElection = await this.prisma.election.update({
      where: { id: electionId },
      data: {
        status: 'COMPLETED',
        winnerId: winner.candidateId,
        winnerVotes: winner.votes,
        turnoutRate,
        resultHash,      // ← LOCKED FOREVER at this moment
        certifiedAt,
      },
      include: {
        winner: true,
        organization: true,
        candidates: { include: { candidate: true } },
      },
    });

    // Update organization leader
    await this.prisma.organization.update({
      where: { id: election.organizationId },
      data: { leaderId: winner.candidateId },
    });

    // Transfer leadership roles
    await this.prisma.organizationMember.updateMany({
      where: { organizationId: election.organizationId, role: 'LEADER' },
      data: { role: 'MEMBER' },
    });
    await this.prisma.organizationMember.updateMany({
      where: { organizationId: election.organizationId, userId: winner.candidateId },
      data: { role: 'LEADER' },
    });

    return {
      ...completedElection,
      resultHash,
      certifiedAt,
    } as any;
  }

  /**
   * Cancel election
   */
  async cancelElection(electionId: string, adminId: string): Promise<Election> {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundException('Election not found');
    }

    if (election.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed election');
    }

    return this.prisma.election.update({
      where: { id: electionId },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Get election details. Includes integrity verification of resultHash.
   *
   * TAMPER DETECTION: For completed elections, recomputes resultHash from
   * current DB values. If someone changed winnerId or vote counts after
   * certification → the mismatch is returned in integrity.error.
   */
  async getElection(electionId: string) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: true,
        winner: { select: { id: true, username: true } },
        candidates: {
          include: { candidate: { select: { id: true, username: true } } },
          orderBy: { votes: 'desc' },
        },
      },
    });

    if (!election) throw new NotFoundException('Election not found');

    // ── Integrity verification ──────────────────────────────────────────
    let integrityOk = true;
    let integrityError: string | null = null;

    if (election.status === 'COMPLETED' && election.resultHash && election.certifiedAt) {
      const expected = computeResultHash(
        election.id,
        election.winnerId!,
        election.winnerVotes!,
        election.totalVotes,
        election.certifiedAt,
      );
      if (expected !== election.resultHash) {
        integrityOk = false;
        integrityError =
          '⚠️ INTEGRITY VIOLATION: Election result was modified after certification. ' +
          `Expected: ${election.resultHash.slice(0, 12)}... Got: ${expected.slice(0, 12)}...`;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // During anonymous+active election: hide individual vote counts
    const result = {
      ...election,
      integrity: { ok: integrityOk, resultHash: election.resultHash, certifiedAt: election.certifiedAt, error: integrityError },
    };

    if (election.isAnonymous && election.status === 'ACTIVE') {
      return {
        ...result,
        candidates: election.candidates.map((c) => ({ ...c, votes: undefined })),
      };
    }

    return result;
  }

  /**
   * Get organization's elections
   */
  async getOrganizationElections(organizationId: string) {
    return this.prisma.election.findMany({
      where: { organizationId },
      include: {
        winner: {
          select: {
            id: true,
            username: true,
            
          },
        },
        candidates: {
          include: {
            candidate: {
              select: {
                id: true,
                username: true,
                
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  /**
   * Get active elections
   */
  async getActiveElections() {
    return this.prisma.election.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        candidates: {
          include: {
            candidate: {
              select: {
                id: true,
                username: true,
                
              },
            },
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });
  }

  /**
   * Get upcoming elections
   */
  async getUpcomingElections() {
    return this.prisma.election.findMany({
      where: {
        status: 'UPCOMING',
      },
      include: {
        organization: true,
        candidates: {
          include: {
            candidate: {
              select: {
                id: true,
                username: true,
                
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Activate upcoming elections (cron job)
   */
  async activateUpcomingElections(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.election.updateMany({
      where: {
        status: 'UPCOMING',
        startDate: {
          lte: now,
        },
      },
      data: {
        status: 'ACTIVE',
      },
    });

    return result.count;
  }

  /**
   * Auto-complete elections (cron job)
   */
  async autoCompleteElections(): Promise<number> {
    const now = new Date();

    // Get elections that need completion
    const elections = await this.prisma.election.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: now,
        },
      },
      include: {
        candidates: {
          orderBy: {
            votes: 'desc',
          },
        },
      },
    });

    let count = 0;
    for (const election of elections) {
      try {
        await this.completeElection(election.id, 'system-auto');
        count++;
      } catch (error) {
        console.error(`Failed to auto-complete election ${election.id}:`, error);
      }
    }

    return count;
  }
}
