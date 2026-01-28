// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GovernanceMyangan (Governance Мянган)
 * @notice NEW Governance layer - Myangan = 10 Zuns = 1,000 people
 * 
 * NOTE: This is a NEW governance contract, separate from legacy Myangan.sol
 * 
 * Structure:
 * - 10 Zun leaders form Myangan Council
 * - Council elects Myangan Leader
 * - Myangan Leader participates in Tumen Council
 * 
 * Integration:
 * - Connects to Tumen for council membership
 * - Tracks 10 Zuns
 */
contract GovernanceMyangan {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotCouncilMember();
    error InvalidZunCount();
    error ZeroAddress();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant COUNCIL_SIZE = 10;  // 10 Zuns
    uint256 public constant QUORUM = 6;         // 6/10 for decisions
    
    /* ==================== STATE ==================== */
    
    // Myangan identity
    uint256 public myanganId;
    string public name;
    address public owner;
    address public tumenContract;  // Parent Tumen
    
    // Council of 10 Zun leaders
    address[10] public councilSeat;
    mapping(address => uint256) public zunToSeat;  // zun => seat (1-10)
    uint256 public activeMemberCount;
    
    // Leader election
    address public leader;
    uint256 public leaderElectedAt;
    mapping(address => address) public currentVoteFor;
    mapping(address => uint256) public votesReceived;
    
    /* ==================== EVENTS ==================== */
    
    event ZunJoined(uint256 indexed seat, address indexed zunLeader, uint256 timestamp);
    event ZunLeft(uint256 indexed seat, address indexed zunLeader, uint256 timestamp);
    event LeaderElected(address indexed leader, uint256 timestamp);
    event VoteCast(address indexed voter, address indexed candidate, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyCouncil() {
        if (zunToSeat[msg.sender] == 0) revert NotCouncilMember();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(uint256 _myanganId, string memory _name, address _tumenContract) {
        myanganId = _myanganId;
        name = _name;
        owner = msg.sender;
        tumenContract = _tumenContract;
    }
    
    /* ==================== COUNCIL MANAGEMENT ==================== */
    
    /**
     * @notice Add Zun leader to council
     */
    function addZunToCouncil(uint256 seat, address zunLeader) external onlyOwner {
        require(seat >= 1 && seat <= COUNCIL_SIZE, "Invalid seat (1-10)");
        require(zunLeader != address(0), "Zero address");
        require(zunToSeat[zunLeader] == 0, "Already member");
        
        uint256 idx = seat - 1;
        
        if (councilSeat[idx] != address(0)) {
            address prev = councilSeat[idx];
            zunToSeat[prev] = 0;
            activeMemberCount--;
            emit ZunLeft(seat, prev, block.timestamp);
        }
        
        councilSeat[idx] = zunLeader;
        zunToSeat[zunLeader] = seat;
        activeMemberCount++;
        
        emit ZunJoined(seat, zunLeader, block.timestamp);
    }
    
    function removeZunFromCouncil(uint256 seat) external onlyOwner {
        require(seat >= 1 && seat <= COUNCIL_SIZE, "Invalid seat");
        
        uint256 idx = seat - 1;
        address zunLeader = councilSeat[idx];
        require(zunLeader != address(0), "Seat empty");
        
        councilSeat[idx] = address(0);
        zunToSeat[zunLeader] = 0;
        activeMemberCount--;
        
        emit ZunLeft(seat, zunLeader, block.timestamp);
    }
    
    /* ==================== LEADER ELECTION ==================== */
    
    /**
     * @notice Council votes for Myangan leader
     */
    function voteForLeader(address candidate) external onlyCouncil {
        require(zunToSeat[candidate] > 0, "Not in council");
        
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
    
    /* ==================== TUMEN INTEGRATION ==================== */
    
    /**
     * @notice Register leader for Tumen council
     */
    function registerForTumenCouncil(uint256 seat) external {
        require(msg.sender == leader || msg.sender == owner, "Not authorized");
        require(tumenContract != address(0), "No Tumen");
        
        // Call Tumen.addMyanganToCouncil()
        (bool success,) = tumenContract.call(
            abi.encodeWithSignature(
                "addMyanganToCouncil(uint256,address)",
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
        return zunToSeat[addr] > 0;
    }
    
    function isCouncilComplete() external view returns (bool) {
        return activeMemberCount == COUNCIL_SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setTumenContract(address _tumenContract) external onlyOwner {
        tumenContract = _tumenContract;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
