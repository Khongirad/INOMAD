// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TreasuryVault
 * @notice State Treasury vault for the INOMAD KHURAL network.
 *
 * Treasury receives:
 * - Annual corporate tax (10% of profits, off-chain determined)
 * - State enterprise revenues
 * - Fees and duties
 * - Fines and penalties
 *
 * Treasury does NOT receive:
 * - Per-transaction network fees (those go to operator)
 *
 * Spending requires multi-sig approval from authorized ministers.
 */
contract TreasuryVault {
    using SafeERC20 for IERC20;

    // Roles
    address public chairman;     // Head of Treasury
    address public minister;     // Finance Minister
    address public auditor;      // State Auditor

    // Spending approval threshold
    uint256 public constant SMALL_SPEND_THRESHOLD = 10000 * 1e18; // 10,000 ALTAN
    uint256 public constant LARGE_SPEND_THRESHOLD = 100000 * 1e18; // 100,000 ALTAN

    // Spending request management
    enum SpendStatus { PENDING, APPROVED, EXECUTED, REJECTED }

    struct SpendRequest {
        uint256 id;
        address token;           // ALTAN or AUSD address
        address recipient;
        uint256 amount;
        string purpose;
        bytes32 budgetCode;      // Budget classification code
        uint64 createdAt;
        uint64 executedAt;
        SpendStatus status;
        bool chairmanApproved;
        bool ministerApproved;
        bool auditorApproved;
    }

    uint256 public nextRequestId;
    mapping(uint256 => SpendRequest) public requests;

    // Revenue tracking
    struct RevenueRecord {
        uint256 id;
        address token;
        address from;
        uint256 amount;
        string category;         // "tax", "enterprise", "duty", "fine"
        bytes32 referenceHash;
        uint64 timestamp;
    }

    uint256 public nextRevenueId;
    mapping(uint256 => RevenueRecord) public revenues;

    // Statistics
    mapping(address => uint256) public totalReceived;  // token -> total
    mapping(address => uint256) public totalSpent;     // token -> total

    // Events
    event ChairmanSet(address indexed oldChairman, address indexed newChairman);
    event MinisterSet(address indexed oldMinister, address indexed newMinister);
    event AuditorSet(address indexed oldAuditor, address indexed newAuditor);

    event RevenueReceived(
        uint256 indexed id,
        address indexed token,
        address indexed from,
        uint256 amount,
        string category
    );

    event SpendRequestCreated(
        uint256 indexed id,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        string purpose
    );
    event SpendRequestApproved(uint256 indexed id, address indexed approver);
    event SpendRequestExecuted(uint256 indexed id);
    event SpendRequestRejected(uint256 indexed id, string reason);

    // Errors
    error NotAuthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidRequest();
    error AlreadyProcessed();
    error InsufficientApprovals();
    error InsufficientBalance();

    modifier onlyChairman() {
        if (msg.sender != chairman) revert NotAuthorized();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != chairman && msg.sender != minister && msg.sender != auditor) {
            revert NotAuthorized();
        }
        _;
    }

    constructor(address chairman_, address minister_, address auditor_) {
        if (chairman_ == address(0) || minister_ == address(0) || auditor_ == address(0)) {
            revert ZeroAddress();
        }

        chairman = chairman_;
        minister = minister_;
        auditor = auditor_;

        emit ChairmanSet(address(0), chairman_);
        emit MinisterSet(address(0), minister_);
        emit AuditorSet(address(0), auditor_);
    }

    // ============ REVENUE RECEIPT ============

    /**
     * @notice Record revenue receipt (anyone can deposit, must transfer first)
     * @param token Token address (ALTAN or AUSD)
     * @param amount Amount to record
     * @param category Revenue category
     * @param referenceHash Reference document hash
     */
    function recordRevenue(
        address token,
        uint256 amount,
        string calldata category,
        bytes32 referenceHash
    ) external returns (uint256 id) {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // Transfer tokens to treasury
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        id = nextRevenueId++;
        revenues[id] = RevenueRecord({
            id: id,
            token: token,
            from: msg.sender,
            amount: amount,
            category: category,
            referenceHash: referenceHash,
            timestamp: uint64(block.timestamp)
        });

        totalReceived[token] += amount;

        emit RevenueReceived(id, token, msg.sender, amount, category);
    }

    /**
     * @notice Direct deposit (for simple transfers)
     */
    function deposit(address token, uint256 amount) external {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        totalReceived[token] += amount;

        uint256 id = nextRevenueId++;
        revenues[id] = RevenueRecord({
            id: id,
            token: token,
            from: msg.sender,
            amount: amount,
            category: "deposit",
            referenceHash: bytes32(0),
            timestamp: uint64(block.timestamp)
        });

        emit RevenueReceived(id, token, msg.sender, amount, "deposit");
    }

    // ============ SPENDING ============

    /**
     * @notice Create spend request
     */
    function createSpendRequest(
        address token,
        address recipient,
        uint256 amount,
        string calldata purpose,
        bytes32 budgetCode
    ) external onlyAuthorized returns (uint256 id) {
        if (token == address(0) || recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        id = nextRequestId++;
        requests[id] = SpendRequest({
            id: id,
            token: token,
            recipient: recipient,
            amount: amount,
            purpose: purpose,
            budgetCode: budgetCode,
            createdAt: uint64(block.timestamp),
            executedAt: 0,
            status: SpendStatus.PENDING,
            chairmanApproved: false,
            ministerApproved: false,
            auditorApproved: false
        });

        emit SpendRequestCreated(id, token, recipient, amount, purpose);
    }

    /**
     * @notice Approve spend request
     */
    function approveSpendRequest(uint256 id) external onlyAuthorized {
        SpendRequest storage req = requests[id];
        if (req.status != SpendStatus.PENDING) revert AlreadyProcessed();

        if (msg.sender == chairman) {
            req.chairmanApproved = true;
        } else if (msg.sender == minister) {
            req.ministerApproved = true;
        } else if (msg.sender == auditor) {
            req.auditorApproved = true;
        }

        emit SpendRequestApproved(id, msg.sender);

        // Check if can auto-execute
        _tryExecute(id);
    }

    /**
     * @notice Execute spend request (if approved)
     */
    function executeSpendRequest(uint256 id) external onlyAuthorized {
        _tryExecute(id);
    }

    function _tryExecute(uint256 id) internal {
        SpendRequest storage req = requests[id];
        if (req.status != SpendStatus.PENDING) return;

        // Determine required approvals based on amount
        bool canExecute = false;

        if (req.amount <= SMALL_SPEND_THRESHOLD) {
            // Small: Chairman OR Minister can approve alone
            canExecute = req.chairmanApproved || req.ministerApproved;
        } else if (req.amount <= LARGE_SPEND_THRESHOLD) {
            // Medium: Chairman AND Minister required
            canExecute = req.chairmanApproved && req.ministerApproved;
        } else {
            // Large: All three required
            canExecute = req.chairmanApproved && req.ministerApproved && req.auditorApproved;
        }

        if (!canExecute) return;

        // Check balance
        if (IERC20(req.token).balanceOf(address(this)) < req.amount) {
            revert InsufficientBalance();
        }

        // Execute transfer first, then update state (CEI pattern)
        IERC20(req.token).safeTransfer(req.recipient, req.amount);

        req.status = SpendStatus.EXECUTED;
        req.executedAt = uint64(block.timestamp);
        totalSpent[req.token] += req.amount;

        emit SpendRequestExecuted(id);
    }

    /**
     * @notice Reject spend request
     */
    function rejectSpendRequest(uint256 id, string calldata reason) external onlyChairman {
        SpendRequest storage req = requests[id];
        if (req.status != SpendStatus.PENDING) revert AlreadyProcessed();

        req.status = SpendStatus.REJECTED;

        emit SpendRequestRejected(id, reason);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get treasury balance for token
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get treasury statistics
     */
    function getStats(address token) external view returns (
        uint256 balance,
        uint256 received,
        uint256 spent
    ) {
        balance = IERC20(token).balanceOf(address(this));
        received = totalReceived[token];
        spent = totalSpent[token];
    }

    /**
     * @notice Get spend request details
     */
    function getSpendRequest(uint256 id) external view returns (SpendRequest memory) {
        return requests[id];
    }

    /**
     * @notice Get revenue record
     */
    function getRevenue(uint256 id) external view returns (RevenueRecord memory) {
        return revenues[id];
    }

    // ============ ADMIN ============

    function setChairman(address newChairman) external onlyChairman {
        if (newChairman == address(0)) revert ZeroAddress();
        emit ChairmanSet(chairman, newChairman);
        chairman = newChairman;
    }

    function setMinister(address newMinister) external onlyChairman {
        if (newMinister == address(0)) revert ZeroAddress();
        emit MinisterSet(minister, newMinister);
        minister = newMinister;
    }

    function setAuditor(address newAuditor) external onlyChairman {
        if (newAuditor == address(0)) revert ZeroAddress();
        emit AuditorSet(auditor, newAuditor);
        auditor = newAuditor;
    }
}
