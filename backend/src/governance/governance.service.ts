import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PowerBranchType, ProvisionalStatus, HierarchyLevel } from '@prisma/client';

/**
 * GovernanceService — Public state-snapshot aggregator
 *
 * Returns a single comprehensive payload for the Governance Dashboard:
 * - Formation status of all 4 branches (PROVISIONAL / FORMED)
 * - Active CIK + election ladder progress
 * - Hot petitions from the Public Square
 * - Citizen & org statistics
 * - Audit log tail
 */
@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      branches,
      cik,
      elections,
      hotPetitions,
      citizenCount,
      verifiedCount,
      orgCount,
      auditTail,
      escalatedPosts,
      legislativePosts,
    ] = await Promise.all([
      // ── 1. Branch formation status ─────────────────────────────────────────
      this.getBranchStatus(),

      // ── 2. Active CIK ─────────────────────────────────────────────────────
      this.prisma.cIK.findFirst({
        where: { status: 'ACTIVE' },
        include: {
          members: {
            include: { user: { select: { seatId: true, username: true, isVerified: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // ── 3. Active & recent elections ──────────────────────────────────────
      this.prisma.khuralElection.findMany({
        where: { status: { in: ['NOMINATION', 'VOTING'] } },
        include: {
          candidates: { select: { voteCount: true }, orderBy: { voteCount: 'desc' } },
          _count: { select: { ballots: true } },
        },
        orderBy: { votingStart: 'asc' },
        take: 12,
      }),

      // ── 4. Hot petitions ──────────────────────────────────────────────────
      this.prisma.publicSquarePost.findMany({
        where: {
          postType: 'PETITION',
          status: { in: ['OPEN', 'VOTING', 'ESCALATED'] },
        },
        orderBy: { supportCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          level: true,
          scopeName: true,
          supportCount: true,
          requiredSupport: true,
          status: true,
          postType: true,
        },
      }),

      // ── 5. Population stats ───────────────────────────────────────────────
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.organization.count(),

      // ── 6. Audit log tail (last 5 major actions) ──────────────────────────
      this.prisma.creatorAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          provisionalRole: { select: { branch: true, roleName: true, roleDisplayName: true } },
        },
      }),

      // ── 7. Public square escalated posts ─────────────────────────────────
      this.prisma.publicSquarePost.count({ where: { status: 'ESCALATED' } }),
      this.prisma.publicSquarePost.count({ where: { status: 'LEGISLATIVE' } }),
    ]);

    // Summarise election ladder: group by (fromLevel→toLevel) rung
    const electionRungMap: Record<string, number> = {};
    for (const e of elections) {
      const rung = `${e.fromLevel}→${e.toLevel}`;
      electionRungMap[rung] = (electionRungMap[rung] ?? 0) + 1;
    }

    const isFormationPeriod = branches.some(b => b.status === 'PROVISIONAL');

    return {
      timestamp: new Date().toISOString(),
      isFormationPeriod,
      banner: isFormationPeriod
        ? '🏛️ Государство формируется — примите участие в строительстве суверенной системы'
        : null,

      // Branch formation
      branches,

      // CIK
      cik,
      activeElections: elections.length,
      electionsByRung: electionRungMap,

      // Featured elections (first 6 for UI)
      featuredElections: elections.slice(0, 6).map(e => ({
        id: e.id,
        fromLevel: e.fromLevel,
        toLevel: e.toLevel,
        branch: e.branch,
        scopeName: e.scopeName,
        status: e.status,
        votingEnd: e.votingEnd,
        ballotCount: e._count.ballots,
        leadingCandidate: e.candidates[0] ?? null,
      })),

      // Public Square
      hotPetitions,
      escalatedPosts,
      legislativePosts,

      // Population
      stats: {
        totalCitizens: citizenCount,
        verifiedCitizens: verifiedCount,
        activeOrganizations: orgCount,
        verificationRate:
          citizenCount > 0
            ? Math.round((verifiedCount / citizenCount) * 100)
            : 0,
      },

      // Audit trail
      recentActions: auditTail,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async getBranchStatus() {
    const branches = [
      PowerBranchType.LEGISLATIVE,
      PowerBranchType.EXECUTIVE,
      PowerBranchType.JUDICIAL,
      PowerBranchType.BANKING,
    ];

    return Promise.all(
      branches.map(async branch => {
        const activeRoles = await this.prisma.creatorProvisionalRole.findMany({
          where: { branch, status: ProvisionalStatus.ACTIVE },
          select: { roleName: true, roleDisplayName: true, startedAt: true },
        });
        const transferredCount = await this.prisma.creatorProvisionalRole.count({
          where: { branch, status: ProvisionalStatus.TRANSFERRED },
        });

        // Count elected leaders at top level for this branch
        const formedLeaders = await this.prisma.khuralElection.count({
          where: {
            branch,
            status: 'CERTIFIED',
            toLevel: HierarchyLevel.CONFEDERATION,
          },
        });

        return {
          branch,
          status: activeRoles.length > 0 ? ('PROVISIONAL' as const) : ('FORMED' as const),
          provisionalRoles: activeRoles,
          transferredRoles: transferredCount,
          formedLeaders,
        };
      }),
    );
  }
}
