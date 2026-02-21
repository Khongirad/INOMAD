/**
 * ABI for ArbadCreditLine contract
 * Credit system for BOTH Family and Organizational Arbads
 */
export const ArbadCreditLine_ABI = [
  // ==================== ADMIN ====================
  
  'function setInterestRate(uint256 rateBps)',
  'function transferOwnership(address newOwner)',
  
  // ==================== FAMILY CREDIT ====================
  
  'function openFamilyCreditLine(uint256 familyArbadId)',
  'function borrowFamily(uint256 familyArbadId, uint256 amount, uint256 durationDays) returns (uint256 loanId)',
  'function repayFamily(uint256 familyArbadId, uint256 loanIdx)',
  
  // ==================== ORG CREDIT ====================
  
  'function openOrgCreditLine(uint256 orgArbadId)',
  'function borrowOrg(uint256 orgArbadId, uint256 amount, uint256 durationDays) returns (uint256 loanId)',
  'function repayOrg(uint256 orgArbadId, uint256 loanIdx)',
  
  // ==================== VIEW FUNCTIONS ====================
  
  'function getFamilyCreditLine(uint256 arbadId) view returns (uint256 rating, uint256 limit, uint256 borrowed, uint256 available, bool isActive)',
  'function getOrgCreditLine(uint256 arbadId) view returns (uint256 rating, uint256 limit, uint256 borrowed, uint256 available, bool isActive)',
  
  // State
  'function owner() view returns (address)',
  'function arbadCompletion() view returns (address)',
  'function interestRateBps() view returns (uint256)',
  'function nextLoanId() view returns (uint256)',
  
  // Mappings
  'function familyCreditLines(uint256 arbadId) view returns (uint256 arbadId, uint8 creditType, uint256 creditRating, uint256 creditLimit, uint256 borrowed, uint256 totalBorrowed, uint256 totalRepaid, uint256 defaultCount, uint256 onTimeCount, bool isActive, uint256 openedAt)',
  'function orgCreditLines(uint256 arbadId) view returns (uint256 arbadId, uint8 creditType, uint256 creditRating, uint256 creditLimit, uint256 borrowed, uint256 totalBorrowed, uint256 totalRepaid, uint256 defaultCount, uint256 onTimeCount, bool isActive, uint256 openedAt)',
  'function hasFamilyCreditLine(uint256 arbadId) view returns (bool)',
  'function hasOrgCreditLine(uint256 arbadId) view returns (bool)',
  
  // Constants
  'function FAMILY_BASE_LIMIT() view returns (uint256)',
  'function ORG_BASE_LIMIT() view returns (uint256)',
  'function MAX_CREDIT_LIMIT() view returns (uint256)',
  'function NEUTRAL_RATING() view returns (uint256)',
  'function MAX_RATING() view returns (uint256)',
  
  // ==================== EVENTS ====================
  
  'event OwnerChanged(address indexed oldOwner, address indexed newOwner)',
  'event InterestRateUpdated(uint256 oldRateBps, uint256 newRateBps)',
  'event CreditLineOpened(uint256 indexed arbadId, uint8 creditType, uint256 creditLimit)',
  'event LoanTaken(uint256 indexed loanId, uint256 indexed arbadId, uint8 creditType, uint256 amount)',
  'event LoanRepaid(uint256 indexed loanId, uint256 indexed arbadId, uint8 creditType, bool onTime)',
  'event RatingUpdated(uint256 indexed arbadId, uint8 creditType, uint256 newRating)',
] as const;

/**
 * Enums for ArbadCreditLine
 */
export enum CreditType {
  NONE = 0,
  FAMILY = 1,
  ORG = 2,
}
