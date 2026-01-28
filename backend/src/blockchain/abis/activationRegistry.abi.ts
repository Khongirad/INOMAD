/**
 * Minimal ABI for ActivationRegistry contract
 * Only includes functions needed for backend operations
 */
export const ActivationRegistry_ABI = [
  // Read functions
  'function isActivated(uint256 seatId) view returns (bool)',
  'function activationTimestamp(uint256 seatId) view returns (uint256)',
  
  // Events
  'event Activated(uint256 indexed seatId, address indexed activator, uint256 timestamp)',
] as const;
