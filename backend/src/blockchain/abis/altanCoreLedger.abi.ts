/**
 * Minimal ABI for AltanCoreLedger contract
 * Only includes functions needed for backend operations
 */
export const AltanCoreLedger_ABI = [
  // Read functions
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Mint(address indexed to, uint256 amount)',
  'event Burn(address indexed from, uint256 amount)',
] as const;
