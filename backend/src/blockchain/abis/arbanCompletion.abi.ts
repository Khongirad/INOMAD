/**
 * ABI for ArbanCompletion contract
 * Two-Type Arban System: Family (Legislative/Khural) + Organizational (Executive/Judicial/Banking)
 */
export const ArbanCompletion_ABI = [
  // ==================== FAMILY ARBAN ====================
  
  // Marriage & Creation
  'function registerMarriage(uint256 husbandSeatId, uint256 wifeSeatId) returns (uint256 arbanId)',
  'function addChild(uint256 arbanId, uint256 childSeatId)',
  'function changeHeir(uint256 arbanId, uint256 newHeirSeatId)',
  'function setKhuralRepresentative(uint256 arbanId, uint256 repSeatId, uint64 birthYear)',
  'function childCreatesOwnArban(uint256 parentArbanId, uint256 childSeatId, uint256 spouseSeatId) returns (uint256 newArbanId)',
  
  // ==================== ZUN (CLAN) ====================
  
  'function formZun(string memory zunName, uint256[] memory arbanIds) returns (uint256 zunId)',
  'function setZunElder(uint256 zunId, uint256 elderSeatId)',
  
  // ==================== ORGANIZATIONAL ARBAN ====================
  
  'function createOrganizationalArban(string memory name, uint8 orgType) returns (uint256 arbanId)',
  'function addOrgMember(uint256 arbanId, uint256 seatId)',
  'function setOrgLeader(uint256 arbanId, uint256 leaderSeatId)',
  'function createDepartment(uint256 parentOrgId, string memory deptName) returns (uint256 deptId)',
  'function formScientificCouncil(string memory name) returns (uint256 councilId)',
  
  // ==================== VIEW FUNCTIONS ====================
  
  // Family Arban Views
  'function getFamilyArban(uint256 arbanId) view returns (uint256 husbandSeatId, uint256 wifeSeatId, uint256[] memory childrenSeatIds, uint256 heirSeatId, uint256 zunId, uint256 khuralRepSeatId, bool isActive)',
  'function isValidKhuralRepresentative(uint256 arbanId, uint256 seatId) view returns (bool)',
  'function getKhuralRepresentatives() view returns (uint256[] memory)',
  
  // Zun Views
  'function getZun(uint256 zunId) view returns (string memory name, uint256 founderArbanId, uint256[] memory memberArbanIds, uint256 elderSeatId, bool isActive)',
  
  // Organizational Arban Views
  'function getOrgArban(uint256 arbanId) view returns (string memory name, uint256[] memory memberSeatIds, uint256 leaderSeatId, uint8 orgType, uint8 powerBranch, bool isActive)',
  
  // General Views
  'function getArbanTypeForSeat(uint256 seatId) view returns (uint8 arbanType, uint256 arbanId)',
  'function isEligibleForTier2(uint256 seatId) view returns (bool)',
  'function isEligibleForTier3(uint256 seatId) view returns (bool)',
  
  // State
  'function nextFamilyArbanId() view returns (uint256)',
  'function nextOrgArbanId() view returns (uint256)',
  'function nextZunId() view returns (uint256)',
  'function totalFamilyArbans() view returns (uint256)',
  'function totalOrgArbans() view returns (uint256)',
  'function scientificCouncilId() view returns (uint256)',
  
  // Mappings
  'function familyArbans(uint256 arbanId) view returns (uint256 arbanId, uint256 husbandSeatId, uint256 wifeSeatId, uint256 heirSeatId, uint256 zunId, uint256 khuralRepSeatId, uint64 khuralRepBirthYear, bool isActive, uint256 createdAt)',
  'function orgArbans(uint256 arbanId) view returns (uint256 arbanId, string memory name, uint256 leaderSeatId, uint8 orgType, uint8 powerBranch, uint256 parentOrgId, bool isActive, uint256 createdAt)',
  'function zuns(uint256 zunId) view returns (uint256 zunId, string memory name, uint256 founderArbanId, uint256 elderSeatId, bool isActive, uint256 createdAt)',
  'function seatToFamilyArban(uint256 seatId) view returns (uint256)',
  'function seatToOrgArban(uint256 seatId) view returns (uint256)',
  'function isMarried(uint256 seatId) view returns (bool)',
  
  // ==================== EVENTS ====================
  
  // Family Events
  'event MarriageRegistered(uint256 indexed arbanId, uint256 husbandSeatId, uint256 wifeSeatId)',
  'event ChildAdded(uint256 indexed arbanId, uint256 childSeatId)',
  'event HeirSet(uint256 indexed arbanId, uint256 heirSeatId)',
  'event HeirChanged(uint256 indexed arbanId, uint256 oldHeirSeatId, uint256 newHeirSeatId)',
  'event KhuralRepresentativeSet(uint256 indexed arbanId, uint256 repSeatId, uint64 birthYear)',
  'event ChildCreatedOwnArban(uint256 indexed parentArbanId, uint256 indexed newArbanId, uint256 childSeatId)',
  
  // Zun Events
  'event ZunFormed(uint256 indexed zunId, string name, uint256[] arbanIds)',
  'event ArbanJoinedZun(uint256 indexed zunId, uint256 indexed arbanId)',
  'event ZunElderSet(uint256 indexed zunId, uint256 elderSeatId)',
  
  // Organizational Events
  'event OrgArbanCreated(uint256 indexed arbanId, string name, uint8 orgType, uint8 branch)',
  'event OrgMemberAdded(uint256 indexed arbanId, uint256 seatId)',
  'event OrgMemberRemoved(uint256 indexed arbanId, uint256 seatId)',
  'event OrgLeaderSet(uint256 indexed arbanId, uint256 leaderSeatId)',
  'event DepartmentCreated(uint256 indexed parentId, uint256 indexed deptId, string name)',
  
  // Scientific Council
  'event ScientificCouncilFormed(uint256 indexed councilId)',
  
  // Admin
  'event OwnerChanged(address indexed oldOwner, address indexed newOwner)',
] as const;

/**
 * Enums for ArbanCompletion
 */
export enum ArbanType {
  NONE = 0,
  FAMILY = 1,
  ORGANIZATIONAL = 2,
}

export enum OrganizationType {
  NONE = 0,
  EXECUTIVE = 1,
  JUDICIAL = 2,
  BANKING = 3,
  PRIVATE_COMPANY = 4,
  STATE_COMPANY = 5,
  GUILD = 6,
  SCIENTIFIC_COUNCIL = 7,
  EKHE_KHURAL = 8,
}

export enum PowerBranch {
  NONE = 0,
  LEGISLATIVE = 1,
  EXECUTIVE = 2,
  JUDICIAL = 3,
  BANKING = 4,
}
