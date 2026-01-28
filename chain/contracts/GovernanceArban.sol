// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GovernanceArban (Governance Арбан)
 * @notice NEW Governance layer - Arban = 10 citizens = smallest unit
 * 
 * NOTE: This is a NEW governance contract, separate from legacy Arban.sol
 * 
 * Structure:
 * - 10 citizens form Arban
 * - Citizens elect Arban Leader
 * - Arban Leader participates in Zun Council
 * 
 * Integration:
 * - Connects to GovernanceZun for council membership
 * - Tracks 10 citizens (via seat IDs from CitizenRegistry)
 */
contract GovernanceArban {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotMember();
    error InvalidCitizenCount();
    error ZeroAddress();
    error AlreadyMember();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant SIZE = 10;  // 10 citizens
    uint256 public constant QUORUM = 6;  // 6/10 for decisions
    
    /* ==================== STATE ==================== */
    
    // Arban identity
    uint256 public arbanId;
    string public name;
    address public owner;
    address public zunContract;  // Parent Zun
    
    // Members (10 citizens)
    address[10] public members;
    mapping(address => uint256) public memberPosition;  // citizen => position (1-10)
    uint256 public activeMemberCount;
    
    // Leader election
    address public leader;
    uint256 public leaderElectedAt;
    mapping(address => address) public currentVoteFor;
    mapping(address => uint256) public votesReceived;
    
    /* ==================== EVENTS ==================== */
    
    event MemberJoined(uint256 indexed position, address indexed citizen, uint256 timestamp);
    event MemberLeft(uint256 indexed position, address indexed citizen, uint256 timestamp);
    event LeaderElected(address indexed leader, uint256 timestamp);
    event VoteCast(address indexed voter, address indexed candidate, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyMember() {
        if (memberPosition[msg.sender] == 0) revert NotMember();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(uint256 _arbanId, string memory _name, address _zunContract) {
        arbanId = _arbanId;
        name = _name;
        owner = msg.sender;
        zunContract = _zunContract;
    }
    
    /* ==================== MEMBER MANAGEMENT ==================== */
    
    /**
     * @notice Add citizen to Arban
     */
    function addMember(uint256 position, address citizen) external onlyOwner {
        require(position >= 1 && position <= SIZE, "Invalid position (1-10)");
        require(citizen != address(0), "Zero address");
        require(memberPosition[citizen] == 0, "Already member");
        
        uint256 idx = position - 1;
        
        if (members[idx] != address(0)) {
            address prev = members[idx];
            memberPosition[prev] = 0;
            activeMemberCount--;
            emit MemberLeft(position, prev, block.timestamp);
        }
        
        members[idx] = citizen;
        memberPosition[citizen] = position;
        activeMemberCount++;
        
        emit MemberJoined(position, citizen, block.timestamp);
    }
    
    function removeMember(uint256 position) external onlyOwner {
        require(position >= 1 && position <= SIZE, "Invalid position");
        
        uint256 idx = position - 1;
        address citizen = members[idx];
        require(citizen != address(0), "Position empty");
        
        members[idx] = address(0);
        memberPosition[citizen] = 0;
        activeMemberCount--;
        
        emit MemberLeft(position, citizen, block.timestamp);
    }
    
    /* ==================== LEADER ELECTION ==================== */
    
    /**
     * @notice Members vote for Arban leader
     */
    function voteForLeader(address candidate) external onlyMember {
        require(memberPosition[candidate] > 0, "Not a member");
        
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
        for (uint256 i = 0; i < SIZE; i++) {
            address member = members[i];
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
    
    /* ==================== ZUN INTEGRATION ==================== */
    
    /**
     * @notice Register leader for Zun council
     */
    function registerForZunCouncil(uint256 seat) external {
        require(msg.sender == leader || msg.sender == owner, "Not authorized");
        require(zunContract != address(0), "No Zun");
        
        // Call GovernanceZun.addArbanToCouncil()
        (bool success,) = zunContract.call(
            abi.encodeWithSignature(
                "addArbanToCouncil(uint256,address)",
                seat,
                leader
            )
        );
        require(success, "Registration failed");
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getMembers() external view returns (address[10] memory) {
        return members;
    }
    
    function isMember(address addr) external view returns (bool) {
        return memberPosition[addr] > 0;
    }
    
    function isFull() external view returns (bool) {
        return activeMemberCount == SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setZunContract(address _zunContract) external onlyOwner {
        zunContract = _zunContract;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
