/**
 * Minimal ABI for CitizenRegistry contract
 * Only includes functions needed for backend operations
 */
export const CitizenRegistry_ABI = [
  // Read functions
  'function seatOf(address citizen) view returns (uint256)',
  'function ownerOfSeat(uint256 seatId) view returns (address)',
  'function metaOf(uint256 seatId) view returns (bytes32 nationId, uint256 arbanId, uint256 provinceId, uint256 districtId, uint256 cityId, uint256 registrationDate, bool exists)',
  
  // Write functions (for future use)
  'function registerSelf(bytes32 nationId, uint256 arbanId, uint256 provinceId, uint256 districtId, uint256 cityId, bytes32 ethicsProofHash, bytes32 identityProofHash) returns (uint256)',
  
  // Events
  'event CitizenRegistered(address indexed citizen, uint256 indexed seatId, bytes32 nationId)',
] as const;
