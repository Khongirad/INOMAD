// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ulas} from "./Ulas.sol";

/**
 * @title UlasRegistry
 * @notice Registry of all Ulas units in the Siberian Confederation
 * 
 * At 145M population:
 * - 1,450 Ulas (each ~100,000 people)
 * - Each Ulas = Council of 10 Түмэнs
 * 
 * Forms the basis of Конфедеративный Хурал (1,450 representatives)
 */
contract UlasRegistry {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error UlasAlreadyExists();
    error UlasNotFound();
    error ZeroAddress();
    error NotUlasChairman();
    
    /* ==================== STATE ==================== */
    
    address public owner;
    
    // Registry of all Ulas
    uint256 public nextUlasId = 1;
    mapping(uint256 => address) public ulasById;        // ulasId => Ulas contract
    mapping(address => uint256) public ulasIdByAddress; // Ulas contract => ulasId
    uint256 public totalUlas;
    
    // Chairman mapping for Конфедеративный Хурал
    mapping(address => bool) public isUlasChairman;     // chairman => bool
    mapping(uint256 => address) public chairmanByUlas;  // ulasId => chairman
    
    /* ==================== EVENTS ==================== */
    
    event UlasCreated(uint256 indexed ulasId, address indexed ulasContract, string name, uint256 timestamp);
    event UlasRemoved(uint256 indexed ulasId, address indexed ulasContract, uint256 timestamp);
    event ChairmanUpdated(uint256 indexed ulasId, address indexed oldChairman, address indexed newChairman);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
    }
    
    /* ==================== ULAS MANAGEMENT ==================== */
    
    /**
     * @notice Create a new Ulas
     * @param name Name of the Ulas
     * @return ulasId The new Ulas ID
     * @return ulasContract The deployed Ulas contract address
     */
    function createUlas(string calldata name) external onlyOwner returns (uint256 ulasId, address ulasContract) {
        ulasId = nextUlasId++;
        
        // Deploy new Ulas contract
        Ulas ulas = new Ulas(ulasId, name);
        ulasContract = address(ulas);
        
        ulasById[ulasId] = ulasContract;
        ulasIdByAddress[ulasContract] = ulasId;
        totalUlas++;
        
        emit UlasCreated(ulasId, ulasContract, name, block.timestamp);
    }
    
    /**
     * @notice Register existing Ulas contract
     */
    function registerUlas(address ulasContract) external onlyOwner returns (uint256 ulasId) {
        require(ulasContract != address(0), "Zero address");
        require(ulasIdByAddress[ulasContract] == 0, "Already registered");
        
        ulasId = nextUlasId++;
        
        ulasById[ulasId] = ulasContract;
        ulasIdByAddress[ulasContract] = ulasId;
        totalUlas++;
        
        emit UlasCreated(ulasId, ulasContract, "", block.timestamp);
    }
    
    /**
     * @notice Update chairman for an Ulas (called when chairman changes)
     */
    function updateChairman(uint256 ulasId, address newChairman) external {
        address ulasContract = ulasById[ulasId];
        if (ulasContract == address(0)) revert UlasNotFound();
        
        // Only the Ulas contract can update its chairman
        require(msg.sender == ulasContract || msg.sender == owner, "Not authorized");
        
        address oldChairman = chairmanByUlas[ulasId];
        
        if (oldChairman != address(0)) {
            isUlasChairman[oldChairman] = false;
        }
        
        chairmanByUlas[ulasId] = newChairman;
        if (newChairman != address(0)) {
            isUlasChairman[newChairman] = true;
        }
        
        emit ChairmanUpdated(ulasId, oldChairman, newChairman);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get Ulas by ID
     */
    function getUlas(uint256 ulasId) external view returns (address) {
        return ulasById[ulasId];
    }
    
    /**
     * @notice Count of all Ulas chairmen (for Конфедеративный Хурал)
     */
    function getKhuralSize() external view returns (uint256) {
        return totalUlas;
    }
    
    /**
     * @notice Check if address can vote in Конфедеративный Хурал
     */
    function canVoteInKhural(address addr) external view returns (bool) {
        return isUlasChairman[addr];
    }
    
    /* ==================== ADMIN ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
