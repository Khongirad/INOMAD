// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {ArbanCompletion} from "./ArbanCompletion.sol";

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
    
    // Distribution Pool (for distributing to new citizens)
    address public distributionPool;
    
    // Sovereign Wealth Fund (pension fund - remainder goes here)
    address public sovereignFund;
    
    // ArbanCompletion contract reference (for tier eligibility)
    ArbanCompletion public arbanCompletion;
    
    // Citizen distribution tracking
    uint256 public perCitizenAmount;           // Initial amount per verified citizen
    uint256 public totalDistributed;           // Total distributed to citizens
    mapping(uint256 => bool) public hasReceivedDistribution;  // seatId => received

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
    event DistributionPoolSet(address indexed oldPool, address indexed newPool);
    event SovereignFundSet(address indexed oldFund, address indexed newFund);
    event PerCitizenAmountSet(uint256 oldAmount, uint256 newAmount);

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
    event CitizenDistributed(uint256 indexed seatId, uint256 indexed accountId, uint256 amount);
    event FundTransferred(address indexed fund, uint256 amount, string reason);

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
    
    /**
     * @notice Set distribution pool address
     */
    function setDistributionPool(address newPool) external onlyRole(CHAIRMAN_ROLE) {
        if (newPool == address(0)) revert ZeroAddress();
        address oldPool = distributionPool;
        distributionPool = newPool;
        emit DistributionPoolSet(oldPool, newPool);
    }
    
    /**
     * @notice Set sovereign wealth fund address
     */
    function setSovereignFund(address newFund) external onlyRole(CHAIRMAN_ROLE) {
        if (newFund == address(0)) revert ZeroAddress();
        address oldFund = sovereignFund;
        sovereignFund = newFund;
        emit SovereignFundSet(oldFund, newFund);
    }
    
    /**
     * @notice Set per-citizen distribution amount
     * @dev This is the initial amount each verified citizen receives
     */
    function setPerCitizenAmount(uint256 newAmount) external onlyRole(CHAIRMAN_ROLE) {
        uint256 oldAmount = perCitizenAmount;
        perCitizenAmount = newAmount;
        emit PerCitizenAmountSet(oldAmount, newAmount);
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
        if (corrAccount == address(this)) {
            altan.safeTransfer(toAcc.owner, amount);
        } else {
            altan.safeTransferFrom(corrAccount, toAcc.owner, amount);
        }

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

    // ============ CITIZEN DISTRIBUTION (3-TIER MANUAL APPROVAL) ============
    
    bytes32 public constant BANKER_ROLE = keccak256("BANKER_ROLE");
    
    // Tier amounts (can be configured by chairman)
    // Tier 1: Automatic on verification
    uint256 public tier1Amount = 1_000 * 1e6;     // 1,000 ALTAN
    
    // Tier 2: Manual approval
    // - Family Arban: Has at least 1 child
    // - Org Arban: Has 10+ members
    uint256 public tier2FamilyAmount = 5_000 * 1e6;    // 5,000 ALTAN for families
    uint256 public tier2OrgAmount = 8_000 * 1e6;       // 8,000 ALTAN for orgs
    
    // Tier 3: Manual approval  
    // - Family Arban: Married (eligible for Khural representative)
    // - Org Arban: Leader elected
    uint256 public tier3FamilyAmount = 11_241 * 1e6;   // 11,241 ALTAN for families
    uint256 public tier3OrgAmount = 8_241 * 1e6;       // 8,241 ALTAN for orgs
    
    // Tier tracking per citizen
    mapping(uint256 => mapping(uint256 => bool)) public hasReceivedTier; // seatId => tier => received
    
    enum ArbanType { NONE, FAMILY, ORG }  // Track which Arban type for distribution
    
    // Pending approvals queue
    struct PendingDistribution {
        uint256 seatId;
        uint256 accountId;
        uint256 tier;
        ArbanType arbanType;    // Family or Organizational
        uint256 arbanId;        // Arban ID
        uint256 amount;
        uint256 requestedAt;
        bool approved;
        bool rejected;
        address approvedBy;
        uint256 approvedAt;
    }
    
    PendingDistribution[] public pendingDistributions;
    mapping(uint256 => uint256[]) public pendingBySeatId; // seatId => pending indices
    
    event TierAmountSet(uint256 tier, uint256 newAmount);
    event DistributionRequested(uint256 indexed seatId, uint256 indexed accountId, uint256 tier, uint256 amount);
    event DistributionApproved(uint256 indexed seatId, uint256 indexed accountId, uint256 tier, uint256 amount, address indexed approvedBy);
    event DistributionRejected(uint256 indexed seatId, uint256 tier, address indexed rejectedBy);
    event TierDistributed(uint256 indexed seatId, uint256 indexed accountId, uint256 tier, uint256 amount);

    /**
     * @notice Set ArbanCompletion contract address
     * @dev Only chairman can set
     */
    function setArbanCompletion(address arbanCompletion_) external onlyRole(CHAIRMAN_ROLE) {
        require(arbanCompletion_ != address(0), "Zero address");
        arbanCompletion = ArbanCompletion(arbanCompletion_);
    }
    
    /**
     * @notice Set tier distribution amounts (separate for Family and Org)
     * @dev Only chairman can configure amounts
     */
    function setTierAmounts(
        uint256 tier1,
        uint256 tier2Family,
        uint256 tier2Org,
        uint256 tier3Family,
        uint256 tier3Org
    ) external onlyRole(CHAIRMAN_ROLE) {
        tier1Amount = tier1;
        tier2FamilyAmount = tier2Family;
        tier2OrgAmount = tier2Org;
        tier3FamilyAmount = tier3Family;
        tier3OrgAmount = tier3Org;
        
        emit TierAmountSet(1, tier1);
        emit TierAmountSet(2, tier2Family);  // Family
        emit TierAmountSet(2, tier2Org);     // Org  
        emit TierAmountSet(3, tier3Family);  // Family
        emit TierAmountSet(3, tier3Org);     // Org
    }

    /**
     * @notice AUTO: Distribute Tier 1 to newly verified citizen
     * @dev Called automatically on verification
     * @param seatId Citizen's SeatSBT ID
     * @param accountId Citizen's bank account ID
     */
    function distributeTier1Auto(
        uint256 seatId,
        uint256 accountId
    ) external onlyRole(OFFICER_ROLE) {
        if (seatId == 0) revert ZeroAmount();
        if (tier1Amount == 0) revert ZeroAmount();
        if (distributionPool == address(0)) revert ZeroAddress();

        // Check if already received
        if (hasReceivedTier[seatId][1]) {
            revert("Already received Tier 1");
        }

        BankAccount storage acc = accounts[accountId];
        if (acc.owner == address(0)) revert AccountNotFound();
        if (acc.status != AccountStatus.ACTIVE) revert AccountNotActive();
        if (acc.seatId != seatId) revert("Account seatId mismatch");

        // Automatic transfer for Tier 1
        altan.safeTransferFrom(distributionPool, acc.owner, tier1Amount);

        // Mark as distributed
        hasReceivedTier[seatId][1] = true;
        totalDistributed += tier1Amount;

        acc.lastActivityAt = uint64(block.timestamp);

        emit TierDistributed(seatId, accountId, 1, tier1Amount);
        emit Deposit(accountId, distributionPool, tier1Amount);
    }
    
    /**
     * @notice REQUEST: Submit distribution request for manual approval (Tier 2 or 3)
     * @dev Called when citizen becomes eligible for tier. Auto-detects Arban type.
     * @param seatId Citizen's SeatSBT ID
     * @param accountId Citizen's bank account ID
     * @param tier Tier number (2 or 3)
     */
    function requestDistribution(
        uint256 seatId,
        uint256 accountId,
        uint256 tier
    ) external onlyRole(OFFICER_ROLE) {
        require(tier == 2 || tier == 3, "Invalid tier (must be 2 or 3)");
        require(!hasReceivedTier[seatId][tier], "Already received this tier");
        require(address(arbanCompletion) != address(0), "ArbanCompletion not set");
        
        BankAccount storage acc = accounts[accountId];
        require(acc.owner != address(0), "Account not found");
        require(acc.seatId == seatId, "Account seatId mismatch");
        
        // Detect Arban type and verify eligibility
        (ArbanCompletion.ArbanType arbanType, uint256 arbanId) = arbanCompletion.getArbanTypeForSeat(seatId);
        
        ArbanType distribType;
        uint256 amount;
        
        if (arbanType == ArbanCompletion.ArbanType.FAMILY) {
            distribType = ArbanType.FAMILY;
            
            // Verify eligibility for Family Arban
            if (tier == 2) {
                require(arbanCompletion.isEligibleForTier2(seatId), "Family not eligible for Tier 2 (needs children)");
                amount = tier2FamilyAmount;
            } else {
                require(arbanCompletion.isEligibleForTier3(seatId), "Family not eligible for Tier 3 (needs Khural rep)");
                amount = tier3FamilyAmount;
            }
        } else if (arbanType == ArbanCompletion.ArbanType.ORGANIZATIONAL) {
            distribType = ArbanType.ORG;
            
            // Verify eligibility for Org Arban
            if (tier == 2) {
                require(arbanCompletion.isEligibleForTier2(seatId), "Org not eligible for Tier 2 (needs 10+ members)");
                amount = tier2OrgAmount;
            } else {
                require(arbanCompletion.isEligibleForTier3(seatId), "Org not eligible for Tier 3 (needs leader)");
                amount = tier3OrgAmount;
            }
        } else {
            revert("Seat not in any Arban");
        }
        
        // Create pending distribution
        uint256 idx = pendingDistributions.length;
        pendingDistributions.push(PendingDistribution({
            seatId: seatId,
            accountId: accountId,
            tier: tier,
            arbanType: distribType,
            arbanId: arbanId,
            amount: amount,
            requestedAt: block.timestamp,
            approved: false,
            rejected: false,
            approvedBy: address(0),
            approvedAt: 0
        }));
        
        pendingBySeatId[seatId].push(idx);
        
        emit DistributionRequested(seatId, accountId, tier, amount);
    }

    /**
     * @notice APPROVE: Banker manually approves distribution (Tier 2 or 3)
     * @dev Requires BANKER_ROLE
     * @param pendingIdx Index in pendingDistributions array
     */
    function approveDistribution(uint256 pendingIdx) external onlyRole(BANKER_ROLE) {
        require(pendingIdx < pendingDistributions.length, "Invalid index");
        
        PendingDistribution storage pending = pendingDistributions[pendingIdx];
        require(!pending.approved, "Already approved");
        require(!pending.rejected, "Already rejected");
        
        uint256 seatId = pending.seatId;
        uint256 accountId = pending.accountId;
        uint256 tier = pending.tier;
        uint256 amount = pending.amount;
        
        // Check not already received
        require(!hasReceivedTier[seatId][tier], "Already received this tier");
        
        BankAccount storage acc = accounts[accountId];
        require(acc.owner != address(0), "Account not found");
        require(acc.status == AccountStatus.ACTIVE, "Account not active");
        
        // Transfer from distribution pool
        altan.safeTransferFrom(distributionPool, acc.owner, amount);
        
        // Mark as approved and distributed
        pending.approved = true;
        pending.approvedBy = msg.sender;
        pending.approvedAt = block.timestamp;
        
        hasReceivedTier[seatId][tier] = true;
        totalDistributed += amount;
        
        acc.lastActivityAt = uint64(block.timestamp);
        
        emit DistributionApproved(seatId, accountId, tier, amount, msg.sender);
        emit TierDistributed(seatId, accountId, tier, amount);
        emit Deposit(accountId, distributionPool, amount);
    }
    
    /**
     * @notice REJECT: Banker rejects distribution request
     * @dev Requires BANKER_ROLE
     */
    function rejectDistribution(uint256 pendingIdx, string calldata reason) external onlyRole(BANKER_ROLE) {
        require(pendingIdx < pendingDistributions.length, "Invalid index");
        
        PendingDistribution storage pending = pendingDistributions[pendingIdx];
        require(!pending.approved, "Already approved");
        require(!pending.rejected, "Already rejected");
        
        pending.rejected = true;
        pending.approvedBy = msg.sender;
        pending.approvedAt = block.timestamp;
        
        emit DistributionRejected(pending.seatId, pending.tier, msg.sender);
    }
    
    /**
     * @notice Get pending distributions count
     */
    function getPendingCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < pendingDistributions.length; i++) {
            if (!pendingDistributions[i].approved && !pendingDistributions[i].rejected) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @notice Get pending distributions for review
     */
    function getPendingDistributions() external view returns (PendingDistribution[] memory) {
        // Count pending
        uint256 count = 0;
        for (uint256 i = 0; i < pendingDistributions.length; i++) {
            if (!pendingDistributions[i].approved && !pendingDistributions[i].rejected) {
                count++;
            }
        }
        
        // Collect pending
        PendingDistribution[] memory result = new PendingDistribution[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < pendingDistributions.length; i++) {
            if (!pendingDistributions[i].approved && !pendingDistributions[i].rejected) {
                result[idx] = pendingDistributions[i];
                idx++;
            }
        }
        
        return result;
    }

    /**
     * @notice Transfer remaining balance from distribution pool to Sovereign Wealth Fund
     * @dev Called after initial citizen distribution is complete
     * @param amount Amount to transfer to fund
     * @param reason Reason for transfer (e.g., "Initial distribution complete")
     */
    function transferToSovereignFund(
        uint256 amount,
        string calldata reason
    ) external onlyRole(CHAIRMAN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (distributionPool == address(0)) revert ZeroAddress();
        if (sovereignFund == address(0)) revert ZeroAddress();

        // Transfer from distribution pool to sovereign fund
        altan.safeTransferFrom(distributionPool, sovereignFund, amount);

        emit FundTransferred(sovereignFund, amount, reason);
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
    
    /**
     * @notice Add banker (manual approval authority)
     */
    function addBanker(address banker) external onlyRole(CHAIRMAN_ROLE) {
        if (banker == address(0)) revert ZeroAddress();
        _grantRole(BANKER_ROLE, banker);
    }
    
    /**
     * @notice Remove banker
     */
    function removeBanker(address banker) external onlyRole(CHAIRMAN_ROLE) {
        _revokeRole(BANKER_ROLE, banker);
    }
}
