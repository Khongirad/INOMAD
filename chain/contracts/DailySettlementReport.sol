// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DailySettlementReport
 * @notice US-style daily banking settlement reports for transparency
 * 
 * Purpose:
 * - Track all manual distributions per day
 * - Record banker approvals
 * - Generate end-of-day reports
 * - Public transparency (like FDIC)
 * 
 * Report Breakdown:
 * - Total verifications
 * - Total distributions (by tier)
 * - Total ALTAN distributed
 * - Banker activity logs
 * - Finalized status
 * 
 * Daily Cycle:
 * 1. Day starts (automatic)
 * 2. Bankers approve distributions throughout day
 * 3. End of day: Admin finalizes report
 * 4. Report becomes immutable
 */
contract DailySettlementReport {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotBanker();
    error ZeroAddress();
    error ReportAlreadyFinalized();
    error ReportNotFinalized();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant SECONDS_PER_DAY = 86400; // 24 hours
    
    /* ==================== STATE ==================== */
    address public owner;
    mapping(address => bool) public bankers; // Authorized bankers
    
    struct DailyReport {
        uint256 day;                        // Day number (timestamp / 86400)
        uint256 totalVerifications;         // Citizens verified today
        uint256 totalDistributions;         // Manual distributions approved
        uint256 totalAmountDistributed;     // Total ALTAN distributed
        uint256 tier1Count;                 // Tier 1 distributions
        uint256 tier2Count;                 // Tier 2 distributions
        uint256 tier3Count;                 // Tier 3 distributions
        uint256 tier1Amount;                // ALTAN distributed in Tier 1
        uint256 tier2Amount;                // ALTAN distributed in Tier 2
        uint256 tier3Amount;                // ALTAN distributed in Tier 3
        address[] activeBankers;            // Bankers who approved today
        bool finalized;                     // Report closed for the day
        uint256 finalizedAt;                // Timestamp of finalization
        address finalizedBy;                // Who finalized the report
    }
    
    mapping(uint256 => DailyReport) public reports;
    
    // Detailed transaction log
    struct DistributionLog {
        uint256 day;
        uint256 seatId;
        uint256 tier;
        uint256 amount;
        address banker;
        uint256 timestamp;
    }
    
    DistributionLog[] public distributionLogs;
    mapping(uint256 => uint256[]) public logsPerDay; // day => log indices
    
    /* ==================== EVENTS ==================== */
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event BankerAdded(address indexed banker);
    event BankerRemoved(address indexed banker);
    event VerificationRecorded(uint256 indexed day, uint256 count);
    event DistributionRecorded(
        uint256 indexed day,
        uint256 indexed seatId,
        uint256 tier,
        uint256 amount,
        address indexed banker
    );
    event ReportFinalized(
        uint256 indexed day,
        uint256 totalDistributions,
        uint256 totalAmount,
        address indexed finalizedBy
    );
    
    /* ==================== MODIFIERS ==================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyBanker() {
        if (!bankers[msg.sender]) revert NotBanker();
        _;
    }
    
    modifier onlyBankerOrOwner() {
        if (!bankers[msg.sender] && msg.sender != owner) revert NotBanker();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    constructor() {
        owner = msg.sender;
        bankers[msg.sender] = true; // Owner is first banker
    }
    
    /* ==================== REPORTING ==================== */
    
    /**
     * @notice Record a citizen verification
     * @param day Day number
     */
    function recordVerification(uint256 day) external onlyBankerOrOwner {
        DailyReport storage report = reports[day];
        if (report.finalized) revert ReportAlreadyFinalized();
        
        report.day = day;
        report.totalVerifications++;
        
        emit VerificationRecorded(day, report.totalVerifications);
    }
    
    /**
     * @notice Record a manual distribution
     * @param seatId Citizen seat ID
     * @param tier Distribution tier (1, 2, or 3)
     * @param amount ALTAN amount distributed
     */
    function recordDistribution(
        uint256 seatId,
        uint256 tier,
        uint256 amount
    ) external onlyBanker {
        uint256 today = getCurrentDay();
        DailyReport storage report = reports[today];
        
        if (report.finalized) revert ReportAlreadyFinalized();
        
        // Initialize report if needed
        if (report.day == 0) {
            report.day = today;
        }
        
        // Update counts
        report.totalDistributions++;
        report.totalAmountDistributed += amount;
        
        if (tier == 1) {
            report.tier1Count++;
            report.tier1Amount += amount;
        } else if (tier == 2) {
            report.tier2Count++;
            report.tier2Amount += amount;
        } else if (tier == 3) {
            report.tier3Count++;
            report.tier3Amount += amount;
        }
        
        // Add banker if not already in list
        _addBankerToReport(report, msg.sender);
        
        // Create detailed log
        uint256 logIdx = distributionLogs.length;
        distributionLogs.push(DistributionLog({
            day: today,
            seatId: seatId,
            tier: tier,
            amount: amount,
            banker: msg.sender,
            timestamp: block.timestamp
        }));
        
        logsPerDay[today].push(logIdx);
        
        emit DistributionRecorded(today, seatId, tier, amount, msg.sender);
    }
    
    /**
     * @notice Finalize daily report (end of day)
     * @param day Day to finalize
     */
    function finalizeReport(uint256 day) external onlyOwner {
        DailyReport storage report = reports[day];
        if (report.finalized) revert ReportAlreadyFinalized();
        
        report.finalized = true;
        report.finalizedAt = block.timestamp;
        report.finalizedBy = msg.sender;
        
        emit ReportFinalized(
            day,
            report.totalDistributions,
            report.totalAmountDistributed,
            msg.sender
        );
    }
    
    /* ==================== INTERNAL ==================== */
    
    function _addBankerToReport(DailyReport storage report, address banker) internal {
        for (uint256 i = 0; i < report.activeBankers.length; i++) {
            if (report.activeBankers[i] == banker) return;
        }
        report.activeBankers.push(banker);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get current day
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }
    
    /**
     * @notice Get report for specific day
     */
    function getReport(uint256 day) external view returns (
        uint256 totalVerifications,
        uint256 totalDistributions,
        uint256 totalAmountDistributed,
        uint256[3] memory tierCounts,  // [tier1, tier2, tier3]
        uint256[3] memory tierAmounts, // [tier1, tier2, tier3]
        address[] memory activeBankers,
        bool finalized,
        uint256 finalizedAt
    ) {
        DailyReport storage report = reports[day];
        
        tierCounts[0] = report.tier1Count;
        tierCounts[1] = report.tier2Count;
        tierCounts[2] = report.tier3Count;
        
        tierAmounts[0] = report.tier1Amount;
        tierAmounts[1] = report.tier2Amount;
        tierAmounts[2] = report.tier3Amount;
        
        return (
            report.totalVerifications,
            report.totalDistributions,
            report.totalAmountDistributed,
            tierCounts,
            tierAmounts,
            report.activeBankers,
            report.finalized,
            report.finalizedAt
        );
    }
    
    /**
     * @notice Get today's report
     */
    function getTodayReport() external view returns (
        uint256 totalVerifications,
        uint256 totalDistributions,
        uint256 totalAmountDistributed,
        uint256[3] memory tierCounts,
        uint256[3] memory tierAmounts,
        address[] memory activeBankers
    ) {
        uint256 today = getCurrentDay();
        DailyReport storage report = reports[today];
        
        tierCounts[0] = report.tier1Count;
        tierCounts[1] = report.tier2Count;
        tierCounts[2] = report.tier3Count;
        
        tierAmounts[0] = report.tier1Amount;
        tierAmounts[1] = report.tier2Amount;
        tierAmounts[2] = report.tier3Amount;
        
        return (
            report.totalVerifications,
            report.totalDistributions,
            report.totalAmountDistributed,
            tierCounts,
            tierAmounts,
            report.activeBankers
        );
    }
    
    /**
     * @notice Get distribution logs for a day
     */
    function getLogsForDay(uint256 day) external view returns (uint256[] memory) {
        return logsPerDay[day];
    }
    
    /**
     * @notice Get distribution log details
     */
    function getDistributionLog(uint256 logIdx) external view returns (
        uint256 day,
        uint256 seatId,
        uint256 tier,
        uint256 amount,
        address banker,
        uint256 timestamp
    ) {
        DistributionLog storage log = distributionLogs[logIdx];
        return (
            log.day,
            log.seatId,
            log.tier,
            log.amount,
            log.banker,
            log.timestamp
        );
    }
    
    /**
     * @notice Get total distribution logs
     */
    function getTotalLogs() external view returns (uint256) {
        return distributionLogs.length;
    }
    
    /* ==================== ADMIN ==================== */
    
    /**
     * @notice Add banker
     */
    function addBanker(address banker) external onlyOwner {
        if (banker == address(0)) revert ZeroAddress();
        bankers[banker] = true;
        emit BankerAdded(banker);
    }
    
    /**
     * @notice Remove banker
     */
    function removeBanker(address banker) external onlyOwner {
        bankers[banker] = false;
        emit BankerRemoved(banker);
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
