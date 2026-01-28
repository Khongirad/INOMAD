/**
 * Minimal ABI for AltanWallet contract
 * Only includes functions needed for backend operations
 */
export const AltanWallet_ABI = [
  // Read functions
  'function seatId() view returns (uint256)',
  'function registry() view returns (address)',
  'function unlocked() view returns (bool)',
  
  // Events
  'event Unlocked(uint256 indexed seatId)',
] as const;
