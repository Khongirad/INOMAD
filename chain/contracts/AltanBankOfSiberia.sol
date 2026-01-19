// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AltanBankOfSiberia
 * @notice First Licensed Commercial Bank of the ALTAN system.
 *
 * Bank of Siberia is:
 * - Licensed by Central Bank
 * - Holds correspondent account at Central Bank
 * - Manages citizen and organization accounts
 * - Primary dealer for ALTAN (secondary market)
 * - Root validator of the ALTAN network (infrastructure role)
 *
 * Receives ALTAN emission from Central Bank via correspondent account.
 * Distributes to citizens and organizations.
 *
 * DOES NOT:
 * - Create new ALTAN (only Central Bank can)
 * - Set monetary policy (only Central Bank can)
 * - Issue bank licenses (only Central Bank can)
 */
contract AltanBankOfSiberia is AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");
    bytes32 public constant TELLER_ROLE = keccak256("TELLER_ROLE");

    // ALTAN token
    IERC20 public immutable altan;

    // Central Bank reference
    address public centralBank;

    // Correspondent account (receives emission from CB)
    address public corrAccount;

    // ============ ACCOUNT MANAGEMENT ============

    enum AccountType { NONE, CITIZEN, ORGANIZATION, GOVERNMENT, SPECIAL }
    enum AccountStatus { NONE, PENDING, ACTIVE, FROZEN, CLOSED }

    struct BankAccount {
        uint256 id;
        address owner;           // Wallet address (AltanWallet for citizens)
        uint256 seatId;          // SeatSBT ID (0 for orgs)
        AccountType accType;
        AccountStatus status;
        uint64 openedAt;
        uint64 lastActivityAt;
        bytes32 kycHash;         // Hash of KYC documents
        string label;            // Account name/label
    }

    uint256 public nextAccountId;
    mapping(uint256 => BankAccount) public accounts;
    mapping(address => uint256) public accountByOwner;
    mapping(uint256 => uint256) public accountBySeatId;  // seatId -> accountId

    // Account balances are tracked by ALTAN token balanceOf(owner)
    // This registry only tracks metadata

    // ============ TRANSACTION LIMITS ============

    uint256 public dailyWithdrawLimit;      // Per account daily limit
    uint256 public singleTxLimit;           // Max single transaction

    mapping(uint256 => uint256) public dailyWithdrawn;     // accountId -> amount
    mapping(uint256 => uint256) public lastWithdrawDay;    // accountId -> day

    // ============ STATISTICS ============

    uint256 public totalAccounts;
    uint256 public totalCitizenAccounts;
    uint256 public totalOrgAccounts;

    // ============ EVENTS ============

    event CentralBankSet(address indexed oldCB, address indexed newCB);
    event CorrAccountSet(address indexed oldCorr, address indexed newCorr);

    event AccountOpened(
        uint256 indexed accountId,
        address indexed owner,
        uint256 indexed seatId,
        AccountType accType
    );
    event AccountStatusChanged(uint256 indexed accountId, AccountStatus oldStatus, AccountStatus newStatus);
    event AccountFrozen(uint256 indexed accountId, string reason);
    event AccountClosed(uint256 indexed accountId, string reason);

    event Deposit(uint256 indexed accountId, address indexed from, uint256 amount);
    event Withdrawal(uint256 indexed accountId, address indexed to, uint256 amount);
    event InternalTransfer(uint256 indexed fromAccount, uint256 indexed toAccount, uint256 amount);

    event DailyLimitSet(uint256 oldLimit, uint256 newLimit);
    event SingleTxLimitSet(uint256 oldLimit, uint256 newLimit);

    // ============ ERRORS ============

    error ZeroAddress();
    error ZeroAmount();
    error AccountNotFound();
    error AccountNotActive();
    error AlreadyHasAccount();
    error InvalidAccountType();
    error DailyLimitExceeded();
    error SingleTxLimitExceeded();
    error InsufficientBalance();
    error NotAccountOwner();

    // ============ CONSTRUCTOR ============

    constructor(
        address altanToken,
        address centralBank_,
        address chairman
    ) {
        if (altanToken == address(0)) revert ZeroAddress();
        if (centralBank_ == address(0)) revert ZeroAddress();
        if (chairman == address(0)) revert ZeroAddress();

        altan = IERC20(altanToken);
        centralBank = centralBank_;

        _grantRole(DEFAULT_ADMIN_ROLE, chairman);
        _grantRole(CHAIRMAN_ROLE, chairman);
        _grantRole(OFFICER_ROLE, chairman);

        // Default limits
        dailyWithdrawLimit = 100_000 * 1e18;  // 100,000 ALTAN daily
        singleTxLimit = 50_000 * 1e18;        // 50,000 ALTAN per tx

        emit CentralBankSet(address(0), centralBank_);
        emit DailyLimitSet(0, dailyWithdrawLimit);
        emit SingleTxLimitSet(0, singleTxLimit);
    }

    // ============ CONFIGURATION ============

    /**
     * @notice Set correspondent account (assigned by Central Bank)
     */
    function setCorrAccount(address newCorr) external onlyRole(CHAIRMAN_ROLE) {
        if (newCorr == address(0)) revert ZeroAddress();
        address oldCorr = corrAccount;
        corrAccount = newCorr;
        emit CorrAccountSet(oldCorr, newCorr);
    }

    /**
     * @notice Update Central Bank reference
     */
    function setCentralBank(address newCB) external onlyRole(CHAIRMAN_ROLE) {
        if (newCB == address(0)) revert ZeroAddress();
        address oldCB = centralBank;
        centralBank = newCB;
        emit CentralBankSet(oldCB, newCB);
    }

    // ============ ACCOUNT MANAGEMENT ============

    /**
     * @notice Open citizen account (linked to SeatSBT)
     */
    function openCitizenAccount(
        address owner,
        uint256 seatId,
        bytes32 kycHash,
        string calldata label
    ) external onlyRole(OFFICER_ROLE) returns (uint256 accountId) {
        if (owner == address(0)) revert ZeroAddress();
        if (accountByOwner[owner] != 0) revert AlreadyHasAccount();
        if (seatId != 0 && accountBySeatId[seatId] != 0) revert AlreadyHasAccount();

        accountId = ++nextAccountId;

        accounts[accountId] = BankAccount({
            id: accountId,
            owner: owner,
            seatId: seatId,
            accType: AccountType.CITIZEN,
            status: AccountStatus.ACTIVE,
            openedAt: uint64(block.timestamp),
            lastActivityAt: uint64(block.timestamp),
            kycHash: kycHash,
            label: label
        });

        accountByOwner[owner] = accountId;
        if (seatId != 0) {
            accountBySeatId[seatId] = accountId;
        }

        totalAccounts++;
        totalCitizenAccounts++;

        emit AccountOpened(accountId, owner, seatId, AccountType.CITIZEN);
    }

    /**
     * @notice Open organization account
     */
    function openOrgAccount(
        address owner,
        bytes32 kycHash,
        string calldata label
    ) external onlyRole(OFFICER_ROLE) returns (uint256 accountId) {
        if (owner == address(0)) revert ZeroAddress();
        if (accountByOwner[owner] != 0) revert AlreadyHasAccount();

        accountId = ++nextAccountId;

        accounts[accountId] = BankAccount({
            id: accountId,
            owner: owner,
            seatId: 0,
            accType: AccountType.ORGANIZATION,
            status: AccountStatus.ACTIVE,
            openedAt: uint64(block.timestamp),
            lastActivityAt: uint64(block.timestamp),
            kycHash: kycHash,
            label: label
        });

        accountByOwner[owner] = accountId;

        totalAccounts++;
        totalOrgAccounts++;

        emit AccountOpened(accountId, owner, 0, AccountType.ORGANIZATION);
    }

    /**
     * @notice Open government account
     */
    function openGovAccount(
        address owner,
        bytes32 kycHash,
        string calldata label
    ) external onlyRole(CHAIRMAN_ROLE) returns (uint256 accountId) {
        if (owner == address(0)) revert ZeroAddress();
        if (accountByOwner[owner] != 0) revert AlreadyHasAccount();

        accountId = ++nextAccountId;

        accounts[accountId] = BankAccount({
            id: accountId,
            owner: owner,
            seatId: 0,
            accType: AccountType.GOVERNMENT,
            status: AccountStatus.ACTIVE,
            openedAt: uint64(block.timestamp),
            lastActivityAt: uint64(block.timestamp),
            kycHash: kycHash,
            label: label
        });

        accountByOwner[owner] = accountId;
        totalAccounts++;

        emit AccountOpened(accountId, owner, 0, AccountType.GOVERNMENT);
    }

    /**
     * @notice Freeze account
     */
    function freezeAccount(uint256 accountId, string calldata reason) external onlyRole(OFFICER_ROLE) {
        BankAccount storage acc = accounts[accountId];
        if (acc.owner == address(0)) revert AccountNotFound();

        AccountStatus oldStatus = acc.status;
        acc.status = AccountStatus.FROZEN;

        emit AccountStatusChanged(accountId, oldStatus, AccountStatus.FROZEN);
        emit AccountFrozen(accountId, reason);
    }

    /**
     * @notice Unfreeze account
     */
    function unfreezeAccount(uint256 accountId) external onlyRole(CHAIRMAN_ROLE) {
        BankAccount storage acc = accounts[accountId];
        if (acc.owner == address(0)) revert AccountNotFound();
        if (acc.status != AccountStatus.FROZEN) revert InvalidAccountType();

        acc.status = AccountStatus.ACTIVE;

        emit AccountStatusChanged(accountId, AccountStatus.FROZEN, AccountStatus.ACTIVE);
    }

    /**
     * @notice Close account
     */
    function closeAccount(uint256 accountId, string calldata reason) external onlyRole(CHAIRMAN_ROLE) {
        BankAccount storage acc = accounts[accountId];
        if (acc.owner == address(0)) revert AccountNotFound();

        // Check balance is zero
        if (altan.balanceOf(acc.owner) > 0) revert InsufficientBalance();

        acc.status = AccountStatus.CLOSED;

        emit AccountClosed(accountId, reason);
    }

    // ============ TRANSFERS ============

    /**
     * @notice Distribute ALTAN from correspondent account to customer
     * @dev Used when Central Bank emits to corr account, bank distributes to customers
     */
    function distributeFromCorr(
        uint256 toAccountId,
        uint256 amount,
        string calldata reason
    ) external onlyRole(OFFICER_ROLE) {
        if (amount == 0) revert ZeroAmount();

        BankAccount storage toAcc = accounts[toAccountId];
        if (toAcc.owner == address(0)) revert AccountNotFound();
        if (toAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();

        // Transfer from correspondent account
        altan.safeTransferFrom(corrAccount, toAcc.owner, amount);

        toAcc.lastActivityAt = uint64(block.timestamp);

        emit Deposit(toAccountId, corrAccount, amount);
    }

    /**
     * @notice Return ALTAN to correspondent account (for CB operations)
     */
    function returnToCorr(
        uint256 fromAccountId,
        uint256 amount,
        string calldata reason
    ) external onlyRole(OFFICER_ROLE) {
        if (amount == 0) revert ZeroAmount();

        BankAccount storage fromAcc = accounts[fromAccountId];
        if (fromAcc.owner == address(0)) revert AccountNotFound();

        // Check balance
        if (altan.balanceOf(fromAcc.owner) < amount) revert InsufficientBalance();

        // Transfer to correspondent account (requires approval from account owner)
        altan.safeTransferFrom(fromAcc.owner, corrAccount, amount);

        fromAcc.lastActivityAt = uint64(block.timestamp);

        emit Withdrawal(fromAccountId, corrAccount, amount);
    }

    /**
     * @notice Internal transfer between bank accounts
     */
    function internalTransfer(
        uint256 fromAccountId,
        uint256 toAccountId,
        uint256 amount
    ) external {
        if (amount == 0) revert ZeroAmount();

        BankAccount storage fromAcc = accounts[fromAccountId];
        BankAccount storage toAcc = accounts[toAccountId];

        if (fromAcc.owner == address(0)) revert AccountNotFound();
        if (toAcc.owner == address(0)) revert AccountNotFound();
        if (fromAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();
        if (toAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();

        // Only account owner or bank officer can initiate
        if (msg.sender != fromAcc.owner && !hasRole(OFFICER_ROLE, msg.sender)) {
            revert NotAccountOwner();
        }

        // Check limits for non-officers
        if (!hasRole(OFFICER_ROLE, msg.sender)) {
            _checkLimits(fromAccountId, amount);
        }

        // Transfer (requires approval if called by owner)
        altan.safeTransferFrom(fromAcc.owner, toAcc.owner, amount);

        fromAcc.lastActivityAt = uint64(block.timestamp);
        toAcc.lastActivityAt = uint64(block.timestamp);

        emit InternalTransfer(fromAccountId, toAccountId, amount);
    }

    function _checkLimits(uint256 accountId, uint256 amount) internal {
        if (amount > singleTxLimit) revert SingleTxLimitExceeded();

        uint256 today = block.timestamp / 1 days;
        if (today != lastWithdrawDay[accountId]) {
            lastWithdrawDay[accountId] = today;
            dailyWithdrawn[accountId] = 0;
        }

        if (dailyWithdrawn[accountId] + amount > dailyWithdrawLimit) {
            revert DailyLimitExceeded();
        }

        dailyWithdrawn[accountId] += amount;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get account details
     */
    function getAccount(uint256 accountId) external view returns (BankAccount memory) {
        return accounts[accountId];
    }

    /**
     * @notice Get account by owner address
     */
    function getAccountByOwner(address owner) external view returns (BankAccount memory) {
        uint256 accountId = accountByOwner[owner];
        return accounts[accountId];
    }

    /**
     * @notice Get account by SeatSBT ID
     */
    function getAccountBySeatId(uint256 seatId) external view returns (BankAccount memory) {
        uint256 accountId = accountBySeatId[seatId];
        return accounts[accountId];
    }

    /**
     * @notice Get account balance
     */
    function getBalance(uint256 accountId) external view returns (uint256) {
        BankAccount storage acc = accounts[accountId];
        if (acc.owner == address(0)) return 0;
        return altan.balanceOf(acc.owner);
    }

    /**
     * @notice Get correspondent account balance
     */
    function getCorrBalance() external view returns (uint256) {
        if (corrAccount == address(0)) return 0;
        return altan.balanceOf(corrAccount);
    }

    /**
     * @notice Get bank statistics
     */
    function getStats() external view returns (
        uint256 _totalAccounts,
        uint256 _citizenAccounts,
        uint256 _orgAccounts,
        uint256 _corrBalance
    ) {
        _totalAccounts = totalAccounts;
        _citizenAccounts = totalCitizenAccounts;
        _orgAccounts = totalOrgAccounts;
        _corrBalance = corrAccount != address(0) ? altan.balanceOf(corrAccount) : 0;
    }

    // ============ ADMIN ============

    /**
     * @notice Set daily withdrawal limit
     */
    function setDailyLimit(uint256 newLimit) external onlyRole(CHAIRMAN_ROLE) {
        uint256 oldLimit = dailyWithdrawLimit;
        dailyWithdrawLimit = newLimit;
        emit DailyLimitSet(oldLimit, newLimit);
    }

    /**
     * @notice Set single transaction limit
     */
    function setSingleTxLimit(uint256 newLimit) external onlyRole(CHAIRMAN_ROLE) {
        uint256 oldLimit = singleTxLimit;
        singleTxLimit = newLimit;
        emit SingleTxLimitSet(oldLimit, newLimit);
    }

    /**
     * @notice Add officer
     */
    function addOfficer(address officer) external onlyRole(CHAIRMAN_ROLE) {
        if (officer == address(0)) revert ZeroAddress();
        _grantRole(OFFICER_ROLE, officer);
    }

    /**
     * @notice Remove officer
     */
    function removeOfficer(address officer) external onlyRole(CHAIRMAN_ROLE) {
        _revokeRole(OFFICER_ROLE, officer);
    }

    /**
     * @notice Add teller
     */
    function addTeller(address teller) external onlyRole(OFFICER_ROLE) {
        if (teller == address(0)) revert ZeroAddress();
        _grantRole(TELLER_ROLE, teller);
    }

    /**
     * @notice Remove teller
     */
    function removeTeller(address teller) external onlyRole(OFFICER_ROLE) {
        _revokeRole(TELLER_ROLE, teller);
    }
}
