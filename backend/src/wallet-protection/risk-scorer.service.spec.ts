import { RiskScorerService } from './risk-scorer.service';

describe('RiskScorerService', () => {
  let service: RiskScorerService;

  beforeEach(() => {
    service = new RiskScorerService();
  });

  it('calculateRiskScore returns a number', () => {
    const score = service.calculateRiskScore('0x123', [
      { type: 'large_transaction', severity: 'low', description: 'Large tx' },
    ]);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('getProfile returns null for unknown wallet', () => {
    expect(service.getProfile('0xunknown')).toBeNull();
  });

  it('isBlacklisted returns false by default', () => {
    expect(service.isBlacklisted('0x123')).toBe(false);
  });

  it('isWhitelisted returns false by default', () => {
    expect(service.isWhitelisted('0x123')).toBe(false);
  });

  it('getStats returns object', () => {
    expect(service.getStats()).toBeDefined();
  });
});
