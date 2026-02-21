import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, EventType, EventScope } from '@prisma/client';
import { TimelineService } from '../timeline/timeline.service';
import { DistributionService } from '../distribution/distribution.service';
import { OnChainVerificationService } from './on-chain-verification.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private timelineService: TimelineService,
    private distributionService: DistributionService,
    private onChainVerification: OnChainVerificationService,
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
   * Request verification by guarantor's SeatID.
   * Looks up the guarantor and marks the requester as pending with that guarantor.
   * The guarantor sees this user in their pending list.
   */
  async requestVerificationBySeat(requesterId: string, guarantorSeatId: string) {
    // Find guarantor
    const guarantor = await this.prisma.user.findUnique({
      where: { seatId: guarantorSeatId },
      select: {
        id: true,
        seatId: true,
        username: true,
        isVerified: true,
        role: true,
        verificationCount: true,
        maxVerifications: true,
      },
    });

    if (!guarantor) {
      throw new NotFoundException('No citizen found with that Seat ID');
    }

    // Can't vouch for yourself
    if (guarantor.id === requesterId) {
      throw new BadRequestException('You cannot be your own guarantor');
    }

    const isAdmin = ([UserRole.ADMIN, UserRole.CREATOR] as const).includes(guarantor.role as any);

    if (!isAdmin && !guarantor.isVerified) {
      throw new BadRequestException('This citizen is not yet verified and cannot vouch for others');
    }

    if (!isAdmin && guarantor.verificationCount >= guarantor.maxVerifications) {
      throw new BadRequestException('This citizen has reached their verification quota');
    }

    // Update the requester to record who their intended guarantor is
    await this.prisma.user.update({
      where: { id: requesterId },
      data: {
        verificationStatus: 'PENDING',
      },
    });

    return {
      ok: true,
      guarantor: {
        username: guarantor.username,
        seatId: guarantor.seatId,
      },
      message: `Verification request sent. ${guarantor.username} can now verify you from their Verification Dashboard.`,
    };
  }

  /**
   * Get who verified the current user (guarantor info)
   */
  async getMyGuarantor(userId: string) {
    const verification = await this.prisma.userVerification.findFirst({
      where: { verifiedUserId: userId },
      include: {
        verifier: {
          select: {
            id: true,
            username: true,
            seatId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!verification) {
      return { guarantor: null };
    }

    return {
      guarantor: {
        username: verification.verifier.username,
        seatId: verification.verifier.seatId,
        verifiedAt: verification.createdAt,
      },
    };
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

    // ── ON-CHAIN: Mint SeatSBT ────────────────────────────────────────────────
    // After DB verification is recorded, attempt to mint a Soul-Bound Token.
    // This is non-fatal: if the citizen has no wallet yet, the SBT can be claimed
    // later. The txHash is stored for permanent proof.
    try {
      const targetWithWallet = await this.prisma.user.findUnique({
        where: { id: verifiedId },
        select: { walletAddress: true, seatId: true },
      });

      if (targetWithWallet?.walletAddress && targetWithWallet?.seatId) {
        const sbtResult = await this.onChainVerification.mintSeatForCitizen(
          targetWithWallet.walletAddress,
          targetWithWallet.seatId,
        );

        if (sbtResult) {
          await this.prisma.userVerification.update({
            where: { id: verification.id },
            data: {
              txHash: sbtResult.txHash,
              blockNumber: sbtResult.blockNumber,
              seatTokenId: sbtResult.tokenId,
            },
          });
          this.logger.log(
            `⛓️  SeatSBT minted for ${verifiedId}: tokenId=${sbtResult.tokenId}, txHash=${sbtResult.txHash}`,
          );
        }
      }
    } catch (err) {
      // Non-fatal — verification is valid, SBT can be claimed later via wallet setup
      this.logger.warn(`⚠️  SeatSBT mint skipped for ${verifiedId}: ${err?.message}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── BIRTHRIGHT DISTRIBUTION ─────────────────────────────────────────────
    // Automatically distribute ALTAN to newly verified citizen.
    // UNVERIFIED → receives 100 ALTAN on registration (registerCitizenForDistribution)
    // ARBAD_VERIFIED → receives 900 more (total 1,000 ALTAN)
    // Fails silently if distribution pool not initialized yet.
    try {
      // Ensure citizen is registered in distribution system first
      await this.distributionService.registerCitizenForDistribution(verifiedId);
    } catch (e) {
      // Already registered — that's fine
    }

    try {
      await this.distributionService.distributeByLevel(verifiedId, 'ARBAD_VERIFIED');
      this.logger.log(`✅ Birthright ALTAN distributed to newly verified citizen ${verifiedId}`);
    } catch (e) {
      // Pool not initialized or user already received — log and continue
      this.logger.warn(`⚠️  ALTAN distribution skipped for ${verifiedId}: ${e?.message}`);
    }
    // ────────────────────────────────────────────────────────────────────────

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

    // ── APPEND-ONLY: Soft revoke (NEVER delete — history is immutable) ─────────
    // The verification record is preserved as historical fact.
    // isActive=false marks it as broken without erasing evidence.
    // \"You can know what happened in the past, but you cannot erase it.\"
    const suspendedReason = `Revoked by admin ${revokedBy}: ${reason}`;

    await this.prisma.userVerification.update({
      where: { id: verificationId },
      data: {
        isActive: false,
        suspendedAt: new Date(),
        suspendedReason,
      },
    });
    // ──────────────────────────────────────────────────────────────────────────

    // ── CASCADE: Suspend all downstream verifications ─────────────────────────
    // If verifier A loses validity, all verifications A granted are suspended too.
    // Citizens can re-verify through another chain. Their history is preserved.
    const cascadeCount = await this.cascadeRevokeDownstream(
      verification.verifierId,
      `Chain broken: ${suspendedReason}`,
    );
    // ──────────────────────────────────────────────────────────────────────────

    // Update verified user status (check if they have another active verification)
    const stillVerified = await this.prisma.userVerification.findFirst({
      where: {
        verifiedUserId: verification.verifiedUserId,
        isActive: true,
      },
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
      data: { verificationCount: { decrement: 1 } },
    });

    // Audit log (permanent record)
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
          cascadeCount, // how many downstream verifications were also suspended
        },
      },
    });

    this.logger.log(
      `⛓️  Verification ${verificationId} soft-revoked. Cascade suspended ${cascadeCount} downstream verifications.`,
    );

    return { success: true, cascadeCount };
  }

  /**
   * VERIFICATION CHAIN CASCADE
   *
   * When verifier X is revoked, all verifications X gave are also suspended.
   * This is recursive — if B was verified by A, and A is revoked, B's verifications
   * are also suspended. Each hop is one level of cascade.
   *
   * This does NOT delete records. History is preserved.
   * Citizens can gain a new verification from an independent chain.
   */
  private async cascadeRevokeDownstream(
    revokerId: string,
    reason: string,
    depth = 0,
  ): Promise<number> {
    if (depth > 10) {
      // Safety limit — prevent infinite recursion in pathological chains
      this.logger.warn('Cascade revocation depth limit reached');
      return 0;
    }

    // Find all active verifications given by this verifier
    const downstreamVerifications = await this.prisma.userVerification.findMany({
      where: {
        verifierId: revokerId,
        isActive: true,
      },
      select: { id: true, verifiedUserId: true },
    });

    if (downstreamVerifications.length === 0) return 0;

    const now = new Date();
    let count = downstreamVerifications.length;

    // Suspend all downstream verifications
    await this.prisma.userVerification.updateMany({
      where: {
        verifierId: revokerId,
        isActive: true,
      },
      data: {
        isActive: false,
        suspendedAt: now,
        suspendedReason: reason,
      },
    });

    // For each downstream citizen, check if they have another valid path
    for (const dv of downstreamVerifications) {
      const hasOtherChain = await this.prisma.userVerification.findFirst({
        where: {
          verifiedUserId: dv.verifiedUserId,
          isActive: true,
        },
      });

      if (!hasOtherChain) {
        await this.prisma.user.update({
          where: { id: dv.verifiedUserId },
          data: { isVerified: false, verifiedAt: null },
        });
        // Recurse: cascade their downstream too
        count += await this.cascadeRevokeDownstream(dv.verifiedUserId, reason, depth + 1);
      }
    }

    return count;
  }
}

