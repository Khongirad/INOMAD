// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VotingCenter.sol";

/**
 * @title MyangangKhural
 * @notice Myangan-level legislative assembly (10 Zun delegates)
 * 
 * Structure:
 * - 10 Zuns per Myangan = 10 delegates
 * - Each Zun elects 1 delegate to MyangangKhural
 * - Delegates vote on Myangan-level proposals
 * - Decisions: provincial laws, infrastructure, Myangan leader
 * 
 * Integration:
 * - Uses VotingCenter for proposal/vote management
 * - Delegates have KHURAL_ROLE in VotingCenter
 * - Elects 1 delegate to TumenKhural
 */
contract MyangangKhural is AccessControl {
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant LEADER_ROLE = keccak256("LEADER_ROLE");
    
    VotingCenter public votingCenter;
    uint256 public myangangId;
    string public myangangName;
    
    // Delegates (max 10 from Zuns)
    address[] public delegates;
    mapping(address => bool) public isDelegate;
    mapping(address => uint256) public zunId; // delegate => Zun ID
    
    // Tumen delegation
    address public tumenDelegate;
    uint256 public parentTumenId;
    
    // Stats
    uint256 public totalProposalsCreated;
    uint256 public lastElection;
    
    // Events
    event DelegateAdded(address indexed delegate, uint256 indexed zunId);
    event DelegateRemoved(address indexed delegate);
    event TumenDelegateElected(address indexed delegate);
    event LeaderElected(address indexed leader);
    
    constructor(
        address admin,
        uint256 _myangangId,
        string memory _myangangName,
        address _votingCenter
    ) {
        require(admin != address(0), "Invalid admin");
        require(_votingCenter != address(0), "Invalid voting center");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        myangangId = _myangangId;
        myangangName = _myangangName;
        votingCenter = VotingCenter(_votingCenter);
    }
    
    /**
     * @notice Add a Zun delegate to this Myangan
     * @param delegate Delegate address
     * @param _zunId Source Zun ID
     */
    function addDelegate(address delegate, uint256 _zunId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(delegates.length < 10, "Max 10 delegates");
        require(!isDelegate[delegate], "Already delegate");
        require(delegate != address(0), "Invalid address");
        
        delegates.push(delegate);
        isDelegate[delegate] = true;
        zunId[delegate] = _zunId;
        
        _grantRole(DELEGATE_ROLE, delegate);
        
        // Grant KHURAL_ROLE in VotingCenter
        votingCenter.grantRole(votingCenter.KHURAL_ROLE(), delegate);
        
        emit DelegateAdded(delegate, _zunId);
    }
    
    /**
     * @notice Remove a delegate
     * @param delegate Delegate address
     */
    function removeDelegate(address delegate) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(isDelegate[delegate], "Not a delegate");
        
        isDelegate[delegate] = false;
        delete zunId[delegate];
        
        // Remove from array
        for (uint256 i = 0; i < delegates.length; i++) {
            if (delegates[i] == delegate) {
                delegates[i] = delegates[delegates.length - 1];
                delegates.pop();
                break;
            }
        }
        
        _revokeRole(DELEGATE_ROLE, delegate);
        votingCenter.revokeRole(votingCenter.KHURAL_ROLE(), delegate);
        
        emit DelegateRemoved(delegate);
    }
    
    /**
     * @notice Get Myangan info for creating proposal
     * @dev Delegates should call VotingCenter.createProposal() directly
     */
    function getProposalInfo() external view returns (
        uint8 level,
        uint256 id
    ) {
        return (3, myangangId);
    }
    
    /**
     * @notice Track proposal created by a delegate
     */
    function recordProposal(uint256 proposalId) external onlyRole(DELEGATE_ROLE) {
        totalProposalsCreated++;
    }
    
    /**
     * @notice Elect Tumen delegate from this Myangan
     * @param delegate Delegate address
     */
    function electTumenDelegate(address delegate) 
        external 
        onlyRole(DELEGATE_ROLE) 
    {
        require(isDelegate[delegate], "Must be delegate");
        tumenDelegate = delegate;
        emit TumenDelegateElected(delegate);
    }
    
    /**
     * @notice Elect Myangan leader
     * @param leader Leader address
     */
    function electLeader(address leader) 
        external 
        onlyRole(DELEGATE_ROLE) 
    {
        require(isDelegate[leader], "Must be delegate");
        
        _grantRole(LEADER_ROLE, leader);
        lastElection = block.timestamp;
        
        emit LeaderElected(leader);
    }
    
    /**
     * @notice Set parent Tumen ID
     */
    function setParentTumen(uint256 tumenId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        parentTumenId = tumenId;
    }
    
    // View functions
    
    function getDelegates() external view returns (address[] memory) {
        return delegates;
    }
    
    function getDelegateCount() external view returns (uint256) {
        return delegates.length;
    }
    
    function isFull() external view returns (bool) {
        return delegates.length >= 10;
    }
    
    function getInfo() external view returns (
        uint256 id,
        string memory name,
        uint256 delegateCount,
        address tumenDel,
        uint256 parentTumen
    ) {
        return (
            myangangId,
            myangangName,
            delegates.length,
            tumenDelegate,
            parentTumenId
        );
    }
}
