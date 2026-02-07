import { randomBytes } from 'crypto';
import * as rfc4648 from 'rfc4648';

const { base32 } = rfc4648;

/**
 * Generate a unique bankRef identifier.
 * Format: BANK-{BASE32}
 * Example: BANK-ABCD1234EFGH5678
 */
export function generateBankRef(): string {
  const randomData = randomBytes(12); // 12 bytes = 96 bits
  const encoded = base32.stringify(randomData, { pad: false });
  return `BANK-${encoded}`;
}

/**
 * Validate bankRef format
 */
export function isValidBankRef(bankRef: string): boolean {
  return /^BANK-[A-Z2-7]{16,20}$/.test(bankRef);
}

/**
 * Generate account number for Correspondent Account
 * Format: CORR-BOS-{timestamp}-{random}
 */
export function generateCorrAccountNumber(bankCode: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `CORR-${bankCode}-${timestamp}-${random}`;
}

/**
 * Economic constants
 */
export const ECONOMIC_CONSTANTS = {
  // Total supply and distribution
  TOTAL_SUPPLY: 2_100_000_000_000, // 2.1 trillion ALTAN
  TOTAL_POPULATION: 145_000_000, // 145 million citizens
  PER_CAPITA_TOTAL: 14_483, // ~14,483 ALTAN per citizen
  
  // Tiered verification allocations
  LEVEL_1_ALLOCATION: 100, // Base verification
  LEVEL_2_ALLOCATION: 5_000, // Arban membership
  LEVEL_3_ALLOCATION: 9_383, // Zun formation (remaining: 14,483 - 100 - 5,000)
  
  // UBI parameters
  UBI_HOURLY_RATE: 10, // ALTAN per hour
  UBI_WEEKLY_HOURS: 40, // Standard work week
  UBI_WEEKLY_AMOUNT: 400, // 10 * 40
  UBI_MONTHLY_AMOUNT: 1_733, // ~400 * 4.33 weeks
  UBI_YEARLY_AMOUNT: 20_800, // ~400 * 52 weeks
  
  // Credit multipliers
  CREDIT_BASE_MULTIPLIER: 5, // Base 5x
  CREDIT_MAX_MULTIPLIER: 9, // Max 9x with referrals
  
  // Special accounts
  PENSION_FUND_BANK_REF: 'BANK-SPF-SIBERIA', // Siberian Pension Fund
  TREASURY_BANK_REF: 'BANK-TREASURY-GOV', // Government Treasury
  INOMAD_INC_BANK_REF: 'BANK-INOMAD-INC', // INOMAD INC (0.03% fees)
} as const;

/**
 * Calculate credit limit based on deposit and referral count
 */
export function calculateCreditLimit(
  depositAmount: number,
  referralCount: number
): number {
  const {
    CREDIT_BASE_MULTIPLIER,
    CREDIT_MAX_MULTIPLIER,
  } = ECONOMIC_CONSTANTS;
  
  let bonusMultiplier = 0;
  if (referralCount >= 21) bonusMultiplier = 4;
  else if (referralCount >= 11) bonusMultiplier = 3;
  else if (referralCount >= 6) bonusMultiplier = 2;
  else if (referralCount >= 1) bonusMultiplier = 1;
  
  const totalMultiplier = Math.min(
    CREDIT_BASE_MULTIPLIER + bonusMultiplier,
    CREDIT_MAX_MULTIPLIER
  );
  
  return depositAmount * totalMultiplier;
}

/**
 * Calculate verification tier allocation
 */
export function getVerificationAllocation(tier: 1 | 2 | 3): number {
  const { LEVEL_1_ALLOCATION, LEVEL_2_ALLOCATION, LEVEL_3_ALLOCATION } =
    ECONOMIC_CONSTANTS;
  
  switch (tier) {
    case 1:
      return LEVEL_1_ALLOCATION;
    case 2:
      return LEVEL_2_ALLOCATION;
    case 3:
      return LEVEL_3_ALLOCATION;
    default:
      return 0;
  }
}

/**
 * Format ALTAN amount for display
 */
export function formatALTAN(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Transaction reason templates
 */
export const TRANSACTION_REASONS = {
  LEVEL_1_VERIFICATION: 'Level 1 Verification Award - Initial Citizenship',
  LEVEL_2_ARBAN: 'Level 2 Arban Membership Award',
  LEVEL_3_ZUN: 'Level 3 Zun Formation Award - Full Allocation',
  UBI_HOURLY: 'UBI Hourly Payment',
  UBI_WEEKLY: 'UBI Weekly Payment',
  UBI_MONTHLY: 'UBI Monthly Payment',
  REFERRAL_BONUS: 'Referral Verification Bonus',
  CB_EMISSION: 'Central Bank Emission to Correspondent Account',
  PENSION_FUND_DIST: 'Siberian Pension Fund Distribution',
} as const;
