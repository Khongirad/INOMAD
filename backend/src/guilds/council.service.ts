import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouncilService {
  private readonly logger = new Logger(CouncilService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get the Council of Scientists (Top 10 members by Level/XP)
   */
  async getCouncilMembers(guildId?: string) {
    // If guildId is provided, get top members of that guild
    // Otherwise, maybe get top global "Historians" or "Scientists" (future logic)
    // For MVP, if guildId is null, we assume "State Council" or top users globally
    
    return this.prisma.guildMember.findMany({
      where: guildId ? { guildId } : {},
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' },
      ],
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            seatId: true, // "Alex (Architect)"
          }
        }
      }
    });
  }

  /**
   * Propose an edit to History (creates a new Version)
   */
  async proposeVersion(eventId: string, title: string, description: string, userId: string) {
    return this.prisma.khuralEventVersion.create({
      data: {
        eventId,
        title,
        description,
        proposedByUserId: userId,
      },
    });
  }

  /**
   * Cast a validation vote
   */
  async castVote(versionId: string, userId: string, vote: boolean) {
    // 1. Check if user is in Council (Top 10)
    // For MVP efficiency, we skip re-checking the Top 10 query every vote, 
    // but in production, we MUST verify user is currently in the Top 10.
    
    const existingVote = await this.prisma.councilVote.findUnique({
      where: {
        versionId_voterUserId: {
          versionId,
          voterUserId: userId
        }
      }
    });

    if (existingVote) {
      throw new Error("Already voted");
    }

    // 2. record vote
    await this.prisma.councilVote.create({
      data: {
        versionId,
        voterUserId: userId,
        vote
      }
    });

    // 3. check consensus (Need 6/10 ideally, or simple majority of votes cast)
    // Let's implement active consensus check
    const approvals = await this.prisma.councilVote.count({
      where: { versionId, vote: true }
    });

    if (approvals >= 6) {
      this.approveVersion(versionId);
    }
    
    return { voted: true, currentApprovals: approvals };
  }

  /**
   * Consensus reached -> Update the Official Event
   */
  private async approveVersion(versionId: string) {
    // 1. Mark version as approved
    const version = await this.prisma.khuralEventVersion.update({
      where: { id: versionId },
      data: { isApproved: true, approvedAt: new Date() }
    });

    // 2. Update the main KhuralEvent to match this version
    await this.prisma.khuralEvent.update({
      where: { id: version.eventId },
      data: {
        title: version.title,
        description: version.description,
        isVerified: true, // Official Truth
      }
    });

    this.logger.log(`Version ${versionId} approved and applied to Event ${version.eventId}`);
  }
}
