import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EventIndexerService } from './event-indexer.service';
import { RiskScorerService, SuspiciousPattern } from './risk-scorer.service';
import { AlertService } from './alert.service';
import { BlockchainService } from '../blockchain/blockchain.service';

/**
 * WalletProtectionService - The "Brain" of hybrid security
 * 
 * Orchestrates all protection components:
 * - Receives events from EventIndexer
 * - Uses RiskScorer for evaluation
 * - Triggers alerts via AlertService
 * - Calls CitizenWalletGuard contract when needed
 */
@Injectable()
export class WalletProtectionService {
  private readonly logger = new Logger(WalletProtectionService.name);
  
  // Guard contract for on-chain locking
  private guardContract: ethers.Contract | null = null;
  private signer: ethers.Wallet | null = null;

  // Auto-lock threshold
  private readonly AUTO_LOCK_THRESHOLD = 80;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private eventIndexer: EventIndexerService,
    private riskScorer: RiskScorerService,
    private alertService: AlertService,
  ) {
    this.initializeGuardContract();
  }

  private async initializeGuardContract() {
    const guardAddress = this.configService.get<string>('CITIZEN_WALLET_GUARD_ADDRESS');
    const privateKey = this.configService.get<string>('MONITOR_PRIVATE_KEY');
    const provider = this.blockchainService.getProvider();

    if (!guardAddress || !privateKey || !provider) {
      this.logger.warn('⚠️  Guard contract not configured, running in read-only mode');
      return;
    }

    try {
      this.signer = new ethers.Wallet(privateKey, provider);
      
      // CitizenWalletGuard ABI (minimal for lockWallet)
      const guardABI = [
        'function lockWallet(address wallet, string description) external',
        'function updateRiskScore(address wallet, uint256 newScore) external',
        'function getLockStatus(address wallet) view returns (bool, uint8, bytes32, uint256)',
      ];

      this.guardContract = new ethers.Contract(guardAddress, guardABI, this.signer);
      this.logger.log('✅ Guard contract initialized');
    } catch (error) {
      this.logger.error('Failed to initialize guard contract', error);
    }
  }

  /**
   * Process suspicious activity from EventIndexer
   */
  async processSuspiciousActivity(
    wallet: string,
    patterns: string[],
    transaction: any,
  ) {
    this.logger.log(`Processing suspicious activity for ${wallet}`);

    // Convert string patterns to SuspiciousPattern objects
    const suspiciousPatterns: SuspiciousPattern[] = patterns.map(p => ({
      type: this.mapPatternType(p),
      severity: this.calculateSeverity(p),
      description: p,
    }));

    // Calculate risk score
    const score = this.riskScorer.calculateRiskScore(wallet, suspiciousPatterns);
    
    this.logger.log(`Risk score for ${wallet}: ${score}`);

    // Update on-chain score if contract available
    await this.updateOnChainScore(wallet, score);

    // Determine action based on score
    if (score >= this.AUTO_LOCK_THRESHOLD) {
      await this.lockWallet(wallet, `Auto-locked: risk score ${score}`);
      await this.alertService.sendHighRiskAlert(wallet, score, patterns);
    } else if (score >= 50) {
      await this.alertService.sendMediumRiskAlert(wallet, score, patterns);
    } else if (score >= 30) {
      await this.alertService.sendLowRiskAlert(wallet, score, patterns);
    }

    return { wallet, score, action: score >= 80 ? 'locked' : 'monitored' };
  }

  /**
   * Lock wallet on-chain via CitizenWalletGuard
   */
  async lockWallet(wallet: string, reason: string) {
    if (!this.guardContract) {
      this.logger.warn(`Cannot lock ${wallet}: Guard contract not available`);
      return false;
    }

    try {
      this.logger.warn(`🔒 Locking wallet ${wallet}: ${reason}`);
      
      const tx = await this.guardContract.lockWallet(wallet, reason);
      await tx.wait();
      
      this.logger.log(`✅ Wallet ${wallet} locked successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to lock wallet ${wallet}`, error);
      return false;
    }
  }

  /**
   * Update risk score on-chain
   */
  private async updateOnChainScore(wallet: string, score: number) {
    if (!this.guardContract) return;

    try {
      const tx = await this.guardContract.updateRiskScore(wallet, score);
      await tx.wait();
    } catch (error) {
      // Non-critical, just log
      this.logger.debug(`Could not update on-chain score for ${wallet}`, error);
    }
  }

  /**
   * Manual wallet lock (for admin/officer)
   */
  async manualLock(wallet: string, reason: string, lockedBy: string) {
    this.logger.warn(`Manual lock requested for ${wallet} by ${lockedBy}`);
    
    const success = await this.lockWallet(wallet, reason);
    
    if (success) {
      await this.alertService.sendManualLockNotification(wallet, reason, lockedBy);
    }

    return success;
  }

  /**
   * Request judicial freeze (goes through JudicialMultiSig)
   */
  async requestJudicialFreeze(wallet: string, caseHash: string, requestedBy: string) {
    this.logger.log(`Judicial freeze requested for ${wallet} by ${requestedBy}`);
    
    // This creates a record for judges to review
    // Actual freeze happens through JudicialMultiSig contract
    await this.alertService.sendJudicialFreezeRequest(wallet, caseHash, requestedBy);

    return {
      status: 'pending',
      message: 'Judicial freeze request submitted for multi-sig approval',
    };
  }

  /**
   * Get wallet protection status
   */
  async getWalletStatus(wallet: string) {
    const profile = this.riskScorer.getProfile(wallet);
    const history = this.eventIndexer.getWalletHistory(wallet);

    let onChainStatus = null;
    if (this.guardContract) {
      try {
        const status = await this.guardContract.getLockStatus(wallet);
        onChainStatus = {
          isLocked: status[0],
          reason: status[1],
          caseHash: status[2],
          lockedAt: Number(status[3]),
        };
      } catch (error) {
        // Contract might not be deployed
      }
    }

    return {
      wallet,
      riskProfile: profile,
      recentTransactions: history.length,
      onChainStatus,
      isBlacklisted: this.riskScorer.isBlacklisted(wallet),
      isWhitelisted: this.riskScorer.isWhitelisted(wallet),
    };
  }

  /**
   * Get protection system statistics
   */
  getStats() {
    return {
      indexer: this.eventIndexer.getStats(),
      riskScorer: this.riskScorer.getStats(),
      guardContractAvailable: !!this.guardContract,
    };
  }

  // Helper methods
  private mapPatternType(pattern: string): SuspiciousPattern['type'] {
    if (pattern.includes('frequency')) return 'high_frequency';
    if (pattern.includes('draining')) return 'drain_pattern';
    if (pattern.includes('approval')) return 'unlimited_approval';
    if (pattern.includes('blacklist')) return 'blacklist_interaction';
    if (pattern.includes('new recipient')) return 'new_recipient';
    return 'large_transaction';
  }

  private calculateSeverity(pattern: string): 'low' | 'medium' | 'high' {
    if (pattern.includes('draining') || pattern.includes('blacklist')) return 'high';
    if (pattern.includes('frequency') || pattern.includes('approval')) return 'medium';
    return 'low';
  }
}
