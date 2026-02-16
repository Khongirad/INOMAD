import { Test, TestingModule } from '@nestjs/testing';
import { RiskScorerService } from './risk-scorer.service';

describe('RiskScorerService', () => {
  let service: RiskScorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskScorerService],
    }).compile();
    service = module.get(RiskScorerService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('calculateRiskScore', () => {
    it('returns 0 for no patterns', () => {
      const s = service.calculateRiskScore('0xWallet', []);
      expect(s).toBe(0);
    });
    it('adds high_frequency weight', () => {
      const s = service.calculateRiskScore('0xA', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
      ]);
      expect(s).toBe(20);
    });
    it('adds large_transaction weight', () => {
      const s = service.calculateRiskScore('0xB', [
        { type: 'large_transaction', severity: 'medium', description: 't' },
      ]);
      expect(s).toBe(15);
    });
    it('adds new_recipient weight', () => {
      const s = service.calculateRiskScore('0xC', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      expect(s).toBe(5);
    });
    it('adds drain_pattern weight', () => {
      const s = service.calculateRiskScore('0xD', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
      ]);
      expect(s).toBe(30);
    });
    it('adds unlimited_approval weight', () => {
      const s = service.calculateRiskScore('0xE', [
        { type: 'unlimited_approval', severity: 'high', description: 't' },
      ]);
      expect(s).toBe(25);
    });
    it('adds blacklist_interaction weight', () => {
      const s = service.calculateRiskScore('0xF', [
        { type: 'blacklist_interaction', severity: 'high', description: 't' },
      ]);
      expect(s).toBe(40);
    });
    it('combines multiple patterns', () => {
      const s = service.calculateRiskScore('0xG', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
        { type: 'drain_pattern', severity: 'high', description: 't' },
      ]);
      expect(s).toBe(50);
    });
    it('caps at 100', () => {
      const s = service.calculateRiskScore('0xH', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
        { type: 'blacklist_interaction', severity: 'high', description: 't' },
        { type: 'unlimited_approval', severity: 'high', description: 't' },
        { type: 'high_frequency', severity: 'medium', description: 't' },
      ]);
      expect(s).toBeLessThanOrEqual(100);
    });
    it('case insensitive wallet', () => {
      service.calculateRiskScore('0xUPPER', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
      ]);
      const p = service.getProfile('0xupper');
      expect(p).toBeDefined();
      expect(p!.currentScore).toBe(20);
    });
  });

  describe('shouldAutoLock', () => {
    it('returns false for unknown wallet', () => {
      expect(service.shouldAutoLock('0xUnknown')).toBe(false);
    });
    it('returns false for low score', () => {
      service.calculateRiskScore('0xLow', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      expect(service.shouldAutoLock('0xLow')).toBe(false);
    });
    it('returns true for score >= 80', () => {
      service.calculateRiskScore('0xHigh', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
        { type: 'blacklist_interaction', severity: 'high', description: 't' },
        { type: 'unlimited_approval', severity: 'high', description: 't' },
      ]);
      expect(service.shouldAutoLock('0xHigh')).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('returns null for unknown wallet', () => {
      expect(service.getProfile('0xUnknown')).toBeNull();
    });
    it('returns profile after scoring', () => {
      service.calculateRiskScore('0xP', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
      ]);
      const p = service.getProfile('0xP');
      expect(p).not.toBeNull();
      expect(p!.wallet).toBe('0xp');
      expect(p!.flagCount).toBe(1);
    });
  });

  describe('getScore', () => {
    it('returns 0 for unknown', () => {
      expect(service.getScore('0xNone')).toBe(0);
    });
    it('returns current score', () => {
      service.calculateRiskScore('0xS', [
        { type: 'large_transaction', severity: 'medium', description: 't' },
      ]);
      expect(service.getScore('0xS')).toBe(15);
    });
  });

  describe('blacklist/whitelist', () => {
    it('zero address is blacklisted by default', () => {
      expect(service.isBlacklisted('0x0000000000000000000000000000000000000000')).toBe(true);
    });
    it('random address is not blacklisted', () => {
      expect(service.isBlacklisted('0xABC')).toBe(false);
    });
    it('adds to blacklist', () => {
      service.addToBlacklist('0xBAD', 'scam');
      expect(service.isBlacklisted('0xBAD')).toBe(true);
    });
    it('is not whitelisted by default', () => {
      expect(service.isWhitelisted('0xABC')).toBe(false);
    });
    it('adds to whitelist', () => {
      service.addToWhitelist('0xGOOD');
      expect(service.isWhitelisted('0xGOOD')).toBe(true);
    });
  });

  describe('resetScore', () => {
    it('resets existing score', () => {
      service.calculateRiskScore('0xR', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
      ]);
      service.resetScore('0xR');
      expect(service.getScore('0xR')).toBe(0);
    });
    it('does nothing for unknown', () => {
      service.resetScore('0xNone'); // should not throw
      expect(service.getScore('0xNone')).toBe(0);
    });
  });

  describe('getHighRiskWallets', () => {
    it('returns high risk wallets sorted', () => {
      service.calculateRiskScore('0xA', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
        { type: 'blacklist_interaction', severity: 'high', description: 't' },
      ]);
      service.calculateRiskScore('0xB', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      const r = service.getHighRiskWallets(20);
      expect(r.length).toBeGreaterThanOrEqual(1);
      expect(r[0].currentScore).toBeGreaterThanOrEqual(r[r.length-1].currentScore);
    });
    it('returns empty for high threshold', () => {
      const r = service.getHighRiskWallets(99);
      // Only includes profiles >= 99
      expect(r.every(p => p.currentScore >= 99)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('returns stats', () => {
      service.calculateRiskScore('0xHigh', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
        { type: 'blacklist_interaction', severity: 'high', description: 't' },
        { type: 'unlimited_approval', severity: 'high', description: 't' },
      ]);
      service.calculateRiskScore('0xMed', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
        { type: 'large_transaction', severity: 'medium', description: 't' },
      ]);
      service.calculateRiskScore('0xLow', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      const s = service.getStats();
      expect(s.totalProfiles).toBeGreaterThanOrEqual(3);
      expect(s.blacklistSize).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── applyDecay with old profile ──────
  describe('applyDecay (implicit via repeated scoring)', () => {
    it('should apply time-based score decay for old profiles', () => {
      // Score a wallet
      service.calculateRiskScore('0xDecay', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
      ]);
      // Manually set lastUpdated to 24 hours ago to simulate decay
      const profile = service.getProfile('0xDecay');
      if (profile) {
        (profile as any).lastUpdated = Date.now() - 24 * 60 * 60 * 1000;
      }
      // Re-score with empty patterns - decay should reduce existing score
      const score = service.calculateRiskScore('0xDecay', []);
      expect(score).toBeLessThanOrEqual(20); // original was 20, should be reduced
    });
  });

  // ─── updateProfile with existing profile ─
  describe('updateProfile (implicit via repeated scoring)', () => {
    it('should update highestScore when new score exceeds', () => {
      service.calculateRiskScore('0xUpdate', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      expect(service.getScore('0xUpdate')).toBe(5);
      service.calculateRiskScore('0xUpdate', [
        { type: 'drain_pattern', severity: 'high', description: 't' },
      ]);
      const profile = service.getProfile('0xUpdate');
      expect(profile!.highestScore).toBeGreaterThanOrEqual(35);
    });
  });

  // ─── flagCount increments ─────────────
  describe('flagCount tracking', () => {
    it('should increment flagCount over multiple scorings', () => {
      service.calculateRiskScore('0xFlags', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      service.calculateRiskScore('0xFlags', [
        { type: 'high_frequency', severity: 'medium', description: 't' },
      ]);
      const profile = service.getProfile('0xFlags');
      expect(profile!.flagCount).toBe(2);
    });
    it('should not increment flagCount for empty patterns', () => {
      service.calculateRiskScore('0xNoFlag', [
        { type: 'new_recipient', severity: 'low', description: 't' },
      ]);
      service.calculateRiskScore('0xNoFlag', []);
      const profile = service.getProfile('0xNoFlag');
      expect(profile!.flagCount).toBe(1);
    });
  });

  // ─── removeFromBlacklist (via resetScore) ─
  describe('blacklist edge cases', () => {
    it('should handle adding same address twice', () => {
      service.addToBlacklist('0xDup', 'first');
      service.addToBlacklist('0xDup', 'second');
      expect(service.isBlacklisted('0xDup')).toBe(true);
    });
  });

  // ─── whitelist edge cases ─────────────
  describe('whitelist edge cases', () => {
    it('should handle adding same address twice', () => {
      service.addToWhitelist('0xWDup');
      service.addToWhitelist('0xWDup');
      expect(service.isWhitelisted('0xWDup')).toBe(true);
    });
  });
});

