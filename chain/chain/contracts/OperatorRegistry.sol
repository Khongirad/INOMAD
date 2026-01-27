// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OperatorRegistry
 * @notice Registry of licensed network operators in the ALTAN ecosystem.
 *
 * Primary operator: INOMAD INC
 * - Receives 0.03% network fee
 * - Acts as ALTAN dealer (secondary market)
 * - Issues AUSD certificates
 * - Pays 10% annual tax on profits (off-chain)
 *
 * Future: May support multiple licensed operators
 */
contract OperatorRegistry {
    enum OperatorStatus {
        NONE,
        PENDING,
        ACTIVE,
        SUSPENDED,
        REVOKED
    }

    enum OperatorLicense {
        NONE,
        DEALER,           // Can buy/sell ALTAN
        AUSD_ISSUER,      // Can issue AUSD certificates
        FEE_COLLECTOR,    // Receives network fees
        FULL              // All licenses
    }

    struct Operator {
        uint256 id;
        address account;          // Operator's main address
        address feeRecipient;     // Address for fee collection
        string name;
        string jurisdiction;      // Legal jurisdiction
        OperatorStatus status;
        OperatorLicense license;
        uint64 registeredAt;
        uint64 lastAuditAt;
        bytes32 complianceHash;   // Hash of compliance documents
    }

    address public owner;
    address public regulator;  // Bank of Siberia or designated regulator

    // Storage
    uint256 public nextOperatorId;
    mapping(uint256 => Operator) public operators;
    mapping(address => uint256) public operatorByAccount;

    // Primary operator (INOMAD INC)
    uint256 public primaryOperatorId;

    // License tracking
    mapping(address => mapping(OperatorLicense => bool)) public hasLicense;

    // Events
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    event RegulatorSet(address indexed oldRegulator, address indexed newRegulator);
    event OperatorRegistered(uint256 indexed id, address indexed account, string name);
    event OperatorStatusChanged(uint256 indexed id, OperatorStatus oldStatus, OperatorStatus newStatus);
    event OperatorLicenseGranted(uint256 indexed id, OperatorLicense license);
    event OperatorLicenseRevoked(uint256 indexed id, OperatorLicense license);
    event PrimaryOperatorSet(uint256 indexed oldId, uint256 indexed newId);
    event ComplianceUpdated(uint256 indexed id, bytes32 complianceHash, uint64 auditAt);
    event FeeRecipientUpdated(uint256 indexed id, address oldRecipient, address newRecipient);

    // Errors
    error NotOwner();
    error NotRegulator();
    error ZeroAddress();
    error AlreadyRegistered();
    error OperatorNotFound();
    error InvalidStatus();
    error NotOperator();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRegulator() {
        if (msg.sender != regulator && msg.sender != owner) revert NotRegulator();
        _;
    }

    modifier onlyOperatorOwner(uint256 operatorId) {
        if (operators[operatorId].account != msg.sender) revert NotOperator();
        _;
    }

    constructor(address regulator_) {
        if (regulator_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        regulator = regulator_;
        emit OwnerSet(address(0), msg.sender);
        emit RegulatorSet(address(0), regulator_);
    }

    // ============ REGISTRATION ============

    /**
     * @notice Register a new operator (regulator only)
     */
    function registerOperator(
        address account,
        address feeRecipient,
        string calldata name,
        string calldata jurisdiction,
        bytes32 complianceHash
    ) external onlyRegulator returns (uint256 id) {
        if (account == address(0)) revert ZeroAddress();
        if (operatorByAccount[account] != 0) revert AlreadyRegistered();

        id = ++nextOperatorId;  // Start from 1

        operators[id] = Operator({
            id: id,
            account: account,
            feeRecipient: feeRecipient != address(0) ? feeRecipient : account,
            name: name,
            jurisdiction: jurisdiction,
            status: OperatorStatus.PENDING,
            license: OperatorLicense.NONE,
            registeredAt: uint64(block.timestamp),
            lastAuditAt: 0,
            complianceHash: complianceHash
        });

        operatorByAccount[account] = id;

        emit OperatorRegistered(id, account, name);
    }

    /**
     * @notice Activate operator after compliance review
     */
    function activateOperator(uint256 id) external onlyRegulator {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();
        if (op.status != OperatorStatus.PENDING && op.status != OperatorStatus.SUSPENDED) {
            revert InvalidStatus();
        }

        OperatorStatus oldStatus = op.status;
        op.status = OperatorStatus.ACTIVE;

        emit OperatorStatusChanged(id, oldStatus, OperatorStatus.ACTIVE);
    }

    /**
     * @notice Suspend operator
     */
    function suspendOperator(uint256 id, string calldata reason) external onlyRegulator {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();
        if (op.status != OperatorStatus.ACTIVE) revert InvalidStatus();

        OperatorStatus oldStatus = op.status;
        op.status = OperatorStatus.SUSPENDED;

        emit OperatorStatusChanged(id, oldStatus, OperatorStatus.SUSPENDED);
    }

    /**
     * @notice Revoke operator (permanent)
     */
    function revokeOperator(uint256 id) external onlyRegulator {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();

        OperatorStatus oldStatus = op.status;
        op.status = OperatorStatus.REVOKED;

        // Revoke all licenses
        hasLicense[op.account][OperatorLicense.DEALER] = false;
        hasLicense[op.account][OperatorLicense.AUSD_ISSUER] = false;
        hasLicense[op.account][OperatorLicense.FEE_COLLECTOR] = false;
        hasLicense[op.account][OperatorLicense.FULL] = false;

        emit OperatorStatusChanged(id, oldStatus, OperatorStatus.REVOKED);
    }

    // ============ LICENSING ============

    /**
     * @notice Grant license to operator
     */
    function grantLicense(uint256 id, OperatorLicense license) external onlyRegulator {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();
        if (op.status != OperatorStatus.ACTIVE) revert InvalidStatus();

        op.license = license;
        hasLicense[op.account][license] = true;

        // FULL license grants all permissions
        if (license == OperatorLicense.FULL) {
            hasLicense[op.account][OperatorLicense.DEALER] = true;
            hasLicense[op.account][OperatorLicense.AUSD_ISSUER] = true;
            hasLicense[op.account][OperatorLicense.FEE_COLLECTOR] = true;
        }

        emit OperatorLicenseGranted(id, license);
    }

    /**
     * @notice Revoke specific license
     */
    function revokeLicense(uint256 id, OperatorLicense license) external onlyRegulator {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();

        hasLicense[op.account][license] = false;

        emit OperatorLicenseRevoked(id, license);
    }

    // ============ PRIMARY OPERATOR ============

    /**
     * @notice Set primary operator (INOMAD INC)
     */
    function setPrimaryOperator(uint256 id) external onlyOwner {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();
        if (op.status != OperatorStatus.ACTIVE) revert InvalidStatus();

        uint256 oldId = primaryOperatorId;
        primaryOperatorId = id;

        emit PrimaryOperatorSet(oldId, id);
    }

    /**
     * @notice Get primary operator details
     */
    function getPrimaryOperator() external view returns (Operator memory) {
        return operators[primaryOperatorId];
    }

    /**
     * @notice Get primary operator's fee recipient address
     */
    function getPrimaryFeeRecipient() external view returns (address) {
        return operators[primaryOperatorId].feeRecipient;
    }

    // ============ OPERATOR MANAGEMENT ============

    /**
     * @notice Update fee recipient (operator can change their own)
     */
    function updateFeeRecipient(uint256 id, address newRecipient) external onlyOperatorOwner(id) {
        if (newRecipient == address(0)) revert ZeroAddress();

        Operator storage op = operators[id];
        address oldRecipient = op.feeRecipient;
        op.feeRecipient = newRecipient;

        emit FeeRecipientUpdated(id, oldRecipient, newRecipient);
    }

    /**
     * @notice Update compliance documents (regulator attests)
     */
    function updateCompliance(uint256 id, bytes32 complianceHash) external onlyRegulator {
        Operator storage op = operators[id];
        if (op.account == address(0)) revert OperatorNotFound();

        op.complianceHash = complianceHash;
        op.lastAuditAt = uint64(block.timestamp);

        emit ComplianceUpdated(id, complianceHash, op.lastAuditAt);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if address has specific license
     */
    function checkLicense(address account, OperatorLicense license) external view returns (bool) {
        return hasLicense[account][license];
    }

    /**
     * @notice Check if address is active operator
     */
    function isActiveOperator(address account) external view returns (bool) {
        uint256 id = operatorByAccount[account];
        if (id == 0) return false;
        return operators[id].status == OperatorStatus.ACTIVE;
    }

    /**
     * @notice Get operator by account
     */
    function getOperatorByAccount(address account) external view returns (Operator memory) {
        uint256 id = operatorByAccount[account];
        return operators[id];
    }

    // ============ ADMIN ============

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerSet(owner, newOwner);
        owner = newOwner;
    }

    function setRegulator(address newRegulator) external onlyOwner {
        if (newRegulator == address(0)) revert ZeroAddress();
        emit RegulatorSet(regulator, newRegulator);
        regulator = newRegulator;
    }
}
