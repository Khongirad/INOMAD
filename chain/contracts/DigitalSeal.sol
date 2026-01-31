// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DigitalSeal
 * @notice 2-of-2 multisig contract for legal entity agreements
 * @dev Used for all B2B contracts, government contracts, and legally significant documents
 */
contract DigitalSeal is AccessControl {
    // ============ State Variables ============
    
    /// @notice The two signers required for this seal
    address[2] public signers;
    
    /// @notice Required number of approvals (always 2)
    uint8 public constant THRESHOLD = 2;
    
    /// @notice Tracks approvals for each transaction hash
    mapping(bytes32 => mapping(address => bool)) public approvals;
    
    /// @notice Counts approvals per transaction
    mapping(bytes32 => uint8) public approvalCount;
    
    /// @notice Tracks if a transaction has been executed
    mapping(bytes32 => bool) public executed;
    
    /// @notice Metadata for sealed documents
    mapping(bytes32 => SealedDocument) public documents;
    
    // ============ Structs ============
    
    struct SealedDocument {
        bytes32 documentHash;
        uint256 createdAt;
        uint256 executedAt;
        bool exists;
    }
    
    // ============ Events ============
    
    event SealCreated(
        address indexed signer1,
        address indexed signer2,
        uint256 timestamp
    );
    
    event Approved(
        bytes32 indexed txHash,
        address indexed approver,
        uint8 totalApprovals
    );
    
    event Revoked(
        bytes32 indexed txHash,
        address indexed revoker,
        uint8 totalApprovals
    );
    
    event Executed(
        bytes32 indexed txHash,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error NotASigner();
    error AlreadyApproved();
    error NotApproved();
    error AlreadyExecuted();
    error InsufficientApprovals();
    error DocumentNotFound();
    
    // ============ Modifiers ============
    
    modifier onlySigner() {
        if (msg.sender != signers[0] && msg.sender != signers[1]) {
            revert NotASigner();
        }
        _;
    }
    
    modifier notExecuted(bytes32 txHash) {
        if (executed[txHash]) {
            revert AlreadyExecuted();
        }
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Creates a new DigitalSeal with two signers
     * @param _signer1 First signing party
     * @param _signer2 Second signing party
     */
    constructor(address _signer1, address _signer2) {
        require(_signer1 != address(0), "Invalid signer1");
        require(_signer2 != address(0), "Invalid signer2");
        require(_signer1 != _signer2, "Signers must be different");
        
        signers[0] = _signer1;
        signers[1] = _signer2;
        
        emit SealCreated(_signer1, _signer2, block.timestamp);
    }
    
    // ============ Public Functions ============
    
    /**
     * @notice Approve a transaction by providing a signature
     * @param txHash Hash of the transaction to approve
     */
    function approve(bytes32 txHash) external onlySigner notExecuted(txHash) {
        if (approvals[txHash][msg.sender]) {
            revert AlreadyApproved();
        }
        
        approvals[txHash][msg.sender] = true;
        approvalCount[txHash]++;
        
        // Create document metadata if it doesn't exist
        if (!documents[txHash].exists) {
            documents[txHash] = SealedDocument({
                documentHash: txHash,
                createdAt: block.timestamp,
                executedAt: 0,
                exists: true
            });
        }
        
        emit Approved(txHash, msg.sender, approvalCount[txHash]);
    }
    
    /**
     * @notice Revoke a previously given approval
     * @param txHash Hash of the transaction to revoke approval from
     */
    function revoke(bytes32 txHash) external onlySigner notExecuted(txHash) {
        if (!approvals[txHash][msg.sender]) {
            revert NotApproved();
        }
        
        approvals[txHash][msg.sender] = false;
        approvalCount[txHash]--;
        
        emit Revoked(txHash, msg.sender, approvalCount[txHash]);
    }
    
    /**
     * @notice Execute a transaction after both signers have approved
     * @param txHash Hash of the transaction to execute
     * @param data Calldata to execute (optional, for future use)
     */
    function execute(bytes32 txHash, bytes calldata data) 
        external 
        onlySigner 
        notExecuted(txHash) 
    {
        if (approvalCount[txHash] < THRESHOLD) {
            revert InsufficientApprovals();
        }
        
        executed[txHash] = true;
        documents[txHash].executedAt = block.timestamp;
        
        // For now, we just mark as executed
        // Future: can execute actual contract calls with 'data'
        
        emit Executed(txHash, block.timestamp);
    }
    
    /**
     * @notice Verify the current status of a transaction
     * @param txHash Hash of the transaction to check
     * @return approved Whether the transaction has enough approvals
     * @return isExecuted Whether the transaction has been executed
     * @return approvals_ Current number of approvals
     */
    function verify(bytes32 txHash) 
        external 
        view 
        returns (
            bool approved,
            bool isExecuted,
            uint8 approvals_
        ) 
    {
        approved = approvalCount[txHash] >= THRESHOLD;
        isExecuted = executed[txHash];
        approvals_ = approvalCount[txHash];
    }
    
    /**
     * @notice Check if a specific address has approved a transaction
     * @param txHash Transaction hash to check
     * @param signer Address to check approval for
     * @return Whether the signer has approved
     */
    function hasApproved(bytes32 txHash, address signer) 
        external 
        view 
        returns (bool) 
    {
        return approvals[txHash][signer];
    }
    
    /**
     * @notice Get document metadata
     * @param txHash Document hash to retrieve
     * @return Document metadata
     */
    function getDocument(bytes32 txHash) 
        external 
        view 
        returns (SealedDocument memory) 
    {
        if (!documents[txHash].exists) {
            revert DocumentNotFound();
        }
        return documents[txHash];
    }
    
    /**
     * @notice Check if an address is one of the signers
     * @param addr Address to check
     * @return Whether the address is a signer
     */
    function isSigner(address addr) external view returns (bool) {
        return addr == signers[0] || addr == signers[1];
    }
}
