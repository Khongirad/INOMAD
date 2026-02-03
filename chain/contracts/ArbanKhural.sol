// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VotingCenter.sol";

/**
 * @title ArbanKhural
 * @notice Arban-level legislative assembly (10 family representatives)
 * 
 * Structure:
 * - 10 families per Arban
 * - Each family chooses 1 representative (husband OR wife)
 * - Representatives vote on Arban-level proposals
 * - Decisions: local budget, projects, Arban leader election
 * 
 * Integration:
 * - Uses VotingCenter for proposal/vote management
 * - Representatives have KHURAL_ROLE in VotingCenter
 * - Delegates 1 representative to ZunKhural
 */
contract ArbanKhural is AccessControl {
    bytes32 public constant REPRESENTATIVE_ROLE = keccak256("REPRESENTATIVE_ROLE");
    bytes32 public constant LEADER_ROLE = keccak256("LEADER_ROLE");
    
    VotingCenter public votingCenter;
    uint256 public arbanId;
    string public arbanName;
    
    // Representatives (max 10)
    address[] public representatives;
    mapping(address => bool) public isRepresentative;
    mapping(address => uint256) public familyArbanId; // rep => family Arban ID
    
    // Zun delegation
    address public zunDelegate;
    uint256 public parentZunId;
    
    // Stats
    uint256 public totalProposalsCreated;
    uint256 public lastElection;
    
    // Events
    event RepresentativeAdded(address indexed representative, uint256 indexed familyId);
    event RepresentativeRemoved(address indexed representative);
    event ZunDelegateElected(address indexed delegate);
    event LeaderElected(address indexed leader);
    
    constructor(
        address admin,
        uint256 _arbanId,
        string memory _arbanName,
        address _votingCenter
    ) {
        require(admin != address(0), "Invalid admin");
        require(_votingCenter != address(0), "Invalid voting center");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        arbanId = _arbanId;
        arbanName = _arbanName;
        votingCenter = VotingCenter(_votingCenter);
    }
    
    /**
     * @notice Add a family representative to this Arban
     * @param rep Representative address
     * @param familyId Family Arban ID
     */
    function addRepresentative(address rep, uint256 familyId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(representatives.length < 10, "Max 10 representatives");
        require(!isRepresentative[rep], "Already representative");
        require(rep != address(0), "Invalid address");
        
        representatives.push(rep);
        isRepresentative[rep] = true;
        familyArbanId[rep] = familyId;
        
        _grantRole(REPRESENTATIVE_ROLE, rep);
        
        // Grant KHURAL_ROLE in VotingCenter
        votingCenter.grantRole(votingCenter.KHURAL_ROLE(), rep);
        
        emit RepresentativeAdded(rep, familyId);
    }
    
    /**
     * @notice Remove a representative
     * @param rep Representative address
     */
    function removeRepresentative(address rep) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(isRepresentative[rep], "Not a representative");
        
        isRepresentative[rep] = false;
        delete familyArbanId[rep];
        
        // Remove from array (inefficient but rare operation)
        for (uint256 i = 0; i < representatives.length; i++) {
            if (representatives[i] == rep) {
                representatives[i] = representatives[representatives.length - 1];
                representatives.pop();
                break;
            }
        }
        
        _revokeRole(REPRESENTATIVE_ROLE, rep);
        votingCenter.revokeRole(votingCenter.KHURAL_ROLE(), rep);
        
        emit RepresentativeRemoved(rep);
    }
    
    /**
     * @notice Get Arban info for creating proposal
     * @dev Representatives should call VotingCenter.createProposal() directly
     * This helper returns the arbanId needed for proposal creation
     */
    function getProposalInfo() external view returns (
        uint8 level,
        uint256 id
    ) {
        return (1, arbanId);
    }
    
    /**
     * @notice Track proposal created by a representative
     * @dev Called after representative creates proposal in VotingCenter
     */
    function recordProposal(uint256 proposalId) external onlyRole(REPRESENTATIVE_ROLE) {
        totalProposalsCreated++;
    }
    
    /**
     * @notice Elect Zun delegate from this Arban
     * @param delegate Delegate address
     */
    function electZunDelegate(address delegate) 
        external 
        onlyRole(REPRESENTATIVE_ROLE) 
    {
        require(isRepresentative[delegate], "Must be representative");
        zunDelegate = delegate;
        emit ZunDelegateElected(delegate);
    }
    
    /**
     * @notice Elect Arban leader
     * @param leader Leader address
     */
    function electLeader(address leader) 
        external 
        onlyRole(REPRESENTATIVE_ROLE) 
    {
        require(isRepresentative[leader], "Must be representative");
        
        _grantRole(LEADER_ROLE, leader);
        lastElection = block.timestamp;
        
        emit LeaderElected(leader);
    }
    
    /**
     * @notice Set parent Zun ID
     */
    function setParentZun(uint256 zunId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        parentZunId = zunId;
    }
    
    // View functions
    
    function getRepresentatives() external view returns (address[] memory) {
        return representatives;
    }
    
    function getRepresentativeCount() external view returns (uint256) {
        return representatives.length;
    }
    
    function isFull() external view returns (bool) {
        return representatives.length >= 10;
    }
    
    function getInfo() external view returns (
        uint256 id,
        string memory name,
        uint256 repCount,
        address delegate,
        uint256 parentZun
    ) {
        return (
            arbanId,
            arbanName,
            representatives.length,
            zunDelegate,
            parentZunId
        );
    }
}
