// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SovereignWealthFund
 * @notice Суверенный Фонд Благосостояния Сибирской Конфедерации
 * 
 * Inspired by Norway's Government Pension Fund Global
 * 
 * Purpose:
 * - Store remainder from initial citizen distribution
 * - Receive profits from natural resources (oil, gas, minerals)
 * - Receive dividends from national enterprises
 * - Receive tax revenue
 * - Publicly transparent balance (visible to all citizens)
 * - Support future investments in infrastructure
 * 
 * Principles:
 * - Full transparency (all balances public)
 * - Democratic oversight (governed by elected officials)
 * - Long-term sustainability (not for immediate spending)
 * - Inter-generational equity (for future citizens)
 */
contract SovereignWealthFund is AccessControl {
    using SafeERC20 for IERC20;

    /* ==================== ROLES ==================== */
    bytes32 public constant FUND_MANAGER_ROLE = keccak256("FUND_MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    /* ==================== STATE ==================== */
    
    // ALTAN token
    IERC20 public immutable altan;
    
    // Fund accounting
    uint256 public totalReceived;      // Total ALTAN received all-time
    uint256 public totalInvested;      // Total invested in projects
    uint256 public totalWithdrawn;     // Total withdrawn (should be minimal)
    
    // Income sources tracking
    enum IncomeSource {
        INITIAL_DISTRIBUTION,   // Remainder from initial citizen distribution
        RESOURCE_PROFITS,       // Profits from oil, gas, mineral extraction
        FACTORY_DIVIDENDS,      // Dividends from national factories/enterprises
        TAX_REVENUE,           // Tax revenue from economic activity
        INVESTMENT_RETURNS,    // Returns from fund investments
        DONATIONS,             // Voluntary donations/contributions
        OTHER                  // Other sources
    }
    
    mapping(IncomeSource => uint256) public incomeBySource;
    
    // Investment tracking
    struct Investment {
        uint256 id;
        string name;                  // e.g., "Infrastructure Project Alpha"
        string description;
        uint256 amount;
        address beneficiary;          // Contract or entity receiving investment
        uint64 timestamp;
        bool active;
        bytes32 approvalHash;         // Hash of approval document
    }
    
    uint256 public nextInvestmentId;
    mapping(uint256 => Investment) public investments;
    uint256[] public activeInvestmentIds;
    
    // Annual statistics (for public reporting)
    struct AnnualReport {
        uint256 year;
        uint256 totalBalance;
        uint256 received;
        uint256 invested;
        uint256 investmentReturns;    // Returns from investments
        bytes32 reportHash;            // IPFS hash or similar
        uint64 publishedAt;
    }
    
    mapping(uint256 => AnnualReport) public annualReports;
    uint256[] public publishedYears;
    
    /* ==================== EVENTS ==================== */
    
    event FundsReceived(
        IncomeSource indexed source,
        uint256 amount,
        string reason,
        address indexed from
    );
    
    event InvestmentCreated(
        uint256 indexed id,
        string name,
        uint256 amount,
        address indexed beneficiary
    );
    
    event InvestmentClosed(uint256 indexed id, uint256 finalAmount);
    
    event FundsWithdrawn(
        address indexed to,
        uint256 amount,
        string reason,
        bytes32 approvalHash
    );
    
    event AnnualReportPublished(
        uint256 indexed year,
        uint256 totalBalance,
        bytes32 reportHash
    );
    
    /* ==================== ERRORS ==================== */
    
    error ZeroAddress();
    error ZeroAmount();
    error InvestmentNotFound();
    error InvestmentNotActive();
    error InsufficientFunds();
    error Unauthorized();
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(
        address altanToken,
        address admin
    ) {
        if (altanToken == address(0)) revert ZeroAddress();
        if (admin == address(0)) revert ZeroAddress();
        
        altan = IERC20(altanToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FUND_MANAGER_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }
    
    /* ==================== RECEIVE FUNDS ==================== */
    
    /**
     * @notice Receive ALTAN into the fund
     * @param source Income source category
     * @param amount Amount of ALTAN
     * @param reason Description of income
     */
    function receiveFunds(
        IncomeSource source,
        uint256 amount,
        string calldata reason
    ) external onlyRole(FUND_MANAGER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        
        // Transfer ALTAN to fund (requires approval)
        altan.safeTransferFrom(msg.sender, address(this), amount);
        
        totalReceived += amount;
        incomeBySource[source] += amount;
        
        emit FundsReceived(source, amount, reason, msg.sender);
    }
    
    /**
     * @notice Directly deposit ALTAN (from approved sources)
     * @dev Can be called by contracts like AltanBankOfSiberia
     */
    function deposit(
        IncomeSource source,
        uint256 amount,
        string calldata reason
    ) external {
        if (amount == 0) revert ZeroAmount();
        
        // Transfer from caller
        altan.safeTransferFrom(msg.sender, address(this), amount);
        
        totalReceived += amount;
        incomeBySource[source] += amount;
        
        emit FundsReceived(source, amount, reason, msg.sender);
    }
    
    /* ==================== INVESTMENTS ==================== */
    
    /**
     * @notice Create investment allocation
     * @param name Investment name
     * @param description Investment description
     * @param amount Amount to invest
     * @param beneficiary Address receiving investment
     * @param approvalHash Hash of government approval document
     */
    function createInvestment(
        string calldata name,
        string calldata description,
        uint256 amount,
        address beneficiary,
        bytes32 approvalHash
    ) external onlyRole(FUND_MANAGER_ROLE) returns (uint256 id) {
        if (amount == 0) revert ZeroAmount();
        if (beneficiary == address(0)) revert ZeroAddress();
        if (altan.balanceOf(address(this)) < amount) revert InsufficientFunds();
        
        id = nextInvestmentId++;
        
        investments[id] = Investment({
            id: id,
            name: name,
            description: description,
            amount: amount,
            beneficiary: beneficiary,
            timestamp: uint64(block.timestamp),
            active: true,
            approvalHash: approvalHash
        });
        
        activeInvestmentIds.push(id);
        
        // Transfer to beneficiary
        altan.safeTransfer(beneficiary, amount);
        totalInvested += amount;
        
        emit InvestmentCreated(id, name, amount, beneficiary);
    }
    
    /**
     * @notice Close investment (mark as completed)
     */
    function closeInvestment(
        uint256 investmentId,
        uint256 finalAmount
    ) external onlyRole(FUND_MANAGER_ROLE) {
        Investment storage investment = investments[investmentId];
        if (investment.beneficiary == address(0)) revert InvestmentNotFound();
        if (!investment.active) revert InvestmentNotActive();
        
        investment.active = false;
        
        // Remove from activeInvestmentIds
        for (uint256 i = 0; i < activeInvestmentIds.length; i++) {
            if (activeInvestmentIds[i] == investmentId) {
                activeInvestmentIds[i] = activeInvestmentIds[activeInvestmentIds.length - 1];
                activeInvestmentIds.pop();
                break;
            }
        }
        
        emit InvestmentClosed(investmentId, finalAmount);
    }
    
    /* ==================== WITHDRAWALS (EMERGENCY ONLY) ==================== */
    
    /**
     * @notice Withdraw funds (requires multi-sig approval)
     * @dev Should be used very rarely, only for emergencies
     */
    function withdraw(
        address to,
        uint256 amount,
        string calldata reason,
        bytes32 approvalHash
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (altan.balanceOf(address(this)) < amount) revert InsufficientFunds();
        
        altan.safeTransfer(to, amount);
        totalWithdrawn += amount;
        
        emit FundsWithdrawn(to, amount, reason, approvalHash);
    }
    
    /* ==================== REPORTING ==================== */
    
    /**
     * @notice Publish annual report
     * @dev For transparency and public accountability
     */
    function publishAnnualReport(
        uint256 year,
        uint256 received,
        uint256 invested,
        uint256 investmentReturns,
        bytes32 reportHash
    ) external onlyRole(AUDITOR_ROLE) {
        uint256 currentBalance = altan.balanceOf(address(this));
        
        annualReports[year] = AnnualReport({
            year: year,
            totalBalance: currentBalance,
            received: received,
            invested: invested,
            investmentReturns: investmentReturns,
            reportHash: reportHash,
            publishedAt: uint64(block.timestamp)
        });
        
        publishedYears.push(year);
        
        emit AnnualReportPublished(year, currentBalance, reportHash);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get current fund balance
     */
    function getCurrentBalance() external view returns (uint256) {
        return altan.balanceOf(address(this));
    }
    
    /**
     * @notice Get fund statistics
     */
    function getFundStats() external view returns (
        uint256 balance,
        uint256 _totalReceived,
        uint256 _totalInvested,
        uint256 _totalWithdrawn,
        uint256 activeInvestments
    ) {
        balance = altan.balanceOf(address(this));
        _totalReceived = totalReceived;
        _totalInvested = totalInvested;
        _totalWithdrawn = totalWithdrawn;
        activeInvestments = activeInvestmentIds.length;
    }
    
    /**
     * @notice Get income breakdown by source
     */
    function getIncomeBreakdown() external view returns (
        uint256[] memory sources,
        uint256[] memory amounts
    ) {
        sources = new uint256[](7);  // 7 income sources
        amounts = new uint256[](7);
        
        for (uint256 i = 0; i < 7; i++) {
            sources[i] = i;
            amounts[i] = incomeBySource[IncomeSource(i)];
        }
    }
    
    /**
     * @notice Get active investment IDs
     */
    function getActiveInvestments() external view returns (uint256[] memory) {
        return activeInvestmentIds;
    }
    
    /**
     * @notice Get investment details
     */
    function getInvestment(uint256 id) external view returns (Investment memory) {
        return investments[id];
    }
    
    /**
     * @notice Get annual report for specific year
     */
    function getAnnualReport(uint256 year) external view returns (AnnualReport memory) {
        return annualReports[year];
    }
    
    /**
     * @notice Get all published years
     */
    function getPublishedYears() external view returns (uint256[] memory) {
        return publishedYears;
    }
    
    /* ==================== ADMIN ==================== */
    
    /**
     * @notice Add fund manager
     */
    function addFundManager(address manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (manager == address(0)) revert ZeroAddress();
        _grantRole(FUND_MANAGER_ROLE, manager);
    }
    
    /**
     * @notice Add auditor
     */
    function addAuditor(address auditor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (auditor == address(0)) revert ZeroAddress();
        _grantRole(AUDITOR_ROLE, auditor);
    }
}
