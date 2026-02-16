import {
  generateBankRef,
  isValidBankRef,
  generateCorrAccountNumber,
  calculateCreditLimit,
  getVerificationAllocation,
  formatALTAN,
  ECONOMIC_CONSTANTS,
  TRANSACTION_REASONS,
} from './bank.utils';

describe('bank.utils', () => {
  describe('generateBankRef', () => {
    it('generates valid format', () => {
      const ref = generateBankRef();
      expect(ref).toMatch(/^BANK-[A-Z2-7]+$/);
    });

    it('generates unique refs', () => {
      const refs = new Set(Array.from({ length: 10 }, () => generateBankRef()));
      expect(refs.size).toBe(10);
    });
  });

  describe('isValidBankRef', () => {
    it('validates correct format', () => expect(isValidBankRef('BANK-ABCDEFGHABCDEFGH')).toBe(true));
    it('rejects bad prefix', () => expect(isValidBankRef('REF-ABCDEFGH23456789')).toBe(false));
    it('rejects too short', () => expect(isValidBankRef('BANK-ABC')).toBe(false));
    it('rejects invalid chars', () => expect(isValidBankRef('BANK-abcdefgh12345678')).toBe(false));
  });

  describe('generateCorrAccountNumber', () => {
    it('generates correct format', () => {
      const acct = generateCorrAccountNumber('BOS');
      expect(acct).toMatch(/^CORR-BOS-[A-Z0-9]+-[A-F0-9]+$/);
    });
  });

  describe('calculateCreditLimit', () => {
    it('returns base 5x with no referrals', () => {
      expect(calculateCreditLimit(1000, 0)).toBe(5000);
    });
    it('returns 6x with 1+ referrals', () => {
      expect(calculateCreditLimit(1000, 1)).toBe(6000);
    });
    it('returns 7x with 6+ referrals', () => {
      expect(calculateCreditLimit(1000, 6)).toBe(7000);
    });
    it('returns 8x with 11+ referrals', () => {
      expect(calculateCreditLimit(1000, 11)).toBe(8000);
    });
    it('caps at 9x with 21+ referrals', () => {
      expect(calculateCreditLimit(1000, 21)).toBe(9000);
    });
  });

  describe('getVerificationAllocation', () => {
    it('returns tier 1 allocation', () => expect(getVerificationAllocation(1)).toBe(100));
    it('returns tier 2 allocation', () => expect(getVerificationAllocation(2)).toBe(5000));
    it('returns tier 3 allocation', () => expect(getVerificationAllocation(3)).toBe(9383));
    it('returns 0 for unknown tier', () => expect(getVerificationAllocation(99 as any)).toBe(0));
  });

  describe('formatALTAN', () => {
    it('formats with default decimals', () => {
      expect(formatALTAN(1234567.89)).toBe('1,234,567.89');
    });
    it('formats with custom decimals', () => {
      expect(formatALTAN(1000, 0)).toBe('1,000');
    });
  });

  describe('constants', () => {
    it('has correct total supply', () => expect(ECONOMIC_CONSTANTS.TOTAL_SUPPLY).toBe(2_100_000_000_000));
    it('has transaction reasons', () => expect(TRANSACTION_REASONS.UBI_WEEKLY).toBeDefined());
  });
});
