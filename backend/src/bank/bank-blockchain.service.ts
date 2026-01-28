import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Bank-focused blockchain integration service
 * Handles synchronization between DB AltanLedger and on-chain AltanCoreLedger
 * 
 * NOTE: Architecture note - Gas sponsorship in Altan
 * Physical verification by Arban members + registration ceremony provides
 * Sybil resistance, reducing need for gas-based attack prevention.
 */
@Injectable()
export class BankBlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BankBlockchainService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  async onModuleInit() {
    if (this.blockchain.isAvailable()) {
      this.logger.log('✅ Bank blockchain sync enabled');
      // TODO: Start event listeners when gas sponsorship ready
    } else {
      this.logger.warn('⚠️  Bank blockchain sync disabled (offline mode)');
    }
  }

  /**
   * Get balance from on-chain AltanCoreLedger for a wallet address
   */
  async getOnChainBalance(walletAddress: string): Promise<{
    balance: string | null;
    decimals: number;
  }> {
    if (!this.blockchain.isAvailable()) {
      return { balance: null, decimals: 18 };
    }

    try {
      const balance = await this.blockchain.getAltanBalance(walletAddress);
      return {
        balance,
        decimals: 18, // Altan uses 18 decimals
      };
    } catch (error) {
      this.logger.error(`Failed to get on-chain balance for ${walletAddress}`, error);
      return { balance: null, decimals: 18 };
    }
  }

  /**
   * Sync on-chain balance to database for a user
   * Compares DB balance with blockchain and logs discrepancies
   */
  async syncBalanceFromBlockchain(userId: string): Promise<{
    synced: boolean;
    dbBalance: string;
    onChainBalance: string | null;
    discrepancy: boolean;
    walletAddress: string | null;
  }> {
    // Get user with wallet info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        altanLedger: true,
      },
    });

    if (!user) {
      return {
        synced: false,
        dbBalance: '0',
        onChainBalance: null,
        discrepancy: false,
        walletAddress: null,
      };
    }

    const dbBalance = user.altanLedger?.balance?.toString() || '0';
    const walletAddress = user.walletAddress;

    if (!walletAddress) {
      return {
        synced: false,
        dbBalance,
        onChainBalance: null,
        discrepancy: false,
        walletAddress: null,
      };
    }

    // Get on-chain balance
    const { balance: onChainBalance } = await this.getOnChainBalance(walletAddress);

    if (!onChainBalance) {
      return {
        synced: false,
        dbBalance,
        onChainBalance: null,
        discrepancy: false,
        walletAddress,
      };
    }

    // Check for discrepancy
    const discrepancy = dbBalance !== onChainBalance;

    if (discrepancy) {
      this.logger.warn(
        `Balance mismatch for user ${userId}: DB=${dbBalance}, OnChain=${onChainBalance}`
      );
      // TODO: Implement reconciliation strategy
      // For now, we trust on-chain as source of truth but don't auto-update DB
    }

    return {
      synced: true,
      dbBalance,
      onChainBalance,
      discrepancy,
      walletAddress,
    };
  }

  /**
   * Get comprehensive balance info combining DB and blockchain
   */
  async getBalanceStatus(userId: string): Promise<{
    user: {
      id: string;
      seatId: string | null;
      walletAddress: string | null;
    };
    database: {
      balance: string;
      lastUpdated: Date | null;
    };
    blockchain: {
      balance: string | null;
      synced: boolean;
    };
    discrepancy: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        altanLedger: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const dbBalance = user.altanLedger?.balance?.toString() || '0';
    const dbUpdated = user.altanLedger?.updatedAt || null;

    let blockchainBalance: string | null = null;
    let synced = false;

    if (user.walletAddress && this.blockchain.isAvailable()) {
      const { balance } = await this.getOnChainBalance(user.walletAddress);
      blockchainBalance = balance;
      synced = balance !== null;
    }

    const discrepancy = synced && blockchainBalance !== dbBalance;

    return {
      user: {
        id: user.id,
        seatId: user.seatId,
        walletAddress: user.walletAddress,
      },
      database: {
        balance: dbBalance,
        lastUpdated: dbUpdated,
      },
      blockchain: {
        balance: blockchainBalance,
        synced,
      },
      discrepancy,
    };
  }

  /**
   * Bulk sync all users with wallets
   * Used for periodic reconciliation
   */
  async bulkSyncBalances(limit: number = 100): Promise<{
    total: number;
    synced: number;
    discrepancies: number;
  }> {
    if (!this.blockchain.isAvailable()) {
      this.logger.warn('Blockchain unavailable, skipping bulk sync');
      return { total: 0, synced: 0, discrepancies: 0 };
    }

    const users = await this.prisma.user.findMany({
      where: {
        walletAddress: { not: null },
      },
      include: {
        altanLedger: true,
      },
      take: limit,
    });

    let synced = 0;
    let discrepancies = 0;

    for (const user of users) {
      const result = await this.syncBalanceFromBlockchain(user.id);
      if (result.synced) synced++;
      if (result.discrepancy) discrepancies++;
    }

    this.logger.log(
      `Bulk sync complete: ${synced}/${users.length} synced, ${discrepancies} discrepancies`
    );

    return {
      total: users.length,
      synced,
      discrepancies,
    };
  }

  /**
   * TODO: Event listener for Transfer events
   * Will be implemented when gas sponsorship (in Altan) is ready
   * 
   * Architecture: Physical Arban verification + registration provides
   * Sybil resistance, reducing reliance on gas for spam prevention
   */
  async startTransferEventListener(): Promise<void> {
    if (!this.blockchain.isAvailable()) {
      return;
    }

    this.logger.log('🚧 Transfer event listener not yet implemented');
    this.logger.log('   Waiting for gas sponsorship in Altan currency');
    
    // TODO: Implement event listener
    // altanCoreLedgerContract.on('Transfer', (from, to, value) => {
    //   this.handleTransferEvent(from, to, value);
    // });
  }

  /**
   * Check if a wallet has sufficient on-chain balance for a transfer
   */
  async hassufficientOnChainBalance(
    walletAddress: string,
    amount: string,
  ): Promise<boolean> {
    const { balance } = await this.getOnChainBalance(walletAddress);
    
    if (!balance) {
      return false; // Cannot verify, assume insufficient
    }

    try {
      const balanceBigInt = BigInt(balance);
      const amountBigInt = BigInt(amount);
      return balanceBigInt >= amountBigInt;
    } catch (error) {
      this.logger.error('Failed to compare balances', error);
      return false;
    }
  }
}
