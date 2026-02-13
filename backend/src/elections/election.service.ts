import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElectionStatus, Election } from '@prisma/client';

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
   * Complete election (declare winner)
   */
  async completeElection(electionId: string, adminId: string): Promise<Election> {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: {
          orderBy: {
            votes: 'desc',
          },
        },
        organization: true,
      },
    });

    if (!election) {
      throw new NotFoundException('Election not found');
    }

    if (election.status === 'COMPLETED') {
      throw new BadRequestException('Election already completed');
    }

    // Find winner (most votes)
    const winner = election.candidates[0];

    if (!winner) {
      throw new BadRequestException('No candidates in election');
    }

    // Calculate turnout
    const totalMembers = await this.prisma.organizationMember.count({
      where: {
        organizationId: election.organizationId,
      },
    });

    const turnoutRate = totalMembers > 0 
      ? (election.totalVotes / totalMembers) * 100 
      : 0;

    // Update election
    const completedElection = await this.prisma.election.update({
      where: { id: electionId },
      data: {
        status: 'COMPLETED',
        winnerId: winner.candidateId,
        winnerVotes: winner.votes,
        turnoutRate,
      },
      include: {
        winner: true,
        organization: true,
        candidates: {
          include: {
            candidate: true,
          },
        },
      },
    });

    // Update organization leader
    await this.prisma.organization.update({
      where: { id: election.organizationId },
      data: {
        leaderId: winner.candidateId,
      },
    });

    // Update membership roles
    // Remove LEADER role from old leader
    await this.prisma.organizationMember.updateMany({
      where: {
        organizationId: election.organizationId,
        role: 'LEADER',
      },
      data: {
        role: 'MEMBER',
      },
    });

    // Assign LEADER role to winner
    await this.prisma.organizationMember.updateMany({
      where: {
        organizationId: election.organizationId,
        userId: winner.candidateId,
      },
      data: {
        role: 'LEADER',
      },
    });

    return completedElection;
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
   * Get election details
   */
  async getElection(electionId: string) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: true,
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
          orderBy: {
            votes: 'desc',
          },
        },
      },
    });

    // If anonymous + still active, hide individual vote counts
    if (election?.isAnonymous && election.status === 'ACTIVE') {
      return {
        ...election,
        candidates: election.candidates.map((c) => ({
          ...c,
          votes: undefined, // Hide until election completes
        })),
      };
    }

    return election;
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
