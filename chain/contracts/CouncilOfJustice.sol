// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CouncilOfJustice
 * @notice Manages legal system, judicial cases, and legal precedents
 * @dev Integrates with Temple of Heaven for archiving court rulings
 */
contract CouncilOfJustice is AccessControl {
    // ============ Roles ============
    
    bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");
    bytes32 public constant ARBAN_NOMINATOR = keccak256("ARBAN_NOMINATOR");
    bytes32 public constant CLERK_ROLE = keccak256("CLERK_ROLE");
    
    // ============ State Variables ============
    
    /// @notice Temple of Heaven contract address
    address public templeOfHeaven;
    
    /// @notice Approval threshold for member nomination
    uint256 public constant APPROVAL_THRESHOLD = 3;
    
    /// @notice Member counter
    uint256 public memberCounter;
    
    /// @notice Case counter
    uint256 public caseCounter;
    
    /// @notice Precedent counter
    uint256 public precedentCounter;
    
    // ============ Enums ============
    
    enum CaseStatus { PENDING, ASSIGNED, UNDER_REVIEW, RULED, APPEALED, CLOSED }
    enum RulingType { CIVIL, CRIMINAL, ADMINISTRATIVE }
    
    // ============ Structs ============
    
    struct Member {
        uint256 memberId;
        uint256 seatId;
        bytes32 legalEducationHash;  // Proof of law degree
        uint256 nominatedByArbanId;
        string specialization;        // "Civil Law", "Criminal Law", etc.
        uint256 approvals;
        bool approved;
        address walletAddress;
        uint256 casesHandled;
        uint256 nominatedAt;
    }
    
    struct JudicialCase {
        uint256 caseId;
        uint256 plaintiffSeatId;
        uint256 defendantSeatId;
        bytes32 caseHash;            // IPFS hash of case documents
        string description;
        RulingType rulingType;
        CaseStatus status;
        address assignedJudge;
        bytes32 rulingHash;          // IPFS hash of ruling
        string ruling;
        uint256 filedAt;
        uint256 ruledAt;
    }
    
    struct LegalPrecedent {
        uint256 precedentId;
        uint256 sourceCaseId;        // Case that created this precedent
        bytes32 precedentHash;
        string summary;
        string legalPrinciple;
        address judge;
        bool archived;               // Archived in Temple
        uint256 createdAt;
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => Member) public members;
    mapping(uint256 => JudicialCase) public cases;
    mapping(uint256 => LegalPrecedent) public precedents;
    
    /// @notice Mapping of seatId to member ID
    mapping(uint256 => uint256) public seatIdToMemberId;
    
    /// @notice Track who approved which member
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    
    // ============ Events ============
    
    event MemberNominated(
        uint256 indexed memberId,
        uint256 indexed seatId,
        string specialization
    );
    
    event MemberApproved(
        uint256 indexed memberId,
        address indexed approver,
        uint256 totalApprovals
    );
    
    event MemberAccepted(
        uint256 indexed memberId,
        uint256 indexed seatId
    );
    
    event CaseFiled(
        uint256 indexed caseId,
        uint256 plaintiffSeatId,
        uint256 defendantSeatId,
        RulingType rulingType
    );
    
    event CaseAssigned(
        uint256 indexed caseId,
        address indexed judge
    );
    
    event CaseRuled(
        uint256 indexed caseId,
        bytes32 rulingHash
    );
    
    event PrecedentRegistered(
        uint256 indexed precedentId,
        uint256 indexed sourceCaseId,
        address indexed judge
    );
    
    // ============ Errors ============
    
    error AlreadyNominated();
    error NotFound();
    error AlreadyApproved();
    error InvalidCase();
    error CaseAlreadyAssigned();
    error CaseNotAssigned();
    error NotAssignedJudge();
    error InvalidStatus();
    
    // ============ Constructor ============
    
    constructor(address _templeOfHeaven) {
        require(_templeOfHeaven != address(0), "Invalid temple address");
        
        templeOfHeaven = _templeOfHeaven;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============ Member Management ============
    
    /**
     * @notice Nominate a member for Council of Justice
     * @param seatId Seat ID of the nominee
     * @param legalEducationHash Hash of legal education proof
     * @param specialization Legal specialization
     * @param arbanId ID of nominating Arban
     * @param walletAddress Wallet address of nominee
     */
    function nominateMember(
        uint256 seatId,
        bytes32 legalEducationHash,
        string calldata specialization,
        uint256 arbanId,
        address walletAddress
    ) external onlyRole(ARBAN_NOMINATOR) returns (uint256) {
        if (seatIdToMemberId[seatId] != 0) {
            revert AlreadyNominated();
        }
        
        memberCounter++;
        uint256 memberId = memberCounter;
        
        members[memberId] = Member({
            memberId: memberId,
            seatId: seatId,
            legalEducationHash: legalEducationHash,
            nominatedByArbanId: arbanId,
            specialization: specialization,
            approvals: 0,
            approved: false,
            walletAddress: walletAddress,
            casesHandled: 0,
            nominatedAt: block.timestamp
        });
        
        seatIdToMemberId[seatId] = memberId;
        
        emit MemberNominated(memberId, seatId, specialization);
        
        return memberId;
    }
    
    /**
     * @notice Approve a member nominee
     * @param memberId ID of the member
     */
    function approveMember(uint256 memberId) 
        external 
        onlyRole(JUDGE_ROLE) 
    {
        Member storage member = members[memberId];
        
        if (member.memberId == 0) {
            revert NotFound();
        }
        
        if (hasApproved[memberId][msg.sender]) {
            revert AlreadyApproved();
        }
        
        hasApproved[memberId][msg.sender] = true;
        member.approvals++;
        
        emit MemberApproved(memberId, msg.sender, member.approvals);
        
        // Auto-accept if threshold reached
        if (member.approvals >= APPROVAL_THRESHOLD && !member.approved) {
            member.approved = true;
            
            // Grant judge role using internal function to bypass AccessControl check
            _grantRole(JUDGE_ROLE, member.walletAddress);
            
            emit MemberAccepted(memberId, member.seatId);
        }
    }

    
    // ============ Judicial Cases ============
    
    /**
     * @notice File a new judicial case
     * @param plaintiffSeatId Seat ID of plaintiff
     * @param defendantSeatId Seat ID of defendant
     * @param caseHash IPFS hash of case documents
     * @param description Case description
     * @param rulingType Type of ruling (CIVIL, CRIMINAL, ADMINISTRATIVE)
     */
    function fileCase(
        uint256 plaintiffSeatId,
        uint256 defendantSeatId,
        bytes32 caseHash,
        string calldata description,
        RulingType rulingType
    ) external returns (uint256) {
        caseCounter++;
        uint256 caseId = caseCounter;
        
        cases[caseId] = JudicialCase({
            caseId: caseId,
            plaintiffSeatId: plaintiffSeatId,
            defendantSeatId: defendantSeatId,
            caseHash: caseHash,
            description: description,
            rulingType: rulingType,
            status: CaseStatus.PENDING,
            assignedJudge: address(0),
            rulingHash: bytes32(0),
            ruling: "",
            filedAt: block.timestamp,
            ruledAt: 0
        });
        
        emit CaseFiled(caseId, plaintiffSeatId, defendantSeatId, rulingType);
        
        return caseId;
    }
    
    /**
     * @notice Assign a case to a judge
     * @param caseId ID of the case
     * @param judge Address of the judge
     */
    function assignCase(uint256 caseId, address judge) 
        external 
        onlyRole(CLERK_ROLE) 
    {
        JudicialCase storage judicialCase = cases[caseId];
        
        if (judicialCase.caseId == 0) {
            revert InvalidCase();
        }
        
        if (judicialCase.assignedJudge != address(0)) {
            revert CaseAlreadyAssigned();
        }
        
        if (!hasRole(JUDGE_ROLE, judge)) {
            revert NotFound();
        }
        
        judicialCase.assignedJudge = judge;
        judicialCase.status = CaseStatus.ASSIGNED;
        
        emit CaseAssigned(caseId, judge);
    }
    
    /**
     * @notice Rule on a case
     * @param caseId ID of the case
     * @param rulingHash IPFS hash of ruling document
     * @param rulingText Text of the ruling
     */
    function ruleOnCase(
        uint256 caseId,
        bytes32 rulingHash,
        string calldata rulingText
    ) external onlyRole(JUDGE_ROLE) {
        JudicialCase storage judicialCase = cases[caseId];
        
        if (judicialCase.caseId == 0) {
            revert InvalidCase();
        }
        
        if (judicialCase.assignedJudge != msg.sender) {
            revert NotAssignedJudge();
        }
        
        if (judicialCase.status == CaseStatus.RULED || judicialCase.status == CaseStatus.CLOSED) {
            revert InvalidStatus();
        }
        
        judicialCase.rulingHash = rulingHash;
        judicialCase.ruling = rulingText;
        judicialCase.status = CaseStatus.RULED;
        judicialCase.ruledAt = block.timestamp;
        
        // Update judge's case count
        for (uint256 i = 1; i <= memberCounter; i++) {
            if (members[i].walletAddress == msg.sender) {
                members[i].casesHandled++;
                break;
            }
        }
        
        emit CaseRuled(caseId, rulingHash);
    }
    
    // ============ Legal Precedents ============
    
    /**
     * @notice Register a legal precedent from a case
     * @param caseId ID of the source case
     * @param precedentHash IPFS hash of precedent document
     * @param summary Summary of the precedent
     * @param legalPrinciple Legal principle established
     */
    function registerPrecedent(
        uint256 caseId,
        bytes32 precedentHash,
        string calldata summary,
        string calldata legalPrinciple
    ) external onlyRole(JUDGE_ROLE) returns (uint256) {
        JudicialCase storage judicialCase = cases[caseId];
        
        if (judicialCase.caseId == 0) {
            revert InvalidCase();
        }
        
        if (judicialCase.status != CaseStatus.RULED) {
            revert InvalidStatus();
        }
        
        precedentCounter++;
        uint256 precedentId = precedentCounter;
        
        precedents[precedentId] = LegalPrecedent({
            precedentId: precedentId,
            sourceCaseId: caseId,
            precedentHash: precedentHash,
            summary: summary,
            legalPrinciple: legalPrinciple,
            judge: msg.sender,
            archived: false,
            createdAt: block.timestamp
        });
        
        emit PrecedentRegistered(precedentId, caseId, msg.sender);
        
        return precedentId;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get member details
     * @param memberId ID of the member
     */
    function getMember(uint256 memberId) 
        external 
        view 
        returns (Member memory) 
    {
        Member memory member = members[memberId];
        if (member.memberId == 0) {
            revert NotFound();
        }
        return member;
    }
    
    /**
     * @notice Get case details
     * @param caseId ID of the case
     */
    function getCase(uint256 caseId) 
        external 
        view 
        returns (JudicialCase memory) 
    {
        JudicialCase memory judicialCase = cases[caseId];
        if (judicialCase.caseId == 0) {
            revert InvalidCase();
        }
        return judicialCase;
    }
    
    /**
     * @notice Get precedent details
     * @param precedentId ID of the precedent
     */
    function getPrecedent(uint256 precedentId) 
        external 
        view 
        returns (LegalPrecedent memory) 
    {
        LegalPrecedent memory precedent = precedents[precedentId];
        if (precedent.precedentId == 0) {
            revert NotFound();
        }
        return precedent;
    }
    
    /**
     * @notice Get member ID by seat ID
     * @param seatId Seat ID to look up
     */
    function getMemberBySeatId(uint256 seatId) 
        external 
        view 
        returns (uint256) 
    {
        return seatIdToMemberId[seatId];
    }
    
    /**
     * @notice Check if address is a judge
     * @param account Address to check
     */
    function isJudge(address account) external view returns (bool) {
        return hasRole(JUDGE_ROLE, account);
    }
}
