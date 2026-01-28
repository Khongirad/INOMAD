// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SupremeCourt} from "./SupremeCourt.sol";
import {ConfederativeKhural} from "./ConfederativeKhural.sol";
import {ExecutiveChairman} from "./ExecutiveChairman.sol";

/**
 * @title JudicialReview
 * @notice Judicial review for laws and executive resolutions
 * 
 * Powers:
 * - Review constitutionality of laws passed by Khural
 * - Review executive resolutions from Chairman
 * - Block unconstitutional acts
 * - 5 of 9 judges required for review decision
 * 
 * Integration:
 * - SupremeCourt judges vote on constitutional issues
 * - Can block laws or resolutions
 * - Decisions are final (no override)
 */
contract JudicialReview {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotSupremeCourt();
    error NotJudge();
    error AlreadyReviewed();
    error ReviewNotFound();
    error AlreadyVoted();
    
    /* ==================== ENUMS ==================== */
    
    enum ReviewType {
        LAW,           // Khural law
        RESOLUTION,    // Executive resolution
        AMENDMENT      // Constitutional amendment
    }
    
    enum ReviewStatus {
        PENDING,
        CONSTITUTIONAL,
        UNCONSTITUTIONAL
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct Review {
        uint256 reviewId;
        ReviewType revType;
        ReviewStatus status;
        uint256 targetId;          // Law ID or Resolution ID
        address requester;
        string challenge;          // Why it's unconstitutional
        uint256 createdAt;
        uint256 decidedAt;
        uint256 votesConstitutional;
        uint256 votesUnconstitutional;
        mapping(address => bool) hasVoted;
    }
    
    /* ==================== CONSTANTS ==================== */
    
    uint256 public constant QUORUM = 5;  // 5 of 9 judges
    uint256 public constant REVIEW_PERIOD = 30 days;
    
    /* ==================== STATE ==================== */
    
    address public owner;
    SupremeCourt public immutable supremeCourt;
    ConfederativeKhural public khural;
    ExecutiveChairman public chairman;
    
    // Reviews
    uint256 public nextReviewId = 1;
    mapping(uint256 => Review) public reviews;
    
    // Blocked items
    mapping(ReviewType => mapping(uint256 => bool)) public isBlocked;  // type => id => blocked
    
    /* ==================== EVENTS ==================== */
    
    event ReviewRequested(
        uint256 indexed reviewId,
        ReviewType indexed revType,
        uint256 targetId,
        address requester,
        uint256 timestamp
    );
    
    event JudgeVoted(
        uint256 indexed reviewId,
        address indexed judge,
        bool constitutional,
        uint256 timestamp
    );
    
    event ReviewDecided(
        uint256 indexed reviewId,
        ReviewStatus status,
        uint256 timestamp
    );
    
    event ItemBlocked(
        ReviewType indexed revType,
        uint256 targetId,
        uint256 timestamp
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyJudge() {
        if (supremeCourt.judgeToSeat(msg.sender) == 0) revert NotJudge();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(
        address _supremeCourt,
        address _khural,
        address _chairman
    ) {
        require(_supremeCourt != address(0), "Zero address");
        owner = msg.sender;
        supremeCourt = SupremeCourt(_supremeCourt);
        khural = ConfederativeKhural(_khural);
        chairman = ExecutiveChairman(_chairman);
    }
    
    /* ==================== REVIEW REQUEST ==================== */
    
    /**
     * @notice Request judicial review (anyone can request)
     */
    function requestReview(
        ReviewType revType,
        uint256 targetId,
        string calldata challenge
    ) external returns (uint256 reviewId) {
        reviewId = nextReviewId++;
        
        Review storage rev = reviews[reviewId];
        rev.reviewId = reviewId;
        rev.revType = revType;
        rev.status = ReviewStatus.PENDING;
        rev.targetId = targetId;
        rev.requester = msg.sender;
        rev.challenge = challenge;
        rev.createdAt = block.timestamp;
        
        emit ReviewRequested(reviewId, revType, targetId, msg.sender, block.timestamp);
    }
    
    /* ==================== JUDICIAL VOTING ==================== */
    
    /**
     * @notice Judge votes on review
     * @param constitutional true = constitutional, false = unconstitutional
     */
    function vote(uint256 reviewId, bool constitutional) external onlyJudge {
        Review storage rev = reviews[reviewId];
        require(rev.reviewId != 0, "Not found");
        require(rev.status == ReviewStatus.PENDING, "Already decided");
        require(!rev.hasVoted[msg.sender], "Already voted");
        
        rev.hasVoted[msg.sender] = true;
        
        if (constitutional) {
            rev.votesConstitutional++;
        } else {
            rev.votesUnconstitutional++;
        }
        
        emit JudgeVoted(reviewId, msg.sender, constitutional, block.timestamp);
        
        // Check if quorum reached
        uint256 totalVotes = rev.votesConstitutional + rev.votesUnconstitutional;
        if (totalVotes >= QUORUM) {
            _finalizeReview(reviewId);
        }
    }
    
    /* ==================== FINALIZATION ==================== */
    
    function _finalizeReview(uint256 reviewId) internal {
        Review storage rev = reviews[reviewId];
        
        if (rev.votesUnconstitutional > rev.votesConstitutional) {
            rev.status = ReviewStatus.UNCONSTITUTIONAL;
            
            // Block the item
            isBlocked[rev.revType][rev.targetId] = true;
            
            emit ItemBlocked(rev.revType, rev.targetId, block.timestamp);
        } else {
            rev.status = ReviewStatus.CONSTITUTIONAL;
        }
        
        rev.decidedAt = block.timestamp;
        
        emit ReviewDecided(reviewId, rev.status, block.timestamp);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getReview(uint256 reviewId) external view returns (
        ReviewType revType,
        ReviewStatus status,
        uint256 targetId,
        address requester,
        string memory challenge,
        uint256 createdAt,
        uint256 decidedAt,
        uint256 votesConstitutional,
        uint256 votesUnconstitutional
    ) {
        Review storage rev = reviews[reviewId];
        return (
            rev.revType,
            rev.status,
            rev.targetId,
            rev.requester,
            rev.challenge,
            rev.createdAt,
            rev.decidedAt,
            rev.votesConstitutional,
            rev.votesUnconstitutional
        );
    }
    
    function isItemBlocked(ReviewType revType, uint256 targetId) external view returns (bool) {
        return isBlocked[revType][targetId];
    }
    
    function hasJudgeVoted(uint256 reviewId, address judge) external view returns (bool) {
        return reviews[reviewId].hasVoted[judge];
    }
    
    /* ==================== ADMIN ==================== */
    
    function setKhural(address _khural) external onlyOwner {
        khural = ConfederativeKhural(_khural);
    }
    
    function setChairman(address _chairman) external onlyOwner {
        chairman = ExecutiveChairman(_chairman);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
