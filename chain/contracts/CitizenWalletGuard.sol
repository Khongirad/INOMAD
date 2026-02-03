// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CitizenWalletGuard
 * @notice Policy Executor for citizen wallet protection
 * 
 * Hybrid security model:
 * - This contract = "Lock" (enforces rules on-chain)
 * - Backend service = "Camera" (AI, pattern detection, risk scoring)
 * 
 * Features:
 * - Pre-transaction validation
 * - Backend-triggered wallet locking
 * - Judicial freeze (via Multi-Sig)
 * - Blacklist/whitelist management
 * - Risk score storage
 */
contract CitizenWalletGuard is AccessControl {

    // ============ ROLES ============
    
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");    // Backend monitor
    bytes32 public constant JUSTICE_ROLE = keccak256("JUSTICE_ROLE");      // JudicialMultiSig
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");          // Configuration

    // ============ LOCK STATUS ============
    
    enum LockReason { NONE, SUSPICIOUS_ACTIVITY, JUDICIAL_ORDER, USER_REQUEST, ADMIN_ACTION }

    struct WalletLock {
        bool isLocked;
        LockReason reason;
        bytes32 caseHash;      // For judicial orders
        uint256 lockedAt;
        address lockedBy;
        string description;
    }

    mapping(address => WalletLock) public walletLocks;
    
    // ============ RISK SCORING ============
    
    // Risk score 0-100 (0 = safe, 100 = block)
    mapping(address => uint256) public riskScores;
    uint256 public autoLockThreshold = 80;  // Auto-lock if score >= 80

    // ============ BLACKLIST / WHITELIST ============
    
    mapping(address => bool) public globalBlacklist;
    mapping(address => mapping(address => bool)) public userWhitelist;  // user => recipient => allowed

    // ============ TRANSACTION LIMITS ============
    
    // Emergency limits (stricter than bank limits)
    uint256 public emergencyDailyLimit = 50_000e6;   // 50K during emergency
    uint256 public emergencySingleLimit = 10_000e6;  // 10K per tx during emergency
    bool public emergencyMode;

    // Per-wallet daily tracking for emergency mode
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public lastVolumeDay;

    // ============ STATISTICS ============
    
    uint256 public totalLocked;
    uint256 public totalJudicialFreezes;
    uint256 public totalBlockedTransactions;

    // ============ EVENTS ============
    
    event WalletLocked(
        address indexed wallet, 
        LockReason reason, 
        bytes32 caseHash, 
        address indexed lockedBy
    );
    event WalletUnlocked(address indexed wallet, address indexed unlockedBy);
    event RiskScoreUpdated(address indexed wallet, uint256 oldScore, uint256 newScore);
    event TransactionBlocked(address indexed from, address indexed to, uint256 amount, string reason);
    event BlacklistUpdated(address indexed addr, bool blacklisted);
    event EmergencyModeChanged(bool enabled);
    event JudicialFreeze(address indexed wallet, bytes32 indexed caseHash, address indexed authority);

    // ============ ERRORS ============
    
    error WalletLocked_Error();
    error BlacklistedAddress();
    error RiskTooHigh();
    error EmergencyLimitExceeded();
    error NotLocked();
    error ZeroAddress();

    // ============ CONSTRUCTOR ============
    
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // ============ TRANSACTION VALIDATION ============
    
    /**
     * @notice Check if transaction is allowed
     * @dev Called by CitizenBank before transfer
     * @return allowed Whether transaction can proceed
     * @return reason Rejection reason if not allowed
     */
    function checkTransaction(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        // 1. Check if sender is locked
        if (walletLocks[from].isLocked) {
            return (false, "Wallet is locked");
        }

        // 2. Check global blacklist
        if (globalBlacklist[to]) {
            return (false, "Recipient is blacklisted");
        }

        // 3. Check risk score
        if (riskScores[from] >= autoLockThreshold) {
            return (false, "Risk score too high");
        }

        // 4. Check emergency limits
        if (emergencyMode) {
            if (amount > emergencySingleLimit) {
                return (false, "Emergency single tx limit exceeded");
            }
            
            uint256 today = block.timestamp / 1 days;
            uint256 todayVolume = dailyVolume[from];
            if (lastVolumeDay[from] != today) {
                todayVolume = 0;
            }
            
            if (todayVolume + amount > emergencyDailyLimit) {
                return (false, "Emergency daily limit exceeded");
            }
        }

        return (true, "");
    }

    /**
     * @notice Record transaction volume (for emergency mode tracking)
     * @dev Called after successful transaction
     */
    function recordTransaction(address wallet, uint256 amount) external onlyRole(GUARDIAN_ROLE) {
        uint256 today = block.timestamp / 1 days;
        
        if (lastVolumeDay[wallet] != today) {
            lastVolumeDay[wallet] = today;
            dailyVolume[wallet] = amount;
        } else {
            dailyVolume[wallet] += amount;
        }
    }

    // ============ LOCK MANAGEMENT ============
    
    /**
     * @notice Lock wallet due to suspicious activity (by backend)
     */
    function lockWallet(
        address wallet,
        string calldata description
    ) external onlyRole(GUARDIAN_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();

        walletLocks[wallet] = WalletLock({
            isLocked: true,
            reason: LockReason.SUSPICIOUS_ACTIVITY,
            caseHash: bytes32(0),
            lockedAt: block.timestamp,
            lockedBy: msg.sender,
            description: description
        });

        totalLocked++;
        emit WalletLocked(wallet, LockReason.SUSPICIOUS_ACTIVITY, bytes32(0), msg.sender);
    }

    /**
     * @notice Judicial freeze (by Multi-Sig court order)
     */
    function judicialFreeze(
        address wallet,
        bytes32 caseHash
    ) external onlyRole(JUSTICE_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();

        walletLocks[wallet] = WalletLock({
            isLocked: true,
            reason: LockReason.JUDICIAL_ORDER,
            caseHash: caseHash,
            lockedAt: block.timestamp,
            lockedBy: msg.sender,
            description: "Judicial order"
        });

        totalLocked++;
        totalJudicialFreezes++;
        
        emit WalletLocked(wallet, LockReason.JUDICIAL_ORDER, caseHash, msg.sender);
        emit JudicialFreeze(wallet, caseHash, msg.sender);
    }

    /**
     * @notice Unlock wallet (admin or after judicial review)
     */
    function unlockWallet(address wallet) external {
        WalletLock storage lock = walletLocks[wallet];
        if (!lock.isLocked) revert NotLocked();

        // Judicial locks require JUSTICE_ROLE to unlock
        if (lock.reason == LockReason.JUDICIAL_ORDER) {
            require(hasRole(JUSTICE_ROLE, msg.sender), "Only justice can unlock judicial freeze");
        } else {
            require(
                hasRole(ADMIN_ROLE, msg.sender) || hasRole(GUARDIAN_ROLE, msg.sender),
                "Not authorized"
            );
        }

        lock.isLocked = false;
        totalLocked--;

        emit WalletUnlocked(wallet, msg.sender);
    }

    // ============ RISK SCORING ============
    
    /**
     * @notice Update risk score (by backend AI)
     */
    function updateRiskScore(address wallet, uint256 newScore) 
        external 
        onlyRole(GUARDIAN_ROLE) 
    {
        require(newScore <= 100, "Score must be 0-100");
        
        uint256 oldScore = riskScores[wallet];
        riskScores[wallet] = newScore;

        emit RiskScoreUpdated(wallet, oldScore, newScore);

        // Auto-lock if threshold exceeded
        if (newScore >= autoLockThreshold && !walletLocks[wallet].isLocked) {
            walletLocks[wallet] = WalletLock({
                isLocked: true,
                reason: LockReason.SUSPICIOUS_ACTIVITY,
                caseHash: bytes32(0),
                lockedAt: block.timestamp,
                lockedBy: msg.sender,
                description: "Auto-locked: high risk score"
            });
            totalLocked++;
            emit WalletLocked(wallet, LockReason.SUSPICIOUS_ACTIVITY, bytes32(0), msg.sender);
        }
    }

    /**
     * @notice Batch update risk scores
     */
    function batchUpdateRiskScores(
        address[] calldata wallets,
        uint256[] calldata scores
    ) external onlyRole(GUARDIAN_ROLE) {
        require(wallets.length == scores.length, "Length mismatch");
        
        for (uint256 i = 0; i < wallets.length; i++) {
            require(scores[i] <= 100, "Score must be 0-100");
            riskScores[wallets[i]] = scores[i];
        }
    }

    // ============ BLACKLIST MANAGEMENT ============
    
    /**
     * @notice Add address to global blacklist
     */
    function addToBlacklist(address addr) external onlyRole(ADMIN_ROLE) {
        globalBlacklist[addr] = true;
        emit BlacklistUpdated(addr, true);
    }

    /**
     * @notice Remove address from blacklist
     */
    function removeFromBlacklist(address addr) external onlyRole(ADMIN_ROLE) {
        globalBlacklist[addr] = false;
        emit BlacklistUpdated(addr, false);
    }

    /**
     * @notice Batch add to blacklist
     */
    function batchAddToBlacklist(address[] calldata addrs) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < addrs.length; i++) {
            globalBlacklist[addrs[i]] = true;
            emit BlacklistUpdated(addrs[i], true);
        }
    }

    // ============ EMERGENCY MODE ============
    
    /**
     * @notice Enable/disable emergency mode
     */
    function setEmergencyMode(bool enabled) external onlyRole(ADMIN_ROLE) {
        emergencyMode = enabled;
        emit EmergencyModeChanged(enabled);
    }

    /**
     * @notice Set emergency limits
     */
    function setEmergencyLimits(
        uint256 dailyLimit,
        uint256 singleLimit
    ) external onlyRole(ADMIN_ROLE) {
        emergencyDailyLimit = dailyLimit;
        emergencySingleLimit = singleLimit;
    }

    // ============ CONFIGURATION ============
    
    function setAutoLockThreshold(uint256 threshold) external onlyRole(ADMIN_ROLE) {
        require(threshold <= 100, "Threshold must be 0-100");
        autoLockThreshold = threshold;
    }

    // ============ VIEW FUNCTIONS ============
    
    function getLockStatus(address wallet) external view returns (
        bool isLocked,
        LockReason reason,
        bytes32 caseHash,
        uint256 lockedAt
    ) {
        WalletLock storage lock = walletLocks[wallet];
        return (lock.isLocked, lock.reason, lock.caseHash, lock.lockedAt);
    }

    function getStats() external view returns (
        uint256 _totalLocked,
        uint256 _judicialFreezes,
        uint256 _blockedTx,
        bool _emergencyMode
    ) {
        return (totalLocked, totalJudicialFreezes, totalBlockedTransactions, emergencyMode);
    }

    // ============ ROLE MANAGEMENT ============
    
    function addGuardian(address guardian) external onlyRole(ADMIN_ROLE) {
        _grantRole(GUARDIAN_ROLE, guardian);
    }

    function addJustice(address justice) external onlyRole(ADMIN_ROLE) {
        _grantRole(JUSTICE_ROLE, justice);
    }

    function removeGuardian(address guardian) external onlyRole(ADMIN_ROLE) {
        _revokeRole(GUARDIAN_ROLE, guardian);
    }

    function removeJustice(address justice) external onlyRole(ADMIN_ROLE) {
        _revokeRole(JUSTICE_ROLE, justice);
    }
}
