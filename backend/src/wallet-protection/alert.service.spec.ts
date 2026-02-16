import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';
import { ConfigService } from '@nestjs/config';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get(AlertService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('sendHighRiskAlert', () => {
    it('creates HIGH alert', async () => {
      await service.sendHighRiskAlert('0xW', 85, ['drain']);
      const alerts = service.getAlerts({ level: 'HIGH' });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].level).toBe('HIGH');
    });
  });

  describe('sendMediumRiskAlert', () => {
    it('creates MEDIUM alert', async () => {
      await service.sendMediumRiskAlert('0xW', 60, ['frequency']);
      const alerts = service.getAlerts({ level: 'MEDIUM' });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sendLowRiskAlert', () => {
    it('creates LOW alert', async () => {
      await service.sendLowRiskAlert('0xW', 35, ['new_recipient']);
      const alerts = service.getAlerts({ level: 'LOW' });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sendManualLockNotification', () => {
    it('creates manual lock alert', async () => {
      await service.sendManualLockNotification('0xW', 'suspicious', 'admin1');
      const alerts = service.getAlerts({ type: 'manual_lock' });
      expect(alerts.length).toBe(1);
      expect(alerts[0].details.lockedBy).toBe('admin1');
    });
  });

  describe('sendJudicialFreezeRequest', () => {
    it('creates CRITICAL judicial freeze alert', async () => {
      await service.sendJudicialFreezeRequest('0xW', '0xcase', 'judge1');
      const alerts = service.getAlerts({ level: 'CRITICAL' as any });
      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe('judicial_freeze');
    });
  });

  describe('getAlerts', () => {
    beforeEach(async () => {
      await service.sendHighRiskAlert('0xA', 90, ['drain']);
      await service.sendMediumRiskAlert('0xB', 60, ['freq']);
      await service.sendLowRiskAlert('0xC', 35, ['new']);
    });

    it('returns all alerts', () => {
      const all = service.getAlerts();
      expect(all.length).toBe(3);
    });
    it('filters by level', () => {
      const high = service.getAlerts({ level: 'HIGH' });
      expect(high.every(a => a.level === 'HIGH')).toBe(true);
    });
    it('filters by type', () => {
      const risk = service.getAlerts({ type: 'risk_score' });
      expect(risk.every(a => a.type === 'risk_score')).toBe(true);
    });
    it('filters by wallet', () => {
      const walletAlerts = service.getAlerts({ wallet: '0xA' });
      expect(walletAlerts.every(a => a.wallet === '0xA')).toBe(true);
    });
    it('filters unacknowledged only', () => {
      const unack = service.getAlerts({ unacknowledgedOnly: true });
      expect(unack.every(a => !a.acknowledged)).toBe(true);
    });
    it('applies limit', () => {
      const limited = service.getAlerts({ limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('acknowledges alert', async () => {
      await service.sendHighRiskAlert('0xW', 85, ['drain']);
      const alerts = service.getAlerts();
      const id = alerts[0].id;
      service.acknowledgeAlert(id, 'admin1');
      const after = service.getAlerts();
      const acked = after.find(a => a.id === id);
      expect(acked!.acknowledged).toBe(true);
      expect(acked!.acknowledgedBy).toBe('admin1');
    });
    it('does nothing for unknown alert', () => {
      service.acknowledgeAlert('bad-id', 'admin'); // should not throw
    });
  });

  describe('getStats', () => {
    it('returns stats', async () => {
      await service.sendHighRiskAlert('0xA', 90, ['drain']);
      await service.sendMediumRiskAlert('0xB', 60, ['freq']);
      const s = service.getStats();
      expect(s.total).toBeGreaterThanOrEqual(2);
      expect(s.last24Hours.total).toBeGreaterThanOrEqual(2);
      expect(s.unacknowledged).toBeGreaterThanOrEqual(2);
    });
  });
});
