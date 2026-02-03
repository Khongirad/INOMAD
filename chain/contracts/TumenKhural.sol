// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VotingCenter.sol";

/**
 * @title TumenKhural
 * @notice Tumen-level (National) legislative assembly (10 Myangan delegates)
 * 
 * Structure:
 * - 10 Myangans per Tumen = 10 delegates
 * - Each Myangan elects 1 delegate to TumenKhural
 * - Delegates vote on national proposals
 * - Decisions: national laws, constitution amendments, national chairman
 * 
 * Integration:
 * - Uses VotingCenter for proposal/vote management
 * - Delegates have KHURAL_ROLE in VotingCenter
 * - Highest level of legislative authority
 */
contract TumenKhural is AccessControl {
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");
    
    VotingCenter public votingCenter;
    uint256 public tumenId;
    string public tumenName;
    
    // Delegates (max 10 from Myangans)
    address[] public delegates;
    mapping(address => bool) public isDelegate;
    mapping(address => uint256) public myangangId; // delegate => Myangan ID
    
    // National leadership
    address public nationalChairman;
    
    // Stats
    uint256 public totalProposalsCreated;
    uint256 public lastElection;
    uint256 public constitutionalAmendments;
    
    // Events
    event DelegateAdded(address indexed delegate, uint256 indexed myangangId);
    event DelegateRemoved(address indexed delegate);
    event ChairmanElected(address indexed chairman);
    event ConstitutionalAmendment(uint256 indexed proposalId, string title);
    
    constructor(
        address admin,
        uint256 _tumenId,
        string memory _tumenName,
        address _votingCenter
    ) {
        require(admin != address(0), "Invalid admin");
        require(_votingCenter != address(0), "Invalid voting center");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        tumenId = _tumenId;
        tumenName = _tumenName;
        votingCenter = VotingCenter(_votingCenter);
    }
    
    /**
     * @notice Add a Myangan delegate to this Tumen
     * @param delegate Delegate address
     * @param _myangangId Source Myangan ID
     */
    function addDelegate(address delegate, uint256 _myangangId) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(delegates.length < 10, "Max 10 delegates");
        require(!isDelegate[delegate], "Already delegate");
        require(delegate != address(0), "Invalid address");
        
        delegates.push(delegate);
        isDelegate[delegate] = true;
        myangangId[delegate] = _myangangId;
        
        _grantRole(DELEGATE_ROLE, delegate);
        
        // Grant KHURAL_ROLE in VotingCenter
        votingCenter.grantRole(votingCenter.KHURAL_ROLE(), delegate);
        
        emit DelegateAdded(delegate, _myangangId);
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
        delete myangangId[delegate];
        
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
     * @notice Get Tumen info for creating proposal
     * @dev Delegates should call VotingCenter.createProposal() directly
     */
    function getProposalInfo() external view returns (
        uint8 level,
        uint256 id
    ) {
        return (4, tumenId);
    }
    
    /**
     * @notice Track proposal created by a delegate
     * @param proposalId Proposal ID
     * @param isConstitutional True if constitutional amendment
     */
    function recordProposal(uint256 proposalId, bool isConstitutional) 
        external 
        onlyRole(DELEGATE_ROLE) 
    {
        totalProposalsCreated++;
        if (isConstitutional) {
            constitutionalAmendments++;
        }
    }
    
    /**
     * @notice Elect national chairman
     * @param chairman Chairman address
     */
    function electChairman(address chairman) 
        external 
        onlyRole(DELEGATE_ROLE) 
    {
        require(isDelegate[chairman], "Must be delegate");
        
        nationalChairman = chairman;
        _grantRole(CHAIRMAN_ROLE, chairman);
        lastElection = block.timestamp;
        
        emit ChairmanElected(chairman);
    }
    
    /**
     * @notice Record constitutional amendment
     * @param proposalId Proposal ID
     * @param title Amendment title
     */
    function recordConstitutionalAmendment(
        uint256 proposalId,
        string calldata title
    ) external onlyRole(CHAIRMAN_ROLE) {
        emit ConstitutionalAmendment(proposalId, title);
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
        address chairman,
        uint256 amendments
    ) {
        return (
            tumenId,
            tumenName,
            delegates.length,
            nationalChairman,
            constitutionalAmendments
        );
    }
    
    function getNationalStats() external view returns (
        uint256 proposals,
        uint256 amendments,
        uint256 lastElectionTime,
        address currentChairman
    ) {
        return (
            totalProposalsCreated,
            constitutionalAmendments,
            lastElection,
            nationalChairman
        );
    }
}
