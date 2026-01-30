/**
 * Updated ABI for AltanBankOfSiberia contract
 * Includes new tier distribution system for Family and Organizational Arbans
 */
export const AltanBankOfSiberia_ABI = [
  // ==================== ADMIN ====================
  
  'function setArbanCompletion(address arbanCompletion_)',
  'function setTierAmounts(uint256 tier1, uint256 tier2Family, uint256 tier2Org, uint256 tier3Family, uint256 tier3Org)',
  'function addBanker(address banker)',
  'function removeBanker(address banker)',
  
  // ==================== TIER DISTRIBUTION ====================
  
  // Tier 1 (Automatic)
  'function distributeTier1Auto(uint256 seatId, uint256 accountId)',
  
  // Tier 2 & 3 (Manual)
  'function requestDistribution(uint256 seatId, uint256 accountId, uint256 tier)',
  'function approveDistribution(uint256 pendingIdx)',
  'function rejectDistribution(uint256 pendingIdx, string calldata reason)',
  
  // ==================== ACCOUNT MANAGEMENT ====================
  
  'function openCitizenAccount(address citizenWallet, uint256 seatId) returns (uint256 accountId)',
  'function getAccountBySeat(uint256 seatId) view returns (uint256 accountId)',
  'function getAccountByAddress(address owner) view returns (uint256 accountId)',
  
  // ==================== VIEW FUNCTIONS ====================
  
  // Tier amounts
  'function tier1Amount() view returns (uint256)',
  'function tier2FamilyAmount() view returns (uint256)',
  'function tier2OrgAmount() view returns (uint256)',
  'function tier3FamilyAmount() view returns (uint256)',
  'function tier3OrgAmount() view returns (uint256)',
  
  // Tier tracking
  'function hasReceivedTier(uint256 seatId, uint256 tier) view returns (bool)',
  
  // Pending distributions
  'function pendingDistributions(uint256 idx) view returns (uint256 seatId, uint256 accountId, uint256 tier, uint8 arbanType, uint256 arbanId, uint256 amount, uint256 requestedAt, bool approved, bool rejected, address approvedBy, uint256 approvedAt)',
  
  // State
  'function arbanCompletion() view returns (address)',
  'function totalDistributed() view returns (uint256)',
  'function distributionPool() view returns (address)',
  
  // ==================== EVENTS ====================
  
  'event TierAmountSet(uint256 tier, uint256 newAmount)',
  'event DistributionRequested(uint256 indexed seatId, uint256 indexed accountId, uint256 tier, uint256 amount)',
  'event DistributionApproved(uint256 indexed seatId, uint256 indexed accountId, uint256 tier, uint256 amount, address indexed approvedBy)',
  'event DistributionRejected(uint256 indexed seatId, uint256 tier, address indexed rejectedBy)',
  'event TierDistributed(uint256 indexed seatId, uint256 indexed accountId, uint256 tier, uint256 amount)',
  
  // Account events
  'event AccountOpened(uint256 indexed accountId, address indexed owner, uint256 seatId)',
  'event Deposit(uint256 indexed accountId, address indexed from, uint256 amount)',
  'event Withdrawal(uint256 indexed accountId, address indexed to, uint256 amount)',
] as const;

/**
 * Enums for AltanBankOfSiberia
 */
export enum ArbanTypeDistrib {
  NONE = 0,
  FAMILY = 1,
  ORG = 2,
}
