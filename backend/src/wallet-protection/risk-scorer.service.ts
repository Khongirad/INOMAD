import { Injectable, Logger } from '@nestjs/common';

/**
 * RiskScorerService - Pattern Detection & Risk Scoring
 * 
 * Assigns risk scores (0-100) to wallets based on:
 * - Transaction patterns
 * - Historical behavior
 * - Network analysis
 * - Blacklist proximity
 */
@Injectable()
export class RiskScorerService {
  private readonly logger = new Logger(RiskScorerService.name);

  // Risk score cache
  private walletScores: Map<string, RiskProfile> = new Map();

  // Blacklist for known bad addresses
  private blacklist: Set<string> = new Set();

  // Whitelist for verified addresses
  private whitelist: Set<string> = new Set();

  // Risk weights
  private readonly WEIGHTS = {
    highFrequency: 20,
    largeTransaction: 15,
    newRecipient: 5,
    drainPattern: 30,
    unlimitedApproval: 25,
    blacklistProximity: 40,
    newWallet: 10,
  };

  constructor() {
    // Initialize with known bad addresses (in production, load from DB)
    this.initializeBlacklist();
  }

  private initializeBlacklist() {
    // Add known scam/malicious addresses
    // In production, this would be loaded from database
    const knownBad = [
      // Example malicious addresses
      '0x0000000000000000000000000000000000000000', // Zero address
    ];
    
    knownBad.forEach(addr => this.blacklist.add(addr.toLowerCase()));
  }

  /**
   * Calculate risk score for a wallet
   */
  calculateRiskScore(
    wallet: string,
    patterns: SuspiciousPattern[],
  ): number {
    let score = 0;
    wallet = wallet.toLowerCase();

    // Base score from existing profile
    const profile = this.walletScores.get(wallet);
    if (profile) {
      score = profile.currentScore;
    }

    // Add scores from detected patterns
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'high_frequency':
          score += this.WEIGHTS.highFrequency;
          break;
        case 'large_transaction':
          score += this.WEIGHTS.largeTransaction;
          break;
        case 'new_recipient':
          score += this.WEIGHTS.newRecipient;
          break;
        case 'drain_pattern':
          score += this.WEIGHTS.drainPattern;
          break;
        case 'unlimited_approval':
          score += this.WEIGHTS.unlimitedApproval;
          break;
        case 'blacklist_interaction':
          score += this.WEIGHTS.blacklistProximity;
          break;
      }
    }

    // Apply decay (reduce score over time for healthy activity)
    score = this.applyDecay(score, profile);

    // Cap at 100
    score = Math.min(100, Math.max(0, score));

    // Update profile
    this.updateProfile(wallet, score, patterns);

    return score;
  }

  /**
   * Apply time-based decay to score
   * Good behavior over time reduces score
   */
  private applyDecay(score: number, profile: RiskProfile | undefined): number {
    if (!profile) return score;

    const hoursSinceUpdate = (Date.now() - profile.lastUpdated) / (60 * 60 * 1000);
    
    // Decay 1 point per hour of inactivity (no suspicious activity)
    const decay = Math.floor(hoursSinceUpdate);
    
    return Math.max(0, score - decay);
  }

  /**
   * Update wallet risk profile
   */
  private updateProfile(
    wallet: string,
    score: number,
    patterns: SuspiciousPattern[],
  ) {
    const existing = this.walletScores.get(wallet);
    
    const profile: RiskProfile = {
      wallet,
      currentScore: score,
      highestScore: existing ? Math.max(existing.highestScore, score) : score,
      lastUpdated: Date.now(),
      flagCount: (existing?.flagCount || 0) + (patterns.length > 0 ? 1 : 0),
      recentPatterns: patterns.map(p => p.type),
    };

    this.walletScores.set(wallet, profile);
  }

  /**
   * Quick check if wallet should be auto-locked
   */
  shouldAutoLock(wallet: string): boolean {
    const profile = this.walletScores.get(wallet.toLowerCase());
    
    if (!profile) return false;
    
    // Auto-lock threshold: 80
    return profile.currentScore >= 80;
  }

  /**
   * Get wallet risk profile
   */
  getProfile(wallet: string): RiskProfile | null {
    return this.walletScores.get(wallet.toLowerCase()) || null;
  }

  /**
   * Get current risk score
   */
  getScore(wallet: string): number {
    const profile = this.walletScores.get(wallet.toLowerCase());
    return profile?.currentScore || 0;
  }

  /**
   * Check if address is blacklisted
   */
  isBlacklisted(address: string): boolean {
    return this.blacklist.has(address.toLowerCase());
  }

  /**
   * Check if address is whitelisted
   */
  isWhitelisted(address: string): boolean {
    return this.whitelist.has(address.toLowerCase());
  }

  /**
   * Add address to blacklist
   */
  addToBlacklist(address: string, reason: string) {
    this.blacklist.add(address.toLowerCase());
    this.logger.warn(`Added ${address} to blacklist: ${reason}`);
  }

  /**
   * Add address to whitelist
   */
  addToWhitelist(address: string) {
    this.whitelist.add(address.toLowerCase());
    this.logger.log(`Added ${address} to whitelist`);
  }

  /**
   * Reset wallet score (after manual review)
   */
  resetScore(wallet: string) {
    const profile = this.walletScores.get(wallet.toLowerCase());
    if (profile) {
      profile.currentScore = 0;
      profile.recentPatterns = [];
      this.walletScores.set(wallet.toLowerCase(), profile);
      this.logger.log(`Reset risk score for ${wallet}`);
    }
  }

  /**
   * Get all high-risk wallets
   */
  getHighRiskWallets(threshold: number = 50): RiskProfile[] {
    const result: RiskProfile[] = [];
    
    this.walletScores.forEach((profile) => {
      if (profile.currentScore >= threshold) {
        result.push(profile);
      }
    });

    return result.sort((a, b) => b.currentScore - a.currentScore);
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalProfiles = 0;
    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;

    this.walletScores.forEach((profile) => {
      totalProfiles++;
      if (profile.currentScore >= 70) highRisk++;
      else if (profile.currentScore >= 30) mediumRisk++;
      else lowRisk++;
    });

    return {
      totalProfiles,
      highRisk,
      mediumRisk,
      lowRisk,
      blacklistSize: this.blacklist.size,
      whitelistSize: this.whitelist.size,
    };
  }
}

// Types
interface RiskProfile {
  wallet: string;
  currentScore: number;
  highestScore: number;
  lastUpdated: number;
  flagCount: number;
  recentPatterns: string[];
}

interface SuspiciousPattern {
  type: 
    | 'high_frequency'
    | 'large_transaction'
    | 'new_recipient'
    | 'drain_pattern'
    | 'unlimited_approval'
    | 'blacklist_interaction';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export { RiskProfile, SuspiciousPattern };
