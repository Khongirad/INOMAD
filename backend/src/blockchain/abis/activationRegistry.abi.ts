/**
 * Full ABI for ActivationRegistry contract
 * Includes read, write, and admin functions
 */
export const ActivationRegistry_ABI = [
  // ==================== READ FUNCTIONS ====================
  'function isActivated(uint256 seatId) view returns (bool)',
  'function isActive(uint256 seatId) view returns (bool)',
  'function activationTimestamp(uint256 seatId) view returns (uint256)',
  'function statusOf(uint256 seatId) view returns (uint8)',
  'function approvalsCount(uint256 seatId) view returns (uint8)',
  'function approvedBy(uint256 seatId, address validator) view returns (bool)',
  'function isValidator(address) view returns (bool)',
  'function thresholdK() view returns (uint8)',
  'function owner() view returns (address)',
  'function statusWithCourt(uint256 seatId) view returns (uint8 status, bool frozen, bool banned)',
  
  // ==================== WRITE FUNCTIONS ====================
  // Core activation flow
  'function requestActivation(uint256 seatId)',
  'function approveActivation(uint256 seatId)',
  
  // Admin functions
  'function setValidator(address v, bool ok)',
  'function setThreshold(uint8 k)',
  'function setLocalBanned(uint256 seatId, bool banned)',
  'function resetApprovals(uint256 seatId)',
  'function transferOwnership(address newOwner)',
  
  // ==================== EVENTS ====================
  'event ActivationRequested(uint256 indexed seatId, address indexed requester)',
  'event ActivationApproved(uint256 indexed seatId, address indexed validator, uint8 approvals)',
  'event Activated(uint256 indexed seatId)',
  'event StatusSet(uint256 indexed seatId, uint8 status)',
  'event ValidatorSet(address indexed validator, bool ok)',
  'event ThresholdSet(uint8 k)',
  'event OwnerChanged(address indexed oldOwner, address indexed newOwner)',
] as const;

/**
 * Status enum matching contract
 */
export enum ActivationStatus {
  NONE = 0,
  LOCKED = 1,
  ACTIVE = 2,
  BANNED = 3,
}
