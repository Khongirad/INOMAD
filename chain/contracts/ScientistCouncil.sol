// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ScientistCouncil
 * @notice Manages scientists for the Temple of Heaven
 * @dev Scientists are nominated through Arbans and review scientific matters
 */
contract ScientistCouncil is AccessControl {
    // ============ Roles ============
    
    bytes32 public constant COUNCILOR_ROLE = keccak256("COUNCILOR_ROLE");
    bytes32 public constant ARBAN_NOMINATOR = keccak256("ARBAN_NOMINATOR");
    
    // ============ State Variables ============
    
    /// @notice Current member count
    uint256 public memberCount;
    
    /// @notice Minimum approvals needed for membership
    uint256 public constant APPROVAL_THRESHOLD = 3;
    
    /// @notice Scientist struct
    struct Scientist {
        uint256 seatId;
        bytes32 degreeHash;        // PhD/Academic degree proof
        uint256 nominatedByArbanId;
        string field;              // e.g., "Physics", "Biology"
        uint256 approvals;
        bool approved;
        uint256 nominatedAt;
        address walletAddress;
    }
    
    /// @notice Mapping of scientist ID to Scientist
    mapping(uint256 => Scientist) public scientists;
    
    /// @notice Mapping of seatId to scientist ID
    mapping(uint256 => uint256) public seatIdToScientistId;
    
    /// @notice Counter for scientist IDs
    uint256 private scientistIdCounter;
    
    /// @notice Track who approved which scientist
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    
    // ============ Events ============
    
    event ScientistNominated(
        uint256 indexed scientistId,
        uint256 indexed seatId,
        uint256 nominatedByArbanId,
        string field
    );
    
    event ScientistApproved(
        uint256 indexed scientistId,
        address indexed approver,
        uint256 totalApprovals
    );
    
    event ScientistAccepted(
        uint256 indexed scientistId,
        uint256 indexed seatId
    );
    
    event DiscoverySubmitted(
        uint256 indexed scientistId,
        bytes32 indexed discoveryHash,
        string description
    );
    
    // ============ Errors ============
    
    error AlreadyNominated();
    error NotFound();
    error AlreadyApproved();
    error NotCouncilor();
    error InsufficientApprovals();
    
    // ============ Constructor ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============ Nomination ============
    
    /**
     * @notice Nominate a scientist through Arban
     * @param seatId Seat ID of the nominee
     * @param degreeHash Hash of academic degree proof
     * @param field Scientific field
     * @param arbanId ID of nominating Arban
     * @param walletAddress Wallet address of nominee
     */
    function nominateScientist(
        uint256 seatId,
        bytes32 degreeHash,
        string calldata field,
        uint256 arbanId,
        address walletAddress
    ) external onlyRole(ARBAN_NOMINATOR) returns (uint256) {
        if (seatIdToScientistId[seatId] != 0) {
            revert AlreadyNominated();
        }
        
        scientistIdCounter++;
        uint256 scientistId = scientistIdCounter;
        
        scientists[scientistId] = Scientist({
            seatId: seatId,
            degreeHash: degreeHash,
            nominatedByArbanId: arbanId,
            field: field,
            approvals: 0,
            approved: false,
            nominatedAt: block.timestamp,
            walletAddress: walletAddress
        });
        
        seatIdToScientistId[seatId] = scientistId;
        
        emit ScientistNominated(scientistId, seatId, arbanId, field);
        
        return scientistId;
    }
    
    /**
     * @notice Approve a scientist nominee
     * @param scientistId ID of the scientist
     */
    function approveScientist(uint256 scientistId) 
        external 
        onlyRole(COUNCILOR_ROLE) 
    {
        Scientist storage scientist = scientists[scientistId];
        
        if (scientist.seatId == 0) {
            revert NotFound();
        }
        
        if (hasApproved[scientistId][msg.sender]) {
            revert AlreadyApproved();
        }
        
        hasApproved[scientistId][msg.sender] = true;
        scientist.approvals++;
        
        emit ScientistApproved(scientistId, msg.sender, scientist.approvals);
        
        // Auto-accept if threshold reached
        if (scientist.approvals >= APPROVAL_THRESHOLD && !scientist.approved) {
            scientist.approved = true;
            memberCount++;
            
            // Grant councilor role
            grantRole(COUNCILOR_ROLE, scientist.walletAddress);
            
            emit ScientistAccepted(scientistId, scientist.seatId);
        }
    }
    
    // ============ Scientific Functions ============
    
    /**
     * @notice Submit a scientific discovery
     * @param discoveryHash Hash of the discovery document
     * @param description Brief description
     */
    function submitDiscovery(
        bytes32 discoveryHash,
        string calldata description
    ) external onlyRole(COUNCILOR_ROLE) {
        // Find scientist ID by wallet
        uint256 scientistId = 0;
        for (uint256 i = 1; i <= scientistIdCounter; i++) {
            if (scientists[i].walletAddress == msg.sender) {
                scientistId = i;
                break;
            }
        }
        
        if (scientistId == 0) {
            revert NotFound();
        }
        
        emit DiscoverySubmitted(scientistId, discoveryHash, description);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get scientist details
     * @param scientistId ID of the scientist
     */
    function getScientist(uint256 scientistId) 
        external 
        view 
        returns (Scientist memory) 
    {
        Scientist memory scientist = scientists[scientistId];
        if (scientist.seatId == 0) {
            revert NotFound();
        }
        return scientist;
    }
    
    /**
     * @notice Get scientist ID by seat ID
     * @param seatId Seat ID to look up
     */
    function getScientistBySeatId(uint256 seatId) 
        external 
        view 
        returns (uint256) 
    {
        return seatIdToScientistId[seatId];
    }
    
    /**
     * @notice Check if address is a councilor
     * @param account Address to check
     */
    function isCouncilor(address account) external view returns (bool) {
        return hasRole(COUNCILOR_ROLE, account);
    }
}
