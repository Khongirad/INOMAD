import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, EventType, EventScope } from '@prisma/client';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private timelineService: TimelineService,
  ) {}

  /**
   * Get list of users pending verification
   */
  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: {
        isVerified: false,
        isLegalSubject: true, // Only show users who accepted constitution
      },
      select: {
        id: true,
        seatId: true,
        username: true,
        createdAt: true,
        constitutionAcceptedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Verify a user
   */
  async verifyUser(
    verifierId: string,
    verifiedId: string,
    ipAddress?: string,
    userAgent?: string,
    notes?: string,
    location?: string,
  ) {
    // Get verifier
    const verifier = await this.prisma.user.findUnique({
      where: { id: verifierId },
      include: {
        verificationsGiven: true,
      },
    });

    if (!verifier) {
      throw new NotFoundException('Verifier not found');
    }

    // Check if verifier has permission
    const isAdmin = ([UserRole.ADMIN, UserRole.CREATOR] as const).includes(verifier.role as any);
    
    if (!isAdmin &&!verifier.isVerified) {
      throw new ForbiddenException('You must be verified to verify others');
    }

    // Check quota for non-admins
    if (!isAdmin && verifier.verificationCount >= verifier.maxVerifications) {
      throw new ForbiddenException(`Verification quota exhausted (limit: ${verifier.maxVerifications})`);
    }

    // Get target user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: verifiedId },
    });

    if (!targetUser) {
      throw new NotFoundException('User to verify not found');
    }

    // Validation
    if (verifierId === verifiedId) {
      throw new BadRequestException('Cannot verify yourself');
    }

    if (targetUser.isVerified) {
      throw new BadRequestException('User already verified');
    }

    if (!targetUser.isLegalSubject) {
      throw new BadRequestException('User must accept Constitution first');
    }

    // Check if already verified by this user
    const existingVerification = await this.prisma.userVerification.findUnique({
      where: {
        verifiedUserId_verifierId: {
          verifiedUserId: verifiedId,
          verifierId: verifierId,
        },
      },
    });

    if (existingVerification) {
      throw new BadRequestException('You have already verified this user');
    }

    // Create verification record
    const verification = await this.prisma.userVerification.create({
      data: {
        verifiedUserId: verifiedId,
        verifierId: verifierId,
        verificationMethod: isAdmin ? 'ADMIN' : 'USER_REFERRAL',
        notes,
        ipAddress,
        userAgent,
        location,
      },
      include: {
        verifier: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        verifiedUser: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Update user status
    await this.prisma.user.update({
      where: { id: verifiedId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Update verifier count
    await this.prisma.user.update({
      where: { id: verifierId },
      data: {
        verificationCount: {
          increment: 1,
        },
      },
    });

    // Get chain level
    const chainLevel = await this.getChainLevel(verifiedId);

    // Create timeline event
    const timelineEvent = await this.timelineService.createEvent({
      type: EventType.IDENTITY_VERIFIED,
      scope: EventScope.INDIVIDUAL,
      title: `${verification.verifiedUser.username} verified by ${verification.verifier.username}`,
      description: notes || `User verified via ${isAdmin ? 'admin approval' : 'user referral'}`,
      actorId: verifierId,
      targetId: verifiedId,
      location,
      ipAddress,
      userAgent,
      metadata: {
        chainLevel,
        verificationMethod: verification.verificationMethod,
      },
    });

    // Link timeline event to verification
    await this.prisma.userVerification.update({
      where: { id: verification.id },
      data: {
        timelineEventId: timelineEvent.id,
      },
    });

    return {
      verification,
      chainLevel,
      remainingQuota: isAdmin ? -1 : verifier.maxVerifications - verifier.verificationCount - 1,
      timelineEventId: timelineEvent.id,
    };
  }

  /**
   * Get verification chain for a user
   */
  async getVerificationChain(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationsReceived: {
          include: {
            verifier: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build chain recursively
    const chain = [];
    let currentUser = user;

    while (currentUser.verificationsReceived.length > 0) {
      const verification = currentUser.verificationsReceived[0];
      chain.push({
        username: verification.verifier.username,
        role: verification.verifier.role,
        verifiedAt: verification.createdAt,
      });

      currentUser = await this.prisma.user.findUnique({
        where: { id: verification.verifierId },
        include: {
          verificationsReceived: {
            include: {
              verifier: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (!currentUser) break;
      if (currentUser.role === UserRole.CREATOR) break; // Stop at Creator
    }

    return chain;
  }

  /**
   * Get chain level (hops from Creator/Admin)
   */
  async getChainLevel(userId: string): Promise<number> {
    const chain = await this.getVerificationChain(userId);
    return chain.length;
  }

  /**
   * Get verifier statistics
   */
  async getVerifierStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationsGiven: {
          include: {
            verifiedUser: {
              select: {
                id: true,
                username: true,
                verifiedAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = ([UserRole.ADMIN, UserRole.CREATOR] as const).includes(user.role as any);

    return {
      verificationCount: user.verificationCount,
      maxVerifications: user.maxVerifications,
      remainingQuota: isAdmin ? -1 : user.maxVerifications - user.verificationCount,
      isUnlimited: isAdmin,
      verificationsGiven: user.verificationsGiven,
    };
  }

  /**
   * Revoke verification (Admin only)
   */
  async revokeVerification(verificationId: string, revokedBy: string, reason: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: revokedBy },
    });

    if (!admin || !([UserRole.ADMIN, UserRole.CREATOR] as const).includes(admin.role as any)) {
      throw new ForbiddenException('Only admins can revoke verifications');
    }

    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    // Delete verification
    await this.prisma.userVerification.delete({
      where: { id: verificationId },
    });

    // Update verified user status
    const stillVerified = await this.prisma.userVerification.findFirst({
      where: { verifiedUserId: verification.verifiedUserId },
    });

    if (!stillVerified) {
      await this.prisma.user.update({
        where: { id: verification.verifiedUserId },
        data: {
          isVerified: false,
          verifiedAt: null,
        },
      });
    }

    // Decrement verifier count
    await this.prisma.user.update({
      where: { id: verification.verifierId },
      data: {
        verificationCount: {
          decrement: 1,
        },
      },
    });

    // Log in audit
    await this.prisma.auditLog.create({
       data: {
        userId: revokedBy,
        action: 'VERIFICATION_REVOKED',
        resourceType: 'UserVerification',
        resourceId: verificationId,
        metadata: {
          reason,
          verifiedUserId: verification.verifiedUserId,
          verifierId: verification.verifierId,
        },
      },
    });

    return { success: true };
  }
}
