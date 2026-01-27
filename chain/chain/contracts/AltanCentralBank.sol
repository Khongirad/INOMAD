// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Altan.sol";

/**
 * @title AltanCentralBank
 * @notice Central Bank of the ALTAN monetary system.
 *
 * SOLE AUTHORITY for:
 * - Emission (minting) of ALTAN
 * - Destruction (burning) of ALTAN
 * - Monetary policy
 * - Bank licensing
 * - Official ALTAN/USD exchange rate
 * - Government bond issuance and management
 *
 * Analogous to: Federal Reserve, ECB, Bank of Russia
 *
 * Initial Emission: 2,500,000,000,000 ALTAN (2.5 trillion)
 * Target Population: 145,000,000 citizens
 * Per Capita: ~17,241 ALTAN per citizen
 *
 * DOES NOT:
 * - Hold citizen accounts (delegated to licensed banks)
 * - Process retail transactions (delegated to licensed banks)
 * - Issue AUSD certificates (delegated to licensed operators)
 *
 * All emission goes to correspondent accounts of licensed banks.
 * Banks then distribute to citizens and organizations.
 */
contract AltanCentralBank is AccessControl {
    // Roles
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant BOARD_MEMBER_ROLE = keccak256("BOARD_MEMBER_ROLE");

    // ALTAN token
    Altan public immutable altan;

    // ============ BANK LICENSING ============

    enum BankStatus { NONE, PENDING, LICENSED, SUSPENDED, REVOKED }

    struct LicensedBank {
        uint256 id;
        address bankAddress;           // Bank's main contract/address
        address corrAccount;           // Correspondent account at Central Bank
        string name;
        string jurisdiction;
        BankStatus status;
        uint64 licensedAt;
        uint64 lastAuditAt;
        uint256 reserveRequirementBps; // Reserve requirement in basis points
        bytes32 licenseDocHash;        // Hash of license documents
    }

    uint256 public nextBankId;
    mapping(uint256 => LicensedBank) public banks;
    mapping(address => uint256) public bankByAddress;
    mapping(address => uint256) public bankByCorrAccount;

    // First licensed bank (Bank of Siberia)
    uint256 public primaryBankId;

    // ============ GOVERNMENT BONDS ============

    enum BondStatus { NONE, ACTIVE, MATURED, CANCELLED }

    struct GovernmentBond {
        uint256 id;
        string name;                    // e.g., "OFZ-001", "ALTAN-BOND-2026"
        uint256 faceValue;              // Nominal value in ALTAN
        uint256 couponRateBps;          // Annual coupon rate in basis points
        uint256 totalIssued;            // Total bonds issued
        uint256 totalSold;              // Bonds sold to investors
        uint256 totalRedeemed;          // Bonds redeemed at maturity
        uint64 issuedAt;                // Issue date
        uint64 maturityAt;              // Maturity date
        uint64 couponPeriodDays;        // Days between coupon payments
        BondStatus status;
        bytes32 prospectusHash;         // Hash of bond prospectus document
    }

    uint256 public nextBondId;
    mapping(uint256 => GovernmentBond) public bonds;

    // Investor bond holdings: bondId => investor => amount
    mapping(uint256 => mapping(address => uint256)) public bondHoldings;

    // Total bond statistics
    uint256 public totalBondsOutstanding;    // Total face value of outstanding bonds
    uint256 public totalCouponsPaid;         // Total coupons paid to investors

    // ============ INITIAL EMISSION CONSTANTS ============

    uint256 public constant INITIAL_EMISSION = 2_500_000_000_000 * 1e18;  // 2.5 trillion ALTAN
    uint256 public constant TARGET_POPULATION = 145_000_000;               // 145 million citizens
    uint256 public constant PER_CAPITA_AMOUNT = 17_241 * 1e18;            // ~17,241 ALTAN per citizen

    bool public initialEmissionComplete;

    // ============ MONETARY POLICY ============

    // Official exchange rate: basis points (10000 = 1 ALTAN : 1 USD)
    uint256 public officialRateBps;

    // Reserve requirement for banks (basis points)
    uint256 public defaultReserveRequirementBps;

    // Emission limits (can be adjusted by board)
    uint256 public dailyEmissionLimit;
    uint256 public dailyEmissionUsed;
    uint256 public lastEmissionDay;

    // Total statistics
    uint256 public totalEmitted;
    uint256 public totalBurned;

    // ============ EVENTS ============

    event GovernorSet(address indexed oldGovernor, address indexed newGovernor);
    event OfficialRateSet(uint256 oldRate, uint256 newRate);
    event ReserveRequirementSet(uint256 oldReq, uint256 newReq);
    event DailyEmissionLimitSet(uint256 oldLimit, uint256 newLimit);

    // Bank licensing events
    event BankRegistered(uint256 indexed id, address indexed bankAddress, string name);
    event BankLicensed(uint256 indexed id, address indexed corrAccount);
    event BankSuspended(uint256 indexed id, string reason);
    event BankRevoked(uint256 indexed id, string reason);
    event BankAudited(uint256 indexed id, bytes32 auditHash);
    event PrimaryBankSet(uint256 indexed oldId, uint256 indexed newId);

    // Emission events
    event Emission(
        uint256 indexed bankId,
        address indexed corrAccount,
        uint256 amount,
        string reason
    );
    event Destruction(
        uint256 indexed bankId,
        address indexed corrAccount,
        uint256 amount,
        string reason
    );
    event InitialEmissionCompleted(
        uint256 amount,
        address indexed corrAccount,
        uint256 targetPopulation
    );

    // Bond events
    event BondIssued(
        uint256 indexed bondId,
        string name,
        uint256 faceValue,
        uint256 totalIssued,
        uint64 maturityAt
    );
    event BondSold(
        uint256 indexed bondId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );
    event BondRedeemed(
        uint256 indexed bondId,
        address indexed holder,
        uint256 amount,
        uint256 payout
    );
    event CouponPaid(
        uint256 indexed bondId,
        address indexed holder,
        uint256 amount
    );
    event BondMatured(uint256 indexed bondId);
    event BondCancelled(uint256 indexed bondId, string reason);

    // ============ ERRORS ============

    error ZeroAddress();
    error ZeroAmount();
    error BankNotFound();
    error BankNotLicensed();
    error InvalidStatus();
    error AlreadyRegistered();
    error DailyLimitExceeded();
    error InsufficientBalance();
    error NotCorrAccount();

    // ============ MODIFIERS ============

    modifier onlyGovernor() {
        _checkRole(GOVERNOR_ROLE);
        _;
    }

    modifier onlyBoard() {
        if (!hasRole(GOVERNOR_ROLE, msg.sender) && !hasRole(BOARD_MEMBER_ROLE, msg.sender)) {
            revert("not board member");
        }
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address altanToken, address governor) {
        if (altanToken == address(0)) revert ZeroAddress();
        if (governor == address(0)) revert ZeroAddress();

        altan = Altan(altanToken);

        _grantRole(DEFAULT_ADMIN_ROLE, governor);
        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(BOARD_MEMBER_ROLE, governor);

        // Initial monetary policy
        officialRateBps = 10000;              // 1:1 with USD
        defaultReserveRequirementBps = 1000;  // 10% reserve requirement
        dailyEmissionLimit = 10_000_000 * 1e18; // 10M ALTAN daily limit

        emit GovernorSet(address(0), governor);
        emit OfficialRateSet(0, 10000);
        emit ReserveRequirementSet(0, 1000);
        emit DailyEmissionLimitSet(0, dailyEmissionLimit);
    }

    // ============ BANK LICENSING ============

    /**
     * @notice Register a bank for licensing (pending status)
     */
    function registerBank(
        address bankAddress,
        string calldata name,
        string calldata jurisdiction,
        bytes32 licenseDocHash
    ) external onlyGovernor returns (uint256 id) {
        if (bankAddress == address(0)) revert ZeroAddress();
        if (bankByAddress[bankAddress] != 0) revert AlreadyRegistered();

        id = ++nextBankId;

        banks[id] = LicensedBank({
            id: id,
            bankAddress: bankAddress,
            corrAccount: address(0),  // Set when licensed
            name: name,
            jurisdiction: jurisdiction,
            status: BankStatus.PENDING,
            licensedAt: 0,
            lastAuditAt: 0,
            reserveRequirementBps: defaultReserveRequirementBps,
            licenseDocHash: licenseDocHash
        });

        bankByAddress[bankAddress] = id;

        emit BankRegistered(id, bankAddress, name);
    }

    /**
     * @notice Grant license to bank and assign correspondent account
     */
    function grantLicense(uint256 bankId, address corrAccount) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.PENDING && bank.status != BankStatus.SUSPENDED) {
            revert InvalidStatus();
        }
        if (corrAccount == address(0)) revert ZeroAddress();

        bank.corrAccount = corrAccount;
        bank.status = BankStatus.LICENSED;
        bank.licensedAt = uint64(block.timestamp);

        bankByCorrAccount[corrAccount] = bankId;

        emit BankLicensed(bankId, corrAccount);
    }

    /**
     * @notice Suspend bank license
     */
    function suspendBank(uint256 bankId, string calldata reason) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.LICENSED) revert InvalidStatus();

        bank.status = BankStatus.SUSPENDED;

        emit BankSuspended(bankId, reason);
    }

    /**
     * @notice Revoke bank license (permanent)
     */
    function revokeBank(uint256 bankId, string calldata reason) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();

        bank.status = BankStatus.REVOKED;

        emit BankRevoked(bankId, reason);
    }

    /**
     * @notice Record bank audit
     */
    function recordAudit(uint256 bankId, bytes32 auditHash) external onlyBoard {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();

        bank.lastAuditAt = uint64(block.timestamp);

        emit BankAudited(bankId, auditHash);
    }

    /**
     * @notice Set primary bank (Bank of Siberia)
     */
    function setPrimaryBank(uint256 bankId) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();

        uint256 oldId = primaryBankId;
        primaryBankId = bankId;

        emit PrimaryBankSet(oldId, bankId);
    }

    // ============ EMISSION (MINTING) ============

    /**
     * @notice Emit ALTAN to a licensed bank's correspondent account
     * @dev Only Central Bank can create new ALTAN
     */
    function emitToBank(
        uint256 bankId,
        uint256 amount,
        string calldata reason
    ) external onlyGovernor {
        if (amount == 0) revert ZeroAmount();

        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();
        if (bank.corrAccount == address(0)) revert NotCorrAccount();

        // Check daily limit
        _checkDailyLimit(amount);

        // Mint to correspondent account
        altan.mint(bank.corrAccount, amount, reason);

        totalEmitted += amount;
        dailyEmissionUsed += amount;

        emit Emission(bankId, bank.corrAccount, amount, reason);
    }

    /**
     * @notice Emit to primary bank (convenience function)
     */
    function emitToPrimaryBank(uint256 amount, string calldata reason) external onlyGovernor {
        if (primaryBankId == 0) revert BankNotFound();

        LicensedBank storage bank = banks[primaryBankId];
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();

        _checkDailyLimit(amount);

        altan.mint(bank.corrAccount, amount, reason);

        totalEmitted += amount;
        dailyEmissionUsed += amount;

        emit Emission(primaryBankId, bank.corrAccount, amount, reason);
    }

    function _checkDailyLimit(uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        if (today != lastEmissionDay) {
            lastEmissionDay = today;
            dailyEmissionUsed = 0;
        }

        if (dailyEmissionUsed + amount > dailyEmissionLimit) {
            revert DailyLimitExceeded();
        }
    }

    // ============ DESTRUCTION (BURNING) ============

    /**
     * @notice Destroy ALTAN from a bank's correspondent account
     * @dev Used when banks return ALTAN to Central Bank (e.g., for USD swap)
     */
    function destroy(
        uint256 bankId,
        uint256 amount,
        string calldata reason
    ) external onlyGovernor {
        if (amount == 0) revert ZeroAmount();

        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.corrAccount == address(0)) revert NotCorrAccount();

        // Check balance
        if (altan.balanceOf(bank.corrAccount) < amount) {
            revert InsufficientBalance();
        }

        // Burn from correspondent account
        altan.burn(bank.corrAccount, amount, reason);

        totalBurned += amount;

        emit Destruction(bankId, bank.corrAccount, amount, reason);
    }

    // ============ MONETARY POLICY ============

    /**
     * @notice Set official ALTAN/USD exchange rate
     */
    function setOfficialRate(uint256 newRateBps) external onlyBoard {
        require(newRateBps > 0, "rate must be positive");
        uint256 oldRate = officialRateBps;
        officialRateBps = newRateBps;
        emit OfficialRateSet(oldRate, newRateBps);
    }

    /**
     * @notice Set default reserve requirement for banks
     */
    function setReserveRequirement(uint256 newReqBps) external onlyBoard {
        require(newReqBps <= 10000, "max 100%");
        uint256 oldReq = defaultReserveRequirementBps;
        defaultReserveRequirementBps = newReqBps;
        emit ReserveRequirementSet(oldReq, newReqBps);
    }

    /**
     * @notice Set bank-specific reserve requirement
     */
    function setBankReserveRequirement(uint256 bankId, uint256 reqBps) external onlyBoard {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        require(reqBps <= 10000, "max 100%");

        bank.reserveRequirementBps = reqBps;
    }

    /**
     * @notice Set daily emission limit
     */
    function setDailyEmissionLimit(uint256 newLimit) external onlyBoard {
        uint256 oldLimit = dailyEmissionLimit;
        dailyEmissionLimit = newLimit;
        emit DailyEmissionLimitSet(oldLimit, newLimit);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get bank details
     */
    function getBank(uint256 bankId) external view returns (LicensedBank memory) {
        return banks[bankId];
    }

    /**
     * @notice Get primary bank details
     */
    function getPrimaryBank() external view returns (LicensedBank memory) {
        return banks[primaryBankId];
    }

    /**
     * @notice Check if address is a licensed bank's corr account
     */
    function isLicensedCorrAccount(address account) external view returns (bool) {
        uint256 bankId = bankByCorrAccount[account];
        if (bankId == 0) return false;
        return banks[bankId].status == BankStatus.LICENSED;
    }

    /**
     * @notice Get monetary statistics
     */
    function getMonetaryStats() external view returns (
        uint256 _totalEmitted,
        uint256 _totalBurned,
        uint256 _netSupply,
        uint256 _dailyLimitRemaining
    ) {
        _totalEmitted = totalEmitted;
        _totalBurned = totalBurned;
        _netSupply = totalEmitted - totalBurned;

        uint256 today = block.timestamp / 1 days;
        if (today == lastEmissionDay) {
            _dailyLimitRemaining = dailyEmissionLimit > dailyEmissionUsed
                ? dailyEmissionLimit - dailyEmissionUsed
                : 0;
        } else {
            _dailyLimitRemaining = dailyEmissionLimit;
        }
    }

    // ============ ADMIN ============

    /**
     * @notice Add board member
     */
    function addBoardMember(address member) external onlyGovernor {
        if (member == address(0)) revert ZeroAddress();
        _grantRole(BOARD_MEMBER_ROLE, member);
    }

    /**
     * @notice Remove board member
     */
    function removeBoardMember(address member) external onlyGovernor {
        _revokeRole(BOARD_MEMBER_ROLE, member);
    }

    /**
     * @notice Transfer governor role
     */
    function setGovernor(address newGovernor) external onlyGovernor {
        if (newGovernor == address(0)) revert ZeroAddress();

        address oldGovernor = msg.sender;

        _revokeRole(GOVERNOR_ROLE, oldGovernor);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldGovernor);

        _grantRole(GOVERNOR_ROLE, newGovernor);
        _grantRole(DEFAULT_ADMIN_ROLE, newGovernor);
        _grantRole(BOARD_MEMBER_ROLE, newGovernor);

        emit GovernorSet(oldGovernor, newGovernor);
    }
}
