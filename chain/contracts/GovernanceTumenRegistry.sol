// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GovernanceTumenRegistry
 * @notice Registry of all GovernanceTumen units (NEW governance layer)
 * 
 * At 145M population:
 * - 14,500 Tumen (each ~10,000 people)
 * - Each Tumen has council of 10 Myangans
 * - Leaders can run for Ulas council
 */
contract GovernanceTumenRegistry {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error TumenNotFound();
    error ZeroAddress();
    
    /* ==================== STATE ==================== */
    
    address public owner;
    
    // Registry
    uint256 public nextTumenId = 1;
    mapping(uint256 => address) public tumenById;
    mapping(address => uint256) public tumenIdByAddress;
    uint256 public totalTumen;
    
    // Leader tracking (for Ulas voting)
    mapping(address => bool) public isTumenLeader;
    mapping(uint256 => address) public leaderByTumen;
    
    /* ==================== EVENTS ==================== */
    
    event TumenCreated(uint256 indexed tumenId, address indexed tumenContract, string name, uint256 timestamp);
    event LeaderUpdated(uint256 indexed tumenId, address indexed oldLeader, address indexed newLeader);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
    }
    
    /* ==================== TUMEN MANAGEMENT ==================== */
    
    function registerTumen(
        address tumenContract,
        string calldata name
    ) external onlyOwner returns (uint256 tumenId) {
        require(tumenContract != address(0), "Zero address");
        require(tumenIdByAddress[tumenContract] == 0, "Already registered");
        
        tumenId = nextTumenId++;
        tumenById[tumenId] = tumenContract;
        tumenIdByAddress[tumenContract] = tumenId;
        totalTumen++;
        
        emit TumenCreated(tumenId, tumenContract, name, block.timestamp);
    }
    
    function updateLeader(uint256 tumenId, address newLeader) external {
        address tumenContract = tumenById[tumenId];
        if (tumenContract == address(0)) revert TumenNotFound();
        
        require(
            msg.sender == tumenContract || msg.sender == owner,
            "Not authorized"
        );
        
        address oldLeader = leaderByTumen[tumenId];
        
        if (oldLeader != address(0)) {
            isTumenLeader[oldLeader] = false;
        }
        
        leaderByTumen[tumenId] = newLeader;
        if (newLeader != address(0)) {
            isTumenLeader[newLeader] = true;
        }
        
        emit LeaderUpdated(tumenId, oldLeader, newLeader);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getTumen(uint256 tumenId) external view returns (address) {
        return tumenById[tumenId];
    }
    
    function canVoteInUlas(address addr) external view returns (bool) {
        return isTumenLeader[addr];
    }
    
    /* ==================== ADMIN ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
