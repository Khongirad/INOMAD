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

  // ==================== ON-CHAIN ACTIVATION ====================

  /**
   * Get detailed activation status from on-chain
   */
  async getActivationStatus(seatId: string): Promise<{
    status: number;
    statusName: string;
    approvalsCount: number;
    thresholdRequired: number;
    isActive: boolean;
    frozen: boolean;
    banned: boolean;
  } | null> {
    const contract = this.blockchain.getActivationRegistryContract();
    if (!contract) {
      return null;
    }

    try {
      const [status, approvalsCount, threshold, isActive, statusWithCourt] = await Promise.all([
        contract.statusOf(seatId),
        contract.approvalsCount(seatId),
        contract.thresholdK(),
        contract.isActive(seatId),
        contract.statusWithCourt(seatId),
      ]);

      const statusNames = ['NONE', 'LOCKED', 'ACTIVE', 'BANNED'];

      return {
        status: Number(status),
        statusName: statusNames[Number(status)] || 'UNKNOWN',
        approvalsCount: Number(approvalsCount),
        thresholdRequired: Number(threshold),
        isActive,
        frozen: statusWithCourt.frozen,
        banned: statusWithCourt.banned,
      };
    } catch (error) {
      this.logger.error(`Failed to get activation status for seat ${seatId}`, error);
      return null;
    }
  }

  /**
   * Request on-chain activation for a seat
   * Must be called by the seat owner after accepting the Constitution
   * 
   * @param seatId - The seat ID to activate
   * @param signer - ethers.Wallet with the seat owner's credentials
   */
  async requestActivation(
    seatId: string,
    signer: import('ethers').Wallet,
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    const contract = this.blockchain.getActivationRegistryContract();
    if (!contract) {
      return { success: false, error: 'ActivationRegistry contract not available' };
    }

    try {
      // Connect contract with signer
      const contractWithSigner = contract.connect(signer) as import('ethers').Contract;
      
      // Execute transaction
      const tx = await contractWithSigner.requestActivation(seatId);
      const receipt = await tx.wait();

      this.logger.log(`Activation requested for seat ${seatId}. TX: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to request activation for seat ${seatId}`, error);
      
      // Parse common errors
      let errorMessage = error.message;
      if (error.message.includes('NO_CONSTITUTION')) {
        errorMessage = 'User has not accepted the Constitution';
      } else if (error.message.includes('NOT_SEAT_OWNER')) {
        errorMessage = 'Only the seat owner can request activation';
      } else if (error.message.includes('NOT_LOCKED')) {
        errorMessage = 'Seat is not in LOCKED status';
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Approve activation for a seat (validator only)
   * 
   * @param seatId - The seat ID to approve
   * @param validatorSigner - ethers.Wallet with validator credentials
   */
  async approveActivation(
    seatId: string,
    validatorSigner: import('ethers').Wallet,
  ): Promise<{
    success: boolean;
    txHash?: string;
    currentApprovals?: number;
    isNowActive?: boolean;
    error?: string;
  }> {
    const contract = this.blockchain.getActivationRegistryContract();
    if (!contract) {
      return { success: false, error: 'ActivationRegistry contract not available' };
    }

    try {
      // Check if caller is a validator
      const isValidator = await contract.isValidator(validatorSigner.address);
      if (!isValidator) {
        return { success: false, error: 'Caller is not a validator' };
      }

      // Check if already approved by this validator
      const alreadyApproved = await contract.approvedBy(seatId, validatorSigner.address);
      if (alreadyApproved) {
        return { success: false, error: 'Validator has already approved this seat' };
      }

      // Connect contract with signer
      const contractWithSigner = contract.connect(validatorSigner) as import('ethers').Contract;
      
      // Execute transaction
      const tx = await contractWithSigner.approveActivation(seatId);
      const receipt = await tx.wait();

      // Get updated status
      const [approvalsCount, isActive] = await Promise.all([
        contract.approvalsCount(seatId),
        contract.isActive(seatId),
      ]);

      this.logger.log(
        `Activation approved for seat ${seatId} by ${validatorSigner.address}. ` +
        `Approvals: ${approvalsCount}. Active: ${isActive}. TX: ${receipt.hash}`
      );

      return {
        success: true,
        txHash: receipt.hash,
        currentApprovals: Number(approvalsCount),
        isNowActive: isActive,
      };
    } catch (error) {
      this.logger.error(`Failed to approve activation for seat ${seatId}`, error);
      
      let errorMessage = error.message;
      if (error.message.includes('NOT_VALIDATOR')) {
        errorMessage = 'Caller is not a registered validator';
      } else if (error.message.includes('NOT_LOCKED')) {
        errorMessage = 'Seat is not in LOCKED status';
      } else if (error.message.includes('ALREADY_APPROVED')) {
        errorMessage = 'This validator has already approved';
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if an address is a validator
   */
  async isValidator(address: string): Promise<boolean> {
    const contract = this.blockchain.getActivationRegistryContract();
    if (!contract) {
      return false;
    }

    try {
      return await contract.isValidator(address);
    } catch (error) {
      this.logger.error(`Failed to check validator status for ${address}`, error);
      return false;
    }
  }

  /**
   * Sync activation status from blockchain to database
   * Updates user's verificationStatus when on-chain activation changes
   */
  async syncActivationToDb(userId: string): Promise<{
    synced: boolean;
    wasActivated?: boolean;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.seatId) {
      return { synced: false };
    }

    const activationStatus = await this.getActivationStatus(user.seatId);
    
    if (!activationStatus) {
      return { synced: false };
    }

    // If on-chain is active but DB is not VERIFIED, update DB
    if (activationStatus.isActive && user.verificationStatus !== VerificationStatus.VERIFIED) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: VerificationStatus.VERIFIED },
      });

      this.logger.log(`User ${userId} verified based on on-chain activation`);
      return { synced: true, wasActivated: true };
    }

    return { synced: true, wasActivated: false };
  }
}
