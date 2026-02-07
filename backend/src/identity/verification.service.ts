import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CitizenAllocationService } from './citizen-allocation.service';


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

  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private allocationService: CitizenAllocationService,
  ) {}

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

      // Check on-chain activation status (informational)
      if (target.seatId && this.blockchain.isAvailable()) {
        const isActivated = await this.blockchain.isActivated(target.seatId);
        this.logger.log(
          `Citizen ${target.seatId} verified in DB. On-chain activated: ${isActivated}`
        );
        // TODO: Trigger on-chain activation when gas sponsorship is ready
      }
    }

    return { count, threshold: 3, verified: count >= 3 };
  }

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

    // Update verification status
    const target = await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        walletStatus: 'UNLOCKED',
        isSuperVerified: true,
        superVerifiedBy: fondantSeatId,
      }
    });

    // ✅ NEW: Automatic bank account creation and fund allocation
    try {
      // Step 1: Create bank account if doesn't exist
      const accountResult = await this.allocationService.createCitizenBankAccount(target.id);
      
      this.logger.log(
        `Bank account for ${target.seatId}: ${accountResult.alreadyExists ? 'already exists' : 'created'} (${accountResult.bankRef})`
      );

      // Step 2: Allocate Level 1 funds (100 ALTAN)
      const allocationResult = await this.allocationService.allocateLevel1Funds(
        target.id,
        target.seatId || 'unknown',
      );

      this.logger.log(
        `✅ Allocated ${allocationResult.amount} ALTAN to citizen ${target.seatId}`
      );

      return {
        status: 'SUPER_VERIFIED',
        targetSeat: target.seatId,
        mandateUsed: fondantSeatId,
        banking: {
          accountCreated: accountResult.accountCreated,
          bankRef: accountResult.bankRef,
          fundsAllocated: allocationResult.allocated,
          amount: allocationResult.amount,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create bank account or allocate funds for ${target.seatId}:`,
        error,
      );

      // Return success for verification but note banking failure
      return {
        status: 'SUPER_VERIFIED',
        targetSeat: target.seatId,
        mandateUsed: fondantSeatId,
        banking: {
          error: 'Failed to create bank account or allocate funds',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
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
        khuralSeats: {
          include: { group: true }
        }
      }
    });

    if (!user) return null;

    // Get verifications count separately since verificationsReceived doesn't exist
    const verificationsCount = await this.prisma.verification.count({
      where: { targetUserId: user.id }
    });

    return {
      ...user,
      progress: verificationsCount,
      required: 3,
      canBeSuperVerified: !user.isSuperVerified,
      isFounderMandateHolder: this.FOUNDER_MANDATES.includes(user.seatId || '')
    };
  }
}
