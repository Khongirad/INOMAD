import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Bank-focused blockchain integration service
 * Handles synchronization between DB AltanLedger and on-chain AltanCoreLedger
 * 
 * NOTE: Architecture note - Gas sponsorship in Altan
 * Physical verification by Arbad members + registration ceremony provides
 * Sybil resistance, reducing need for gas-based attack prevention.
 */
@Injectable()
export class BankBlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BankBlockchainService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.blockchain.isAvailable()) {
      this.logger.log('✅ Bank blockchain sync enabled');
      
      // Start event listeners if enabled
      const enableListeners = this.configService.get<string>('ENABLE_EVENT_LISTENERS', 'false') === 'true';
      if (enableListeners) {
        await this.startTransferEventListener();
      } else {
        this.logger.log('   Event listeners: disabled (set ENABLE_EVENT_LISTENERS=true to enable)');
      }
    } else {
      this.logger.warn('⚠️  Bank blockchain sync disabled (offline mode)');
    }
  }

  async onModuleDestroy() {
    await this.stopTransferEventListener();
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
   * Event listener for Transfer events
   * Syncs on-chain transfers to database for account reconciliation
   */
  private eventListenerActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async startTransferEventListener(): Promise<void> {
    if (!this.blockchain.isAvailable()) {
      this.logger.warn('⚠️  Cannot start event listener: blockchain unavailable');
      return;
    }

    const contract = this.blockchain.getAltanCoreLedgerContract();
    if (!contract) {
      this.logger.warn('⚠️  AltanCoreLedger contract not available');
      return;
    }

    if (this.eventListenerActive) {
      this.logger.log('Event listener already active');
      return;
    }

    try {
      // Listen for Transfer events
      contract.on('Transfer', async (from: string, to: string, value: bigint, event: any) => {
        await this.handleTransferEvent(from, to, value, event);
      });

      this.eventListenerActive = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ Transfer event listener started');
      this.logger.log(`   Listening on contract: ${await contract.getAddress()}`);
    } catch (error) {
      this.logger.error(`Failed to start event listener: ${error.message}`);
      await this.attemptReconnect();
    }
  }

  /**
   * Stop the event listener
   */
  async stopTransferEventListener(): Promise<void> {
    const contract = this.blockchain.getAltanCoreLedgerContract();
    if (contract && this.eventListenerActive) {
      contract.removeAllListeners('Transfer');
      this.eventListenerActive = false;
      this.logger.log('🛑 Transfer event listener stopped');
    }
  }

  /**
   * Handle incoming Transfer event
   */
  private async handleTransferEvent(
    from: string,
    to: string,
    value: bigint,
    event: any,
  ): Promise<void> {
    const blockNumber = event?.log?.blockNumber || 'unknown';
    const txHash = event?.log?.transactionHash || 'unknown';
    
    this.logger.log(`📥 Transfer detected: ${from} → ${to} | ${value.toString()} | Block ${blockNumber}`);

    try {
      // Find users by wallet address
      const [fromUser, toUser] = await Promise.all([
        this.prisma.user.findFirst({ where: { walletAddress: from.toLowerCase() } }),
        this.prisma.user.findFirst({ where: { walletAddress: to.toLowerCase() } }),
      ]);

      // Update sender's balance if they're a known user
      if (fromUser && from !== '0x0000000000000000000000000000000000000000') {
        await this.reconcileUserBalance(fromUser.id, from);
      }

      // Update receiver's balance if they're a known user
      if (toUser && to !== '0x0000000000000000000000000000000000000000') {
        await this.reconcileUserBalance(toUser.id, to);
      }

      // Log the transfer for audit trail
      await this.logTransferEvent(from, to, value, txHash, blockNumber);

    } catch (error) {
      this.logger.error(`Error handling transfer event: ${error.message}`);
    }
  }

  /**
   * Reconcile user's database balance with on-chain balance
   */
  private async reconcileUserBalance(userId: string, walletAddress: string): Promise<void> {
    const { balance: onChainBalance } = await this.getOnChainBalance(walletAddress);
    
    if (!onChainBalance) {
      return;
    }

    // Get current database balance
    const ledger = await this.prisma.altanLedger.findFirst({
      where: { userId },
    });

    const dbBalance = ledger?.balance?.toString() || '0';

    if (dbBalance !== onChainBalance) {
      this.logger.log(`🔄 Reconciling balance for user ${userId}: DB=${dbBalance} → OnChain=${onChainBalance}`);
      
      // Update database to match on-chain (on-chain is source of truth)
      await this.prisma.altanLedger.upsert({
        where: { userId },
        update: { 
          balance: new Decimal(onChainBalance),
          updatedAt: new Date(),
        },
        create: {
          userId,
          balance: new Decimal(onChainBalance),
        },
      });
    }
  }

  /**
   * Log transfer event for audit trail
   */
  private async logTransferEvent(
    from: string,
    to: string,
    value: bigint,
    txHash: string,
    blockNumber: number | string,
  ): Promise<void> {
    try {
      // Store in a transfer log (if table exists)
      // This is optional - implement if TransferLog model exists
      this.logger.debug(`Transfer logged: ${txHash}`);
    } catch (error) {
      // Non-critical, just log
      this.logger.warn(`Could not log transfer: ${error.message}`);
    }
  }

  /**
   * Attempt to reconnect the event listener
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`❌ Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    this.logger.log(`🔄 Reconnecting event listener in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.startTransferEventListener();
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
