import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class VerificationService {
  // Hardcoded Founder Mandate Seats (Seats in the first Arban of the first Tumen)
  private readonly FOUNDER_MANDATES = [
    'FOUNDER-001', // Bair Ivanov
    'MANDATE-002', 
    'MANDATE-003',
    'MANDATE-004',
    'MANDATE-005',
    'MANDATE-006',
    'MANDATE-007',
    'MANDATE-008',
    'MANDATE-009',
    'MANDATE-010'
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Standard Verification: Requires 3 verified locals.
   */
  async submitVerification(verifierSeatId: string, targetUserId: string) {
    const verifier = await this.prisma.user.findUnique({
      where: { seatId: verifierSeatId },
      include: { khuralSeats: { include: { group: true } } }
    });

    // Find target user
    const target = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: targetUserId }, { seatId: targetUserId }]
      },
      include: { khuralSeats: { include: { group: true } } }
    });

    if (!verifier || verifier.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Only verified citizens can verify others.');
    }

    if (!target) throw new BadRequestException('Target user not found.');

    // Local Responsibility Check: Must belong to the same Zuun (100) or Myangan (1000)
    const verifierSeat = verifier.khuralSeats[0];
    const targetSeat = target.khuralSeats[0];

    if (!verifierSeat || !targetSeat) {
        throw new BadRequestException('Territorial allocation missing for verifier or target.');
    }

    const verifierArban = verifierSeat.group;
    const targetArban = targetSeat.group;
    
    const verifierZuunId = verifierArban.parentGroupId;
    const targetZuunId = targetArban.parentGroupId;

    if (!verifierZuunId || !targetZuunId) {
         throw new BadRequestException('Territorial hierarchy data incomplete.');
    }

    if (verifierZuunId !== targetZuunId) {
        throw new ForbiddenException('Indigenous Responsibility: You can only verify residents within your own local Zuun (100-family circle).');
    }

    await this.prisma.verification.create({
      data: {
        targetUserId: target.id,
        verifierUserId: verifier.id,
      }
    });

    // Check for Quorum (3)
    const count = await this.prisma.verification.count({
      where: { targetUserId: target.id }
    });

    if (count >= 3) {
      await this.prisma.user.update({
        where: { id: target.id },
        data: { 
          verificationStatus: VerificationStatus.VERIFIED,
          walletStatus: 'UNLOCKED'
        }
      });
    }

    return { count, threshold: 3, verified: count >= 3 };
  }

  /**
   * Super-Verification: One mandate holder verifies instantly.
   */
  async superVerify(fondantSeatId: string, targetUserId: string, justification: string) {
    if (!this.FOUNDER_MANDATES.includes(fondantSeatId)) {
      throw new ForbiddenException('Invalid Mandate ID. Access denied.');
    }

    // Find the target user by ID or Seat ID
    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: targetUserId }, { seatId: targetUserId }]
      }
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found.');
    }

    const target = await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        walletStatus: 'UNLOCKED',
        isSuperVerified: true,
        superVerifiedBy: fondantSeatId,
      }
    });

    return { status: 'SUPER_VERIFIED', targetSeat: target.seatId, mandateUsed: fondantSeatId };
  }

  async getVerificationStatus(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { seatId: identifier }
        ]
      },
      include: {
        verificationsReceived: {
          include: { verifierUser: true }
        },
        khuralSeats: {
            include: { group: true }
        }
      }
    });

    if (!user) return null;

    // Return current progress and details
    return {
        ...user,
        progress: user.verificationsReceived.length,
        required: 3,
        canBeSuperVerified: !user.isSuperVerified,
        isFounderMandateHolder: this.FOUNDER_MANDATES.includes(user.seatId || '')
    };
  }
}
