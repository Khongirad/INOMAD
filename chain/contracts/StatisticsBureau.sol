// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title StatisticsBureau
 * @notice Collects and maintains voting statistics and census data
 * 
 * Responsibilities:
 * - Track voting participation rates
 * - Maintain census of citizens, families, Arbans, etc.
 * - Generate reports for Legislative Branch
 * - Provide data to Temple of Heaven (Scientist Council)
 * 
 * Integration:
 * - Called by VotingCenter for each proposal/vote
 * - Updated by Legislative Branch for census
 * - Data accessible by Temple of Heaven for research
 */
contract StatisticsBureau is AccessControl {
    bytes32 public constant LEGISLATIVE_ROLE = keccak256("LEGISLATIVE_ROLE");
    bytes32 public constant VOTING_CENTER_ROLE = keccak256("VOTING_CENTER_ROLE");
    bytes32 public constant TEMPLE_ROLE = keccak256("TEMPLE_ROLE");
    
    struct VotingStats {
        uint256 totalProposals;
        uint256 totalVotes;
        uint256 activeProposals;
        uint256 passedProposals;
        uint256 rejectedProposals;
        uint256 participationRate;  // Basis points (10000 = 100%)
        uint256 lastUpdated;
    }
    
    struct CensusData {
        uint256 totalCitizens;
        uint256 totalFamilies;
        uint256 totalArbans;
        uint256 totalZuns;
        uint256 totalMyangans;
        uint256 totalTumens;
        uint256 marriedCitizens;
        uint256 childrenCount;
        uint256 lastCensus;
    }
    
    struct ProposalStats {
        uint256 proposalId;
        uint8 khuralLevel;
        uint256 votersCount;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 timestamp;
    }
    
    // Statistics storage
    mapping(uint8 => VotingStats) public khuralStats; // level => stats
    CensusData public census;
    mapping(uint256 => ProposalStats) public proposalData;
    
    // Historical tracking
    mapping(uint8 => uint256[]) public proposalsByLevel;
    mapping(address => uint256) public votesByVoter;
    
    // Temple of Heaven link
    address public templeOfHeaven;
    
    // Events
    event ProposalRecorded(
        uint256 indexed proposalId,
        uint8 indexed khuralLevel,
        uint256 timestamp
    );
    
    event VoteRecorded(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 timestamp
    );
    
    event CensusUpdated(
        uint256 totalCitizens,
        uint256 totalFamilies,
        uint256 totalArbans,
        uint256 timestamp
    );
    
    event StatisticsExported(
        address indexed requester,
        uint8 khuralLevel,
        uint256 timestamp
    );
    
    constructor(address admin, address _temple) {
        require(admin != address(0), "Invalid admin");
        require(_temple != address(0), "Invalid temple");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LEGISLATIVE_ROLE, admin);
        templeOfHeaven = _temple;
        
        // Grant temple role to Temple of Heaven
        _grantRole(TEMPLE_ROLE, _temple);
    }
    
    /**
     * @notice Record a new proposal (called by VotingCenter)
     * @param proposalId Proposal ID
     * @param level Khural level (1-4)
     */
    function recordProposal(uint256 proposalId, uint8 level) 
        external 
        onlyRole(VOTING_CENTER_ROLE) 
    {
        require(level >= 1 && level <= 4, "Invalid level");
        
        khuralStats[level].totalProposals++;
        khuralStats[level].activeProposals++;
        khuralStats[level].lastUpdated = block.timestamp;
        
        proposalsByLevel[level].push(proposalId);
        
        proposalData[proposalId] = ProposalStats({
            proposalId: proposalId,
            khuralLevel: level,
            votersCount: 0,
            votesFor: 0,
            votesAgainst: 0,
            timestamp: block.timestamp
        });
        
        emit ProposalRecorded(proposalId, level, block.timestamp);
    }
    
    /**
     * @notice Record a vote (called by VotingCenter)
     * @param proposalId Proposal ID
     * @param voter Voter address
     * @param support Vote direction
     */
    function recordVote(uint256 proposalId, address voter, bool support) 
        external 
        onlyRole(VOTING_CENTER_ROLE) 
    {
        ProposalStats storage stats = proposalData[proposalId];
        require(stats.proposalId != 0, "Proposal not found");
        
        uint8 level = stats.khuralLevel;
        
        // Update proposal stats
        stats.votersCount++;
        if (support) {
            stats.votesFor++;
        } else {
            stats.votesAgainst++;
        }
        
        // Update Khural level stats
        khuralStats[level].totalVotes++;
        votesByVoter[voter]++;
        
        // Update participation rate
        _updateParticipationRate(level);
        
        emit VoteRecorded(proposalId, voter, support, block.timestamp);
    }
    
    /**
     * @notice Mark proposal as finalized (called by VotingCenter)
     * @param proposalId Proposal ID
     * @param passed True if passed, false if rejected
     */
    function finalizeProposal(uint256 proposalId, bool passed) 
        external 
        onlyRole(VOTING_CENTER_ROLE) 
    {
        ProposalStats storage stats = proposalData[proposalId];
        require(stats.proposalId != 0, "Proposal not found");
        
        uint8 level = stats.khuralLevel;
        
        khuralStats[level].activeProposals--;
        if (passed) {
            khuralStats[level].passedProposals++;
        } else {
            khuralStats[level].rejectedProposals++;
        }
        
        khuralStats[level].lastUpdated = block.timestamp;
    }
    
    /**
     * @notice Update census data (called by Legislative Branch)
     * @param citizens Total citizens
     * @param families Total families
     * @param arbans Total Arbans
     * @param zuns Total Zuns
     * @param myangans Total Myangans
     * @param tumens Total Tumens
     */
    function updateCensus(
        uint256 citizens,
        uint256 families,
        uint256 arbans,
        uint256 zuns,
        uint256 myangans,
        uint256 tumens
    ) external onlyRole(LEGISLATIVE_ROLE) {
        census = CensusData({
            totalCitizens: citizens,
            totalFamilies: families,
            totalArbans: arbans,
            totalZuns: zuns,
            totalMyangans: myangans,
            totalTumens: tumens,
            marriedCitizens: families * 2, // Approximate: each family has 2 married adults
            childrenCount: 0, // Can be updated separately
            lastCensus: block.timestamp
        });
        
        emit CensusUpdated(citizens, families, arbans, block.timestamp);
    }
    
    /**
     * @notice Update detailed census fields
     */
    function updateCensusDetails(
        uint256 marriedCitizens,
        uint256 childrenCount
    ) external onlyRole(LEGISLATIVE_ROLE) {
        census.marriedCitizens = marriedCitizens;
        census.childrenCount = childrenCount;
        census.lastCensus = block.timestamp;
    }
    
    /**
     * @notice Update participation rate for a Khural level
     */
    function _updateParticipationRate(uint8 level) internal {
        VotingStats storage stats = khuralStats[level];
        
        // Calculate eligible voters based on level
        uint256 eligibleVoters = _getEligibleVoters(level);
        
        if (eligibleVoters > 0 && stats.totalProposals > 0) {
            // Average votes per proposal
            uint256 avgVotes = stats.totalVotes / stats.totalProposals;
            // Participation rate in basis points
            stats.participationRate = (avgVotes * 10000) / eligibleVoters;
        }
    }
    
    /**
     * @notice Get eligible voters count for a level
     */
    function _getEligibleVoters(uint8 level) internal view returns (uint256) {
        if (level == 1) return census.totalArbans * 10;      // 10 families per Arban
        if (level == 2) return census.totalZuns * 10;        // 10 Arbans per Zun
        if (level == 3) return census.totalMyangans * 10;    // 10 Zuns per Myangan
        if (level == 4) return census.totalTumens * 10;      // 10 Myangans per Tumen
        return 0;
    }
    
    // View functions
    
    function getStats(uint8 level) external view returns (VotingStats memory) {
        return khuralStats[level];
    }
    
    function getCensus() external view returns (CensusData memory) {
        return census;
    }
    
    function getProposalStats(uint256 proposalId) external view returns (ProposalStats memory) {
        return proposalData[proposalId];
    }
    
    function getProposalsByLevel(uint8 level) external view returns (uint256[] memory) {
        return proposalsByLevel[level];
    }
    
    function getVoterActivity(address voter) external view returns (uint256) {
        return votesByVoter[voter];
    }
    
    /**
     * @notice Export statistics for Temple of Heaven research
     * @param level Khural level to export
     */
    function exportStatistics(uint8 level) 
        external 
        onlyRole(TEMPLE_ROLE) 
        returns (VotingStats memory, ProposalStats[] memory) 
    {
        VotingStats memory stats = khuralStats[level];
        uint256[] memory proposalIds = proposalsByLevel[level];
        
        ProposalStats[] memory proposals = new ProposalStats[](proposalIds.length);
        for (uint256 i = 0; i < proposalIds.length; i++) {
            proposals[i] = proposalData[proposalIds[i]];
        }
        
        emit StatisticsExported(msg.sender, level, block.timestamp);
        
        return (stats, proposals);
    }
    
    /**
     * @notice Generate participation report
     */
    function getParticipationReport() external view returns (
        uint256 arbanParticipation,
        uint256 zunParticipation,
        uint256 myangangParticipation,
        uint256 tumenParticipation
    ) {
        return (
            khuralStats[1].participationRate,
            khuralStats[2].participationRate,
            khuralStats[3].participationRate,
            khuralStats[4].participationRate
        );
    }
    
    /**
     * @notice Get overall voting health metrics
     */
    function getVotingHealth() external view returns (
        uint256 totalProposals,
        uint256 totalVotes,
        uint256 avgParticipation
    ) {
        totalProposals = khuralStats[1].totalProposals + 
                        khuralStats[2].totalProposals + 
                        khuralStats[3].totalProposals + 
                        khuralStats[4].totalProposals;
        
        totalVotes = khuralStats[1].totalVotes + 
                    khuralStats[2].totalVotes + 
                    khuralStats[3].totalVotes + 
                    khuralStats[4].totalVotes;
        
        avgParticipation = (khuralStats[1].participationRate + 
                           khuralStats[2].participationRate + 
                           khuralStats[3].participationRate + 
                           khuralStats[4].participationRate) / 4;
    }
}
