import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationLevel, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { DistributionService } from '../distribution/distribution.service';

export interface EmissionLimitInfo {
  level: VerificationLevel;
  limit: number;
  used: Decimal;
  remaining: number;
  isUnlimited: boolean;
}

@Injectable()
export class TieredVerificationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => DistributionService))
    private distributionService: DistributionService,
  ) {}

  /**
   * Get emission limit for a user based on verification level.
   *
   * Денежный поток:
   *   Центральный Банк →(корр. счёт)→ Банк Сибири →(прямой перевод)→ счёт гражданина
   *
   * Уровни эмиссии:
   *   UNVERIFIED  = 100 ALTAN    (начальный)
   *   ARBAD       = 1,000 ALTAN  (создание Арбана)
   *   ZUN+        = безлимит     (вся оставшаяся эмиссия гражданина)
   */
  getEmissionLimit(level: VerificationLevel, role?: UserRole): number {
    // Creator has unlimited emissions
    if (role === UserRole.CREATOR) {
      return Number.MAX_SAFE_INTEGER;
    }

    switch (level) {
      case VerificationLevel.UNVERIFIED:
        return 100; // 100 ALTAN — initial allocation
      case VerificationLevel.ARBAD_VERIFIED:
        return 1000; // 1,000 ALTAN — upon Arbad creation
      case VerificationLevel.ZUN_VERIFIED:
        return Number.MAX_SAFE_INTEGER; // All remaining citizen emission
      case VerificationLevel.FULLY_VERIFIED:
        return Number.MAX_SAFE_INTEGER; // Unlimited
      default:
        return 0;
    }
  }

  /**
   * Check if user can emit more currency
   */
  async canEmit(userId: string, amount: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        verificationLevel: true,
        totalEmitted: true,
        role: true,
        currentArbadId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Creator always can emit
    if (user.role === UserRole.CREATOR) {
      return true;
    }

    const limit = this.getEmissionLimit(user.verificationLevel, user.role);
    const currentEmissions = parseFloat(user.totalEmitted.toString());
    
    // For ARBAD_VERIFIED, check Arbad group total
    if (user.verificationLevel === VerificationLevel.ARBAD_VERIFIED && user.currentArbadId) {
      const arbadMembers = await this.prisma.user.findMany({
        where: { currentArbadId: user.currentArbadId },
        select: { totalEmitted: true },
      });

      const arbadTotal = arbadMembers.reduce(
        (sum, member) => sum + parseFloat(member.totalEmitted.toString()),
        0
      );

      return arbadTotal + amount <= limit;
    }

    // Individual limit check
    return currentEmissions + amount <= limit;
  }

  /**
   * Record an emission and update totalEmitted
   */
  async recordEmission(userId: string, amount: number): Promise<void> {
    const canEmit = await this.canEmit(userId, amount);

    if (!canEmit) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { verificationLevel: true, totalEmitted: true, role: true },
      });

      const limit = this.getEmissionLimit(user!.verificationLevel, user!.role);
      const current = parseFloat(user!.totalEmitted.toString());

      throw new ForbiddenException(
        `Emission limit exceeded. Level: ${user!.verificationLevel}, Limit: ${limit} ALTAN, Current: ${current} ALTAN, Requested: ${amount} ALTAN`
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalEmitted: {
          increment: new Decimal(amount),
        },
      },
    });
  }

  /**
   * Get emission status for a user
   */
  async getEmissionStatus(userId: string): Promise<EmissionLimitInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        verificationLevel: true,
        totalEmitted: true,
        role: true,
        currentArbadId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isUnlimited = user.role === UserRole.CREATOR || 
                         user.verificationLevel === VerificationLevel.FULLY_VERIFIED ||
                         user.verificationLevel === VerificationLevel.ZUN_VERIFIED;
    
    const limit = this.getEmissionLimit(user.verificationLevel, user.role);
    const used = user.totalEmitted;
    const remaining = isUnlimited ? 
      Number.MAX_SAFE_INTEGER : 
      Math.max(0, limit - parseFloat(used.toString()));

    return {
      level: user.verificationLevel,
      limit,
      used,
      remaining,
      isUnlimited,
    };
  }

  /**
   * Request verification level upgrade (Zun or Full)
   */
  async requestVerificationUpgrade(
    userId: string,
    requestedLevel: VerificationLevel,
    justification: string,
    supportingDocuments?: any[]
  ) {
    // Validate requested level
    if (requestedLevel !== VerificationLevel.ZUN_VERIFIED && 
        requestedLevel !== VerificationLevel.FULLY_VERIFIED) {
      throw new BadRequestException('Can only request ZUN_VERIFIED or FULLY_VERIFIED');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationLevel: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is eligible
    if (requestedLevel === VerificationLevel.ZUN_VERIFIED && 
        user.verificationLevel !== VerificationLevel.ARBAD_VERIFIED) {
      throw new BadRequestException('Must be ARBAD_VERIFIED to request ZUN_VERIFIED');
    }

    if (requestedLevel === VerificationLevel.FULLY_VERIFIED && 
        user.verificationLevel !== VerificationLevel.ZUN_VERIFIED) {
      throw new BadRequestException('Must be ZUN_VERIFIED to request FULLY_VERIFIED');
    }

    // Create request
    return this.prisma.verificationRequest.create({
      data: {
        requesterId: userId,
        requestedLevel,
        justification,
        supportingDocuments: supportingDocuments ? JSON.stringify(supportingDocuments) : null,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            seatId: true,
            verificationLevel: true,
          },
        },
      },
    });
  }

  /**
   * Admin: Review verification request
   */
  async reviewVerificationRequest(
    requestId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ) {
    // Check admin privileges
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || (admin.role !== UserRole.CREATOR && admin.role !== UserRole.ADMIN)) {
      throw new ForbiddenException('Only Creator or Admin can review verification requests');
    }

    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { requester: true },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already reviewed');
    }

    // Update request
    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedById: adminId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });

    // If approved, upgrade user
    if (approved) {
      const updateData: any = {
        verificationLevel: request.requestedLevel,
        verificationLevelSetAt: new Date(),
        verificationLevelSetBy: adminId,
      };

      if (request.requestedLevel === VerificationLevel.ZUN_VERIFIED) {
        updateData.zunVerifiedAt = new Date();
      } else if (request.requestedLevel === VerificationLevel.FULLY_VERIFIED) {
        updateData.fullyVerifiedAt = new Date();
      }

      await this.prisma.user.update({
        where: { id: request.requesterId },
        data: updateData,
      });

      // Trigger ALTAN distribution for new level
      try {
        await this.distributionService.distributeByLevel(
          request.requesterId,
          request.requestedLevel,
        );
      } catch (error) {
        // Log but don't fail the upgrade if distribution fails
        console.error('Distribution failed:', error.message);
      }
    }

    return updatedRequest;
  }

  /**
   * Get pending verification requests (Admin)
   */
  async getPendingRequests() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            seatId: true,
            verificationLevel: true,
            totalEmitted: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get user's verification requests
   */
  async getMyRequests(userId: string) {
    return this.prisma.verificationRequest.findMany({
      where: { requesterId: userId },
      include: {
        reviewedBy: {
          select: {
            username: true,
            seatId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: Manually set user verification level
   */
  async setVerificationLevel(
    userId: string,
    level: VerificationLevel,
    adminId: string
  ) {
    // Check admin privileges
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== UserRole.CREATOR) {
      throw new ForbiddenException('Only Creator can manually set verification levels');
    }

    const updateData: any = {
      verificationLevel: level,
      verificationLevelSetAt: new Date(),
      verificationLevelSetBy: adminId,
    };

    if (level === VerificationLevel.ARBAD_VERIFIED) {
      updateData.arbadVerifiedAt = new Date();
    } else if (level === VerificationLevel.ZUN_VERIFIED) {
      updateData.zunVerifiedAt = new Date();
    } else if (level === VerificationLevel.FULLY_VERIFIED) {
      updateData.fullyVerifiedAt = new Date();
      updateData.isVerified = true; // Legacy field
      updateData.verifiedAt = new Date();
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Trigger ALTAN distribution for new level
    try {
      await this.distributionService.distributeByLevel(userId, level);
    } catch (error) {
      // Log but don't fail the upgrade if distribution fails
      console.error('Distribution failed:', error.message);
    }

    return user;
  }
}
