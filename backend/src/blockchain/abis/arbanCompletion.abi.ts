/**
 * ABI for ArbadCompletion contract
 * Two-Type Arbad System: Family (Legislative/Khural) + Organizational (Executive/Judicial/Banking)
 */
export const ArbadCompletion_ABI = [
  // ==================== FAMILY ARBAD ====================
  
  // Marriage & Creation
  'function registerMarriage(uint256 husbandSeatId, uint256 wifeSeatId) returns (uint256 arbadId)',
  'function addChild(uint256 arbadId, uint256 childSeatId)',
  'function changeHeir(uint256 arbadId, uint256 newHeirSeatId)',
  'function setKhuralRepresentative(uint256 arbadId, uint256 repSeatId, uint64 birthYear)',
  'function childCreatesOwnArbad(uint256 parentArbadId, uint256 childSeatId, uint256 spouseSeatId) returns (uint256 newArbadId)',
  
  // ==================== ZUN (CLAN) ====================
  
  'function formZun(string memory zunName, uint256[] memory arbadIds) returns (uint256 zunId)',
  'function setZunElder(uint256 zunId, uint256 elderSeatId)',
  
  // ==================== ORGANIZATIONAL ARBAD ====================
  
  'function createOrganizationalArbad(string memory name, uint8 orgType) returns (uint256 arbadId)',
  'function addOrgMember(uint256 arbadId, uint256 seatId)',
  'function setOrgLeader(uint256 arbadId, uint256 leaderSeatId)',
  'function createDepartment(uint256 parentOrgId, string memory deptName) returns (uint256 deptId)',
  'function formScientificCouncil(string memory name) returns (uint256 councilId)',
  
  // ==================== VIEW FUNCTIONS ====================
  
  // Family Arbad Views
  'function getFamilyArbad(uint256 arbadId) view returns (uint256 husbandSeatId, uint256 wifeSeatId, uint256[] memory childrenSeatIds, uint256 heirSeatId, uint256 zunId, uint256 khuralRepSeatId, bool isActive)',
  'function isValidKhuralRepresentative(uint256 arbadId, uint256 seatId) view returns (bool)',
  'function getKhuralRepresentatives() view returns (uint256[] memory)',
  
  // Zun Views
  'function getZun(uint256 zunId) view returns (string memory name, uint256 founderArbadId, uint256[] memory memberArbadIds, uint256 elderSeatId, bool isActive)',
  
  // Organizational Arbad Views
  'function getOrgArbad(uint256 arbadId) view returns (string memory name, uint256[] memory memberSeatIds, uint256 leaderSeatId, uint8 orgType, uint8 powerBranch, bool isActive)',
  
  // General Views
  'function getArbadTypeForSeat(uint256 seatId) view returns (uint8 arbadType, uint256 arbadId)',
  'function isEligibleForTier2(uint256 seatId) view returns (bool)',
  'function isEligibleForTier3(uint256 seatId) view returns (bool)',
  
  // State
  'function nextFamilyArbadId() view returns (uint256)',
  'function nextOrgArbadId() view returns (uint256)',
  'function nextZunId() view returns (uint256)',
  'function totalFamilyArbads() view returns (uint256)',
  'function totalOrgArbads() view returns (uint256)',
  'function scientificCouncilId() view returns (uint256)',
  
  // Mappings
  'function familyArbads(uint256 arbadId) view returns (uint256 arbadId, uint256 husbandSeatId, uint256 wifeSeatId, uint256 heirSeatId, uint256 zunId, uint256 khuralRepSeatId, uint64 khuralRepBirthYear, bool isActive, uint256 createdAt)',
  'function orgArbads(uint256 arbadId) view returns (uint256 arbadId, string memory name, uint256 leaderSeatId, uint8 orgType, uint8 powerBranch, uint256 parentOrgId, bool isActive, uint256 createdAt)',
  'function zuns(uint256 zunId) view returns (uint256 zunId, string memory name, uint256 founderArbadId, uint256 elderSeatId, bool isActive, uint256 createdAt)',
  'function seatToFamilyArbad(uint256 seatId) view returns (uint256)',
  'function seatToOrgArbad(uint256 seatId) view returns (uint256)',
  'function isMarried(uint256 seatId) view returns (bool)',
  
  // ==================== EVENTS ====================
  
  // Family Events
  'event MarriageRegistered(uint256 indexed arbadId, uint256 husbandSeatId, uint256 wifeSeatId)',
  'event ChildAdded(uint256 indexed arbadId, uint256 childSeatId)',
  'event HeirSet(uint256 indexed arbadId, uint256 heirSeatId)',
  'event HeirChanged(uint256 indexed arbadId, uint256 oldHeirSeatId, uint256 newHeirSeatId)',
  'event KhuralRepresentativeSet(uint256 indexed arbadId, uint256 repSeatId, uint64 birthYear)',
  'event ChildCreatedOwnArbad(uint256 indexed parentArbadId, uint256 indexed newArbadId, uint256 childSeatId)',
  
  // Zun Events
  'event ZunFormed(uint256 indexed zunId, string name, uint256[] arbadIds)',
  'event ArbadJoinedZun(uint256 indexed zunId, uint256 indexed arbadId)',
  'event ZunElderSet(uint256 indexed zunId, uint256 elderSeatId)',
  
  // Organizational Events
  'event OrgArbadCreated(uint256 indexed arbadId, string name, uint8 orgType, uint8 branch)',
  'event OrgMemberAdded(uint256 indexed arbadId, uint256 seatId)',
  'event OrgMemberRemoved(uint256 indexed arbadId, uint256 seatId)',
  'event OrgLeaderSet(uint256 indexed arbadId, uint256 leaderSeatId)',
  'event DepartmentCreated(uint256 indexed parentId, uint256 indexed deptId, string name)',
  
  // Scientific Council
  'event ScientificCouncilFormed(uint256 indexed councilId)',
  
  // Admin
  'event OwnerChanged(address indexed oldOwner, address indexed newOwner)',
] as const;

/**
 * Enums for ArbadCompletion
 */
export enum ArbadType {
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
