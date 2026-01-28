// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GovernanceZun (Governance Зуун)
 * @notice NEW Governance layer - Zun = 10 Arbans = 100 people
 * 
 * NOTE: This is a NEW governance contract, separate from legacy Zun.sol
 * 
 * Structure:
 * - 10 Arban leaders form Zun Council
 * - Council elects Zun Leader
 * - Zun Leader participates in Myangan Council
 * 
 * Integration:
 * - Connects to GovernanceMyangan for council membership
 * - Tracks 10 Arbans
 */
contract GovernanceZun {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotCouncilMember();
    error InvalidArbanCount();
    error ZeroAddress();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant COUNCIL_SIZE = 10;  // 10 Arbans
    uint256 public constant QUORUM = 6;         // 6/10 for decisions
    
    /* ==================== STATE ==================== */
    
    // Zun identity
    uint256 public zunId;
    string public name;
    address public owner;
    address public myanganContract;  // Parent Myangan
    
    // Council of 10 Arban leaders
    address[10] public councilSeat;
    mapping(address => uint256) public arbanToSeat;  // arban => seat (1-10)
    uint256 public activeMemberCount;
    
    // Leader election
    address public leader;
    uint256 public leaderElectedAt;
    mapping(address => address) public currentVoteFor;
    mapping(address => uint256) public votesReceived;
    
    /* ==================== EVENTS ==================== */
    
    event ArbanJoined(uint256 indexed seat, address indexed arbanLeader, uint256 timestamp);
    event ArbanLeft(uint256 indexed seat, address indexed arbanLeader, uint256 timestamp);
    event LeaderElected(address indexed leader, uint256 timestamp);
    event VoteCast(address indexed voter, address indexed candidate, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyCouncil() {
        if (arbanToSeat[msg.sender] == 0) revert NotCouncilMember();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(uint256 _zunId, string memory _name, address _myanganContract) {
        zunId = _zunId;
        name = _name;
        owner = msg.sender;
        myanganContract = _myanganContract;
    }
    
    /* ==================== COUNCIL MANAGEMENT ==================== */
    
    /**
     * @notice Add Arban leader to council
     */
    function addArbanToCouncil(uint256 seat, address arbanLeader) external onlyOwner {
        require(seat >= 1 && seat <= COUNCIL_SIZE, "Invalid seat (1-10)");
        require(arbanLeader != address(0), "Zero address");
        require(arbanToSeat[arbanLeader] == 0, "Already member");
        
        uint256 idx = seat - 1;
        
        if (councilSeat[idx] != address(0)) {
            address prev = councilSeat[idx];
            arbanToSeat[prev] = 0;
            activeMemberCount--;
            emit ArbanLeft(seat, prev, block.timestamp);
        }
        
        councilSeat[idx] = arbanLeader;
        arbanToSeat[arbanLeader] = seat;
        activeMemberCount++;
        
        emit ArbanJoined(seat, arbanLeader, block.timestamp);
    }
    
    function removeArbanFromCouncil(uint256 seat) external onlyOwner {
        require(seat >= 1 && seat <= COUNCIL_SIZE, "Invalid seat");
        
        uint256 idx = seat - 1;
        address arbanLeader = councilSeat[idx];
        require(arbanLeader != address(0), "Seat empty");
        
        councilSeat[idx] = address(0);
        arbanToSeat[arbanLeader] = 0;
        activeMemberCount--;
        
        emit ArbanLeft(seat, arbanLeader, block.timestamp);
    }
    
    /* ==================== LEADER ELECTION ==================== */
    
    /**
     * @notice Council votes for Zun leader
     */
    function voteForLeader(address candidate) external onlyCouncil {
        require(arbanToSeat[candidate] > 0, "Not in council");
        
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
    
    /* ==================== MYANGAN INTEGRATION ==================== */
    
    /**
     * @notice Register leader for Myangan council
     */
    function registerForMyanganCouncil(uint256 seat) external {
        require(msg.sender == leader || msg.sender == owner, "Not authorized");
        require(myanganContract != address(0), "No Myangan");
        
        // Call GovernanceMyangan.addZunToCouncil()
        (bool success,) = myanganContract.call(
            abi.encodeWithSignature(
                "addZunToCouncil(uint256,address)",
                seat,
                leader
            )
        );
        require(success, "Registration failed");
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getCouncil() external view returns (address[10] memory) {
        return councilSeat;
    }
    
    function isCouncilMember(address addr) external view returns (bool) {
        return arbanToSeat[addr] > 0;
    }
    
    function isCouncilComplete() external view returns (bool) {
        return activeMemberCount == COUNCIL_SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setMyanganContract(address _myanganContract) external onlyOwner {
        myanganContract = _myanganContract;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
