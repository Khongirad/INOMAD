/**
 * Minimal ABI for SeatSBT contract
 * Only includes functions needed for backend operations
 */
export const SeatSBT_ABI = [
  // Read functions
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
] as const;
