// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VotingCenter.sol";

/**
 * @title ZunKhural
 * @notice Zun-level legislative assembly (10 Arban delegates)
 * 
 * Structure:
 * - 10 Arbans per Zun = 10 delegates
 * - Each Arban elects 1 delegate to ZunKhural
 * - Delegates vote on Zun-level proposals
 * - Decisions: regional policies, Zun elder election, budget
 * 
 * Integration:
 * - Uses VotingCenter for proposal/vote management
 * - Delegates have KHURAL_ROLE in VotingCenter
 * - Elects 1 delegate to MyangangKhural
 */
contract ZunKhural is AccessControl {
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant ELDER_ROLE = keccak256("ELDER_ROLE");
    
    VotingCenter public votingCenter;
    uint256 public zunId;
    string public zunName;
    
    // Delegates (max 10 from Arbans)
    address[] public delegates;
    mapping(address => bool) public isDelegate;
    mapping(address => uint256) public arbanId; // delegate => Arban ID
    
    // Myangan delegation
    address public myangangDelegate;
    uint256 public parentMyangangId;
    
    // Stats
    uint256 public totalProposalsCreated;
    uint256 public lastElection;
    
    // Events
    event DelegateAdded(address indexed delegate, uint256 indexed arbanId);
    event DelegateRemoved(address indexed delegate);
    event MyangangDelegateElected(address indexed delegate);
    event ElderElected(address indexed elder);
    
    constructor(
        address admin,
        uint256 _zunId,
        string memory _zunName,
        address _votingCenter
    ) {
        require(admin != address(0), "Invalid admin");
        require(_votingCenter != address(0), "Invalid voting center");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        zunId = _zunId;
        zunName = _zunName;
        votingCenter = VotingCenter(_votingCenter);
    }
    
    /**
     * @notice Add an Arban delegate to this Zun
     * @param delegate Delegate address
     * @param _arbanId Source Arban ID
     */
    function addDelegate(address delegate, uint256 _arbanId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(delegates.length < 10, "Max 10 delegates");
        require(!isDelegate[delegate], "Already delegate");
        require(delegate != address(0), "Invalid address");
        
        delegates.push(delegate);
        isDelegate[delegate] = true;
        arbanId[delegate] = _arbanId;
        
        _grantRole(DELEGATE_ROLE, delegate);
        
        // Grant KHURAL_ROLE in VotingCenter
        votingCenter.grantRole(votingCenter.KHURAL_ROLE(), delegate);
        
        emit DelegateAdded(delegate, _arbanId);
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
        delete arbanId[delegate];
        
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
     * @notice Get Zun info for creating proposal
     * @dev Delegates should call VotingCenter.createProposal() directly
     */
    function getProposalInfo() external view returns (
        uint8 level,
        uint256 id
    ) {
        return (2, zunId);
    }
    
    /**
     * @notice Track proposal created by a delegate
     */
    function recordProposal(uint256 proposalId) external onlyRole(DELEGATE_ROLE) {
        totalProposalsCreated++;
    }
    
    /**
     * @notice Elect Myangan delegate from this Zun
     * @param delegate Delegate address
     */
    function electMyangangDelegate(address delegate) 
        external 
        onlyRole(DELEGATE_ROLE) 
    {
        require(isDelegate[delegate], "Must be delegate");
        myangangDelegate = delegate;
        emit MyangangDelegateElected(delegate);
    }
    
    /**
     * @notice Elect Zun elder
     * @param elder Elder address
     */
    function electElder(address elder) 
        external 
        onlyRole(DELEGATE_ROLE) 
    {
        require(isDelegate[elder], "Must be delegate");
        
        _grantRole(ELDER_ROLE, elder);
        lastElection = block.timestamp;
        
        emit ElderElected(elder);
    }
    
    /**
     * @notice Set parent Myangan ID
     */
    function setParentMyangan(uint256 myangangId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        parentMyangangId = myangangId;
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
        address myangangDel,
        uint256 parentMyangan
    ) {
        return (
            zunId,
            zunName,
            delegates.length,
            myangangDelegate,
            parentMyangangId
        );
    }
}
