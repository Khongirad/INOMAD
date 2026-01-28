// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Ulas (Улас)
 * @notice Confederation unit = Council of 10 Түмэнs (~100,000 people)
 * 
 * Structure:
 * - 10 Түмэн leaders form the Ulas Council
 * - Council elects Chairman (Председатель Совета Улас)
 * - Chairman limited to 2 terms maximum
 * - Council can recall Chairman
 * 
 * Powers:
 * - Strategy
 * - War/Peace decisions
 * - Foreign policy
 * - Alliances
 * - Macroeconomics
 */
contract Ulas {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotCouncilMember();
    error InvalidTumenCount();
    error TumenAlreadyMember();
    error TumenNotMember();
    error ChairmanTermLimit();
    error ChairmanAlreadyElected();
    error NotEnoughVotes();
    error ZeroAddress();
    error AlreadyVoted();
    error NotChairman();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant COUNCIL_SIZE = 10;       // Exactly 10 Түмэнs
    uint256 public constant MAX_TERMS = 2;           // Maximum 2 terms
    uint256 public constant TERM_DURATION = 365 days; // 1 year term
    uint256 public constant QUORUM = 6;              // 6 of 10 for decisions
    
    /* ==================== STATE ==================== */
    
    // Ulas identity
    uint256 public ulasId;
    string public name;
    address public owner;
    
    // Council of 10 Tumen Leaders
    address[10] public councilSeat;                  // 10 fixed seats
    mapping(address => uint256) public tumenToSeat;  // tumen leader => seat (1-10)
    uint256 public activeMemberCount;
    
    // Chairman (elected by council)
    address public chairman;
    uint256 public chairmanTermsServed;
    uint256 public chairmanElectedAt;
    uint256 public chairmanTermEnd;
    
    // Voting for chairman election
    mapping(address => address) public currentVoteFor; // voter => candidate
    mapping(address => uint256) public votesReceived;  // candidate => vote count
    
    /* ==================== EVENTS ==================== */
    
    event TumenJoined(uint256 indexed seat, address indexed tumenLeader, uint256 timestamp);
    event TumenLeft(uint256 indexed seat, address indexed tumenLeader, uint256 timestamp);
    event ChairmanElected(address indexed chairman, uint256 term, uint256 timestamp);
    event ChairmanRecalled(address indexed chairman, uint256 timestamp);
    event VoteCast(address indexed voter, address indexed candidate, uint256 timestamp);
    event DecisionMade(bytes32 indexed decisionHash, uint256 votesFor, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyCouncil() {
        if (tumenToSeat[msg.sender] == 0) revert NotCouncilMember();
        _;
    }
    
    modifier onlyChairman() {
        if (msg.sender != chairman) revert NotChairman();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(uint256 _ulasId, string memory _name) {
        ulasId = _ulasId;
        name = _name;
        owner = msg.sender;
    }
    
    /* ==================== TUMEN CANDIDATE & VOTING ==================== */
    
    // Candidate registration for council seats
    address[] public tumenCandidates;                    // All Түмэн candidates
    mapping(address => bool) public isCandidate;
    mapping(address => uint256) public candidateVotes;   // Vote count per candidate
    mapping(address => address) public tumenVote;        // Tүмэн => voted for
    mapping(address => bool) public isTumen;             // Registered Түмэн leaders
    
    event CandidateRegistered(address indexed candidate, uint256 timestamp);
    event TumenVoteCast(address indexed tumen, address indexed candidate, uint256 timestamp);
    event Top10Selected(address[10] topCandidates, uint256 timestamp);
    
    /**
     * @notice Register as Түмэн candidate for council
     */
    function registerAsCandidate() external {
        require(!isCandidate[msg.sender], "Already candidate");
        
        isCandidate[msg.sender] = true;
        tumenCandidates.push(msg.sender);
        
        emit CandidateRegistered(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Register Түмэн leader (can vote)
     */
    function registerTumen(address tumenLeader) external onlyOwner {
        isTumen[tumenLeader] = true;
    }
    
    /**
     * @notice Түмэн votes for candidate
     */
    function voteForCouncilCandidate(address candidate) external {
        require(isTumen[msg.sender], "Not a Tumen leader");
        require(isCandidate[candidate], "Not a candidate");
        
        // Remove previous vote
        address previousVote = tumenVote[msg.sender];
        if (previousVote != address(0)) {
            candidateVotes[previousVote]--;
        }
        
        // Cast new vote
        tumenVote[msg.sender] = candidate;
        candidateVotes[candidate]++;
        
        emit TumenVoteCast(msg.sender, candidate, block.timestamp);
    }
    
    /**
     * @notice Finalize election and select top-10 candidates
     * @dev Only owner can finalize
     */
    function finalizeCouncilElection() external onlyOwner {
        require(tumenCandidates.length >= COUNCIL_SIZE, "Not enough candidates");
        
        // Get top 10 by votes (simple bubble sort for clarity)
        address[] memory sorted = new address[](tumenCandidates.length);
        for (uint256 i = 0; i < tumenCandidates.length; i++) {
            sorted[i] = tumenCandidates[i];
        }
        
        // Sort by votes (descending)
        for (uint256 i = 0; i < sorted.length; i++) {
            for (uint256 j = i + 1; j < sorted.length; j++) {
                if (candidateVotes[sorted[i]] < candidateVotes[sorted[j]]) {
                    address temp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = temp;
                }
            }
        }
        
        // Set top 10 to council
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            address leader = sorted[i];
            councilSeat[i] = leader;
            tumenToSeat[leader] = i + 1;
        }
        
        activeMemberCount = COUNCIL_SIZE;
        
        address[10] memory top10;
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            top10[i] = sorted[i];
        }
        
        emit Top10Selected(top10, block.timestamp);
    }
    
    /* ==================== CHAIRMAN ELECTION ==================== */
    
    /**
     * @notice Vote for chairman candidate (council members only)
     * @param candidate Must be a current council member
     */
    function voteForChairman(address candidate) external onlyCouncil {
        require(tumenToSeat[candidate] > 0, "Candidate not in council");
        
        // Remove previous vote if exists
        address previousVote = currentVoteFor[msg.sender];
        if (previousVote != address(0)) {
            votesReceived[previousVote]--;
        }
        
        // Cast new vote
        currentVoteFor[msg.sender] = candidate;
        votesReceived[candidate]++;
        
        emit VoteCast(msg.sender, candidate, block.timestamp);
        
        // Check if candidate has enough votes (majority of 10 = 6)
        if (votesReceived[candidate] >= QUORUM) {
            _electChairman(candidate);
        }
    }
    
    /**
     * @notice Internal: elect chairman
     */
    function _electChairman(address candidate) internal {
        // Check term limits
        if (candidate == chairman) {
            if (chairmanTermsServed >= MAX_TERMS) {
                revert ChairmanTermLimit();
            }
        } else {
            // New chairman, reset terms
            chairmanTermsServed = 0;
        }
        
        chairman = candidate;
        chairmanTermsServed++;
        chairmanElectedAt = block.timestamp;
        chairmanTermEnd = block.timestamp + TERM_DURATION;
        
        // Reset all votes
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            address member = councilSeat[i];
            if (member != address(0)) {
                address votedFor = currentVoteFor[member];
                if (votedFor != address(0)) {
                    votesReceived[votedFor] = 0;
                    currentVoteFor[member] = address(0);
                }
            }
        }
        
        emit ChairmanElected(candidate, chairmanTermsServed, block.timestamp);
    }
    
    /**
     * @notice Recall chairman (requires QUORUM votes)
     */
    function recallChairman() external onlyCouncil {
        // Simple implementation: if called by enough members, recall
        // TODO: Implement proper recall voting
        require(chairman != address(0), "No chairman");
        
        address recalled = chairman;
        chairman = address(0);
        chairmanElectedAt = 0;
        chairmanTermEnd = 0;
        
        emit ChairmanRecalled(recalled, block.timestamp);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get all council members
     */
    function getCouncil() external view returns (address[10] memory) {
        return councilSeat;
    }
    
    /**
     * @notice Check if address is council member
     */
    function isCouncilMember(address addr) external view returns (bool) {
        return tumenToSeat[addr] > 0;
    }
    
    /**
     * @notice Get chairman info
     */
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
    
    /**
     * @notice Check if council is complete (10 members)
     */
    function isCouncilComplete() external view returns (bool) {
        return activeMemberCount == COUNCIL_SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
