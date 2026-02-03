import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainService } from '../blockchain/blockchain.service';

/**
 * EventIndexerService - Real-time blockchain event listener
 * 
 * The "Eyes" of the hybrid security system:
 * - Listens to Transfer, Approval events in real-time
 * - Detects suspicious patterns
 * - Triggers RiskScorerService for evaluation
 * - Feeds data to WalletProtectionService
 */
@Injectable()
export class EventIndexerService implements OnModuleInit {
  private readonly logger = new Logger(EventIndexerService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private altanContract: ethers.Contract | null = null;
  private isListening = false;

  // Event counters for monitoring
  private eventCounts = {
    transfers: 0,
    approvals: 0,
    suspicious: 0,
  };

  // Recent transactions cache (for pattern detection)
  private recentTransactions: Map<string, TransactionRecord[]> = new Map();
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {}

  async onModuleInit() {
    // Delay initialization to ensure blockchain service is ready
    setTimeout(() => this.initialize(), 5000);
  }

  private async initialize() {
    this.provider = this.blockchainService.getProvider();
    this.altanContract = this.blockchainService.getAltanCoreLedgerContract();

    if (!this.provider || !this.altanContract) {
      this.logger.warn('⚠️  Event Indexer: Blockchain not available, running in offline mode');
      return;
    }

    await this.startListening();
    this.logger.log('✅ Event Indexer initialized');
  }

  /**
   * Start listening to blockchain events
   */
  private async startListening() {
    if (this.isListening || !this.altanContract) {
      return;
    }

    try {
      // Listen to Transfer events
      this.altanContract.on('Transfer', async (from, to, amount, event) => {
        await this.handleTransferEvent(from, to, amount, event);
      });

      // Listen to Approval events (potential phishing indicator)
      this.altanContract.on('Approval', async (owner, spender, amount, event) => {
        await this.handleApprovalEvent(owner, spender, amount, event);
      });

      this.isListening = true;
      this.logger.log('   👁️  Listening to ALTAN Transfer and Approval events');
    } catch (error) {
      this.logger.error('Failed to start event listening', error);
    }
  }

  /**
   * Handle Transfer event
   */
  private async handleTransferEvent(
    from: string,
    to: string,
    amount: bigint,
    event: any,
  ) {
    this.eventCounts.transfers++;

    const record: TransactionRecord = {
      type: 'transfer',
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      amount: amount.toString(),
      timestamp: Date.now(),
      blockNumber: event.blockNumber,
      txHash: event.transactionHash,
    };

    // Add to cache
    this.addToCache(from.toLowerCase(), record);

    // Check for suspicious patterns
    const suspiciousReasons = await this.checkSuspiciousPatterns(from.toLowerCase(), record);
    
    if (suspiciousReasons.length > 0) {
      this.eventCounts.suspicious++;
      this.logger.warn(`🚨 Suspicious transfer detected: ${from} -> ${to}`);
      this.logger.warn(`   Reasons: ${suspiciousReasons.join(', ')}`);
      
      // Emit event for WalletProtectionService to handle
      this.onSuspiciousActivity(from, record, suspiciousReasons);
    }
  }

  /**
   * Handle Approval event
   */
  private async handleApprovalEvent(
    owner: string,
    spender: string,
    amount: bigint,
    event: any,
  ) {
    this.eventCounts.approvals++;

    // Unlimited approval is a red flag
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    if (amount >= MAX_UINT256 / 2n) {
      this.logger.warn(`⚠️  Unlimited approval detected: ${owner} -> ${spender}`);
      
      const record: TransactionRecord = {
        type: 'approval',
        from: owner.toLowerCase(),
        to: spender.toLowerCase(),
        amount: amount.toString(),
        timestamp: Date.now(),
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      };

      this.onSuspiciousActivity(owner, record, ['Unlimited token approval']);
    }
  }

  /**
   * Check for suspicious patterns
   */
  private async checkSuspiciousPatterns(
    wallet: string,
    currentTx: TransactionRecord,
  ): Promise<string[]> {
    const reasons: string[] = [];
    const recentTxs = this.recentTransactions.get(wallet) || [];

    // Pattern 1: Large single transaction (>50% of known balance)
    // This requires balance check which we'll skip for performance

    // Pattern 2: High frequency (>10 transactions in 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const txsInLastHour = recentTxs.filter(tx => tx.timestamp > oneHourAgo);
    if (txsInLastHour.length > 10) {
      reasons.push('High transaction frequency (>10/hour)');
    }

    // Pattern 3: Draining pattern (all outgoing, no incoming)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentOutgoing = recentTxs.filter(
      tx => tx.timestamp > fiveMinAgo && tx.from === wallet
    );
    const recentIncoming = recentTxs.filter(
      tx => tx.timestamp > fiveMinAgo && tx.to === wallet
    );
    
    if (recentOutgoing.length >= 3 && recentIncoming.length === 0) {
      reasons.push('Potential wallet draining (multiple outgoing, no incoming)');
    }

    // Pattern 4: New recipient (first time sending to this address)
    const allRecipients = new Set(recentTxs.map(tx => tx.to));
    if (!allRecipients.has(currentTx.to) && recentTxs.length > 5) {
      // Only flag if wallet has history but this is new recipient
      reasons.push('Transfer to new recipient');
    }

    return reasons;
  }

  /**
   * Add transaction to cache
   */
  private addToCache(wallet: string, record: TransactionRecord) {
    if (!this.recentTransactions.has(wallet)) {
      this.recentTransactions.set(wallet, []);
    }

    const cache = this.recentTransactions.get(wallet)!;
    cache.push(record);

    // Clean old entries
    const cutoff = Date.now() - this.CACHE_DURATION_MS;
    const cleaned = cache.filter(tx => tx.timestamp > cutoff);
    this.recentTransactions.set(wallet, cleaned);
  }

  /**
   * Handle suspicious activity (callback for WalletProtectionService)
   */
  private onSuspiciousActivity(
    wallet: string,
    record: TransactionRecord,
    reasons: string[],
  ) {
    // This will be connected to WalletProtectionService via EventEmitter
    // For now, just log
    this.logger.warn(`⚡ Suspicious activity flagged for ${wallet}`);
  }

  /**
   * Get transaction history for a wallet
   */
  getWalletHistory(wallet: string): TransactionRecord[] {
    return this.recentTransactions.get(wallet.toLowerCase()) || [];
  }

  /**
   * Get indexer statistics
   */
  getStats() {
    return {
      isListening: this.isListening,
      eventCounts: this.eventCounts,
      cachedWallets: this.recentTransactions.size,
    };
  }

  /**
   * Stop listening (for cleanup)
   */
  async stopListening() {
    if (this.altanContract) {
      this.altanContract.removeAllListeners();
      this.isListening = false;
      this.logger.log('Event Indexer stopped');
    }
  }
}

// Types
export interface TransactionRecord {
  type: 'transfer' | 'approval';
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}
