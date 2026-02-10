import { Test, TestingModule } from '@nestjs/testing';
import { WalletProtectionService } from './wallet-protection.service';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from '../blockchain/blockchain.service';
import { EventIndexerService } from './event-indexer.service';
import { RiskScorerService } from './risk-scorer.service';
import { AlertService } from './alert.service';

describe('WalletProtectionService', () => {
  let service: WalletProtectionService;
  let riskScorer: any;
  let alertService: any;
  let eventIndexer: any;

  beforeEach(async () => {
    riskScorer = {
      calculateRiskScore: jest.fn().mockReturnValue(25),
      getProfile: jest.fn().mockReturnValue(null),
      isBlacklisted: jest.fn().mockReturnValue(false),
      isWhitelisted: jest.fn().mockReturnValue(false),
      getStats: jest.fn().mockReturnValue({}),
    };
    alertService = {
      sendHighRiskAlert: jest.fn(),
      sendMediumRiskAlert: jest.fn(),
      sendLowRiskAlert: jest.fn(),
      sendManualLockNotification: jest.fn(),
      sendJudicialFreezeRequest: jest.fn(),
    };
    eventIndexer = {
      getWalletHistory: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({}),
    };
    const configService = { get: jest.fn().mockReturnValue(null) };
    const blockchain = { getProvider: jest.fn().mockReturnValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletProtectionService,
        { provide: ConfigService, useValue: configService },
        { provide: BlockchainService, useValue: blockchain },
        { provide: EventIndexerService, useValue: eventIndexer },
        { provide: RiskScorerService, useValue: riskScorer },
        { provide: AlertService, useValue: alertService },
      ],
    }).compile();
    service = module.get<WalletProtectionService>(WalletProtectionService);
  });

  it('processSuspiciousActivity returns monitored for low score', async () => {
    const r = await service.processSuspiciousActivity('0x123', ['large_transaction'], {});
    expect(r.action).toBe('monitored');
  });

  it('processSuspiciousActivity returns locked for high score', async () => {
    riskScorer.calculateRiskScore.mockReturnValue(90);
    const r = await service.processSuspiciousActivity('0x123', ['draining'], {});
    expect(r.action).toBe('locked');
  });

  it('getStats returns combined stats', () => {
    const r = service.getStats();
    expect(r).toHaveProperty('indexer');
    expect(r).toHaveProperty('riskScorer');
  });

  it('requestJudicialFreeze returns pending status', async () => {
    const r = await service.requestJudicialFreeze('0x123', 'hash', 'officer-1');
    expect(r.status).toBe('pending');
  });

  it('getWalletStatus returns wallet info', async () => {
    const r = await service.getWalletStatus('0x123');
    expect(r.wallet).toBe('0x123');
    expect(r.isBlacklisted).toBe(false);
  });
});
