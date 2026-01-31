// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TempleOfHeaven
 * @notice Central archive and knowledge repository with dual governance
 * @dev Scientist Council (scientific matters) + Wisdom Council (ethical matters)
 */
contract TempleOfHeaven is AccessControl {
    // ============ Roles ============
    
    bytes32 public constant SCIENTIST_COUNCIL = keccak256("SCIENTIST_COUNCIL");
    bytes32 public constant WISDOM_COUNCIL = keccak256("WISDOM_COUNCIL");
    bytes32 public constant STATE_TREASURER = keccak256("STATE_TREASURER");
    
    // ============ State Variables ============
    
    /// @notice State funding account (Treasury)
    address public stateFundingAccount;
    
    /// @notice Public donation account (Bank of Siberia)
    address public donationAccount;
    
    /// @notice Total donations received
    uint256 public totalDonations;
    
    /// @notice Record types
    enum RecordType { 
        LIBRARY,    // Knowledge & discoveries
        ARCHIVE,    // Historical documents
        CADASTRE    // Land registry
    }
    
    /// @notice Record struct
    struct Record {
        bytes32 documentHash;
        RecordType recordType;
        address submitter;
        uint256 timestamp;
        bool scientificVerified;
        bool ethicalVerified;
        address scientificVerifier;
        address ethicalVerifier;
        string metadata; // IPFS CID or description
    }
    
    /// @notice Mapping of document hash to record
    mapping(bytes32 => Record) public records;
    
    /// @notice Array of all document hashes
    bytes32[] public allRecords;
    
    /// @notice Donation tracking
    mapping(address => uint256) public donations;
    
    // ============ Events ============
    
    event RecordSubmitted(
        bytes32 indexed documentHash,
        RecordType recordType,
        address indexed submitter,
        string metadata
    );
    
    event ScientificVerification(
        bytes32 indexed documentHash,
        address indexed verifier,
        bool approved
    );
    
    event EthicalVerification(
        bytes32 indexed documentHash,
        address indexed verifier,
        bool approved
    );
    
    event DonationReceived(
        address indexed donor,
        uint256 amount
    );
    
    event StateFundingReceived(
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error RecordAlreadyExists();
    error RecordNotFound();
    error AlreadyVerified();
    error InsufficientFunds();
    error UnauthorizedRole();
    
    // ============ Constructor ============
    
    constructor(
        address _stateFundingAccount,
        address _donationAccount
    ) {
        require(_stateFundingAccount != address(0), "Invalid state funding account");
        require(_donationAccount != address(0), "Invalid donation account");
        
        stateFundingAccount = _stateFundingAccount;
        donationAccount = _donationAccount;
        
        // Grant admin role to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============ Record Management ============
    
    /**
     * @notice Submit a document to the Temple archive
     * @param documentHash Hash of the document
     * @param recordType Type of record (LIBRARY/ARCHIVE/CADASTRE)
     * @param metadata IPFS CID or description
     */
    function submitRecord(
        bytes32 documentHash,
        RecordType recordType,
        string calldata metadata
    ) external {
        if (records[documentHash].timestamp != 0) {
            revert RecordAlreadyExists();
        }
        
        records[documentHash] = Record({
            documentHash: documentHash,
            recordType: recordType,
            submitter: msg.sender,
            timestamp: block.timestamp,
            scientificVerified: false,
            ethicalVerified: false,
            scientificVerifier: address(0),
            ethicalVerifier: address(0),
            metadata: metadata
        });
        
        allRecords.push(documentHash);
        
        emit RecordSubmitted(documentHash, recordType, msg.sender, metadata);
    }
    
    /**
     * @notice Verify a record from scientific perspective
     * @param documentHash Hash of the document to verify
     * @param approved Whether the record is approved
     */
    function scientificVerify(bytes32 documentHash, bool approved) 
        external 
        onlyRole(SCIENTIST_COUNCIL) 
    {
        Record storage record = records[documentHash];
        
        if (record.timestamp == 0) {
            revert RecordNotFound();
        }
        
        if (record.scientificVerified) {
            revert AlreadyVerified();
        }
        
        record.scientificVerified = true;
        record.scientificVerifier = msg.sender;
        
        emit ScientificVerification(documentHash, msg.sender, approved);
    }
    
    /**
     * @notice Verify a record from ethical perspective
     * @param documentHash Hash of the document to verify
     * @param approved Whether the record is approved
     */
    function ethicalVerify(bytes32 documentHash, bool approved) 
        external 
        onlyRole(WISDOM_COUNCIL) 
    {
        Record storage record = records[documentHash];
        
        if (record.timestamp == 0) {
            revert RecordNotFound();
        }
        
        if (record.ethicalVerified) {
            revert AlreadyVerified();
        }
        
        record.ethicalVerified = true;
        record.ethicalVerifier = msg.sender;
        
        emit EthicalVerification(documentHash, msg.sender, approved);
    }
    
    // ============ Funding ============
    
    /**
     * @notice Receive donation from public (народные пожертвования)
     */
    function receiveDonation() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        
        donations[msg.sender] += msg.value;
        totalDonations += msg.value;
        
        emit DonationReceived(msg.sender, msg.value);
    }
    
    /**
     * @notice Receive state funding
     */
    function receiveStateFunding() external payable onlyRole(STATE_TREASURER) {
        require(msg.value > 0, "Funding must be greater than 0");
        
        emit StateFundingReceived(msg.value, block.timestamp);
    }
    
    /**
     * @notice Withdraw funds for Temple operations
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawFunds(uint256 amount, address payable recipient) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (address(this).balance < amount) {
            revert InsufficientFunds();
        }
        
        recipient.transfer(amount);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get record details
     * @param documentHash Hash of the document
     */
    function getRecord(bytes32 documentHash) 
        external 
        view 
        returns (Record memory) 
    {
        Record memory record = records[documentHash];
        if (record.timestamp == 0) {
            revert RecordNotFound();
        }
        return record;
    }
    
    /**
     * @notice Get total number of records
     */
    function getTotalRecords() external view returns (uint256) {
        return allRecords.length;
    }
    
    /**
     * @notice Get records by type
     * @param recordType Type to filter by
     * @return Array of document hashes
     */
    function getRecordsByType(RecordType recordType) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        uint256 count = 0;
        
        // Count matching records
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (records[allRecords[i]].recordType == recordType) {
                count++;
            }
        }
        
        // Build result array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (records[allRecords[i]].recordType == recordType) {
                result[index] = allRecords[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Check if both councils have verified a record
     * @param documentHash Hash of the document
     */
    function isFullyVerified(bytes32 documentHash) 
        external 
        view 
        returns (bool) 
    {
        Record memory record = records[documentHash];
        return record.scientificVerified && record.ethicalVerified;
    }
    
    /**
     * @notice Get Temple balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get donation amount from specific donor
     * @param donor Address of donor
     */
    function getDonation(address donor) external view returns (uint256) {
        return donations[donor];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Grant Scientist Council role
     * @param account Address to grant role to
     */
    function grantScientistCouncil(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        grantRole(SCIENTIST_COUNCIL, account);
    }
    
    /**
     * @notice Grant Wisdom Council role
     * @param account Address to grant role to
     */
    function grantWisdomCouncil(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        grantRole(WISDOM_COUNCIL, account);
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {
        totalDonations += msg.value;
        donations[msg.sender] += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }
}
