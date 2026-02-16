import { Test, TestingModule } from '@nestjs/testing';
import { WalletProtectionService } from './wallet-protection.service';
import { ConfigService } from '@nestjs/config';
import { EventIndexerService } from './event-indexer.service';
import { RiskScorerService } from './risk-scorer.service';
import { AlertService } from './alert.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('WalletProtectionService', () => {
  let service: WalletProtectionService;
  let riskScorer: any;
  let alertService: any;
  let eventIndexer: any;

  beforeEach(async () => {
    riskScorer = {
      calculateRiskScore: jest.fn().mockReturnValue(40),
      getProfile: jest.fn().mockReturnValue({ riskScore: 40, patterns: [] }),
      isBlacklisted: jest.fn().mockReturnValue(false),
      isWhitelisted: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockReturnValue({ totalProfiles: 10 }),
    };
    alertService = {
      sendHighRiskAlert: jest.fn(),
      sendMediumRiskAlert: jest.fn(),
      sendLowRiskAlert: jest.fn(),
      sendManualLockNotification: jest.fn(),
      sendJudicialFreezeRequest: jest.fn(),
    };
    eventIndexer = {
      getWalletHistory: jest.fn().mockReturnValue([{ txHash: '0x1' }]),
      getStats: jest.fn().mockReturnValue({ totalEvents: 100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletProtectionService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: BlockchainService, useValue: { getProvider: jest.fn().mockReturnValue(null) } },
        { provide: EventIndexerService, useValue: eventIndexer },
        { provide: RiskScorerService, useValue: riskScorer },
        { provide: AlertService, useValue: alertService },
      ],
    }).compile();

    service = module.get(WalletProtectionService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ============== processSuspiciousActivity ==============

  it('processes suspicious activity with low risk (monitored)', async () => {
    riskScorer.calculateRiskScore.mockReturnValue(35);
    const r = await service.processSuspiciousActivity('0xWallet', ['new recipient pattern'], { hash: '0x1' });
    expect(r.score).toBe(35);
    expect(r.action).toBe('monitored');
    expect(alertService.sendLowRiskAlert).toHaveBeenCalled();
  });

  it('processes medium risk', async () => {
    riskScorer.calculateRiskScore.mockReturnValue(55);
    const r = await service.processSuspiciousActivity('0xW', ['frequency issue'], {});
    expect(r.action).toBe('monitored');
    expect(alertService.sendMediumRiskAlert).toHaveBeenCalled();
  });

  it('processes high risk and auto-locks', async () => {
    riskScorer.calculateRiskScore.mockReturnValue(85);
    const r = await service.processSuspiciousActivity('0xW', ['draining detected'], {});
    expect(r.action).toBe('locked');
    expect(alertService.sendHighRiskAlert).toHaveBeenCalled();
  });

  it('processes very low risk (no alerts)', async () => {
    riskScorer.calculateRiskScore.mockReturnValue(10);
    const r = await service.processSuspiciousActivity('0xW', ['minor'], {});
    expect(r.action).toBe('monitored');
    expect(alertService.sendLowRiskAlert).not.toHaveBeenCalled();
    expect(alertService.sendMediumRiskAlert).not.toHaveBeenCalled();
  });

  // ============== lockWallet ==============

  it('returns false if guard contract not available', async () => {
    const r = await service.lockWallet('0xW', 'test reason');
    expect(r).toBe(false);
  });

  // ============== manualLock ==============

  it('manual lock returns false when guard not available', async () => {
    const r = await service.manualLock('0xW', 'reason', 'admin1');
    expect(r).toBe(false);
  });

  // ============== requestJudicialFreeze ==============

  it('creates judicial freeze request', async () => {
    const r = await service.requestJudicialFreeze('0xW', 'case123', 'judge1');
    expect(r.status).toBe('pending');
    expect(alertService.sendJudicialFreezeRequest).toHaveBeenCalledWith('0xW', 'case123', 'judge1');
  });

  // ============== getWalletStatus ==============

  it('returns wallet status without on-chain data', async () => {
    const r = await service.getWalletStatus('0xW');
    expect(r.wallet).toBe('0xW');
    expect(r.riskProfile).toBeDefined();
    expect(r.onChainStatus).toBeNull();
    expect(r.isBlacklisted).toBe(false);
    expect(r.isWhitelisted).toBe(true);
  });

  // ============== getStats ==============

  it('returns system stats', () => {
    const r = service.getStats();
    expect(r.indexer).toBeDefined();
    expect(r.riskScorer).toBeDefined();
    expect(r.guardContractAvailable).toBe(false);
  });

  // ============== mapPatternType & calculateSeverity ==============

  it('maps pattern types correctly', () => {
    expect((service as any).mapPatternType('high frequency')).toBe('high_frequency');
    expect((service as any).mapPatternType('draining detected')).toBe('drain_pattern');
    expect((service as any).mapPatternType('unlimited approval')).toBe('unlimited_approval');
    expect((service as any).mapPatternType('blacklist interaction')).toBe('blacklist_interaction');
    expect((service as any).mapPatternType('new recipient')).toBe('new_recipient');
    expect((service as any).mapPatternType('other')).toBe('large_transaction');
  });

  it('calculates severity correctly', () => {
    expect((service as any).calculateSeverity('draining')).toBe('high');
    expect((service as any).calculateSeverity('blacklist')).toBe('high');
    expect((service as any).calculateSeverity('frequency')).toBe('medium');
    expect((service as any).calculateSeverity('approval')).toBe('medium');
    expect((service as any).calculateSeverity('other')).toBe('low');
  });

  // ============== With guard contract (covers lockWallet success/error, updateOnChainScore, manualLock success) ==============

  describe('with guard contract available', () => {
    let mockGuardContract: any;

    beforeEach(() => {
      mockGuardContract = {
        lockWallet: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
        updateRiskScore: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
        getLockStatus: jest.fn().mockResolvedValue([true, 1, '0xcaseHash', 1700000000n]),
      };
      (service as any).guardContract = mockGuardContract;
    });

    it('lockWallet succeeds with guard contract', async () => {
      const result = await service.lockWallet('0xW', 'test reason');
      expect(result).toBe(true);
      expect(mockGuardContract.lockWallet).toHaveBeenCalledWith('0xW', 'test reason');
    });

    it('lockWallet returns false on tx error', async () => {
      mockGuardContract.lockWallet.mockRejectedValue(new Error('tx failed'));
      const result = await service.lockWallet('0xW', 'reason');
      expect(result).toBe(false);
    });

    it('processSuspiciousActivity updates on-chain score', async () => {
      riskScorer.calculateRiskScore.mockReturnValue(45);
      await service.processSuspiciousActivity('0xW', ['frequency'], {});
      expect(mockGuardContract.updateRiskScore).toHaveBeenCalledWith('0xW', 45);
    });

    it('updateOnChainScore silently handles errors', async () => {
      mockGuardContract.updateRiskScore.mockRejectedValue(new Error('chain error'));
      riskScorer.calculateRiskScore.mockReturnValue(20);
      // Should not throw
      await expect(service.processSuspiciousActivity('0xW', ['minor'], {})).resolves.toBeDefined();
    });

    it('manualLock succeeds and sends notification', async () => {
      const result = await service.manualLock('0xW', 'fraud', 'admin1');
      expect(result).toBe(true);
      expect(alertService.sendManualLockNotification).toHaveBeenCalledWith('0xW', 'fraud', 'admin1');
    });

    it('getWalletStatus returns on-chain data', async () => {
      const r = await service.getWalletStatus('0xW');
      expect(r.onChainStatus).not.toBeNull();
      expect(r.onChainStatus.isLocked).toBe(true);
      expect(r.onChainStatus.lockedAt).toBe(1700000000);
    });

    it('getWalletStatus handles on-chain error gracefully', async () => {
      mockGuardContract.getLockStatus.mockRejectedValue(new Error('not deployed'));
      const r = await service.getWalletStatus('0xW');
      expect(r.onChainStatus).toBeNull();
    });
  });
});
