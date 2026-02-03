// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IStatisticsBureau {
    function recordProposal(uint256 proposalId, uint8 level) external;
    function recordVote(uint256 proposalId, address voter, bool support) external;
}

/**
 * @title VotingCenter
 * @notice Centralized voting hub for all Legislative Branch (Khural) votes
 * 
 * Architecture:
 * - Controlled by Legislative Branch (LEGISLATIVE_ROLE)
 * - Used by all Khural levels (ArbanKhural, ZunKhural, etc.)
 * - Linked to StatisticsBureau for data collection
 * - Manages proposal lifecycle: create → vote → finalize → execute
 * 
 * Khural Hierarchy:
 * Level 1: ArbanKhural (10 families)
 * Level 2: ZunKhural (10 Arbans = 100 families)
 * Level 3: MyangangKhural (10 Zuns = 1000 families)
 * Level 4: TumenKhural (10 Myangans = 10000 families, National)
 */
contract VotingCenter is AccessControl {
    bytes32 public constant LEGISLATIVE_ROLE = keccak256("LEGISLATIVE_ROLE");
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    
    enum ProposalType {
        ARBAN_BUDGET,       // Arban-level budget allocation
        ARBAN_LEADER,       // Elect Arban leader
        ARBAN_PROJECT,      // Local project approval
        ZUN_POLICY,         // Zun-level policy
        ZUN_ELDER,          // Elect Zun elder
        ZUN_BUDGET,         // Zun budget
        MYANGAN_LAW,        // Myangan regional law
        MYANGAN_LEADER,     // Myangan leadership
        TUMEN_NATIONAL,     // National legislation
        TUMEN_CHAIRMAN,     // National chairman election
        CONSTITUTIONAL      // Constitution amendment (highest level)
    }
    
    enum ProposalStatus {
        PENDING,      // Created but not yet active
        ACTIVE,       // Voting in progress
        PASSED,       // Vote passed, awaiting execution
        REJECTED,     // Vote failed (no quorum or majority)
        EXECUTED,     // Successfully executed
        CANCELLED     // Cancelled by proposer or admin
    }
    
    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        uint8 khuralLevel;        // 1=Arban, 2=Zun, 3=Myangan, 4=Tumen
        uint256 khuralId;         // ID of specific Khural unit
        string title;
        string description;
        bytes executionData;      // Encoded function call for execution
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 quorumRequired;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
    }
    
    struct Vote {
        address voter;
        bool support;
        uint256 timestamp;
        string reason;
    }
    
    // Storage
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => address[]) public proposalVoters;
    uint256 public proposalCount;
    
    // Statistics Bureau link
    IStatisticsBureau public statisticsBureau;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        uint8 khuralLevel,
        uint256 khuralId,
        address indexed proposer,
        string title
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votesFor,
        uint256 votesAgainst
    );
    
    event ProposalFinalized(
        uint256 indexed proposalId,
        ProposalStatus status,
        uint256 votesFor,
        uint256 votesAgainst
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        bool success
    );
    
    event ProposalCancelled(
        uint256 indexed proposalId,
        address indexed canceller
    );
    
    constructor(address admin, address _statisticsBureau) {
        require(admin != address(0), "Invalid admin");
        require(_statisticsBureau != address(0), "Invalid bureau");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LEGISLATIVE_ROLE, admin);
        statisticsBureau = IStatisticsBureau(_statisticsBureau);
    }
    
    /**
     * @notice Create a new proposal
     * @param proposalType Type of proposal
     * @param khuralLevel Level (1-4)
     * @param khuralId Specific Khural unit ID
     * @param title Proposal title
     * @param description Full description
     * @param executionData Encoded execution call (optional)
     * @param votingPeriod Duration in seconds
     */
    function createProposal(
        ProposalType proposalType,
        uint8 khuralLevel,
        uint256 khuralId,
        string calldata title,
        string calldata description,
        bytes calldata executionData,
        uint256 votingPeriod
    ) external onlyRole(KHURAL_ROLE) returns (uint256) {
        require(khuralLevel >= 1 && khuralLevel <= 4, "Invalid level");
        require(votingPeriod >= 1 days && votingPeriod <= 30 days, "Invalid period");
        require(bytes(title).length > 0, "Empty title");
        
        uint256 proposalId = ++proposalCount;
        
        // Calculate quorum based on level
        uint256 quorum = _calculateQuorum(khuralLevel);
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: proposalType,
            proposer: msg.sender,
            khuralLevel: khuralLevel,
            khuralId: khuralId,
            title: title,
            description: description,
            executionData: executionData,
            votesFor: 0,
            votesAgainst: 0,
            quorumRequired: quorum,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            status: ProposalStatus.ACTIVE
        });
        
        emit ProposalCreated(proposalId, proposalType, khuralLevel, khuralId, msg.sender, title);
        
        // Report to StatisticsBureau
        statisticsBureau.recordProposal(proposalId, khuralLevel);
        
        return proposalId;
    }
    
    /**
     * @notice Cast a vote on a proposal
     * @param proposalId Proposal ID
     * @param support True for yes, false for no
     * @param reason Optional reason for vote
     */
    function vote(
        uint256 proposalId,
        bool support,
        string calldata reason
    ) external onlyRole(KHURAL_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(votes[proposalId][msg.sender].voter == address(0), "Already voted");
        
        // Record vote
        votes[proposalId][msg.sender] = Vote({
            voter: msg.sender,
            support: support,
            timestamp: block.timestamp,
            reason: reason
        });
        
        proposalVoters[proposalId].push(msg.sender);
        
        // Update tallies
        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VoteCast(proposalId, msg.sender, support, proposal.votesFor, proposal.votesAgainst);
        
        // Report to StatisticsBureau
        statisticsBureau.recordVote(proposalId, msg.sender, support);
    }
    
    /**
     * @notice Finalize a proposal after voting period ends
     * @param proposalId Proposal ID
     */
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp > proposal.endTime, "Voting ongoing");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        
        // Check quorum
        if (totalVotes < proposal.quorumRequired) {
            proposal.status = ProposalStatus.REJECTED;
            emit ProposalFinalized(proposalId, ProposalStatus.REJECTED, proposal.votesFor, proposal.votesAgainst);
            return;
        }
        
        // Check majority (simple majority: >50%)
        if (proposal.votesFor > proposal.votesAgainst) {
            proposal.status = ProposalStatus.PASSED;
            emit ProposalFinalized(proposalId, ProposalStatus.PASSED, proposal.votesFor, proposal.votesAgainst);
        } else {
            proposal.status = ProposalStatus.REJECTED;
            emit ProposalFinalized(proposalId, ProposalStatus.REJECTED, proposal.votesFor, proposal.votesAgainst);
        }
    }
    
    /**
     * @notice Execute a passed proposal
     * @param proposalId Proposal ID
     */
    function executeProposal(uint256 proposalId) external onlyRole(LEGISLATIVE_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(proposal.status == ProposalStatus.PASSED, "Not passed");
        require(proposal.executionData.length > 0, "No execution data");
        
        // Execute the proposal's action
        (bool success,) = address(this).call(proposal.executionData);
        
        proposal.status = ProposalStatus.EXECUTED;
        emit ProposalExecuted(proposalId, success);
    }
    
    /**
     * @notice Cancel a proposal (by proposer or admin)
     * @param proposalId Proposal ID
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(
            msg.sender == proposal.proposer || hasRole(LEGISLATIVE_ROLE, msg.sender),
            "Not authorized"
        );
        require(
            proposal.status == ProposalStatus.PENDING || proposal.status == ProposalStatus.ACTIVE,
            "Cannot cancel"
        );
        
        proposal.status = ProposalStatus.CANCELLED;
        emit ProposalCancelled(proposalId, msg.sender);
    }
    
    /**
     * @notice Calculate quorum requirement based on Khural level
     */
    function _calculateQuorum(uint8 level) internal pure returns (uint256) {
        // Arban (10 families): 6/10 = 60%
        if (level == 1) return 6;
        // Zun (10 Arbans): 6/10 = 60%
        if (level == 2) return 6;
        // Myangan (10 Zuns): 7/10 = 70%
        if (level == 3) return 7;
        // Tumen (10 Myangans): 8/10 = 80% (national level)
        return 8;
    }
    
    // View functions
    
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }
    
    function getProposalVoters(uint256 proposalId) external view returns (address[] memory) {
        return proposalVoters[proposalId];
    }
    
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return votes[proposalId][voter].voter != address(0);
    }
    
    function getProposalResults(uint256 proposalId) external view returns (
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 quorum,
        ProposalStatus status
    ) {
        Proposal memory proposal = proposals[proposalId];
        return (proposal.votesFor, proposal.votesAgainst, proposal.quorumRequired, proposal.status);
    }
}
