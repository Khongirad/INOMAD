// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ArbanCompletion
 * @notice Two-Type Arban System: Family (Legislative) + Organizational (Executive/Judicial/Banking)
 * 
 * FAMILY ARBAN (Семейный Арбан):
 * - Legislative Power only (Khural)
 * - Requires MARRIAGE to create (single persons cannot)
 * - Members: Husband, Wife, Children (unlimited)
 * - Inheritance: Youngest child inherits by default (can be changed)
 * - Zun (Clan): Formed by sibling Arbans
 * - Khural: ONE representative per family (husband OR wife)
 * - Age Limit: Representatives serve until age 60
 * 
 * ORGANIZATIONAL ARBAN (Организационный Арбан):
 * - Executive Branch (President, Government, Scientific Council/Education)
 * - Judicial Branch (Courts) 
 * - Banking Branch (Central Bank, Commercial Banks)
 * - Companies (Private, State)
 * - Guilds (Professional associations - one person, one guild)
 * - Scientific Council (Temple of Heaven) - Part of Executive/Education, autonomous, follows law
 * - Scaling: 10 → 100 → 1,000 → 10,000 → Nation Khural → Ekhe Khural (Confederation)
 * 
 * POWER STRUCTURE (4 BRANCHES WITH CHECKS AND BALANCES):
 * 1. KHURAL (Legislative) - FOUNDATION OF STATE (like US Senate)
 *    - Families decide how to live
 *    - People monitor President through Khural
 *    - Chairman of the Khural leads national legislature
 * 
 * 2. PRESIDENT (Executive) - EXECUTOR
 *    - Implements external and internal policy
 *    - Monitored by people through Khural
 *    - Scientific Council (education) under Executive
 * 
 * 3. JUDICIARY - Courts, law enforcement
 * 
 * 4. BANKING - Central Bank (sets monetary policy), commercial banks
 * 
 * EKHE KHURAL (BIG KHURAL):
 * - 10 representatives led by Chairman of the Khural
 * - Meet with leaders of other Siberian Confederation states
 * - Decide global agenda and coordination (like EU or UN)
 */
contract ArbanCompletion {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error ZeroAddress();
    error InvalidArbanId();
    error ArbanFull();
    error NotArbanMember();
    error AlreadyInArban();
    error NotMarried();
    error AlreadyHasFamilyArban();
    error LeaderAlreadySet();
    error InvalidRepresentative();
    error AlreadyInZun();
    error ZunNotActive();
    error TooOldForKhural();  // Over 60 years old
    error NotParent();
    
    /* ==================== ENUMS ==================== */
    
    enum ArbanType {
        NONE,
        FAMILY,           // Семейный - для Хурала (Legislative)
        ORGANIZATIONAL    // Организационный - Executive/Judicial/Banking
    }
    
    enum OrganizationType {
        NONE,
        EXECUTIVE,           // Executive branch (President office)
        JUDICIAL,            // Courts
        BANKING,             // Banks
        PRIVATE_COMPANY,     // Private business
        STATE_COMPANY,       // State enterprise
        GUILD,               // Professional guild
        SCIENTIFIC_COUNCIL,  // Temple of Heaven - Part of Executive (Education)
        EKHE_KHURAL         // Big Khural - 10 reps for confederation coordination
    }
    
    enum PowerBranch {
        NONE,
        LEGISLATIVE,      // Khural - Family Arbans ONLY
        EXECUTIVE,        // President - Organizational ONLY
        JUDICIAL,         // Courts - Organizational ONLY
        BANKING           // Banks - Organizational ONLY
    }
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant MAX_ORG_MEMBERS = 100;
    uint256 public constant INITIAL_ORG_SIZE = 10;
    uint256 public constant KHURAL_AGE_LIMIT = 60;  // Max age for Khural representative
    
    /* ==================== STATE ==================== */
    address public owner;
    
    // =============
    // FAMILY ARBAN
    // =============
    struct FamilyArban {
        uint256 arbanId;
        uint256 husbandSeatId;          // Муж
        uint256 wifeSeatId;             // Жена
        uint256[] childrenSeatIds;      // Дети (неограниченно)
        uint256 heirSeatId;             // Наследник (по умолчанию младший, можно изменить)
        uint256 zunId;                  // ID клана (если часть Зун)
        uint256 khuralRepSeatId;        // Представитель в Хурале (муж ИЛИ жена)
        uint64 khuralRepBirthYear;      // Год рождения представителя (для проверки 60 лет)
        bool isActive;
        uint256 createdAt;
    }
    
    mapping(uint256 => FamilyArban) public familyArbans;
    mapping(uint256 => uint256) public seatToFamilyArban;  // seatId => familyArbanId
    mapping(uint256 => bool) public isMarried;             // seatId => is married
    uint256 public nextFamilyArbanId = 1;
    uint256 public totalFamilyArbans;
    
    // =============
    // ZUN (CLAN)
    // =============
    struct Zun {
        uint256 zunId;
        string name;                        // Название клана
        uint256 founderArbanId;             // Исходный семейный Арбан
        uint256[] memberArbanIds;           // Все семейные Арбаны в клане
        uint256 elderSeatId;                // Старейшина клана
        bool isActive;
        uint256 createdAt;
    }
    
    mapping(uint256 => Zun) public zuns;
    uint256 public nextZunId = 1;
    
    // =============
    // ORGANIZATIONAL ARBAN
    // =============
    struct OrganizationalArban {
        uint256 arbanId;
        string name;                        // Название организации
        uint256[] memberSeatIds;            // Члены (до MAX_ORG_MEMBERS)
        uint256 leaderSeatId;               // Руководитель
        OrganizationType orgType;
        PowerBranch powerBranch;
        uint256 parentOrgId;                // Для отделов (0 = корневой)
        bool isActive;
        uint256 createdAt;
    }
    
    mapping(uint256 => OrganizationalArban) public orgArbans;
    mapping(uint256 => uint256) public seatToOrgArban;     // seatId => orgArbanId
    uint256 public nextOrgArbanId = 1;
    uint256 public totalOrgArbans;
    
    // Scientific Council (Temple of Heaven)
    uint256 public scientificCouncilId;
    
    /* ==================== EVENTS ==================== */
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    
    // Family Events
    event MarriageRegistered(uint256 indexed arbanId, uint256 husbandSeatId, uint256 wifeSeatId);
    event ChildAdded(uint256 indexed arbanId, uint256 childSeatId);
    event HeirSet(uint256 indexed arbanId, uint256 heirSeatId);
    event HeirChanged(uint256 indexed arbanId, uint256 oldHeirSeatId, uint256 newHeirSeatId);
    event KhuralRepresentativeSet(uint256 indexed arbanId, uint256 repSeatId, uint64 birthYear);
    event ChildCreatedOwnArban(uint256 indexed parentArbanId, uint256 indexed newArbanId, uint256 childSeatId);
    
    // Zun Events
    event ZunFormed(uint256 indexed zunId, string name, uint256[] arbanIds);
    event ArbanJoinedZun(uint256 indexed zunId, uint256 indexed arbanId);
    event ZunElderSet(uint256 indexed zunId, uint256 elderSeatId);
    
    // Organizational Events
    event OrgArbanCreated(uint256 indexed arbanId, string name, OrganizationType orgType, PowerBranch branch);
    event OrgMemberAdded(uint256 indexed arbanId, uint256 seatId);
    event OrgMemberRemoved(uint256 indexed arbanId, uint256 seatId);
    event OrgLeaderSet(uint256 indexed arbanId, uint256 leaderSeatId);
    event DepartmentCreated(uint256 indexed parentId, uint256 indexed deptId, string name);
    
    // Scientific Council
    event ScientificCouncilFormed(uint256 indexed councilId);
    
    /* ==================== MODIFIERS ==================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    constructor() {
        owner = msg.sender;
    }
    
    // =====================================================
    // FAMILY ARBAN FUNCTIONS (Legislative/Khural)
    // =====================================================
    
    /**
     * @notice Create Family Arban through marriage
     * @dev Requires both parties to be unmarried. Only married couples can participate in Khural.
     * @param husbandSeatId Seat ID of husband
     * @param wifeSeatId Seat ID of wife
     */
    function registerMarriage(
        uint256 husbandSeatId,
        uint256 wifeSeatId
    ) external returns (uint256 arbanId) {
        if (husbandSeatId == 0 || wifeSeatId == 0) revert ZeroAddress();
        if (isMarried[husbandSeatId] || isMarried[wifeSeatId]) revert AlreadyHasFamilyArban();
        
        arbanId = nextFamilyArbanId++;
        
        FamilyArban storage arban = familyArbans[arbanId];
        arban.arbanId = arbanId;
        arban.husbandSeatId = husbandSeatId;
        arban.wifeSeatId = wifeSeatId;
        arban.isActive = true;
        arban.createdAt = block.timestamp;
        
        // Mark as married
        isMarried[husbandSeatId] = true;
        isMarried[wifeSeatId] = true;
        
        // Link to family Arban
        seatToFamilyArban[husbandSeatId] = arbanId;
        seatToFamilyArban[wifeSeatId] = arbanId;
        
        totalFamilyArbans++;
        
        emit MarriageRegistered(arbanId, husbandSeatId, wifeSeatId);
    }
    
    /**
     * @notice Add child to Family Arban
     * @param arbanId Family Arban ID
     * @param childSeatId Child's seat ID
     */
    function addChild(uint256 arbanId, uint256 childSeatId) external {
        FamilyArban storage arban = familyArbans[arbanId];
        if (!arban.isActive) revert InvalidArbanId();
        if (childSeatId == 0) revert ZeroAddress();
        
        arban.childrenSeatIds.push(childSeatId);
        seatToFamilyArban[childSeatId] = arbanId;
        
        // By default, newest child becomes heir (youngest)
        arban.heirSeatId = childSeatId;
        
        emit ChildAdded(arbanId, childSeatId);
        emit HeirSet(arbanId, childSeatId);
    }
    
    /**
     * @notice Set Khural representative (husband OR wife only)
     * @dev Only one representative per family allowed in Khural. Representative serves until age 60.
     * @param arbanId Family Arban ID
     * @param repSeatId Representative seat ID (must be husband or wife)
     * @param birthYear Birth year of representative (for age verification)
     */
    function setKhuralRepresentative(
        uint256 arbanId,
        uint256 repSeatId,
        uint64 birthYear
    ) external {
        FamilyArban storage arban = familyArbans[arbanId];
        if (!arban.isActive) revert InvalidArbanId();
        
        // Must be husband OR wife
        if (repSeatId != arban.husbandSeatId && repSeatId != arban.wifeSeatId) {
            revert InvalidRepresentative();
        }
        
        // Check age limit (must be under 60)
        uint64 currentYear = uint64(block.timestamp / 365 days + 1970);
        if (currentYear - birthYear >= KHURAL_AGE_LIMIT) {
            revert TooOldForKhural();
        }
        
        arban.khuralRepSeatId = repSeatId;
        arban.khuralRepBirthYear = birthYear;
        
        emit KhuralRepresentativeSet(arbanId, repSeatId, birthYear);
    }
    
    /**
     * @notice Change heir to another child
     * @dev Parents can change heir from youngest to any other child
     * @param arbanId Family Arban ID
     * @param newHeirSeatId New heir's seat ID (must be a child)
     */
    function changeHeir(uint256 arbanId, uint256 newHeirSeatId) external {
        FamilyArban storage arban = familyArbans[arbanId];
        if (!arban.isActive) revert InvalidArbanId();
        
        // Verify newHeir is a child
        bool isChild = false;
        for (uint256 i = 0; i < arban.childrenSeatIds.length; i++) {
            if (arban.childrenSeatIds[i] == newHeirSeatId) {
                isChild = true;
                break;
            }
        }
        if (!isChild) revert NotParent();
        
        uint256 oldHeir = arban.heirSeatId;
        arban.heirSeatId = newHeirSeatId;
        
        emit HeirChanged(arbanId, oldHeir, newHeirSeatId);
    }
    
    /**
     * @notice Elder child creates own Arban when marrying
     * @dev Elder children create own Arbans; youngest inherits parent Arban
     * @param parentArbanId Parent's Family Arban ID
     * @param childSeatId Elder child's seat ID
     * @param spouseSeatId Spouse's seat ID
     */
    function childCreatesOwnArban(
        uint256 parentArbanId,
        uint256 childSeatId,
        uint256 spouseSeatId
    ) external returns (uint256 newArbanId) {
        FamilyArban storage parentArban = familyArbans[parentArbanId];
        if (!parentArban.isActive) revert InvalidArbanId();
        
        // Child must be in parent's Arban
        bool isChild = false;
        for (uint256 i = 0; i < parentArban.childrenSeatIds.length; i++) {
            if (parentArban.childrenSeatIds[i] == childSeatId) {
                isChild = true;
                break;
            }
        }
        if (!isChild) revert NotArbanMember();
        
        // Create new Family Arban for child
        newArbanId = nextFamilyArbanId++;
        
        FamilyArban storage newArban = familyArbans[newArbanId];
        newArban.arbanId = newArbanId;
        newArban.husbandSeatId = childSeatId;  // Assuming child is husband; swap if needed
        newArban.wifeSeatId = spouseSeatId;
        newArban.isActive = true;
        newArban.createdAt = block.timestamp;
        
        // Mark as married
        isMarried[childSeatId] = true;
        isMarried[spouseSeatId] = true;
        
        // Link to new Arban
        seatToFamilyArban[childSeatId] = newArbanId;
        seatToFamilyArban[spouseSeatId] = newArbanId;
        
        totalFamilyArbans++;
        
        emit ChildCreatedOwnArban(parentArbanId, newArbanId, childSeatId);
        emit MarriageRegistered(newArbanId, childSeatId, spouseSeatId);
    }
    
    // =====================================================
    // ZUN (CLAN) FUNCTIONS
    // =====================================================
    
    /**
     * @notice Form Zun (Clan) from sibling Family Arbans
     * @dev Brothers/sisters with own Arbans form a Zun
     * @param zunName Clan name
     * @param arbanIds Family Arban IDs to include
     */
    function formZun(
        string memory zunName,
        uint256[] memory arbanIds
    ) external returns (uint256 zunId) {
        require(arbanIds.length >= 2, "Need at least 2 Arbans for Zun");
        
        zunId = nextZunId++;
        
        Zun storage zun = zuns[zunId];
        zun.zunId = zunId;
        zun.name = zunName;
        zun.founderArbanId = arbanIds[0];
        zun.isActive = true;
        zun.createdAt = block.timestamp;
        
        for (uint256 i = 0; i < arbanIds.length; i++) {
            FamilyArban storage arban = familyArbans[arbanIds[i]];
            if (!arban.isActive) revert InvalidArbanId();
            if (arban.zunId != 0) revert AlreadyInZun();
            
            arban.zunId = zunId;
            zun.memberArbanIds.push(arbanIds[i]);
        }
        
        emit ZunFormed(zunId, zunName, arbanIds);
    }
    
    /**
     * @notice Set Zun elder (clan representative)
     * @param zunId Zun ID
     * @param elderSeatId Elder's seat ID
     */
    function setZunElder(uint256 zunId, uint256 elderSeatId) external {
        Zun storage zun = zuns[zunId];
        if (!zun.isActive) revert ZunNotActive();
        
        zun.elderSeatId = elderSeatId;
        
        emit ZunElderSet(zunId, elderSeatId);
    }
    
    // =====================================================
    // ORGANIZATIONAL ARBAN FUNCTIONS 
    // =====================================================
    
    /**
     * @notice Create Organizational Arban (company, government, guild, etc.)
     * @param name Organization name
     * @param orgType Type of organization
     */
    function createOrganizationalArban(
        string memory name,
        OrganizationType orgType
    ) external returns (uint256 arbanId) {
        arbanId = nextOrgArbanId++;
        
        // Determine power branch based on org type
        PowerBranch branch = _getPowerBranch(orgType);
        
        OrganizationalArban storage arban = orgArbans[arbanId];
        arban.arbanId = arbanId;
        arban.name = name;
        arban.orgType = orgType;
        arban.powerBranch = branch;
        arban.isActive = true;
        arban.createdAt = block.timestamp;
        
        totalOrgArbans++;
        
        emit OrgArbanCreated(arbanId, name, orgType, branch);
    }
    
    /**
     * @notice Add member to Organizational Arban
     */
    function addOrgMember(uint256 arbanId, uint256 seatId) external {
        OrganizationalArban storage arban = orgArbans[arbanId];
        if (!arban.isActive) revert InvalidArbanId();
        if (arban.memberSeatIds.length >= MAX_ORG_MEMBERS) revert ArbanFull();
        
        arban.memberSeatIds.push(seatId);
        seatToOrgArban[seatId] = arbanId;
        
        emit OrgMemberAdded(arbanId, seatId);
    }
    
    /**
     * @notice Set leader/manager of Organizational Arban
     */
    function setOrgLeader(uint256 arbanId, uint256 leaderSeatId) external {
        OrganizationalArban storage arban = orgArbans[arbanId];
        if (!arban.isActive) revert InvalidArbanId();
        if (arban.leaderSeatId != 0) revert LeaderAlreadySet();
        
        arban.leaderSeatId = leaderSeatId;
        
        emit OrgLeaderSet(arbanId, leaderSeatId);
    }
    
    /**
     * @notice Create department under parent organization
     */
    function createDepartment(
        uint256 parentOrgId,
        string memory deptName
    ) external returns (uint256 deptId) {
        OrganizationalArban storage parent = orgArbans[parentOrgId];
        if (!parent.isActive) revert InvalidArbanId();
        
        deptId = nextOrgArbanId++;
        
        OrganizationalArban storage dept = orgArbans[deptId];
        dept.arbanId = deptId;
        dept.name = deptName;
        dept.orgType = parent.orgType;
        dept.powerBranch = parent.powerBranch;
        dept.parentOrgId = parentOrgId;
        dept.isActive = true;
        dept.createdAt = block.timestamp;
        
        totalOrgArbans++;
        
        emit DepartmentCreated(parentOrgId, deptId, deptName);
    }
    
    /**
     * @notice Create Scientific Council (Temple of Heaven)
     * @dev Stores knowledge, DNA, history, all civilization wisdom
     */
    function formScientificCouncil(
        string memory name
    ) external returns (uint256 councilId) {
        require(scientificCouncilId == 0, "Scientific Council already exists");
        
        councilId = nextOrgArbanId++;
        
        OrganizationalArban storage council = orgArbans[councilId];
        council.arbanId = councilId;
        council.name = name;
        council.orgType = OrganizationType.SCIENTIFIC_COUNCIL;
        council.powerBranch = PowerBranch.EXECUTIVE; // Part of Executive (Education)
        council.isActive = true;
        council.createdAt = block.timestamp;
        
        scientificCouncilId = councilId;
        totalOrgArbans++;
        
        emit ScientificCouncilFormed(councilId);
        emit OrgArbanCreated(councilId, name, OrganizationType.SCIENTIFIC_COUNCIL, PowerBranch.EXECUTIVE);
    }
    
    // =====================================================
    // INTERNAL FUNCTIONS
    // =====================================================
    
    function _getPowerBranch(OrganizationType orgType) internal pure returns (PowerBranch) {
        if (orgType == OrganizationType.EXECUTIVE) return PowerBranch.EXECUTIVE;
        if (orgType == OrganizationType.JUDICIAL) return PowerBranch.JUDICIAL;
        if (orgType == OrganizationType.BANKING) return PowerBranch.BANKING;
        if (orgType == OrganizationType.PRIVATE_COMPANY) return PowerBranch.EXECUTIVE;
        if (orgType == OrganizationType.STATE_COMPANY) return PowerBranch.EXECUTIVE;
        if (orgType == OrganizationType.GUILD) return PowerBranch.EXECUTIVE;
        if (orgType == OrganizationType.SCIENTIFIC_COUNCIL) return PowerBranch.EXECUTIVE; // Education system
        if (orgType == OrganizationType.EKHE_KHURAL) return PowerBranch.LEGISLATIVE; // Confederation
        return PowerBranch.NONE;
    }
    
    // =====================================================
    // VIEW FUNCTIONS
    // =====================================================
    
    /**
     * @notice Check if seat has valid Khural representation
     */
    function isValidKhuralRepresentative(uint256 arbanId, uint256 seatId) public view returns (bool) {
        FamilyArban storage arban = familyArbans[arbanId];
        if (!arban.isActive) return false;
        return (seatId == arban.husbandSeatId || seatId == arban.wifeSeatId);
    }
    
    /**
     * @notice Get all Khural representatives
     */
    function getKhuralRepresentatives() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextFamilyArbanId; i++) {
            if (familyArbans[i].isActive && familyArbans[i].khuralRepSeatId != 0) {
                count++;
            }
        }
        
        uint256[] memory reps = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i < nextFamilyArbanId; i++) {
            if (familyArbans[i].isActive && familyArbans[i].khuralRepSeatId != 0) {
                reps[idx++] = familyArbans[i].khuralRepSeatId;
            }
        }
        
        return reps;
    }
    
    /**
     * @notice Get Family Arban details
     */
    function getFamilyArban(uint256 arbanId) external view returns (
        uint256 husbandSeatId,
        uint256 wifeSeatId,
        uint256[] memory childrenSeatIds,
        uint256 heirSeatId,
        uint256 zunId,
        uint256 khuralRepSeatId,
        bool isActive
    ) {
        FamilyArban storage arban = familyArbans[arbanId];
        return (
            arban.husbandSeatId,
            arban.wifeSeatId,
            arban.childrenSeatIds,
            arban.heirSeatId,
            arban.zunId,
            arban.khuralRepSeatId,
            arban.isActive
        );
    }
    
    /**
     * @notice Get Organizational Arban details
     */
    function getOrgArban(uint256 arbanId) external view returns (
        string memory name,
        uint256[] memory memberSeatIds,
        uint256 leaderSeatId,
        OrganizationType orgType,
        PowerBranch powerBranch,
        bool isActive
    ) {
        OrganizationalArban storage arban = orgArbans[arbanId];
        return (
            arban.name,
            arban.memberSeatIds,
            arban.leaderSeatId,
            arban.orgType,
            arban.powerBranch,
            arban.isActive
        );
    }
    
    /**
     * @notice Get Zun (Clan) details
     */
    function getZun(uint256 zunId) external view returns (
        string memory name,
        uint256 founderArbanId,
        uint256[] memory memberArbanIds,
        uint256 elderSeatId,
        bool isActive
    ) {
        Zun storage zun = zuns[zunId];
        return (
            zun.name,
            zun.founderArbanId,
            zun.memberArbanIds,
            zun.elderSeatId,
            zun.isActive
        );
    }
    
    /**
     * @notice Get Arban type for seat
     */
    function getArbanTypeForSeat(uint256 seatId) external view returns (
        ArbanType arbanType,
        uint256 arbanId
    ) {
        if (seatToFamilyArban[seatId] != 0) {
            return (ArbanType.FAMILY, seatToFamilyArban[seatId]);
        }
        if (seatToOrgArban[seatId] != 0) {
            return (ArbanType.ORGANIZATIONAL, seatToOrgArban[seatId]);
        }
        return (ArbanType.NONE, 0);
    }
    
    /**
     * @notice Check tier eligibility based on Arban type
     * @dev Family: Tier 2 = has children, Tier 3 = married (Khural rep can be set)
     * @dev Org: Tier 2 = 10+ members, Tier 3 = leader set
     */
    function isEligibleForTier2(uint256 seatId) external view returns (bool) {
        uint256 familyId = seatToFamilyArban[seatId];
        if (familyId != 0) {
            // Family: Eligible when has children
            return familyArbans[familyId].childrenSeatIds.length > 0;
        }
        
        uint256 orgId = seatToOrgArban[seatId];
        if (orgId != 0) {
            // Org: Eligible when 10+ members
            return orgArbans[orgId].memberSeatIds.length >= INITIAL_ORG_SIZE;
        }
        
        return false;
    }
    
    function isEligibleForTier3(uint256 seatId) external view returns (bool) {
        uint256 familyId = seatToFamilyArban[seatId];
        if (familyId != 0) {
            // Family: Eligible when married (Khural rep CAN be set, children not required)
            FamilyArban storage arban = familyArbans[familyId];
            return arban.isActive;  // Marriage exists = eligible for Khural
        }
        
        uint256 orgId = seatToOrgArban[seatId];
        if (orgId != 0) {
            // Org: Eligible when leader is set
            return orgArbans[orgId].leaderSeatId != 0;
        }
        
        return false;
    }
    
    /* ==================== ADMIN ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
