// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InstitutionalBank
 * @notice Institutional banking services for government, organizations, guilds, and temples
 * 
 * Split from AltanBankOfSiberia for:
 * - Risk isolation from retail banking
 * - Higher limits and multi-sig support
 * - Different compliance requirements
 *
 * Account types:
 * - GOVERNMENT: State treasury, sovereign fund, ministries
 * - ORGANIZATION: Registered legal entities
 * - GUILD: Professional guilds
 * - TEMPLE: Temple of Heaven accounts
 * - SPECIAL: Reserved for special purposes
 */
contract InstitutionalBank is AccessControl {
    using SafeERC20 for IERC20;

    // ============ ROLES ============
    
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    // ============ TOKEN & REFERENCES ============
    
    IERC20 public immutable altan;
    address public centralBank;
    address public corrAccount;

    // ============ ACCOUNT TYPES ============
    
    enum AccountType { NONE, GOVERNMENT, ORGANIZATION, GUILD, TEMPLE, SPECIAL }
    enum AccountStatus { NONE, PENDING, ACTIVE, FROZEN, CLOSED }

    struct InstitutionalAccount {
        uint256 id;
        address treasury;        // Treasury contract address
        AccountType accType;
        AccountStatus status;
        uint256 entityId;        // OrgId, GuildId, etc.
        uint64 openedAt;
        uint64 lastActivityAt;
        bytes32 registrationHash;
        string label;
        uint256 dailyLimit;      // Per-account custom limit
        bool requiresMultiSig;   // Whether multi-sig is required
    }

    uint256 public nextAccountId;
    mapping(uint256 => InstitutionalAccount) public accounts;
    mapping(address => uint256) public accountByTreasury;
    mapping(AccountType => mapping(uint256 => uint256)) public accountByEntity; // type => entityId => accountId

    // ============ DEFAULT LIMITS ============
    
    uint256 public govDailyLimit = 10_000_000e6;      // 10M ALTAN
    uint256 public orgDailyLimit = 1_000_000e6;       // 1M ALTAN
    uint256 public guildDailyLimit = 500_000e6;       // 500K ALTAN
    uint256 public templeDailyLimit = 5_000_000e6;    // 5M ALTAN

    mapping(uint256 => uint256) public dailyWithdrawn;
    mapping(uint256 => uint256) public lastWithdrawDay;

    // ============ STATISTICS ============
    
    uint256 public totalAccounts;
    mapping(AccountType => uint256) public accountsByType;

    // ============ EVENTS ============
    
    event AccountOpened(
        uint256 indexed accountId, 
        address indexed treasury, 
        AccountType accType, 
        uint256 entityId
    );
    event AccountFrozen(uint256 indexed accountId, string reason);
    event AccountUnfrozen(uint256 indexed accountId);
    event AccountClosed(uint256 indexed accountId, string reason);
    event Transfer(uint256 indexed fromAccount, address indexed to, uint256 amount);
    event Deposit(uint256 indexed accountId, address indexed from, uint256 amount);

    // ============ ERRORS ============
    
    error ZeroAddress();
    error ZeroAmount();
    error AccountNotFound();
    error AccountNotActive();
    error AccountAlreadyExists();
    error InvalidAccountType();
    error DailyLimitExceeded();
    error InsufficientBalance();
    error NotTreasury();
    error MultiSigRequired();

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
    }

    // ============ CONFIGURATION ============
    
    function setCorrAccount(address _corr) external onlyRole(CHAIRMAN_ROLE) {
        if (_corr == address(0)) revert ZeroAddress();
        corrAccount = _corr;
    }

    // ============ ACCOUNT MANAGEMENT ============
    
    /**
     * @notice Open government account
     */
    function openGovAccount(
        address treasury,
        uint256 entityId,
        bytes32 registrationHash,
        string calldata label
    ) external onlyRole(CHAIRMAN_ROLE) returns (uint256 accountId) {
        accountId = _openAccount(
            treasury,
            AccountType.GOVERNMENT,
            entityId,
            registrationHash,
            label,
            govDailyLimit,
            true // requires multi-sig
        );
    }

    /**
     * @notice Open organization account
     */
    function openOrgAccount(
        address treasury,
        uint256 orgId,
        bytes32 registrationHash,
        string calldata label
    ) external onlyRole(OFFICER_ROLE) returns (uint256 accountId) {
        accountId = _openAccount(
            treasury,
            AccountType.ORGANIZATION,
            orgId,
            registrationHash,
            label,
            orgDailyLimit,
            false
        );
    }

    /**
     * @notice Open guild account
     */
    function openGuildAccount(
        address treasury,
        uint256 guildId,
        bytes32 registrationHash,
        string calldata label
    ) external onlyRole(OFFICER_ROLE) returns (uint256 accountId) {
        accountId = _openAccount(
            treasury,
            AccountType.GUILD,
            guildId,
            registrationHash,
            label,
            guildDailyLimit,
            false
        );
    }

    /**
     * @notice Open Temple of Heaven account
     */
    function openTempleAccount(
        address treasury,
        bytes32 registrationHash,
        string calldata label
    ) external onlyRole(CHAIRMAN_ROLE) returns (uint256 accountId) {
        accountId = _openAccount(
            treasury,
            AccountType.TEMPLE,
            0, // No entity ID for temple
            registrationHash,
            label,
            templeDailyLimit,
            true // requires multi-sig
        );
    }

    /**
     * @notice Open special purpose account
     */
    function openSpecialAccount(
        address treasury,
        uint256 purposeId,
        bytes32 registrationHash,
        string calldata label,
        uint256 customLimit,
        bool multiSig
    ) external onlyRole(CHAIRMAN_ROLE) returns (uint256 accountId) {
        accountId = _openAccount(
            treasury,
            AccountType.SPECIAL,
            purposeId,
            registrationHash,
            label,
            customLimit,
            multiSig
        );
    }

    function _openAccount(
        address treasury,
        AccountType accType,
        uint256 entityId,
        bytes32 registrationHash,
        string calldata label,
        uint256 dailyLimit,
        bool multiSig
    ) internal returns (uint256 accountId) {
        if (treasury == address(0)) revert ZeroAddress();
        if (accountByTreasury[treasury] != 0) revert AccountAlreadyExists();
        if (accType == AccountType.NONE) revert InvalidAccountType();

        accountId = ++nextAccountId;

        accounts[accountId] = InstitutionalAccount({
            id: accountId,
            treasury: treasury,
            accType: accType,
            status: AccountStatus.ACTIVE,
            entityId: entityId,
            openedAt: uint64(block.timestamp),
            lastActivityAt: uint64(block.timestamp),
            registrationHash: registrationHash,
            label: label,
            dailyLimit: dailyLimit,
            requiresMultiSig: multiSig
        });

        accountByTreasury[treasury] = accountId;
        if (entityId != 0) {
            accountByEntity[accType][entityId] = accountId;
        }

        totalAccounts++;
        accountsByType[accType]++;

        emit AccountOpened(accountId, treasury, accType, entityId);
    }

    /**
     * @notice Freeze account
     */
    function freezeAccount(uint256 accountId, string calldata reason) 
        external 
        onlyRole(OFFICER_ROLE) 
    {
        InstitutionalAccount storage acc = accounts[accountId];
        if (acc.treasury == address(0)) revert AccountNotFound();

        acc.status = AccountStatus.FROZEN;
        emit AccountFrozen(accountId, reason);
    }

    /**
     * @notice Unfreeze account
     */
    function unfreezeAccount(uint256 accountId) external onlyRole(CHAIRMAN_ROLE) {
        InstitutionalAccount storage acc = accounts[accountId];
        if (acc.treasury == address(0)) revert AccountNotFound();

        acc.status = AccountStatus.ACTIVE;
        emit AccountUnfrozen(accountId);
    }

    /**
     * @notice Close account (requires zero balance)
     */
    function closeAccount(uint256 accountId, string calldata reason) 
        external 
        onlyRole(CHAIRMAN_ROLE) 
    {
        InstitutionalAccount storage acc = accounts[accountId];
        if (acc.treasury == address(0)) revert AccountNotFound();
        if (altan.balanceOf(acc.treasury) > 0) revert InsufficientBalance();

        acc.status = AccountStatus.CLOSED;
        emit AccountClosed(accountId, reason);
    }

    // ============ TRANSFERS ============
    
    /**
     * @notice Distribute from correspondent account
     */
    function distributeFromCorr(
        uint256 toAccountId,
        uint256 amount
    ) external onlyRole(OFFICER_ROLE) {
        if (amount == 0) revert ZeroAmount();

        InstitutionalAccount storage toAcc = accounts[toAccountId];
        if (toAcc.treasury == address(0)) revert AccountNotFound();
        if (toAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();

        altan.safeTransferFrom(corrAccount, toAcc.treasury, amount);

        toAcc.lastActivityAt = uint64(block.timestamp);
        emit Deposit(toAccountId, corrAccount, amount);
    }

    /**
     * @notice Transfer from institutional account
     */
    function transferFrom(
        uint256 fromAccountId,
        address to,
        uint256 amount
    ) external {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        InstitutionalAccount storage fromAcc = accounts[fromAccountId];
        if (fromAcc.treasury == address(0)) revert AccountNotFound();
        if (fromAcc.status != AccountStatus.ACTIVE) revert AccountNotActive();

        // Only treasury or treasurer can initiate
        if (msg.sender != fromAcc.treasury && !hasRole(TREASURER_ROLE, msg.sender)) {
            revert NotTreasury();
        }

        // Check daily limit
        _checkLimit(fromAccountId, amount);

        // Transfer (requires approval from treasury)
        altan.safeTransferFrom(fromAcc.treasury, to, amount);

        fromAcc.lastActivityAt = uint64(block.timestamp);
        emit Transfer(fromAccountId, to, amount);
    }

    function _checkLimit(uint256 accountId, uint256 amount) internal {
        InstitutionalAccount storage acc = accounts[accountId];
        
        uint256 today = block.timestamp / 1 days;
        if (today != lastWithdrawDay[accountId]) {
            lastWithdrawDay[accountId] = today;
            dailyWithdrawn[accountId] = 0;
        }

        if (dailyWithdrawn[accountId] + amount > acc.dailyLimit) {
            revert DailyLimitExceeded();
        }

        dailyWithdrawn[accountId] += amount;
    }

    // ============ VIEW FUNCTIONS ============
    
    function getAccount(uint256 accountId) external view returns (InstitutionalAccount memory) {
        return accounts[accountId];
    }

    function getAccountByTreasury(address treasury) external view returns (InstitutionalAccount memory) {
        return accounts[accountByTreasury[treasury]];
    }

    function getBalance(uint256 accountId) external view returns (uint256) {
        InstitutionalAccount storage acc = accounts[accountId];
        if (acc.treasury == address(0)) return 0;
        return altan.balanceOf(acc.treasury);
    }

    function getStats() external view returns (
        uint256 _total,
        uint256 _gov,
        uint256 _org,
        uint256 _guild,
        uint256 _temple,
        uint256 _special
    ) {
        _total = totalAccounts;
        _gov = accountsByType[AccountType.GOVERNMENT];
        _org = accountsByType[AccountType.ORGANIZATION];
        _guild = accountsByType[AccountType.GUILD];
        _temple = accountsByType[AccountType.TEMPLE];
        _special = accountsByType[AccountType.SPECIAL];
    }

    // ============ ADMIN ============
    
    function setDefaultLimits(
        uint256 _gov,
        uint256 _org,
        uint256 _guild,
        uint256 _temple
    ) external onlyRole(CHAIRMAN_ROLE) {
        govDailyLimit = _gov;
        orgDailyLimit = _org;
        guildDailyLimit = _guild;
        templeDailyLimit = _temple;
    }

    function setAccountLimit(uint256 accountId, uint256 newLimit) 
        external 
        onlyRole(CHAIRMAN_ROLE) 
    {
        accounts[accountId].dailyLimit = newLimit;
    }

    function addOfficer(address officer) external onlyRole(CHAIRMAN_ROLE) {
        _grantRole(OFFICER_ROLE, officer);
    }

    function addTreasurer(address treasurer) external onlyRole(CHAIRMAN_ROLE) {
        _grantRole(TREASURER_ROLE, treasurer);
    }
}
