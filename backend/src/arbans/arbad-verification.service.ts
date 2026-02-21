import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TieredVerificationService } from '../verification/tiered-verification.service';
import { VerificationLevel } from '@prisma/client';

export interface VerificationMatrix {
  [memberId: string]: string[]; // memberId -> array of verifier IDs
}

export interface VerificationProgress {
  total: number;
  completed: number;
  percentage: number;
  isComplete: boolean;
  remaining: number;
}

@Injectable()
export class ArbadVerificationService {
  constructor(
    private prisma: PrismaService,
    private tieredVerificationService: TieredVerificationService,
  ) {}

  /**
   * Member verifies another member in the same Arbad
   */
  async verifyMember(
    arbadId: string,
    verifierId: string,
    verifiedId: string,
    notes?: string
  ) {
    // Validate both users are in the same Arbad
    const [verifier, verified] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: verifierId },
        select: { currentArbadId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: verifiedId },
        select: { currentArbadId: true },
      }),
    ]);

    if (!verifier || !verified) {
      throw new NotFoundException('User not found');
    }

    if (verifier.currentArbadId !== arbadId || verified.currentArbadId !== arbadId) {
      throw new ForbiddenException('Both users must be members of this Arbad');
    }

    if (verifierId === verifiedId) {
      throw new BadRequestException('Cannot verify yourself');
    }

    // Check if already verified
    const existing = await this.prisma.arbadMutualVerification.findUnique({
      where: {
        arbadId_verifierId_verifiedId: {
          arbadId,
          verifierId,
          verifiedId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already verified this member');
    }

    // Create verification
    const verification = await this.prisma.arbadMutualVerification.create({
      data: {
        arbadId,
        verifierId,
        verifiedId,
        notes,
        isVerified: true,
        verifiedAt: new Date(),
      },
      include: {
        verifier: {
          select: { id: true, username: true, seatId: true },
        },
        verified: {
          select: { id: true, username: true, seatId: true },
        },
      },
    });

    // Check if Arbad is now fully verified
    const isComplete = await this.isFullyVerified(arbadId);
    
    if (isComplete) {
      await this.onFullVerification(arbadId);
    }

    return {
      verification,
      isArbadComplete: isComplete,
    };
  }

  /**
   * Get verification matrix (who verified whom)
   * Returns: { memberId: [verifierIds] }
   */
  async getVerificationMatrix(arbadId: string): Promise<VerificationMatrix> {
    const verifications = await this.prisma.arbadMutualVerification.findMany({
      where: { arbadId },
      select: {
        verifierId: true,
        verifiedId: true,
      },
    });

    const matrix: VerificationMatrix = {};

    for (const v of verifications) {
      if (!matrix[v.verifiedId]) {
        matrix[v.verifiedId] = [];
      }
      matrix[v.verifiedId].push(v.verifierId);
    }

    return matrix;
  }

  /**
   * Check if Arbad is fully verified (all combinations)
   * For 5 members: need 20 verifications (each member verifies 4 others)
   */
  async isFullyVerified(arbadId: string): Promise<boolean> {
    // Get Arbad members
    const members = await this.prisma.user.findMany({
      where: { currentArbadId: arbadId },
      select: { id: true },
    });

    const memberCount = members.length;

    // Must have exactly 5 members for Arbad
    if (memberCount !== 5) {
      return false;
    }

    // Count total verifications
    const verificationCount = await this.prisma.arbadMutualVerification.count({
      where: { arbadId },
    });

    // For 5 members: 5 * 4 = 20 verifications needed (each verifies 4 others)
    const requiredCount = memberCount * (memberCount - 1);

    return verificationCount >= requiredCount;
  }

  /**
   * Get verification progress for an Arbad
   */
  async getVerificationProgress(arbadId: string): Promise<VerificationProgress> {
    const members = await this.prisma.user.findMany({
      where: { currentArbadId: arbadId },
      select: { id: true },
    });

    const memberCount = members.length;

    if (memberCount !== 5) {
      return {
        total: 20,
        completed: 0,
        percentage: 0,
        isComplete: false,
        remaining: 20,
      };
    }

    const verificationCount = await this.prisma.arbadMutualVerification.count({
      where: { arbadId },
    });

    const requiredCount = memberCount * (memberCount - 1); // 20 for 5 members
    const percentage = Math.round((verificationCount / requiredCount) * 100);
    const isComplete = verificationCount >= requiredCount;

    return {
      total: requiredCount,
      completed: verificationCount,
      percentage,
      isComplete,
      remaining: Math.max(0, requiredCount - verificationCount),
    };
  }

  /**
   * Auto-upgrade all Arbad members when verification is complete
   */
  async onFullVerification(arbadId: string): Promise<void> {
    // Get all Arbad members
    const members = await this.prisma.user.findMany({
      where: { currentArbadId: arbadId },
      select: { id: true },
    });

    // Update all members to ARBAD_VERIFIED
    await this.prisma.user.updateMany({
      where: {
        id: { in: members.map(m => m.id) },
        verificationLevel: VerificationLevel.UNVERIFIED, // Only upgrade if still unverified
      },
      data: {
        verificationLevel: VerificationLevel.ARBAD_VERIFIED,
        arbadVerifiedAt: new Date(),
        verificationLevelSetAt: new Date(),
      },
    });

    // Mark Arbad as fully verified
    await this.prisma.guild.update({
      where: { id: arbadId },
      data: {
        // Note: isFullyVerified field needs to be added to Guild model
        // For now, we track via verification count
      },
    });

    console.log(`✅ Arbad ${arbadId} fully verified! Upgraded ${members.length} members to ARBAD_VERIFIED`);
  }

  /**
   * Get list of members user hasn't verified yet
   */
  async getUnverifiedMembers(arbadId: string, userId: string) {
    // Get all Arbad members except self
    const allMembers = await this.prisma.user.findMany({
      where: {
        currentArbadId: arbadId,
        id: { not: userId },
      },
      select: {
        id: true,
        username: true,
        seatId: true,
        verificationLevel: true,
      },
    });

    // Get already verified members
    const verified = await this.prisma.arbadMutualVerification.findMany({
      where: {
        arbadId,
        verifierId: userId,
      },
      select: { verifiedId: true },
    });

    const verifiedIds = new Set(verified.map(v => v.verifiedId));

    // Return only unverified members
    return allMembers.filter(m => !verifiedIds.has(m.id));
  }

  /**
   * Get verification details for a specific member
   */
  async getMemberVerifications(arbadId: string, memberId: string) {
    const [givenVerifications, receivedVerifications] = await Promise.all([
      // Verifications given by this member
      this.prisma.arbadMutualVerification.findMany({
        where: {
          arbadId,
          verifierId: memberId,
        },
        include: {
          verified: {
            select: {
              id: true,
              username: true,
              seatId: true,
            },
          },
        },
      }),
      // Verifications received by this member
      this.prisma.arbadMutualVerification.findMany({
        where: {
          arbadId,
          verifiedId: memberId,
        },
        include: {
          verifier: {
            select: {
              id: true,
              username: true,
              seatId: true,
            },
          },
        },
      }),
    ]);

    return {
      given: givenVerifications,
      received: receivedVerifications,
      givenCount: givenVerifications.length,
      receivedCount: receivedVerifications.length,
      expectedGiven: 4, // Should verify 4 others
      expectedReceived: 4, // Should be verified by 4 others
    };
  }

  /**
   * Revoke a verification (admin/creator only or self)
   */
  async revokeVerification(
    arbadId: string,
    verifierId: string,
    verifiedId: string,
    revokedBy: string,
    reason?: string
  ) {
    // Check if user can revoke (must be Creator, Admin, or the verifier themselves)
    const revoker = await this.prisma.user.findUnique({
      where: { id: revokedBy },
      select: { role: true, id: true },
    });

    const canRevoke = 
      revokedBy === verifierId || // Can revoke own verifications
      revoker?.role === 'CREATOR' ||
      revoker?.role === 'ADMIN';

    if (!canRevoke) {
      throw new ForbiddenException('Cannot revoke this verification');
    }

    // Delete verification
    await this.prisma.arbadMutualVerification.delete({
      where: {
        arbadId_verifierId_verifiedId: {
          arbadId,
          verifierId,
          verifiedId,
        },
      },
    });

    // Check if Arbad is still fully verified
    const isComplete = await this.isFullyVerified(arbadId);

    // If it was complete but now isn't, downgrade members
    if (!isComplete) {
      await this.prisma.user.updateMany({
        where: {
          currentArbadId: arbadId,
          verificationLevel: VerificationLevel.ARBAD_VERIFIED,
        },
        data: {
          verificationLevel: VerificationLevel.UNVERIFIED,
          arbadVerifiedAt: null,
          verificationLevelSetAt: new Date(),
        },
      });
    }

    return { success: true, isArbadStillComplete: isComplete };
  }
}
