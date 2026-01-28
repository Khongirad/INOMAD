// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SupremeCourt
 * @notice Court system for fraud investigation and wallet freeze
 * 
 * Responsibilities:
 * 1. Case management (open, investigate, close)
 * 2. Wallet freeze during investigation
 * 3. Verdict execution (punishment or acquittal)
 * 4. Integration with verification accountability
 */
contract SupremeCourt {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotJudge();
    error CaseNotFound();
    error CaseAlreadyClosed();
    error CaseNotOpen();
    error InvalidVerdict();
    error ZeroAddress();
    
    /* ==================== ENUMS ==================== */
    
    enum CaseStatus {
        NONE,
        OPEN,               // Investigation started
        UNDER_REVIEW,       // Evidence being reviewed
        VERDICT_PENDING,    // Verdict being drafted
        CLOSED              // Final decision made
    }
    
    enum CaseType {
        FRAUD_VERIFICATION,  // Fake identity verified
        ABUSE_OF_POWER,      // Leader abuse
        FINANCIAL_CRIME,     // Money laundering etc
        OTHER
    }
    
    enum Verdict {
        NONE,
        ACQUITTED,           // Not guilty
        WARNING,             // Guilty but minor offense
        TEMPORARY_BAN,       // Ban for period
        PERMANENT_BAN,       // Lifetime ban
        ASSET_CONFISCATION   // Funds confiscated
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct Case {
        uint256 caseId;
        address defendant;           // Accused person
        address prosecutor;          // Who filed the case
        CaseType caseType;
        CaseStatus status;
        uint256 openedAt;
        uint256 closedAt;
        bytes32 evidenceHash;        // IPFS hash of evidence
        bytes32 verdictHash;         // IPFS hash of verdict document
        Verdict verdict;
        uint256[] affectedSeats;     // Affected citizen seats
        bool walletFrozen;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    
    // 9 SUPREME COURT JUDGE SEATS
    uint256 public constant TOTAL_JUDGE_SEATS = 9;
    address[9] public judgeSeat;     // 9 fixed judge seats
    mapping(address => uint256) public judgeToSeat; // judge => seat (1-9, 0 = not a judge)
    uint256 public activeJudgeCount;
    
    // Case management
    uint256 public nextCaseId = 1;
    mapping(uint256 => Case) public cases;
    mapping(address => uint256[]) public casesByDefendant;
    
    // Prosecutor role
    mapping(address => bool) public isProsecutor;
    
    // External integrations
    address public verificationJustice;
    address public walletRegistry;
    
    /* ==================== EVENTS ==================== */
    
    event CaseOpened(
        uint256 indexed caseId,
        address indexed defendant,
        address indexed prosecutor,
        CaseType caseType,
        uint256 timestamp
    );
    
    event WalletFrozenByOrder(
        uint256 indexed caseId,
        address indexed defendant,
        uint256 indexed seatId,
        uint256 timestamp
    );
    
    event WalletUnfrozenByOrder(
        uint256 indexed caseId,
        address indexed defendant,
        uint256 timestamp
    );
    
    event VerdictIssued(
        uint256 indexed caseId,
        address indexed defendant,
        Verdict verdict,
        bytes32 verdictHash,
        uint256 timestamp
    );
    
    event CaseClosed(
        uint256 indexed caseId,
        Verdict verdict,
        uint256 timestamp
    );
    
    event JudgeAppointed(uint256 indexed seat, address indexed judge, uint256 timestamp);
    event JudgeRemoved(uint256 indexed seat, address indexed judge, uint256 timestamp);
    event ProsecutorSet(address indexed prosecutor, bool status);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyJudge() {
        if (judgeToSeat[msg.sender] == 0 && msg.sender != owner) revert NotJudge();
        _;
    }
    
    modifier onlyProsecutor() {
        if (!isProsecutor[msg.sender] && judgeToSeat[msg.sender] == 0 && msg.sender != owner) {
            revert NotJudge();
        }
        _;
    }
    
    modifier caseExists(uint256 caseId) {
        if (cases[caseId].caseId == 0) revert CaseNotFound();
        _;
    }
    
    modifier caseOpen(uint256 caseId) {
        if (cases[caseId].status == CaseStatus.CLOSED) revert CaseAlreadyClosed();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        // Owner can act as judge until 9 seats are filled
        isProsecutor[msg.sender] = true;
    }
    
    /* ==================== CASE MANAGEMENT ==================== */
    
    /**
     * @notice Open a new case against a defendant
     * @param defendant Address of accused
     * @param caseType Type of case
     * @param evidenceHash IPFS hash of evidence
     * @param affectedSeats List of affected citizen seat IDs
     */
    function openCase(
        address defendant,
        CaseType caseType,
        bytes32 evidenceHash,
        uint256[] calldata affectedSeats
    ) external onlyProsecutor returns (uint256 caseId) {
        if (defendant == address(0)) revert ZeroAddress();
        
        caseId = nextCaseId++;
        
        cases[caseId] = Case({
            caseId: caseId,
            defendant: defendant,
            prosecutor: msg.sender,
            caseType: caseType,
            status: CaseStatus.OPEN,
            openedAt: block.timestamp,
            closedAt: 0,
            evidenceHash: evidenceHash,
            verdictHash: bytes32(0),
            verdict: Verdict.NONE,
            affectedSeats: affectedSeats,
            walletFrozen: false
        });
        
        casesByDefendant[defendant].push(caseId);
        
        emit CaseOpened(caseId, defendant, msg.sender, caseType, block.timestamp);
    }
    
    /**
     * @notice Freeze defendant's wallet during investigation
     * @param caseId Case ID
     * @param seatId Defendant's seat ID (for wallet lookup)
     */
    function freezeDefendantWallet(
        uint256 caseId,
        uint256 seatId
    ) external onlyJudge caseExists(caseId) caseOpen(caseId) {
        Case storage c = cases[caseId];
        
        c.walletFrozen = true;
        
        // TODO: Call AltanWallet.freeze() via registry
        // IWalletRegistry(walletRegistry).freezeWallet(seatId, bytes32(caseId));
        
        emit WalletFrozenByOrder(caseId, c.defendant, seatId, block.timestamp);
    }
    
    /**
     * @notice Issue verdict and close case
     * @param caseId Case ID
     * @param verdict Final verdict
     * @param verdictHash IPFS hash of verdict document
     */
    function issueVerdict(
        uint256 caseId,
        Verdict verdict,
        bytes32 verdictHash
    ) external onlyJudge caseExists(caseId) caseOpen(caseId) {
        if (verdict == Verdict.NONE) revert InvalidVerdict();
        
        Case storage c = cases[caseId];
        
        c.verdict = verdict;
        c.verdictHash = verdictHash;
        c.status = CaseStatus.CLOSED;
        c.closedAt = block.timestamp;
        
        // If wallet was frozen, unfreeze it (punishment is now in effect)
        if (c.walletFrozen) {
            c.walletFrozen = false;
            // TODO: Call AltanWallet.unfreeze()
            emit WalletUnfrozenByOrder(caseId, c.defendant, block.timestamp);
        }
        
        // TODO: Execute verdict based on type
        // - ACQUITTED: restore all rights
        // - WARNING: log warning
        // - TEMPORARY_BAN: call VerificationJustice.suspendTemporary()
        // - PERMANENT_BAN: call VerificationJustice.banPermanently()
        // - ASSET_CONFISCATION: transfer funds to treasury
        
        emit VerdictIssued(caseId, c.defendant, verdict, verdictHash, block.timestamp);
        emit CaseClosed(caseId, verdict, block.timestamp);
    }
    
    /**
     * @notice Update case status
     */
    function updateCaseStatus(
        uint256 caseId,
        CaseStatus newStatus
    ) external onlyJudge caseExists(caseId) caseOpen(caseId) {
        cases[caseId].status = newStatus;
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getCase(uint256 caseId) external view returns (Case memory) {
        return cases[caseId];
    }
    
    function getCasesByDefendant(address defendant) external view returns (uint256[] memory) {
        return casesByDefendant[defendant];
    }
    
    function hasOpenCase(address defendant) external view returns (bool) {
        uint256[] memory defendantCases = casesByDefendant[defendant];
        for (uint256 i = 0; i < defendantCases.length; i++) {
            if (cases[defendantCases[i]].status != CaseStatus.CLOSED) {
                return true;
            }
        }
        return false;
    }
    
    /* ==================== ADMIN FUNCTIONS ==================== */
    
    /**
     * @notice Appoint a judge to a specific seat (1-9)
     * @param seat Seat number (1-9)
     * @param judge Address of the judge
     */
    function appointJudge(uint256 seat, address judge) external onlyOwner {
        require(seat >= 1 && seat <= TOTAL_JUDGE_SEATS, "Invalid seat (1-9)");
        require(judge != address(0), "Zero address");
        require(judgeToSeat[judge] == 0, "Already a judge");
        
        uint256 idx = seat - 1;
        
        // If seat is occupied, remove previous judge
        if (judgeSeat[idx] != address(0)) {
            address prevJudge = judgeSeat[idx];
            judgeToSeat[prevJudge] = 0;
            activeJudgeCount--;
            emit JudgeRemoved(seat, prevJudge, block.timestamp);
        }
        
        judgeSeat[idx] = judge;
        judgeToSeat[judge] = seat;
        activeJudgeCount++;
        
        emit JudgeAppointed(seat, judge, block.timestamp);
    }
    
    /**
     * @notice Remove a judge from their seat
     * @param seat Seat number (1-9)
     */
    function removeJudge(uint256 seat) external onlyOwner {
        require(seat >= 1 && seat <= TOTAL_JUDGE_SEATS, "Invalid seat (1-9)");
        
        uint256 idx = seat - 1;
        address judge = judgeSeat[idx];
        require(judge != address(0), "Seat empty");
        
        judgeSeat[idx] = address(0);
        judgeToSeat[judge] = 0;
        activeJudgeCount--;
        
        emit JudgeRemoved(seat, judge, block.timestamp);
    }
    
    /**
     * @notice Get all 9 judge seats
     */
    function getAllJudges() external view returns (address[9] memory) {
        return judgeSeat;
    }
    
    /**
     * @notice Check if address is a judge
     */
    function isJudge(address addr) external view returns (bool) {
        return judgeToSeat[addr] > 0;
    }
    
    function setProsecutor(address prosecutor, bool status) external onlyOwner {
        isProsecutor[prosecutor] = status;
        emit ProsecutorSet(prosecutor, status);
    }
    
    function setVerificationJustice(address justice_) external onlyOwner {
        verificationJustice = justice_;
    }
    
    function setWalletRegistry(address registry_) external onlyOwner {
        walletRegistry = registry_;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
