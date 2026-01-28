import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { VerificationStatus, WalletStatus } from '@prisma/client';

/**
 * Identity-focused blockchain integration service
 * Handles synchronization between DB identity records and on-chain state
 * 
 * IMPORTANT: Currently read-only. Write operations will be added
 * when gas sponsorship (paid in Altan) is implemented.
 */
@Injectable()
export class IdentityBlockchainService implements OnModuleInit {
  private readonly logger = new Logger(IdentityBlockchainService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  async onModuleInit() {
    if (this.blockchain.isAvailable()) {
      this.logger.log('✅ Identity blockchain sync enabled');
    } else {
      this.logger.warn('⚠️  Identity blockchain sync disabled (offline mode)');
    }
  }

  /**
   * Get comprehensive on-chain identity status for a user
   * Returns null if blockchain is unavailable
   */
  async getOnChainStatus(seatId: string): Promise<{
    seatExists: boolean;
    seatMetadata: any | null;
    walletAddress: string | null;
    walletUnlocked: boolean;
    isActivated: boolean;
    altanBalance: string | null;
  } | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      // Parallel fetch all on-chain data
      const [
        seatOwner,
        seatMetadata,
        walletAddress,
        isActivated,
      ] = await Promise.all([
        this.blockchain.getSeatOwner(seatId),
        this.blockchain.getSeatMetadata(seatId),
        this.blockchain.getWalletAddress(seatId),
        this.blockchain.isActivated(seatId),
      ]);

      const seatExists = !!seatOwner;

      // Check wallet unlock status
      const walletUnlocked = walletAddress 
        ? await this.blockchain.isWalletUnlocked(seatId)
        : false;

      // Get Altan balance if wallet exists
      const altanBalance = walletAddress 
        ? await this.blockchain.getAltanBalance(walletAddress)
        : null;

      return {
        seatExists,
        seatMetadata,
        walletAddress,
        walletUnlocked,
        isActivated,
        altanBalance,
      };
    } catch (error) {
      this.logger.error(`Failed to get on-chain status for seat ${seatId}`, error);
      return null;
    }
  }

  /**
   * Sync on-chain status to database for a specific user
   * Updates verification status and wallet status based on blockchain state
   */
  async syncUserFromBlockchain(userId: string): Promise<{
    synced: boolean;
    changes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.seatId) {
      return { synced: false, changes: [] };
    }

    const onChainStatus = await this.getOnChainStatus(user.seatId);
    if (!onChainStatus) {
      return { synced: false, changes: [] };
    }

    const changes: string[] = [];
    const updates: any = {};

    // Sync wallet address
    if (onChainStatus.walletAddress && user.walletAddress !== onChainStatus.walletAddress) {
      updates.walletAddress = onChainStatus.walletAddress;
      changes.push(`walletAddress: ${user.walletAddress} → ${onChainStatus.walletAddress}`);
    }

    // Sync verification status
    if (onChainStatus.isActivated && user.verificationStatus !== VerificationStatus.VERIFIED) {
      updates.verificationStatus = VerificationStatus.VERIFIED;
      changes.push(`verificationStatus: ${user.verificationStatus} → VERIFIED`);
    }

    // Sync wallet unlock status
    if (onChainStatus.walletUnlocked && user.walletStatus !== WalletStatus.UNLOCKED) {
      updates.walletStatus = WalletStatus.UNLOCKED;
      changes.push(`walletStatus: ${user.walletStatus} → UNLOCKED`);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updates,
      });

      this.logger.log(`Synced user ${userId}: ${changes.join(', ')}`);
    }

    return { synced: true, changes };
  }

  /**
   * Verify if a user's seatId matches on-chain ownership
   * Critical for authentication security
   */
  async verifySeatOwnership(seatId: string, walletAddress: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    if (!this.blockchain.isAvailable()) {
      // In offline mode, trust DB
      return { valid: true, reason: 'blockchain_offline' };
    }

    const isOwner = await this.blockchain.verifySeatOwnership(seatId, walletAddress);
    
    if (!isOwner) {
      const actualOwner = await this.blockchain.getSeatOwner(seatId);
      return {
        valid: false,
        reason: `Seat ${seatId} is owned by ${actualOwner || 'unknown'}, not ${walletAddress}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if user can be verified (has seat on-chain)
   */
  async canBeVerified(seatId: string): Promise<{
    canVerify: boolean;
    reason?: string;
  }> {
    if (!this.blockchain.isAvailable()) {
      return { canVerify: true, reason: 'blockchain_offline' };
    }

    const seatOwner = await this.blockchain.getSeatOwner(seatId);
    if (!seatOwner) {
      return { 
        canVerify: false, 
        reason: 'Seat does not exist on-chain. Registration incomplete.' 
      };
    }

    const isActivated = await this.blockchain.isActivated(seatId);
    if (isActivated) {
      return { 
        canVerify: false, 
        reason: 'Seat is already activated on-chain.' 
      };
    }

    return { canVerify: true };
  }

  /**
   * Get verification progress combining DB and blockchain data
   */
  async getVerificationProgress(userId: string): Promise<{
    dbVerifications: number;
    required: number;
    onChainActivated: boolean | null;
    walletUnlocked: boolean | null;
    ready: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationsReceived: true,
      },
    });

    if (!user) {
      return {
        dbVerifications: 0,
        required: 3,
        onChainActivated: null,
        walletUnlocked: null,
        ready: false,
      };
    }

    const dbVerifications = user.verificationsReceived.length;

    // Get on-chain status if available
    let onChainActivated: boolean | null = null;
    let walletUnlocked: boolean | null = null;

    if (user.seatId && this.blockchain.isAvailable()) {
      onChainActivated = await this.blockchain.isActivated(user.seatId);
      walletUnlocked = await this.blockchain.isWalletUnlocked(user.seatId);
    }

    return {
      dbVerifications,
      required: 3,
      onChainActivated,
      walletUnlocked,
      ready: dbVerifications >= 3,
    };
  }

  /**
   * Cross-check DB state with blockchain
   * Used for auditing and consistency checks
   */
  async auditUserState(userId: string): Promise<{
    consistent: boolean;
    dbState: any;
    onChainState: any;
    discrepancies: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { verificationsReceived: true },
    });

    if (!user || !user.seatId) {
      return {
        consistent: true,
        dbState: user,
        onChainState: null,
        discrepancies: ['No seatId in database'],
      };
    }

    const onChainStatus = await this.getOnChainStatus(user.seatId);
    const discrepancies: string[] = [];

    if (onChainStatus) {
      // Check verification status
      if (onChainStatus.isActivated && user.verificationStatus !== VerificationStatus.VERIFIED) {
        discrepancies.push(`DB: ${user.verificationStatus}, OnChain: ACTIVATED`);
      }

      // Check wallet status
      if (onChainStatus.walletUnlocked && user.walletStatus !== WalletStatus.UNLOCKED) {
        discrepancies.push(`DB walletStatus: ${user.walletStatus}, OnChain: UNLOCKED`);
      }

      // Check wallet address
      if (onChainStatus.walletAddress && user.walletAddress !== onChainStatus.walletAddress) {
        discrepancies.push(`DB wallet: ${user.walletAddress}, OnChain: ${onChainStatus.walletAddress}`);
      }
    }

    return {
      consistent: discrepancies.length === 0,
      dbState: {
        seatId: user.seatId,
        verificationStatus: user.verificationStatus,
        walletStatus: user.walletStatus,
        walletAddress: user.walletAddress,
        verificationsCount: user.verificationsReceived.length,
      },
      onChainState: onChainStatus,
      discrepancies,
    };
  }
}
