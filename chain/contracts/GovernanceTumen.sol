// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GovernanceTumen (Governance Түмэн)
 * @notice NEW Governance layer - Tumen = 10 Myangans = 10,000 people
 * 
 * NOTE: This is a NEW governance contract, separate from legacy Tumen.sol
 * 
 * Structure:
 * - 10 Myangan leaders form Tumen Council
 * - Council elects Tumen Leader
 * - Tumen Leader can run for Ulas Council (top-10 election)
 * 
 * Integration:
 * - Connects to Ulas for council candidacy
 * - Tracks 10 Myangans
 */
contract GovernanceTumen {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotCouncilMember();
    error InvalidMyanganCount();
    error ZeroAddress();
    error AlreadyVoted();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant COUNCIL_SIZE = 10;  // 10 Myangans
    uint256 public constant QUORUM = 6;         // 6/10 for decisions
    
    /* ==================== STATE ==================== */
    
    // Tumen identity
    uint256 public tumenId;
    string public name;
    address public owner;
    address public ulasContract;  // Parent Ulas
    
    // Council of 10 Myangan leaders
    address[10] public councilSeat;
    mapping(address => uint256) public myanganToSeat;  // myangan => seat (1-10)
    uint256 public activeMemberCount;
    
    // Leader election
    address public leader;
    uint256 public leaderElectedAt;
    mapping(address => address) public currentVoteFor;
    mapping(address => uint256) public votesReceived;
    
    /* ==================== EVENTS ==================== */
    
    event MyanganJoined(uint256 indexed seat, address indexed myanganLeader, uint256 timestamp);
    event MyanganLeft(uint256 indexed seat, address indexed myanganLeader, uint256 timestamp);
    event LeaderElected(address indexed leader, uint256 timestamp);
    event VoteCast(address indexed voter, address indexed candidate, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyCouncil() {
        if (myanganToSeat[msg.sender] == 0) revert NotCouncilMember();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(uint256 _tumenId, string memory _name, address _ulasContract) {
        tumenId = _tumenId;
        name = _name;
        owner = msg.sender;
        ulasContract = _ulasContract;
    }
    
    /* ==================== COUNCIL MANAGEMENT ==================== */
    
    /**
     * @notice Add Myangan leader to council
     */
    function addMyanganToCouncil(uint256 seat, address myanganLeader) external onlyOwner {
        require(seat >= 1 && seat <= COUNCIL_SIZE, "Invalid seat (1-10)");
        require(myanganLeader != address(0), "Zero address");
        require(myanganToSeat[myanganLeader] == 0, "Already member");
        
        uint256 idx = seat - 1;
        
        if (councilSeat[idx] != address(0)) {
            address prev = councilSeat[idx];
            myanganToSeat[prev] = 0;
            activeMemberCount--;
            emit MyanganLeft(seat, prev, block.timestamp);
        }
        
        councilSeat[idx] = myanganLeader;
        myanganToSeat[myanganLeader] = seat;
        activeMemberCount++;
        
        emit MyanganJoined(seat, myanganLeader, block.timestamp);
    }
    
    function removeMyanganFromCouncil(uint256 seat) external onlyOwner {
        require(seat >= 1 && seat <= COUNCIL_SIZE, "Invalid seat");
        
        uint256 idx = seat - 1;
        address myanganLeader = councilSeat[idx];
        require(myanganLeader != address(0), "Seat empty");
        
        councilSeat[idx] = address(0);
        myanganToSeat[myanganLeader] = 0;
        activeMemberCount--;
        
        emit MyanganLeft(seat, myanganLeader, block.timestamp);
    }
    
    /* ==================== LEADER ELECTION ==================== */
    
    /**
     * @notice Council votes for Tumen leader
     */
    function voteForLeader(address candidate) external onlyCouncil {
        require(myanganToSeat[candidate] > 0, "Not in council");
        
        // Remove previous vote
        address previousVote = currentVoteFor[msg.sender];
        if (previousVote != address(0)) {
            votesReceived[previousVote]--;
        }
        
        // Cast vote
        currentVoteFor[msg.sender] = candidate;
        votesReceived[candidate]++;
        
        emit VoteCast(msg.sender, candidate, block.timestamp);
        
        // Auto-elect if quorum reached
        if (votesReceived[candidate] >= QUORUM) {
            _electLeader(candidate);
        }
    }
    
    function _electLeader(address candidate) internal {
        leader = candidate;
        leaderElectedAt = block.timestamp;
        
        // Reset votes
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            address member = councilSeat[i];
            if (member != address(0)) {
                address voted = currentVoteFor[member];
                if (voted != address(0)) {
                    votesReceived[voted] = 0;
                    currentVoteFor[member] = address(0);
                }
            }
        }
        
        emit LeaderElected(candidate, block.timestamp);
    }
    
    /* ==================== ULAS INTEGRATION ==================== */
    
    /**
     * @notice Leader registers as Ulas council candidate
     * @dev Calls Ulas.registerAsCandidate()
     */
    function registerForUlasCouncil() external {
        require(msg.sender == leader, "Not leader");
        require(ulasContract != address(0), "No Ulas");
        
        // Call Ulas.registerAsCandidate()
        (bool success,) = ulasContract.call(
            abi.encodeWithSignature("registerAsCandidate()")
        );
        require(success, "Registration failed");
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getCouncil() external view returns (address[10] memory) {
        return councilSeat;
    }
    
    function isCouncilMember(address addr) external view returns (bool) {
        return myanganToSeat[addr] > 0;
    }
    
    function isCouncilComplete() external view returns (bool) {
        return activeMemberCount == COUNCIL_SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setUlasContract(address _ulasContract) external onlyOwner {
        ulasContract = _ulasContract;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
