import { Test, TestingModule } from '@nestjs/testing';
import { WalletProtectionController } from './wallet-protection.controller';
import { WalletProtectionService } from './wallet-protection.service';
import { RiskScorerService } from './risk-scorer.service';
import { AlertService } from './alert.service';
import { EventIndexerService } from './event-indexer.service';

describe('WalletProtectionController', () => {
  let controller: WalletProtectionController;
  let walletProtection: any;
  let riskScorer: any;
  let alertService: any;
  let eventIndexer: any;

  beforeEach(async () => {
    walletProtection = {
      getStats: jest.fn().mockReturnValue({ totalWallets: 100, lockedWallets: 3 }),
      getWalletStatus: jest.fn().mockResolvedValue({ isLocked: false, riskScore: 10 }),
      manualLock: jest.fn().mockResolvedValue(true),
      requestJudicialFreeze: jest.fn().mockResolvedValue({ freezeId: 'f1' }),
    };
    riskScorer = {
      getHighRiskWallets: jest.fn().mockReturnValue([{ address: '0x1', score: 80 }]),
      addToBlacklist: jest.fn(),
      addToWhitelist: jest.fn(),
      resetScore: jest.fn(),
    };
    alertService = {
      getAlerts: jest.fn().mockReturnValue([{ id: 'a1', level: 'HIGH' }]),
      getStats: jest.fn().mockReturnValue({ total: 5, unacknowledged: 2 }),
      acknowledgeAlert: jest.fn(),
    };
    eventIndexer = {
      getWalletHistory: jest.fn().mockReturnValue([{ type: 'Transfer', amount: '100' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletProtectionController],
      providers: [
        { provide: WalletProtectionService, useValue: walletProtection },
        { provide: RiskScorerService, useValue: riskScorer },
        { provide: AlertService, useValue: alertService },
        { provide: EventIndexerService, useValue: eventIndexer },
      ],
    }).compile();

    controller = module.get(WalletProtectionController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets stats', () => {
    const r = controller.getStats();
    expect(r.success).toBe(true);
    expect(r.data).toBeDefined();
  });

  it('gets wallet status', async () => {
    const r = await controller.getWalletStatus('0xABC');
    expect(r.success).toBe(true);
    expect(r.data).toBeDefined();
  });

  it('gets wallet history', () => {
    const r = controller.getWalletHistory('0xABC');
    expect(r.success).toBe(true);
    expect(r.data.count).toBe(1);
  });

  it('locks wallet', async () => {
    const r = await controller.lockWallet({ wallet: '0x1', reason: 'fraud', lockedBy: 'admin' });
    expect(r.success).toBe(true);
    expect(walletProtection.manualLock).toHaveBeenCalledWith('0x1', 'fraud', 'admin');
  });

  it('locks wallet returns failed', async () => {
    walletProtection.manualLock.mockResolvedValue(false);
    const r = await controller.lockWallet({ wallet: '0x1', reason: 'test', lockedBy: 'a' });
    expect(r.success).toBe(false);
  });

  it('requests judicial freeze', async () => {
    const r = await controller.requestJudicialFreeze({
      wallet: '0x1', caseHash: '0xCASE', requestedBy: 'judge1',
    });
    expect(r.success).toBe(true);
    expect(r.data).toBeDefined();
  });

  it('gets alerts with filters', () => {
    const r = controller.getAlerts('HIGH', 'SUSPICIOUS', '0x1', '10', 'true');
    expect(r.success).toBe(true);
    expect(alertService.getAlerts).toHaveBeenCalledWith({
      level: 'HIGH', type: 'SUSPICIOUS', wallet: '0x1',
      limit: 10, unacknowledgedOnly: true,
    });
  });

  it('gets alerts without filters', () => {
    const r = controller.getAlerts();
    expect(r.success).toBe(true);
  });

  it('acknowledges alert', () => {
    const r = controller.acknowledgeAlert('a1', { acknowledgedBy: 'admin' });
    expect(r.success).toBe(true);
    expect(alertService.acknowledgeAlert).toHaveBeenCalledWith('a1', 'admin');
  });

  it('gets high risk wallets', () => {
    const r = controller.getHighRiskWallets('70');
    expect(r.success).toBe(true);
    expect(r.data.threshold).toBe(70);
  });

  it('gets high risk wallets with default threshold', () => {
    const r = controller.getHighRiskWallets();
    expect(r.data.threshold).toBe(50);
  });

  it('adds to blacklist', () => {
    const r = controller.addToBlacklist({ address: '0xBAD', reason: 'fraud' });
    expect(r.success).toBe(true);
    expect(riskScorer.addToBlacklist).toHaveBeenCalledWith('0xBAD', 'fraud');
  });

  it('adds to whitelist', () => {
    const r = controller.addToWhitelist({ address: '0xGOOD' });
    expect(r.success).toBe(true);
    expect(riskScorer.addToWhitelist).toHaveBeenCalledWith('0xGOOD');
  });

  it('resets score', () => {
    const r = controller.resetScore('0xABC');
    expect(r.success).toBe(true);
  });
});
