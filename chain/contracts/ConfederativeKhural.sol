// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UlasRegistry} from "./UlasRegistry.sol";

/**
 * @title ConfederativeKhural (Конфедеративный Хурал / Ехэ Хурал)
 * @notice Supreme legislative body of the Siberian Confederation
 * 
 * Structure:
 * - 1,450 representatives (at 145M population)
 * - Each representative = Chairman of one Ulas (~100,000 people)
 * - Elects Председатель Ехэ Хурала
 * - Legislative process: propose → vote → enact laws
 * 
 * Powers:
 * - Constitutional amendments
 * - Federal laws
 * - Inter-Ulas disputes
 * - Election of Chairman
 */
contract ConfederativeKhural {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotRepresentative();
    error ProposalNotFound();
    error ProposalAlreadyVoted();
    error ProposalNotActive();
    error QuorumNotReached();
    error ChairmanTermLimit();
    error ZeroAddress();
    
    /* ==================== ENUMS ==================== */
    
    enum ProposalType {
        LAW,                    // Regular law
        CONSTITUTIONAL,         // Constitution amendment
        BUDGET,                 // Budget allocation
        INTER_ULAS,            // Inter-Ulas dispute resolution
        CHAIRMAN_ELECTION       // Election of Chairman
    }
    
    enum ProposalStatus {
        ACTIVE,
        PASSED,
        REJECTED,
        EXECUTED
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct Proposal {
        uint256 proposalId;
        ProposalType proposalType;
        ProposalStatus status;
        address proposer;
        string title;
        bytes32 contentHash;        // IPFS hash or document reference
        uint256 createdAt;
        uint256 votingEnds;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        mapping(address => bool) hasVoted;
    }
    
    /* ==================== CONSTANTS ==================== */
    
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_PERCENT = 50;     // 50% must vote
    uint256 public constant MAJORITY_PERCENT = 60;   // 60% to pass
    uint256 public constant CONSTITUTIONAL_PERCENT = 75; // 75% for constitutional changes
    uint256 public constant MAX_CHAIRMAN_TERMS = 2;
    uint256 public constant CHAIRMAN_TERM = 365 days;
    
    /* ==================== STATE ==================== */
    
    address public owner;
    UlasRegistry public immutable ulasRegistry;
    
    // Representative tracking
    mapping(address => bool) public isRepresentative;
    uint256 public totalRepresentatives;
    
    // Proposals
    uint256 public nextProposalId = 1;
    mapping(uint256 => Proposal) public proposals;
    
    // Chairman of Ехэ Хурал
    address public chairman;
    uint256 public chairmanTermsServed;
    uint256 public chairmanElectedAt;
    uint256 public chairmanTermEnd;
    
    /* ==================== EVENTS ==================== */
    
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType indexed proposalType,
        address indexed proposer,
        string title,
        uint256 timestamp
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 timestamp
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        ProposalStatus status,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 timestamp
    );
    
    event ChairmanElected(
        address indexed chairman,
        uint256 term,
        uint256 timestamp
    );
    
    event RepresentativeAdded(address indexed representative, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyRepresentative() {
        if (!isRepresentative[msg.sender]) revert NotRepresentative();
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        if (proposals[proposalId].proposalId == 0) revert ProposalNotFound();
        _;
    }
    
    modifier proposalActive(uint256 proposalId) {
        Proposal storage prop = proposals[proposalId];
        if (prop.status != ProposalStatus.ACTIVE) revert ProposalNotActive();
        if (block.timestamp > prop.votingEnds) revert ProposalNotActive();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(address _ulasRegistry) {
        require(_ulasRegistry != address(0), "Zero address");
        owner = msg.sender;
        ulasRegistry = UlasRegistry(_ulasRegistry);
    }
    
    /* ==================== REPRESENTATIVE MANAGEMENT ==================== */
    
    /**
     * @notice Sync representatives from UlasRegistry
     * @dev Called when new Ulas chairman is elected
     */
    function addRepresentative(address representative) external {
        require(
            msg.sender == owner || msg.sender == address(ulasRegistry),
            "Not authorized"
        );
        require(!isRepresentative[representative], "Already representative");
        
        isRepresentative[representative] = true;
        totalRepresentatives++;
        
        emit RepresentativeAdded(representative, block.timestamp);
    }
    
    /**
     * @notice Sync all representatives from UlasRegistry
     */
    function syncRepresentatives() external onlyOwner {
        // TODO: Implement batch sync from UlasRegistry
        // This would iterate through all Ulas and add their chairmen
    }
    
    /* ==================== PROPOSAL CREATION ==================== */
    
    /**
     * @notice Create a new proposal
     * @param proposalType Type of proposal
     * @param title Title of the proposal
     * @param contentHash IPFS hash of full proposal text
     */
    function createProposal(
        ProposalType proposalType,
        string calldata title,
        bytes32 contentHash
    ) external onlyRepresentative returns (uint256 proposalId) {
        proposalId = nextProposalId++;
        
        Proposal storage prop = proposals[proposalId];
        prop.proposalId = proposalId;
        prop.proposalType = proposalType;
        prop.status = ProposalStatus.ACTIVE;
        prop.proposer = msg.sender;
        prop.title = title;
        prop.contentHash = contentHash;
        prop.createdAt = block.timestamp;
        prop.votingEnds = block.timestamp + VOTING_PERIOD;
        
        emit ProposalCreated(proposalId, proposalType, msg.sender, title, block.timestamp);
    }
    
    /* ==================== VOTING ==================== */
    
    /**
     * @notice Vote on a proposal
     * @param proposalId Proposal to vote on
     * @param support true = for, false = against
     * @param abstain true = abstain from voting
     */
    function vote(
        uint256 proposalId,
        bool support,
        bool abstain
    ) external onlyRepresentative proposalExists(proposalId) proposalActive(proposalId) {
        Proposal storage prop = proposals[proposalId];
        
        require(!prop.hasVoted[msg.sender], "Already voted");
        
        prop.hasVoted[msg.sender] = true;
        
        if (abstain) {
            prop.votesAbstain++;
        } else if (support) {
            prop.votesFor++;
        } else {
            prop.votesAgainst++;
        }
        
        emit VoteCast(proposalId, msg.sender, support, block.timestamp);
    }
    
    /* ==================== PROPOSAL EXECUTION ==================== */
    
    /**
     * @notice Execute proposal after voting period
     */
    function executeProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage prop = proposals[proposalId];
        
        require(prop.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp > prop.votingEnds, "Voting ongoing");
        
        uint256 totalVotes = prop.votesFor + prop.votesAgainst + prop.votesAbstain;
        uint256 quorum = (totalRepresentatives * QUORUM_PERCENT) / 100;
        
        // Check quorum
        if (totalVotes < quorum) {
            prop.status = ProposalStatus.REJECTED;
            emit ProposalExecuted(proposalId, ProposalStatus.REJECTED, prop.votesFor, prop.votesAgainst, block.timestamp);
            return;
        }
        
        // Determine threshold
        uint256 threshold = MAJORITY_PERCENT;
        if (prop.proposalType == ProposalType.CONSTITUTIONAL) {
            threshold = CONSTITUTIONAL_PERCENT;
        }
        
        // Calculate percentage
        uint256 percentFor = (prop.votesFor * 100) / totalVotes;
        
        if (percentFor >= threshold) {
            prop.status = ProposalStatus.PASSED;
        } else {
            prop.status = ProposalStatus.REJECTED;
        }
        
        emit ProposalExecuted(proposalId, prop.status, prop.votesFor, prop.votesAgainst, block.timestamp);
    }
    
    /* ==================== CHAIRMAN ELECTION ==================== */
    
    /**
     * @notice Elect Chairman of Ехэ Хурал
     * @dev This is a special type of proposal
     */
    function electChairman(address candidate) external onlyOwner {
        require(isRepresentative[candidate], "Not a representative");
        
        // Check term limits
        if (candidate == chairman && chairmanTermsServed >= MAX_CHAIRMAN_TERMS) {
            revert ChairmanTermLimit();
        }
        
        if (candidate != chairman) {
            chairmanTermsServed = 0;
        }
        
        chairman = candidate;
        chairmanTermsServed++;
        chairmanElectedAt = block.timestamp;
        chairmanTermEnd = block.timestamp + CHAIRMAN_TERM;
        
        emit ChairmanElected(candidate, chairmanTermsServed, block.timestamp);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        ProposalType pType,
        ProposalStatus status,
        address proposer,
        string memory title,
        bytes32 contentHash,
        uint256 createdAt,
        uint256 votingEnds,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain
    ) {
        Proposal storage prop = proposals[proposalId];
        return (
            prop.proposalId,
            prop.proposalType,
            prop.status,
            prop.proposer,
            prop.title,
            prop.contentHash,
            prop.createdAt,
            prop.votingEnds,
            prop.votesFor,
            prop.votesAgainst,
            prop.votesAbstain
        );
    }
    
    function getChairmanInfo() external view returns (
        address currentChairman,
        uint256 termsServed,
        uint256 electedAt,
        uint256 termEnd,
        bool termExpired
    ) {
        return (
            chairman,
            chairmanTermsServed,
            chairmanElectedAt,
            chairmanTermEnd,
            block.timestamp > chairmanTermEnd
        );
    }
    
    /* ==================== ADMIN ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
