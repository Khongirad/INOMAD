// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConfederativeKhural} from "./ConfederativeKhural.sol";

/**
 * @title ExecutiveChairman
 * @notice Executive branch - Chairman elected by ConfederativeKhural
 * 
 * Powers:
 * - Execute laws passed by Khural
 * - Issue executive orders / resolutions
 * - Veto laws (can be overridden by 75% Khural vote)
 * - Appoint Cabinet ministers
 * - Represent Confederation externally
 * 
 * Checks:
 * - Elected by Khural (60% vote)
 * - 2 terms maximum (4 years each)
 * - Can be impeached (66% Khural vote)
 * - Resolutions subject to judicial review
 */
contract ExecutiveChairman {
    
    /* ==================== ERRORS ==================== */
    error NotChairman();
    error NotKhural();
    error TermLimitExceeded();
    error AlreadyVetoed();
    error VetoAlreadyOverridden();
    error NotMinister();
    error InvalidCabinet();
    
    /* ==================== ENUMS ==================== */
    
    enum ResolutionType {
        ADMINISTRATIVE,     // Admin orders
        POLICY,            // Policy directives
        APPOINTMENT,       // Cabinet appointments
        EMERGENCY          // Emergency powers
    }
    
    enum ResolutionStatus {
        ACTIVE,
        EXECUTED,
        REVOKED,
        BLOCKED_BY_COURT
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct Chairman {
        address addr;
        uint256 termsServed;
        uint256 electedAt;
        uint256 termEnd;
        bool isActive;
    }
    
    struct Resolution {
        uint256 resolutionId;
        ResolutionType resType;
        ResolutionStatus status;
        address issuer;
        string title;
        bytes32 contentHash;
        uint256 issuedAt;
        uint256 expiresAt;
    }
    
    struct Veto {
        uint256 lawId;
        address chairman;
        string reason;
        uint256 vetoedAt;
        bool overridden;
    }
    
    /* ==================== CONSTANTS ==================== */
    
    uint256 public constant TERM_DURATION = 4 * 365 days;  // 4 years
    uint256 public constant MAX_TERMS = 2;
    uint256 public constant CABINET_SIZE = 12;  // 12 ministers
    
    /* ==================== STATE ==================== */
    
    address public owner;
    ConfederativeKhural public immutable khural;
    
    // Current chairman
    Chairman public currentChairman;
    
    // Resolutions
    uint256 public nextResolutionId = 1;
    mapping(uint256 => Resolution) public resolutions;
    
    // Vetoes
    mapping(uint256 => Veto) public vetoes;  // lawId => veto
    
    // Cabinet
    string[CABINET_SIZE] public cabinetPositions;
    mapping(string => address) public cabinetMinisters;  // position => minister
    uint256 public activeMinisters;
    
    /* ==================== EVENTS ==================== */
    
    event ChairmanElected(address indexed chairman, uint256 term, uint256 timestamp);
    event ChairmanImpeached(address indexed chairman, uint256 timestamp);
    event ResolutionIssued(uint256 indexed resolutionId, ResolutionType resType, string title, uint256 timestamp);
    event ResolutionRevoked(uint256 indexed resolutionId, uint256 timestamp);
    event LawVetoed(uint256 indexed lawId, address indexed chairman, string reason, uint256 timestamp);
    event VetoOverridden(uint256 indexed lawId, uint256 timestamp);
    event MinisterAppointed(string indexed position, address indexed minister, uint256 timestamp);
    event MinisterRemoved(string indexed position, address indexed minister, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotChairman();
        _;
    }
    
    modifier onlyChairman() {
        if (msg.sender != currentChairman.addr || !currentChairman.isActive) revert NotChairman();
        _;
    }
    
    modifier onlyKhural() {
        if (msg.sender != address(khural)) revert NotKhural();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(address _khural) {
        require(_khural != address(0), "Zero address");
        owner = msg.sender;
        khural = ConfederativeKhural(_khural);
        
        // Initialize cabinet positions
        _initializeCabinet();
    }
    
    function _initializeCabinet() internal {
        cabinetPositions[0] = "Defense";
        cabinetPositions[1] = "Finance";
        cabinetPositions[2] = "Foreign Affairs";
        cabinetPositions[3] = "Interior";
        cabinetPositions[4] = "Justice";
        cabinetPositions[5] = "Education";
        cabinetPositions[6] = "Healthcare";
        cabinetPositions[7] = "Infrastructure";
        cabinetPositions[8] = "Energy";
        cabinetPositions[9] = "Agriculture";
        cabinetPositions[10] = "Technology";
        cabinetPositions[11] = "Environment";
    }
    
    /* ==================== ELECTION ==================== */
    
    /**
     * @notice Elect chairman (called by Khural after 60% vote)
     */
    function electChairman(address candidate) external onlyKhural {
        // Check term limits
        if (candidate == currentChairman.addr) {
            require(currentChairman.termsServed < MAX_TERMS, "Term limit");
            currentChairman.termsServed++;
        } else {
            // New chairman
            if (currentChairman.isActive) {
                currentChairman.isActive = false;
            }
            currentChairman = Chairman({
                addr: candidate,
                termsServed: 1,
                electedAt: block.timestamp,
                termEnd: block.timestamp + TERM_DURATION,
                isActive: true
            });
        }
        
        currentChairman.electedAt = block.timestamp;
        currentChairman.termEnd = block.timestamp + TERM_DURATION;
        
        emit ChairmanElected(candidate, currentChairman.termsServed, block.timestamp);
    }
    
    /**
     * @notice Impeach chairman (called by Khural after 66% vote)
     */
    function impeachChairman() external onlyKhural {
        require(currentChairman.isActive, "No active chairman");
        
        address impeached = currentChairman.addr;
        currentChairman.isActive = false;
        
        emit ChairmanImpeached(impeached, block.timestamp);
    }
    
    /* ==================== RESOLUTIONS ==================== */
    
    /**
     * @notice Issue executive resolution
     */
    function issueResolution(
        ResolutionType resType,
        string calldata title,
        bytes32 contentHash,
        uint256 expiresAt
    ) external onlyChairman returns (uint256 resolutionId) {
        resolutionId = nextResolutionId++;
        
        resolutions[resolutionId] = Resolution({
            resolutionId: resolutionId,
            resType: resType,
            status: ResolutionStatus.ACTIVE,
            issuer: msg.sender,
            title: title,
            contentHash: contentHash,
            issuedAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        emit ResolutionIssued(resolutionId, resType, title, block.timestamp);
    }
    
    /**
     * @notice Revoke own resolution
     */
    function revokeResolution(uint256 resolutionId) external onlyChairman {
        Resolution storage res = resolutions[resolutionId];
        require(res.resolutionId != 0, "Not found");
        require(res.status == ResolutionStatus.ACTIVE, "Not active");
        
        res.status = ResolutionStatus.REVOKED;
        
        emit ResolutionRevoked(resolutionId, block.timestamp);
    }
    
    /* ==================== VETO POWER ==================== */
    
    /**
     * @notice Veto a law passed by Khural
     * @dev Can be overridden by 75% Khural vote
     */
    function vetoLaw(uint256 lawId, string calldata reason) external onlyChairman {
        require(vetoes[lawId].lawId == 0, "Already vetoed");
        
        vetoes[lawId] = Veto({
            lawId: lawId,
            chairman: msg.sender,
            reason: reason,
            vetoedAt: block.timestamp,
            overridden: false
        });
        
        emit LawVetoed(lawId, msg.sender, reason, block.timestamp);
    }
    
    /**
     * @notice Override veto (called by Khural after 75% vote)
     */
    function overrideVeto(uint256 lawId) external onlyKhural {
        Veto storage veto = vetoes[lawId];
        require(veto.lawId != 0, "No veto");
        require(!veto.overridden, "Already overridden");
        
        veto.overridden = true;
        
        emit VetoOverridden(lawId, block.timestamp);
    }
    
    /* ==================== CABINET ==================== */
    
    /**
     * @notice Appoint cabinet minister
     */
    function appointMinister(string calldata position, address minister) external onlyChairman {
        require(minister != address(0), "Zero address");
        require(_isValidPosition(position), "Invalid position");
        
        // Remove previous minister if exists
        address prev = cabinetMinisters[position];
        if (prev != address(0)) {
            emit MinisterRemoved(position, prev, block.timestamp);
            activeMinisters--;
        }
        
        cabinetMinisters[position] = minister;
        activeMinisters++;
        
        emit MinisterAppointed(position, minister, block.timestamp);
    }
    
    /**
     * @notice Remove cabinet minister
     */
    function removeMinister(string calldata position) external onlyChairman {
        require(_isValidPosition(position), "Invalid position");
        
        address minister = cabinetMinisters[position];
        require(minister != address(0), "No minister");
        
        cabinetMinisters[position] = address(0);
        activeMinisters--;
        
        emit MinisterRemoved(position, minister, block.timestamp);
    }
    
    function _isValidPosition(string memory position) internal view returns (bool) {
        for (uint256 i = 0; i < CABINET_SIZE; i++) {
            if (keccak256(bytes(cabinetPositions[i])) == keccak256(bytes(position))) {
                return true;
            }
        }
        return false;
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getChairmanInfo() external view returns (
        address addr,
        uint256 termsServed,
        uint256 electedAt,
        uint256 termEnd,
        bool isActive,
        bool termExpired
    ) {
        return (
            currentChairman.addr,
            currentChairman.termsServed,
            currentChairman.electedAt,
            currentChairman.termEnd,
            currentChairman.isActive,
            block.timestamp > currentChairman.termEnd
        );
    }
    
    function getResolution(uint256 resolutionId) external view returns (
        ResolutionType resType,
        ResolutionStatus status,
        address issuer,
        string memory title,
        bytes32 contentHash,
        uint256 issuedAt,
        uint256 expiresAt
    ) {
        Resolution storage res = resolutions[resolutionId];
        return (
            res.resType,
            res.status,
            res.issuer,
            res.title,
            res.contentHash,
            res.issuedAt,
            res.expiresAt
        );
    }
    
    function getVeto(uint256 lawId) external view returns (
        address chairman,
        string memory reason,
        uint256 vetoedAt,
        bool overridden
    ) {
        Veto storage veto = vetoes[lawId];
        return (
            veto.chairman,
            veto.reason,
            veto.vetoedAt,
            veto.overridden
        );
    }
    
    function getCabinetMinister(string calldata position) external view returns (address) {
        return cabinetMinisters[position];
    }
    
    function isCabinetFull() external view returns (bool) {
        return activeMinisters == CABINET_SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
