// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ICitizenWalletGuard.sol";
import {ArbanCompletion} from "./ArbanCompletion.sol";

/**
 * @title CitizenBank
 * @notice Retail banking services for Altan citizens
 * 
 * Split from AltanBankOfSiberia for:
 * - Security isolation (citizen vs institutional risks)
 * - Gas optimization (smaller contract)
 * - Clearer responsibility boundaries
 *
 * Key features:
 * - 1-of-N unlock (single verifier unlocks wallet)
 * - Tier 1-2-3 distribution system
 * - Daily/single transaction limits
 * - Integration with CitizenWalletGuard
 *
 * Part of 10-100-1000-10000 administrative hierarchy:
 * - TELLER (Арбан 10) - basic operations
 * - OFFICER (Зун 100) - account opening, Tier 1
 * - BANKER (Мянган 1000) - Tier 2-3 approval
 * - CHAIRMAN (Тумен 10000) - freeze, configuration
 */
contract CitizenBank is AccessControl {
    using SafeERC20 for IERC20;

    // ============ ROLES (10-100-1000-10000 Hierarchy) ============
    
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");   // Тумен 10000
    bytes32 public constant BANKER_ROLE = keccak256("BANKER_ROLE");       // Мянган 1000
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");     // Зун 100
    bytes32 public constant TELLER_ROLE = keccak256("TELLER_ROLE");       // Арбан 10
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");   // 1-of-N unlock
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");     // Backend protection

    // ============ TOKENS & REFERENCES ============
    
    IERC20 public immutable altan;
    address public centralBank;
    address public corrAccount;           // Correspondent account
    address public distributionPool;      // For citizen distributions
    address public walletGuard;           // CitizenWalletGuard contract
    ArbanCompletion public arbanCompletion;

    // ============ ACCOUNT TYPES ============
    
    enum AccountStatus { NONE, PENDING, ACTIVE, FROZEN, CLOSED }

    struct CitizenAccount {
        uint256 id;
        address wallet;          // AltanWallet address
        uint256 seatId;          // SeatSBT ID
        AccountStatus status;
        uint64 openedAt;
        uint64 lastActivityAt;
        bytes32 kycHash;
        string label;
        bool isUnlocked;         // 1-of-N unlock status
    }

    uint256 public nextAccountId;
    mapping(uint256 => CitizenAccount) public accounts;
    mapping(address => uint256) public accountByWallet;
    mapping(uint256 => uint256) public accountBySeatId;

    // ============ LIMITS ============
    
    uint256 public dailyLimit = 100_000e6;      // 100,000 ALTAN daily
    uint256 public singleTxLimit = 50_000e6;    // 50,000 ALTAN per tx

    mapping(uint256 => uint256) public dailyWithdrawn;
    mapping(uint256 => uint256) public lastWithdrawDay;

    // ============ TIER DISTRIBUTION ============
    
    uint256 public tier1Amount = 1_000e6;
    uint256 public tier2FamilyAmount = 5_000e6;
    uint256 public tier2OrgAmount = 8_000e6;
    uint256 public tier3FamilyAmount = 11_241e6;
    uint256 public tier3OrgAmount = 8_241e6;

    mapping(uint256 => mapping(uint256 => bool)) public hasReceivedTier;
    uint256 public totalDistributed;

    // Pending tier approvals
    struct PendingDistribution {
        uint256 seatId;
        uint256 accountId;
        uint8 tier;
        uint8 arbanType;        // 1=Family, 2=Org
        uint256 arbanId;
        uint256 amount;
        uint256 requestedAt;
        bool approved;
        bool rejected;
        address approvedBy;
    }

    PendingDistribution[] public pendingDistributions;

    // ============ STATISTICS ============
    
    uint256 public totalAccounts;

    // ============ EVENTS ============
    
    event AccountOpened(uint256 indexed accountId, address indexed wallet, uint256 indexed seatId);
    event AccountUnlocked(uint256 indexed accountId, address indexed unlockedBy);
    event AccountFrozen(uint256 indexed accountId, string reason);
    event AccountUnfrozen(uint256 indexed accountId);
    
    event TierDistributed(uint256 indexed seatId, uint256 indexed accountId, uint8 tier, uint256 amount);
    event DistributionRequested(uint256 indexed seatId, uint8 tier, uint256 amount);
    event DistributionApproved(uint256 indexed seatId, uint8 tier, address indexed approvedBy);
    event DistributionRejected(uint256 indexed seatId, uint8 tier, address indexed rejectedBy);

    event Transfer(uint256 indexed fromAccount, uint256 indexed toAccount, uint256 amount);
    event LimitUpdated(string limitType, uint256 oldValue, uint256 newValue);

    // ============ ERRORS ============
    
    error ZeroAddress();
    error ZeroAmount();
    error AccountNotFound();
    error AccountNotActive();
    error AccountAlreadyExists();
    error AccountNotUnlocked();
    error AccountFrozenError();
    error DailyLimitExceeded();
    error SingleTxLimitExceeded();
    error InsufficientBalance();
    error NotAccountOwner();
    error AlreadyReceived();
    error InvalidTier();
    error NotEligible();
    error GuardCheckFailed();

    // ============ CONSTRUCTOR ============
    
    constructor(
        address _altan,
        address _centralBank,
        address _chairman
    ) {
        if (_altan == address(0)) revert ZeroAddress();
        if (_centralBank == address(0)) revert ZeroAddress();
        if (_chairman == address(0)) revert ZeroAddress();

        altan = IERC20(_altan);
        centralBank = _centralBank;

        _grantRole(DEFAULT_ADMIN_ROLE, _chairman);
        _grantRole(CHAIRMAN_ROLE, _chairman);
        _grantRole(OFFICER_ROLE, _chairman);
        _grantRole(BANKER_ROLE, _chairman);
    }

    // ============ CONFIGURATION ============
    
    function setCorrAccount(address _corr) external onlyRole(CHAIRMAN_ROLE) {
        if (_corr == address(0)) revert ZeroAddress();
        corrAccount = _corr;
    }

    function setDistributionPool(address _pool) external onlyRole(CHAIRMAN_ROLE) {
        if (_pool == address(0)) revert ZeroAddress();
        distributionPool = _pool;
    }

    function setWalletGuard(address _guard) external onlyRole(CHAIRMAN_ROLE) {
        if (_guard == address(0)) revert ZeroAddress();
        walletGuard = _guard;
    }

    function setArbanCompletion(address _arban) external onlyRole(CHAIRMAN_ROLE) {
        if (_arban == address(0)) revert ZeroAddress();
        arbanCompletion = ArbanCompletion(_arban);
    }

    // ============ ACCOUNT MANAGEMENT ============
    
    /**
     * @notice Open citizen account (linked to SeatSBT)
     * @dev Account starts LOCKED, requires 1-of-N unlock
     */
    function openAccount(
        address wallet,
        uint256 seatId,
        bytes32 kycHash,
        string calldata label
    ) external onlyRole(OFFICER_ROLE) returns (uint256 accountId) {
        if (wallet == address(0)) revert ZeroAddress();
        if (accountByWallet[wallet] != 0) revert AccountAlreadyExists();
        if (seatId != 0 && accountBySeatId[seatId] != 0) revert AccountAlreadyExists();

        accountId = ++nextAccountId;

        accounts[accountId] = CitizenAccount({
            id: accountId,
            wallet: wallet,
            seatId: seatId,
            status: AccountStatus.ACTIVE,
            openedAt: uint64(block.timestamp),
            lastActivityAt: uint64(block.timestamp),
            kycHash: kycHash,
            label: label,
            isUnlocked: false   // Starts locked
        });

        accountByWallet[wallet] = accountId;
        if (seatId != 0) {
            accountBySeatId[seatId] = accountId;
        }

        totalAccounts++;

        emit AccountOpened(accountId, wallet, seatId);
    }

    /**
     * @notice 1-of-N unlock - single verifier unlocks wallet
     * @dev Changed from 3-of-N to 1-of-N per architecture decision
     */
    function unlockAccount(uint256 accountId) external onlyRole(VERIFIER_ROLE) {
        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) revert AccountNotFound();
        if (acc.isUnlocked) return; // Already unlocked

        acc.isUnlocked = true;
        acc.lastActivityAt = uint64(block.timestamp);

        emit AccountUnlocked(accountId, msg.sender);
    }

    /**
     * @notice Freeze account (by officer or protection system)
     */
    function freezeAccount(uint256 accountId, string calldata reason) 
        external 
        onlyRole(OFFICER_ROLE) 
    {
        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) revert AccountNotFound();

        acc.status = AccountStatus.FROZEN;
        emit AccountFrozen(accountId, reason);
    }

    /**
     * @notice Unfreeze account (chairman only)
     */
    function unfreezeAccount(uint256 accountId) external onlyRole(CHAIRMAN_ROLE) {
        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) revert AccountNotFound();

        acc.status = AccountStatus.ACTIVE;
        emit AccountUnfrozen(accountId);
    }

    // ============ TIER DISTRIBUTION ============
    
    /**
     * @notice AUTO: Distribute Tier 1 on verification
     */
    function distributeTier1(uint256 seatId, uint256 accountId) 
        external 
        onlyRole(OFFICER_ROLE) 
    {
        if (hasReceivedTier[seatId][1]) revert AlreadyReceived();
        if (distributionPool == address(0)) revert ZeroAddress();

        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) revert AccountNotFound();
        if (acc.status != AccountStatus.ACTIVE) revert AccountNotActive();
        if (acc.seatId != seatId) revert NotAccountOwner();

        altan.safeTransferFrom(distributionPool, acc.wallet, tier1Amount);

        hasReceivedTier[seatId][1] = true;
        totalDistributed += tier1Amount;
        acc.lastActivityAt = uint64(block.timestamp);

        emit TierDistributed(seatId, accountId, 1, tier1Amount);
    }

    /**
     * @notice REQUEST: Submit Tier 2/3 for manual approval
     */
    function requestTier(uint256 seatId, uint256 accountId, uint8 tier) 
        external 
        onlyRole(OFFICER_ROLE) 
    {
        if (tier != 2 && tier != 3) revert InvalidTier();
        if (hasReceivedTier[seatId][tier]) revert AlreadyReceived();
        if (address(arbanCompletion) == address(0)) revert ZeroAddress();

        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) revert AccountNotFound();
        if (acc.seatId != seatId) revert NotAccountOwner();

        // Detect arban type and eligibility
        (ArbanCompletion.ArbanType arbanType, uint256 arbanId) = 
            arbanCompletion.getArbanTypeForSeat(seatId);

        uint8 aType;
        uint256 amount;

        if (arbanType == ArbanCompletion.ArbanType.FAMILY) {
            aType = 1;
            if (!arbanCompletion.isEligibleForTier2(seatId) && tier == 2) revert NotEligible();
            if (!arbanCompletion.isEligibleForTier3(seatId) && tier == 3) revert NotEligible();
            amount = tier == 2 ? tier2FamilyAmount : tier3FamilyAmount;
        } else if (arbanType == ArbanCompletion.ArbanType.ORGANIZATIONAL) {
            aType = 2;
            if (!arbanCompletion.isEligibleForTier2(seatId) && tier == 2) revert NotEligible();
            if (!arbanCompletion.isEligibleForTier3(seatId) && tier == 3) revert NotEligible();
            amount = tier == 2 ? tier2OrgAmount : tier3OrgAmount;
        } else {
            revert NotEligible();
        }

        pendingDistributions.push(PendingDistribution({
            seatId: seatId,
            accountId: accountId,
            tier: tier,
            arbanType: aType,
            arbanId: arbanId,
            amount: amount,
            requestedAt: block.timestamp,
            approved: false,
            rejected: false,
            approvedBy: address(0)
        }));

        emit DistributionRequested(seatId, tier, amount);
    }

    /**
     * @notice APPROVE: Banker approves Tier 2/3
     */
    function approveTier(uint256 idx) external onlyRole(BANKER_ROLE) {
        require(idx < pendingDistributions.length, "Invalid index");
        
        PendingDistribution storage pending = pendingDistributions[idx];
        require(!pending.approved && !pending.rejected, "Already processed");

        uint256 seatId = pending.seatId;
        uint256 accountId = pending.accountId;
        uint8 tier = pending.tier;
        uint256 amount = pending.amount;

        if (hasReceivedTier[seatId][tier]) revert AlreadyReceived();

        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) revert AccountNotFound();
        if (acc.status != AccountStatus.ACTIVE) revert AccountNotActive();

        altan.safeTransferFrom(distributionPool, acc.wallet, amount);

        pending.approved = true;
        pending.approvedBy = msg.sender;
        hasReceivedTier[seatId][tier] = true;
        totalDistributed += amount;
        acc.lastActivityAt = uint64(block.timestamp);

        emit DistributionApproved(seatId, tier, msg.sender);
        emit TierDistributed(seatId, accountId, tier, amount);
    }

    /**
     * @notice REJECT: Banker rejects Tier 2/3
     */
    function rejectTier(uint256 idx, string calldata reason) external onlyRole(BANKER_ROLE) {
        require(idx < pendingDistributions.length, "Invalid index");
        
        PendingDistribution storage pending = pendingDistributions[idx];
        require(!pending.approved && !pending.rejected, "Already processed");

        pending.rejected = true;
        pending.approvedBy = msg.sender;

        emit DistributionRejected(pending.seatId, pending.tier, msg.sender);
    }

    // ============ TRANSFERS ============
    
    /**
     * @notice Internal transfer between citizen accounts
     * @dev Checks limits and guard approval
     */
    function transfer(
        uint256 fromAccountId,
        uint256 toAccountId,
        uint256 amount
    ) external {
        if (amount == 0) revert ZeroAmount();

        CitizenAccount storage fromAcc = accounts[fromAccountId];
        CitizenAccount storage toAcc = accounts[toAccountId];

        if (fromAcc.wallet == address(0)) revert AccountNotFound();
        if (toAcc.wallet == address(0)) revert AccountNotFound();
        if (fromAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();
        if (toAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();
        if (!fromAcc.isUnlocked) revert AccountNotUnlocked();

        // Only owner or officer can initiate
        if (msg.sender != fromAcc.wallet && !hasRole(OFFICER_ROLE, msg.sender)) {
            revert NotAccountOwner();
        }

        // Check limits for non-officers
        if (!hasRole(OFFICER_ROLE, msg.sender)) {
            _checkLimits(fromAccountId, amount);
        }

        // Check with wallet guard if configured
        if (walletGuard != address(0)) {
            (bool allowed,) = ICitizenWalletGuard(walletGuard).checkTransaction(
                fromAcc.wallet, 
                toAcc.wallet, 
                amount
            );
            if (!allowed) revert GuardCheckFailed();
        }

        altan.safeTransferFrom(fromAcc.wallet, toAcc.wallet, amount);

        fromAcc.lastActivityAt = uint64(block.timestamp);
        toAcc.lastActivityAt = uint64(block.timestamp);

        emit Transfer(fromAccountId, toAccountId, amount);
    }

    function _checkLimits(uint256 accountId, uint256 amount) internal {
        if (amount > singleTxLimit) revert SingleTxLimitExceeded();

        uint256 today = block.timestamp / 1 days;
        if (today != lastWithdrawDay[accountId]) {
            lastWithdrawDay[accountId] = today;
            dailyWithdrawn[accountId] = 0;
        }

        if (dailyWithdrawn[accountId] + amount > dailyLimit) {
            revert DailyLimitExceeded();
        }

        dailyWithdrawn[accountId] += amount;
    }

    // ============ VIEW FUNCTIONS ============
    
    function getAccount(uint256 accountId) external view returns (CitizenAccount memory) {
        return accounts[accountId];
    }

    function getAccountByWallet(address wallet) external view returns (CitizenAccount memory) {
        return accounts[accountByWallet[wallet]];
    }

    function getAccountBySeatId(uint256 seatId) external view returns (CitizenAccount memory) {
        return accounts[accountBySeatId[seatId]];
    }

    function getBalance(uint256 accountId) external view returns (uint256) {
        CitizenAccount storage acc = accounts[accountId];
        if (acc.wallet == address(0)) return 0;
        return altan.balanceOf(acc.wallet);
    }

    function getPendingDistributionsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < pendingDistributions.length; i++) {
            if (!pendingDistributions[i].approved && !pendingDistributions[i].rejected) {
                count++;
            }
        }
        return count;
    }

    // ============ ADMIN ============
    
    function setDailyLimit(uint256 newLimit) external onlyRole(CHAIRMAN_ROLE) {
        emit LimitUpdated("daily", dailyLimit, newLimit);
        dailyLimit = newLimit;
    }

    function setSingleTxLimit(uint256 newLimit) external onlyRole(CHAIRMAN_ROLE) {
        emit LimitUpdated("singleTx", singleTxLimit, newLimit);
        singleTxLimit = newLimit;
    }

    function setTierAmounts(
        uint256 _tier1,
        uint256 _tier2Family,
        uint256 _tier2Org,
        uint256 _tier3Family,
        uint256 _tier3Org
    ) external onlyRole(CHAIRMAN_ROLE) {
        tier1Amount = _tier1;
        tier2FamilyAmount = _tier2Family;
        tier2OrgAmount = _tier2Org;
        tier3FamilyAmount = _tier3Family;
        tier3OrgAmount = _tier3Org;
    }

    // Role management
    function addOfficer(address officer) external onlyRole(CHAIRMAN_ROLE) {
        _grantRole(OFFICER_ROLE, officer);
    }

    function addBanker(address banker) external onlyRole(CHAIRMAN_ROLE) {
        _grantRole(BANKER_ROLE, banker);
    }

    function addTeller(address teller) external onlyRole(OFFICER_ROLE) {
        _grantRole(TELLER_ROLE, teller);
    }

    function addVerifier(address verifier) external onlyRole(OFFICER_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    function addMonitor(address monitor) external onlyRole(CHAIRMAN_ROLE) {
        _grantRole(MONITOR_ROLE, monitor);
    }
}

