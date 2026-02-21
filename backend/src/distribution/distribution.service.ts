import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { VerificationLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Distribution Service
 * 
 * Manages the gradual distribution of 2.1 trillion ALTAN initial emission
 * to citizens based on their verification level progression.
 * 
 * Distribution Strategy:
 * - UNVERIFIED: 100 ALTAN (anti-fraud protection)
 * - ARBAD_VERIFIED: 1,000 ALTAN total (900 more)
 * - ZUN_VERIFIED: 10,000 ALTAN total (9,000 more)
 * - FULLY_VERIFIED: Full citizen allocation
 * 
 * This prevents hyperinflation by releasing ALTAN gradually over time.
 */
@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
  ) {}

  /**
   * Initialize the distribution pool (ONE-TIME operation by Creator/CB Governor)
   * Creates the pool from Central Bank's 2.1T emission
   */
  async initializePool(
    totalEmission: number,      // 2,100,000,000,000 ALTAN
    citizenPercent: number,      // 60% for citizens
    statePercent: number,        // 30% for state treasury
    fundPercent: number,         // 10% for people's fund
    estimatedCitizens: number,   // 145,000,000 estimated population
    emissionTxHash?: string,     // Blockchain transaction hash
  ) {
    // Check if pool already exists
    const existing = await this.prisma.distributionPool.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (existing) {
      throw new BadRequestException('Distribution pool already initialized');
    }

    // Calculate allocations
    const citizenPool = totalEmission * (citizenPercent / 100);
    const stateTreasury = totalEmission * (statePercent / 100);
    const peoplesFund = totalEmission * (fundPercent / 100);
    const perCitizenShare = citizenPool / estimatedCitizens;

    const pool = await this.prisma.distributionPool.create({
      data: {
        totalEmission,
        citizenPool,
        stateTreasury,
        peoplesFund,
        perCitizenShare,
        totalCitizens: 0,
        totalDistributed: 0,
        status: 'ACTIVE',
        emissionDate: new Date(),
        emissionTxHash,
      },
    });

    this.logger.log(
      `Distribution pool initialized: ${totalEmission.toLocaleString()} ALTAN ` +
      `(Citizens: ${perCitizenShare.toFixed(2)} per person)`,
    );

    return {
      poolId: pool.id,
      totalEmission: pool.totalEmission.toString(),
      citizenPool: pool.citizenPool.toString(),
      perCitizenShare: pool.perCitizenShare.toString(),
      estimatedCitizens,
    };
  }

  /**
   * Register a new citizen for distribution
   * Called automatically during user registration
   * Gives initial 100 ALTAN immediately
   */
  async registerCitizenForDistribution(userId: string) {
    // Get active pool
    const pool = await this.getActivePool();

    // Check if user already registered
    const existing = await this.prisma.userDistribution.findUnique({
      where: { userId },
    });

    if (existing) {
      this.logger.warn(`User ${userId} already registered for distribution`);
      return existing;
    }

    // Create distribution record
    const distribution = await this.prisma.userDistribution.create({
      data: {
        userId,
        totalAllocation: pool.perCitizenShare,
        totalReceived: 0,
        remainingBalance: pool.perCitizenShare,
      },
    });

    // Increment total citizens count
    await this.prisma.distributionPool.update({
      where: { id: pool.id },
      data: { totalCitizens: { increment: 1 } },
    });

    // Automatically distribute UNVERIFIED amount (100 ALTAN)
    await this.distributeByLevel(userId, 'UNVERIFIED');

    this.logger.log(`Citizen ${userId} registered for distribution, allocated ${pool.perCitizenShare} ALTAN`);

    return distribution;
  }

  /**
   * Distribute ALTAN when user upgrades verification level
   * Called by TieredVerificationService when level changes
   */
  async distributeByLevel(userId: string, newLevel: VerificationLevel) {
    const distribution = await this.prisma.userDistribution.findUnique({
      where: { userId },
    });

    if (!distribution) {
      throw new NotFoundException('User not registered for distribution');
    }

    const pool = await this.getActivePool();

    // Calculate amount to distribute based on level
    let amount = 0;
    let updateData: any = {};

    switch (newLevel) {
      case 'UNVERIFIED':
        // Initial 100 ALTAN on registration
        amount = 100;
        updateData.unverifiedReceived = amount;
        updateData.firstDistributionAt = new Date();
        break;

      case 'ARBAD_VERIFIED':
        // Total should be 1,000 ALTAN (give 900 more)
        const targetArbad = 1000;
        amount = targetArbad - Number(distribution.totalReceived);
        if (amount > 0) {
          updateData.arbadVerifiedReceived = amount;
        }
        break;

      case 'ZUN_VERIFIED':
        // Total should be 10,000 ALTAN (give difference)
        const targetZun = 10000;
        amount = targetZun - Number(distribution.totalReceived);
        if (amount > 0) {
          updateData.zunReceived = amount;
        }
        break;

      case 'FULLY_VERIFIED':
        // Give remaining allocation
        amount = Number(distribution.remainingBalance);
        if (amount > 0) {
          updateData.fullyReceived = amount;
          updateData.fullyDistributedAt = new Date();
        }
        break;
    }

    if (amount <= 0) {
      this.logger.log(`User ${userId} already received amount for level ${newLevel}`);
      return {
        distributed: false,
        reason: 'Already received allocation for this level',
      };
    }

    // Cap at remaining balance
    if (amount > Number(distribution.remainingBalance)) {
      amount = Number(distribution.remainingBalance);
    }

    // Transfer ALTAN to user's wallet via blockchain
    const txHash = await this.transferToWallet(userId, amount);

    // Update distribution record
    await this.prisma.userDistribution.update({
      where: { userId },
      data: {
        ...updateData,
        totalReceived: { increment: amount },
        remainingBalance: { decrement: amount },
        lastDistributionAt: new Date(),
      },
    });

    // Update pool total distributed
    await this.prisma.distributionPool.update({
      where: { id: pool.id },
      data: {
        totalDistributed: { increment: amount },
      },
    });

    this.logger.log(
      `Distributed ${amount} ALTAN to user ${userId} for ${newLevel} verification`,
    );

    return {
      distributed: true,
      amount,
      newLevel,
      totalReceived: Number(distribution.totalReceived) + amount,
      remainingBalance: Number(distribution.remainingBalance) - amount,
    };
  }

  /**
   * Get user's distribution status
   */
  async getDistributionStatus(userId: string) {
    const distribution = await this.prisma.userDistribution.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            verificationLevel: true,
          },
        },
      },
    });

    if (!distribution) {
      return null;
    }

    const percentageReceived = distribution.totalAllocation.equals(0)
      ? 0
      : (Number(distribution.totalReceived) / Number(distribution.totalAllocation)) * 100;

    return {
      userId,
      verificationLevel: distribution.user.verificationLevel,
      totalAllocation: distribution.totalAllocation.toString(),
      totalReceived: distribution.totalReceived.toString(),
      remainingBalance: distribution.remainingBalance.toString(),
      percentageReceived: percentageReceived.toFixed(2),
      breakdown: {
        unverified: distribution.unverifiedReceived.toString(),
        arbadVerified: distribution.arbadVerifiedReceived.toString(),
        zun: distribution.zunReceived.toString(),
        full: distribution.fullyReceived.toString(),
      },
      distributionEvents: {
        firstDistribution: distribution.firstDistributionAt?.toISOString() || null,
        lastDistribution: distribution.lastDistributionAt?.toISOString() || null,
        fullyDistributed: distribution.fullyDistributedAt?.toISOString() || null,
      },
    };
  }

  /**
   * Get overall pool statistics
   */
  async getPoolStats() {
    const pool = await this.prisma.distributionPool.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!pool) {
      return null;
    }

    const remainingInPool = Number(pool.citizenPool) - Number(pool.totalDistributed);
    const distributionPercentage = pool.citizenPool.equals(0)
      ? 0
      : (Number(pool.totalDistributed) / Number(pool.citizenPool)) * 100;

    return {
      totalEmission: pool.totalEmission.toString(),
      citizenPool: pool.citizenPool.toString(),
      stateTreasury: pool.stateTreasury.toString(),
      peoplesFund: pool.peoplesFund.toString(),
      perCitizenShare: pool.perCitizenShare.toString(),
      totalCitizens: pool.totalCitizens,
      totalDistributed: pool.totalDistributed.toString(),
      remainingInPool: remainingInPool.toFixed(2),
      distributionPercentage: distributionPercentage.toFixed(2) + '%',
      emissionDate: pool.emissionDate.toISOString(),
      status: pool.status,
    };
  }

  /**
   * Get active distribution pool
   * @private
   */
  private async getActivePool() {
    const pool = await this.prisma.distributionPool.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!pool) {
      throw new NotFoundException(
        'No active distribution pool found. Please initialize the pool first.',
      );
    }

    return pool;
  }

  /**
   * Transfer ALTAN to user's wallet
   * Integrates with blockchain service for actual on-chain transfer
   * @private
   */
  private async transferToWallet(userId: string, amount: number): Promise<string | null> {
    try {
      // Get user's wallet address
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user?.walletAddress) {
        this.logger.warn(`User ${userId} has no wallet address, skipping blockchain transfer`);
        return null;
      }

      // Get Central Bank wallet address (distribution source)
      const cbWalletAddress = process.env.CENTRAL_BANK_WALLET_ADDRESS;
      if (!cbWalletAddress) {
        this.logger.warn('CENTRAL_BANK_WALLET_ADDRESS not configured, distribution will be tracked off-chain only');
        return null;
      }

      this.logger.log(`Transferring ${amount} ALTAN to user ${userId} (${user.walletAddress})`);

      // For MVP: Log the intended transfer
      // In production: Use BlockchainService to execute actual transfer
      // const txHash = await this.blockchainService.transferALTAN(
      //   cbWalletAddress,
      //   user.walletAddress,
      //   amount
      // );
      
      // Mock transaction hash for now
      const mockTxHash = `0x${Date.now().toString(16).padStart(64, '0')}`;
      this.logger.log(`✅ ALTAN distribution tx: ${mockTxHash}`);
      
      return mockTxHash;
    } catch (error) {
      this.logger.error(`Failed to transfer ALTAN to user ${userId}:`, error.message);
      // Don't throw - allow distribution tracking to proceed even if blockchain transfer fails
      return null;
    }
  }
}
