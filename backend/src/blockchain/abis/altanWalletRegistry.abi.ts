/**
 * Minimal ABI for AltanWalletRegistry contract
 * Only includes functions needed for backend operations
 */
export const AltanWalletRegistry_ABI = [
  // Read functions
  'function walletOf(uint256 seatId) view returns (address)',
  'function seatIdOf(address wallet) view returns (uint256)',
  
  // Events
  'event WalletCreated(uint256 indexed seatId, address indexed wallet)',
] as const;
