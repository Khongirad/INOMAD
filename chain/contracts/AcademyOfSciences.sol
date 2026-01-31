// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AcademyOfSciences
 * @notice Manages patents, scientific discoveries, and research grants
 * @dev Integrates with ScientistCouncil and Temple of Heaven
 */
contract AcademyOfSciences is AccessControl {
    // ============ Roles ============
    
    bytes32 public constant SCIENTIST_ROLE = keccak256("SCIENTIST_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    
    // ============ State Variables ============
    
    /// @notice ScientistCouncil contract address
    address public scientistCouncil;
    
    /// @notice Temple of Heaven contract address
    address public templeOfHeaven;
    
    /// @notice Treasury address
    address public treasury;
    
    /// @notice Patent counter
    uint256 public patentCounter;
    
    /// @notice Discovery counter
    uint256 public discoveryCounter;
    
    /// @notice Grant counter
    uint256 public grantCounter;
    
    /// @notice Minimum peer reviews required
    uint256 public constant MIN_PEER_REVIEWS = 2;
    
    // ============ Enums ============
    
    enum PatentStatus { PENDING, UNDER_REVIEW, APPROVED, REJECTED }
    enum GrantStatus { REQUESTED, APPROVED, DISBURSED, COMPLETED }
    
    // ============ Structs ============
    
    struct Patent {
        uint256 patentId;
        uint256 submitterSeatId;
        bytes32 patentHash;       // IPFS hash of patent document
        string title;
        string field;             // e.g., "Physics", "Biology"
        PatentStatus status;
        uint256 submittedAt;
        uint256 reviewedAt;
        address reviewer;
        string reviewNotes;
    }
    
    struct Discovery {
        uint256 discoveryId;
        uint256 scientistSeatId;
        bytes32 discoveryHash;
        string title;
        string description;
        uint256 timestamp;
        uint256 peerReviews;
        bool archived;            // Archived in Temple
    }
    
    struct ResearchGrant {
        uint256 grantId;
        uint256 scientistSeatId;
        string projectTitle;
        string description;
        uint256 requestedAmount;
        uint256 approvedAmount;
        GrantStatus status;
        uint256 requestedAt;
        uint256 approvedAt;
        uint256 disbursedAt;
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => Patent) public patents;
    mapping(uint256 => Discovery) public discoveries;
    mapping(uint256 => ResearchGrant) public grants;
    
    /// @notice Track peer reviews by discovery and reviewer
    mapping(uint256 => mapping(address => bool)) public hasReviewed;
    
    // ============ Events ============
    
    event PatentSubmitted(
        uint256 indexed patentId,
        uint256 indexed seatId,
        string title,
        string field
    );
    
    event PatentReviewed(
        uint256 indexed patentId,
        PatentStatus status,
        address indexed reviewer
    );
    
    event DiscoveryRegistered(
        uint256 indexed discoveryId,
        uint256 indexed seatId,
        string title
    );
    
    event DiscoveryPeerReviewed(
        uint256 indexed discoveryId,
        address indexed reviewer,
        uint256 totalReviews
    );
    
    event GrantRequested(
        uint256 indexed grantId,
        uint256 indexed seatId,
        uint256 amount
    );
    
    event GrantApproved(
        uint256 indexed grantId,
        uint256 approvedAmount
    );
    
    event GrantDisbursed(
        uint256 indexed grantId,
        uint256 amount
    );
    
    // ============ Errors ============
    
    error NotScientist();
    error NotReviewer();
    error InvalidPatent();
    error InvalidDiscovery();
    error InvalidGrant();
    error AlreadyReviewed();
    error InsufficientFunds();
    error InvalidStatus();
    
    // ============ Constructor ============
    
    constructor(
        address _scientistCouncil,
        address _templeOfHeaven,
        address _treasury
    ) {
        require(_scientistCouncil != address(0), "Invalid scientist council");
        require(_templeOfHeaven != address(0), "Invalid temple");
        require(_treasury != address(0), "Invalid treasury");
        
        scientistCouncil = _scientistCouncil;
        templeOfHeaven = _templeOfHeaven;
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============ Patent Management ============
    
    /**
     * @notice Submit a patent application
     * @param patentHash IPFS hash of patent document
     * @param title Patent title
     * @param field Scientific field
     */
    function submitPatent(
        bytes32 patentHash,
        string calldata title,
        string calldata field,
        uint256 submitterSeatId
    ) external onlyRole(SCIENTIST_ROLE) returns (uint256) {
        patentCounter++;
        uint256 patentId = patentCounter;
        
        patents[patentId] = Patent({
            patentId: patentId,
            submitterSeatId: submitterSeatId,
            patentHash: patentHash,
            title: title,
            field: field,
            status: PatentStatus.PENDING,
            submittedAt: block.timestamp,
            reviewedAt: 0,
            reviewer: address(0),
            reviewNotes: ""
        });
        
        emit PatentSubmitted(patentId, submitterSeatId, title, field);
        
        return patentId;
    }
    
    /**
     * @notice Review a patent application
     * @param patentId ID of the patent
     * @param approve Whether to approve the patent
     * @param notes Review notes
     */
    function reviewPatent(
        uint256 patentId,
        bool approve,
        string calldata notes
    ) external onlyRole(REVIEWER_ROLE) {
        Patent storage patent = patents[patentId];
        
        if (patent.patentId == 0) {
            revert InvalidPatent();
        }
        
        if (patent.status != PatentStatus.PENDING && patent.status != PatentStatus.UNDER_REVIEW) {
            revert InvalidStatus();
        }
        
        patent.status = approve ? PatentStatus.APPROVED : PatentStatus.REJECTED;
        patent.reviewedAt = block.timestamp;
        patent.reviewer = msg.sender;
        patent.reviewNotes = notes;
        
        emit PatentReviewed(patentId, patent.status, msg.sender);
    }
    
    // ============ Discovery Registration ============
    
    /**
     * @notice Register a scientific discovery
     * @param discoveryHash IPFS hash of discovery document
     * @param title Discovery title
     * @param description Brief description
     * @param scientistSeatId Scientist's seat ID
     */
    function registerDiscovery(
        bytes32 discoveryHash,
        string calldata title,
        string calldata description,
        uint256 scientistSeatId
    ) external onlyRole(SCIENTIST_ROLE) returns (uint256) {
        discoveryCounter++;
        uint256 discoveryId = discoveryCounter;
        
        discoveries[discoveryId] = Discovery({
            discoveryId: discoveryId,
            scientistSeatId: scientistSeatId,
            discoveryHash: discoveryHash,
            title: title,
            description: description,
            timestamp: block.timestamp,
            peerReviews: 0,
            archived: false
        });
        
        emit DiscoveryRegistered(discoveryId, scientistSeatId, title);
        
        return discoveryId;
    }
    
    /**
     * @notice Peer review a discovery
     * @param discoveryId ID of the discovery
     */
    function peerReviewDiscovery(uint256 discoveryId) 
        external 
        onlyRole(SCIENTIST_ROLE) 
    {
        Discovery storage discovery = discoveries[discoveryId];
        
        if (discovery.discoveryId == 0) {
            revert InvalidDiscovery();
        }
        
        if (hasReviewed[discoveryId][msg.sender]) {
            revert AlreadyReviewed();
        }
        
        hasReviewed[discoveryId][msg.sender] = true;
        discovery.peerReviews++;
        
        emit DiscoveryPeerReviewed(discoveryId, msg.sender, discovery.peerReviews);
    }
    
    // ============ Research Grants ============
    
    /**
     * @notice Request a research grant
     * @param projectTitle Title of research project
     * @param description Project description
     * @param amount Requested funding amount
     * @param scientistSeatId Scientist's seat ID
     */
    function requestGrant(
        string calldata projectTitle,
        string calldata description,
        uint256 amount,
        uint256 scientistSeatId
    ) external onlyRole(SCIENTIST_ROLE) returns (uint256) {
        grantCounter++;
        uint256 grantId = grantCounter;
        
        grants[grantId] = ResearchGrant({
            grantId: grantId,
            scientistSeatId: scientistSeatId,
            projectTitle: projectTitle,
            description: description,
            requestedAmount: amount,
            approvedAmount: 0,
            status: GrantStatus.REQUESTED,
            requestedAt: block.timestamp,
            approvedAt: 0,
            disbursedAt: 0
        });
        
        emit GrantRequested(grantId, scientistSeatId, amount);
        
        return grantId;
    }
    
    /**
     * @notice Approve a research grant
     * @param grantId ID of the grant
     * @param approvedAmount Amount approved (may be less than requested)
     */
    function approveGrant(uint256 grantId, uint256 approvedAmount) 
        external 
        onlyRole(REVIEWER_ROLE) 
    {
        ResearchGrant storage grant = grants[grantId];
        
        if (grant.grantId == 0) {
            revert InvalidGrant();
        }
        
        if (grant.status != GrantStatus.REQUESTED) {
            revert InvalidStatus();
        }
        
        grant.approvedAmount = approvedAmount;
        grant.status = GrantStatus.APPROVED;
        grant.approvedAt = block.timestamp;
        
        emit GrantApproved(grantId, approvedAmount);
    }
    
    /**
     * @notice Disburse approved grant funds
     * @param grantId ID of the grant
     */
    function disburseGrant(uint256 grantId) 
        external 
        onlyRole(TREASURER_ROLE) 
    {
        ResearchGrant storage grant = grants[grantId];
        
        if (grant.grantId == 0) {
            revert InvalidGrant();
        }
        
        if (grant.status != GrantStatus.APPROVED) {
            revert InvalidStatus();
        }
        
        if (address(this).balance < grant.approvedAmount) {
            revert InsufficientFunds();
        }
        
        grant.status = GrantStatus.DISBURSED;
        grant.disbursedAt = block.timestamp;
        
        emit GrantDisbursed(grantId, grant.approvedAmount);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get patent details
     * @param patentId ID of the patent
     */
    function getPatent(uint256 patentId) 
        external 
        view 
        returns (Patent memory) 
    {
        Patent memory patent = patents[patentId];
        if (patent.patentId == 0) {
            revert InvalidPatent();
        }
        return patent;
    }
    
    /**
     * @notice Get discovery details
     * @param discoveryId ID of the discovery
     */
    function getDiscovery(uint256 discoveryId) 
        external 
        view 
        returns (Discovery memory) 
    {
        Discovery memory discovery = discoveries[discoveryId];
        if (discovery.discoveryId == 0) {
            revert InvalidDiscovery();
        }
        return discovery;
    }
    
    /**
     * @notice Get grant details
     * @param grantId ID of the grant
     */
    function getGrant(uint256 grantId) 
        external 
        view 
        returns (ResearchGrant memory) 
    {
        ResearchGrant memory grant = grants[grantId];
        if (grant.grantId == 0) {
            revert InvalidGrant();
        }
        return grant;
    }
    
    /**
     * @notice Check if discovery has minimum peer reviews
     * @param discoveryId ID of the discovery
     */
    function hasMinimumReviews(uint256 discoveryId) 
        external 
        view 
        returns (bool) 
    {
        return discoveries[discoveryId].peerReviews >= MIN_PEER_REVIEWS;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Receive funds from treasury
     */
    receive() external payable {}
}
