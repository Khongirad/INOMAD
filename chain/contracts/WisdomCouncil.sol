// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title WisdomCouncil
 * @notice Manages wise elders for the Temple of Heaven's ethical guidance
 * @dev Elders are nominated through Arbans based on virtue, not religious affiliation
 */
contract WisdomCouncil is AccessControl {
    // ============ Roles ============
    
    bytes32 public constant ELDER_ROLE = keccak256("ELDER_ROLE");
    bytes32 public constant ARBAN_NOMINATOR = keccak256("ARBAN_NOMINATOR");
    
    // ============ State Variables ============
    
    /// @notice Current elder count
    uint256 public elderCount;
    
    /// @notice Minimum approvals needed for membership
    uint256 public constant APPROVAL_THRESHOLD = 3;
    
    /// @notice Elder struct
    struct Elder {
        uint256 seatId;
        uint256 nominatedByArbanId;
        string virtues;            // "kind, honest, compassionate, wise"
        uint256 approvals;
        bool approved;
        uint256 joinedAt;
        address walletAddress;
    }
    
    /// @notice Mapping of elder ID to Elder
    mapping(uint256 => Elder) public elders;
    
    /// @notice Mapping of seatId to elder ID
    mapping(uint256 => uint256) public seatIdToElderId;
    
    /// @notice Counter for elder IDs
    uint256 private elderIdCounter;
    
    /// @notice Track who approved which elder
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    
    /// @notice Ethical review decisions
    struct EthicalReview {
        bytes32 documentHash;
        address reviewer;
        bool approved;
        string reasoning;
        uint256 timestamp;
    }
    
    /// @notice Mapping of document hash to review
    mapping(bytes32 => EthicalReview) public ethicalReviews;
    
    // ============ Events ============
    
    event ElderNominated(
        uint256 indexed elderId,
        uint256 indexed seatId,
        uint256 nominatedByArbanId,
        string virtues
    );
    
    event ElderApproved(
        uint256 indexed elderId,
        address indexed approver,
        uint256 totalApprovals
    );
    
    event ElderAccepted(
        uint256 indexed elderId,
        uint256 indexed seatId
    );
    
    event EthicalReviewCompleted(
        bytes32 indexed documentHash,
        address indexed reviewer,
        bool approved,
        string reasoning
    );
    
    event CulturalHeritageReviewed(
        bytes32 indexed artifactHash,
        address indexed reviewer,
        bool preserved
    );
    
    // ============ Errors ============
    
    error AlreadyNominated();
    error NotFound();
    error AlreadyApproved();
    error AlreadyReviewed();
    error NotElder();
    
    // ============ Constructor ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============ Nomination ============
    
    /**
     * @notice Nominate an elder through Arban
     * @param seatId Seat ID of the nominee
     * @param virtues Description of virtues (e.g., "kind, honest, compassionate")
     * @param arbanId ID of nominating Arban
     * @param walletAddress Wallet address of nominee
     */
    function nominateElder(
        uint256 seatId,
        string calldata virtues,
        uint256 arbanId,
        address walletAddress
    ) external onlyRole(ARBAN_NOMINATOR) returns (uint256) {
        if (seatIdToElderId[seatId] != 0) {
            revert AlreadyNominated();
        }
        
        elderIdCounter++;
        uint256 elderId = elderIdCounter;
        
        elders[elderId] = Elder({
            seatId: seatId,
            nominatedByArbanId: arbanId,
            virtues: virtues,
            approvals: 0,
            approved: false,
            joinedAt: block.timestamp,
            walletAddress: walletAddress
        });
        
        seatIdToElderId[seatId] = elderId;
        
        emit ElderNominated(elderId, seatId, arbanId, virtues);
        
        return elderId;
    }
    
    /**
     * @notice Approve an elder nominee
     * @param elderId ID of the elder
     */
    function approveElder(uint256 elderId) 
        external 
        onlyRole(ELDER_ROLE) 
    {
        Elder storage elder = elders[elderId];
        
        if (elder.seatId == 0) {
            revert NotFound();
        }
        
        if (hasApproved[elderId][msg.sender]) {
            revert AlreadyApproved();
        }
        
        hasApproved[elderId][msg.sender] = true;
        elder.approvals++;
        
        emit ElderApproved(elderId, msg.sender, elder.approvals);
        
        // Auto-accept if threshold reached
        if (elder.approvals >= APPROVAL_THRESHOLD && !elder.approved) {
            elder.approved = true;
            elder.joinedAt = block.timestamp;
            elderCount++;
            
            // Grant elder role
            grantRole(ELDER_ROLE, elder.walletAddress);
            
            emit ElderAccepted(elderId, elder.seatId);
        }
    }
    
    // ============ Ethical Review ============
    
    /**
     * @notice Perform ethical review of a document
     * @param documentHash Hash of the document
     * @param approved Whether the document is ethically sound
     * @param reasoning Explanation of the decision
     */
    function ethicalReview(
        bytes32 documentHash,
        bool approved,
        string calldata reasoning
    ) external onlyRole(ELDER_ROLE) {
        if (ethicalReviews[documentHash].timestamp != 0) {
            revert AlreadyReviewed();
        }
        
        ethicalReviews[documentHash] = EthicalReview({
            documentHash: documentHash,
            reviewer: msg.sender,
            approved: approved,
            reasoning: reasoning,
            timestamp: block.timestamp
        });
        
        emit EthicalReviewCompleted(documentHash, msg.sender, approved, reasoning);
    }
    
    /**
     * @notice Review cultural heritage artifact
     * @param artifactHash Hash of the artifact
     * @param preserved Whether to preserve the artifact
     */
    function culturalHeritageReview(
        bytes32 artifactHash,
        bool preserved
    ) external onlyRole(ELDER_ROLE) {
        emit CulturalHeritageReviewed(artifactHash, msg.sender, preserved);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get elder details
     * @param elderId ID of the elder
     */
    function getElder(uint256 elderId) 
        external 
        view 
        returns (Elder memory) 
    {
        Elder memory elder = elders[elderId];
        if (elder.seatId == 0) {
            revert NotFound();
        }
        return elder;
    }
    
    /**
     * @notice Get elder ID by seat ID
     * @param seatId Seat ID to look up
     */
    function getElderBySeatId(uint256 seatId) 
        external 
        view 
        returns (uint256) 
    {
        return seatIdToElderId[seatId];
    }
    
    /**
     * @notice Get ethical review for a document
     * @param documentHash Hash of the document
     */
    function getEthicalReview(bytes32 documentHash) 
        external 
        view 
        returns (EthicalReview memory) 
    {
        return ethicalReviews[documentHash];
    }
    
    /**
     * @notice Check if address is an elder
     * @param account Address to check
     */
    function isElder(address account) external view returns (bool) {
        return hasRole(ELDER_ROLE, account);
    }
}
