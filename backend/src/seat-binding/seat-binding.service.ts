import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

export interface SeatBindingResult {
  userId: string;
  seatId: string;
  walletAddress: string;
  verified: boolean;
  onChainOwner?: string;
  bindingTimestamp: Date;
}

/**
 * Service for binding backend KhuralSeats to on-chain SeatSBT tokens
 * Ensures 1 seat = 1 soulbound identity
 */
@Injectable()
export class SeatBindingService {
  private readonly logger = new Logger(SeatBindingService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Bind a user to a seat by verifying on-chain ownership
   * This is the primary method for establishing seat legitimacy
   */
  async bindSeatToUser(
    userId: string,
    seatId: string,
    walletAddress: string,
  ): Promise<SeatBindingResult> {
    // 1. Check if blockchain is available
    if (!this.blockchain.isAvailable()) {
      throw new BadRequestException(
        'Blockchain verification unavailable. Cannot bind seat.',
      );
    }

    // 2. Verify on-chain ownership
    const isOwner = await this.blockchain.verifySeatOwnership(seatId, walletAddress);
    
    if (!isOwner) {
      const actualOwner = await this.blockchain.getSeatOwner(seatId);
      throw new UnauthorizedException(
        `Wallet ${walletAddress} does not own SeatSBT ${seatId}. ` +
        `Actual owner: ${actualOwner || 'unknown'}`,
      );
    }

    // 3. Check if seat is already bound to another user
    const existingUser = await this.prisma.user.findUnique({
      where: { seatId },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(
        `Seat ${seatId} is already bound to another user`,
      );
    }

    // 4. Update or create user with verified seat binding
    const user = await this.prisma.user.upsert({
      where: { id: userId },
      update: {
        seatId,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        seatId,
        role: 'CITIZEN',
      },
    });

    this.logger.log(
      `✅ Seat ${seatId} successfully bound to user ${userId} (wallet: ${walletAddress})`,
    );

    return {
      userId: user.id,
      seatId: user.seatId,
      walletAddress,
      verified: true,
      onChainOwner: walletAddress,
      bindingTimestamp: user.updatedAt,
    };
  }

  /**
   * Verify that a user's seat binding is still valid on-chain
   * Should be called periodically or before critical operations
   */
  async verifySeatBinding(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.seatId) {
      return false;
    }

    if (!this.blockchain.isAvailable()) {
      this.logger.warn(`Cannot verify seat binding for user ${userId} - blockchain unavailable`);
      return false;
    }

    // For now, we need the wallet address to verify
    // In production, this would be stored in the User model
    // For MVP, we'll just check if the seat exists on-chain
    const owner = await this.blockchain.getSeatOwner(user.seatId);
    return owner !== null;
  }

  /**
   * Sync all seats from blockchain
   * Useful for initial setup or periodic reconciliation
   */
  async syncSeatsFromBlockchain(walletAddress: string): Promise<string[]> {
    if (!this.blockchain.isAvailable()) {
      throw new BadRequestException('Blockchain not available');
    }

    const seatIds = await this.blockchain.getSeatsOwnedBy(walletAddress);
    
    this.logger.log(
      `Found ${seatIds.length} seats for wallet ${walletAddress}: ${seatIds.join(', ')}`,
    );

    return seatIds;
  }

  /**
   * Get seat binding status for a user
   */
  async getSeatBindingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        seatId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return {
        bound: false,
        message: 'User not found',
      };
    }

    if (!user.seatId) {
      return {
        bound: false,
        userId: user.id,
        message: 'No seat bound to this user',
      };
    }

    // Check on-chain status if blockchain is available
    let onChainStatus = null;
    if (this.blockchain.isAvailable()) {
      const owner = await this.blockchain.getSeatOwner(user.seatId);
      onChainStatus = {
        exists: owner !== null,
        owner,
      };
    }

    return {
      bound: true,
      userId: user.id,
      seatId: user.seatId,
      role: user.role,
      boundAt: user.updatedAt,
      onChainStatus,
    };
  }

  /**
   * Unbind a seat from a user (admin function)
   * Should only be used in exceptional circumstances
   */
  async unbindSeat(userId: string, reason: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    this.logger.warn(
      `⚠️ Unbinding seat ${user.seatId} from user ${userId}. Reason: ${reason}`,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        seatId: `UNBOUND_${user.seatId}_${Date.now()}`,
      },
    });
  }
}
