// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VerificationJustice
 * @notice Enforces accountability for identity verification
 * 
 * Core Invariant:
 * One confirmed fake verification = immediate suspension of verification rights
 * 
 * Principles:
 * 1. Automatic suspension (no human decision)
 * 2. Due process restoration (court required)
 * 3. Universal application (all verifiers)
 * 4. Public transparency (all records on-chain)
 */
contract VerificationJustice {
    
    /* ==================== ERRORS ==================== */
    error NotAuthorized();
    error VerificationSuspended();
    error CaseAlreadyResolved();
    error InvalidResolution();
    
    /* ==================== ENUMS ==================== */
    
    enum VerifierStatus {
        ACTIVE,              // Can verify normally
        SUSPENDED,           // Auto-suspended (fraud detected)
        UNDER_REVIEW,        // Investigation ongoing
        PERMANENTLY_BANNED   // Court decision - never restore
    }
    
    enum FraudSeverity {
        PENDING_INVESTIGATION,
        NEGLIGENCE,          // Careless but not malicious
        SYSTEMATIC,          // Pattern of poor verification
        MALICIOUS            // Intentional fake factory
    }
    
    enum Resolution {
        NONE,
        CLEARED,             // False positive - full restoration
        WARNING,             // Reduced limit, probation
        TEMPORARY_BAN,       // Ban for period (e.g., 1 year)
        PERMANENT_BAN        // Never restore
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct FraudCase {
        uint256 caseId;
        uint256 fakeSeatId;          // The fraudulent identity
        address verifier;             // Who verified it
        uint256 detectionTimestamp;
        FraudSeverity severity;
        bool resolved;
        Resolution resolution;
        bytes32 courtDecisionHash;   // IPFS hash of court decision
        uint256 resolutionTimestamp;
    }
    
    struct VerifierRecord {
        VerifierStatus status;
        uint256 totalVerifications;   // All-time count
        uint256 fraudCases;           // Number of fraud cases
        uint256 lastFraudTimestamp;
        uint256 verificationLimit;    // Current limit (0 when suspended)
        bool canVerify;               // Master switch
        uint256[] caseIds;            // All cases involving this verifier
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    
    // Verifier tracking
    mapping(address => VerifierRecord) public verifierRecords;
    
    // Case tracking
    uint256 public nextCaseId = 1;
    mapping(uint256 => FraudCase) public fraudCases;
    
    // Seat to verifier mapping (who verified each seat)
    mapping(uint256 => address) public seatToVerifier;
    
    // Role-based access
    mapping(address => bool) public isAdjudicator;  // Can report fraud
    mapping(address => bool) public isJudge;        // Can resolve cases
    
    /* ==================== EVENTS ==================== */
    
    event VerifierSuspended(
        address indexed verifier,
        uint256 indexed fakeSeatId,
        uint256 indexed caseId,
        uint256 timestamp
    );
    
    event CaseResolved(
        uint256 indexed caseId,
        address indexed verifier,
        Resolution resolution,
        bytes32 courtDecisionHash,
        uint256 timestamp
    );
    
    event VerificationRecorded(
        address indexed verifier,
        uint256 indexed seatId,
        uint256 timestamp
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    modifier onlyAdjudicator() {
        if (!isAdjudicator[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    modifier onlyJudge() {
        if (!isJudge[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        isAdjudicator[msg.sender] = true;
        isJudge[msg.sender] = true;
    }
    
    /* ==================== CORE FUNCTIONS ==================== */
    
    /**
     * @notice Record a verification (called by CitizenRegistry)
     * @dev Tracks who verified each seat for accountability
     */
    function recordVerification(
        address verifier,
        uint256 seatId
    ) external {
        // TODO: Add access control (only CitizenRegistry)
        
        seatToVerifier[seatId] = verifier;
        verifierRecords[verifier].totalVerifications++;
        
        emit VerificationRecorded(verifier, seatId, block.timestamp);
    }
    
    /**
     * @notice Report fraudulent verification - AUTOMATIC SUSPENSION
     * @dev This is the core invariant: one fake = immediate stop
     * @param fakeSeatId The fraudulent identity
     * @param evidenceHash IPFS hash of fraud evidence
     */
    function reportFraudulentVerification(
        uint256 fakeSeatId,
        bytes32 evidenceHash
    ) external onlyAdjudicator returns (uint256 caseId) {
        address verifier = seatToVerifier[fakeSeatId];
        require(verifier != address(0), "No verifier found for seat");
        
        // ========== AUTOMATIC SUSPENSION ==========
        // No human decision or judgment required
        // This happens IMMEDIATELY upon fraud detection
        
        verifierRecords[verifier].status = VerifierStatus.SUSPENDED;
        verifierRecords[verifier].verificationLimit = 0;
        verifierRecords[verifier].canVerify = false;
        verifierRecords[verifier].fraudCases++;
        verifierRecords[verifier].lastFraudTimestamp = block.timestamp;
        
        // Create case record
        caseId = nextCaseId++;
        fraudCases[caseId] = FraudCase({
            caseId: caseId,
            fakeSeatId: fakeSeatId,
            verifier: verifier,
            detectionTimestamp: block.timestamp,
            severity: FraudSeverity.PENDING_INVESTIGATION,
            resolved: false,
            resolution: Resolution.NONE,
            courtDecisionHash: evidenceHash,
            resolutionTimestamp: 0
        });
        
        verifierRecords[verifier].caseIds.push(caseId);
        
        emit VerifierSuspended(verifier, fakeSeatId, caseId, block.timestamp);
    }
    
    /**
     * @notice Resolve fraud case via due process
     * @dev Only judges can restore verification rights
     */
    function resolveCase(
        uint256 caseId,
        FraudSeverity severity,
        Resolution resolution,
        uint256 newLimit,
        bytes32 courtDecisionHash
    ) external onlyJudge {
        FraudCase storage fraudCase = fraudCases[caseId];
        if (fraudCase.resolved) revert CaseAlreadyResolved();
        
        address verifier = fraudCase.verifier;
        
        // Update case
        fraudCase.severity = severity;
        fraudCase.resolution = resolution;
        fraudCase.resolved = true;
        fraudCase.courtDecisionHash = courtDecisionHash;
        fraudCase.resolutionTimestamp = block.timestamp;
        
        // Apply resolution
        if (resolution == Resolution.CLEARED) {
            // Full restoration - false positive
            verifierRecords[verifier].status = VerifierStatus.ACTIVE;
            verifierRecords[verifier].verificationLimit = newLimit;
            verifierRecords[verifier].canVerify = true;
            
        } else if (resolution == Resolution.WARNING) {
            // Partial restoration - negligence
            verifierRecords[verifier].status = VerifierStatus.ACTIVE;
            verifierRecords[verifier].verificationLimit = newLimit; // Reduced
            verifierRecords[verifier].canVerify = true;
            
        } else if (resolution == Resolution.TEMPORARY_BAN) {
            // Status remains SUSPENDED
            // Can be restored later via another court decision
            verifierRecords[verifier].status = VerifierStatus.UNDER_REVIEW;
            
        } else if (resolution == Resolution.PERMANENT_BAN) {
            // Never restore
            verifierRecords[verifier].status = VerifierStatus.PERMANENTLY_BANNED;
            verifierRecords[verifier].canVerify = false;
            verifierRecords[verifier].verificationLimit = 0;
        }
        
        emit CaseResolved(caseId, verifier, resolution, courtDecisionHash, block.timestamp);
    }
    
    /**
     * @notice Check if verifier can still verify
     * @dev Called by CitizenRegistry/FounderBootstrap before each verification
     */
    function canVerify(address verifier) external view returns (bool) {
        VerifierRecord memory record = verifierRecords[verifier];
        
        return record.canVerify 
            && record.status == VerifierStatus.ACTIVE
            && record.verificationLimit > 0;
    }
    
    /**
     * @notice Initialize verifier with limit
     * @dev Called when verifier first starts (e.g., founder bootstrap)
     */
    function initializeVerifier(
        address verifier,
        uint256 initialLimit
    ) external onlyOwner {
        if (verifierRecords[verifier].totalVerifications > 0) {
            // Already initialized
            return;
        }
        
        verifierRecords[verifier] = VerifierRecord({
            status: VerifierStatus.ACTIVE,
            totalVerifications: 0,
            fraudCases: 0,
            lastFraudTimestamp: 0,
            verificationLimit: initialLimit,
            canVerify: true,
            caseIds: new uint256[](0)
        });
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get verifier trust score (0-100)
     */
    function getVerifierTrustScore(address verifier) 
        external 
        view 
        returns (
            uint256 score,
            uint256 verified,
            uint256 frauds,
            VerifierStatus status
        ) 
    {
        VerifierRecord memory record = verifierRecords[verifier];
        
        verified = record.totalVerifications;
        frauds = record.fraudCases;
        status = record.status;
        
        if (verified == 0) {
            score = 100; // No history = neutral
        } else {
            // Score = (verified - frauds * 100) / verified
            // One fraud in 100 = 0 score
            uint256 penalty = frauds * 100;
            if (penalty >= verified) {
                score = 0;
            } else {
                score = ((verified - penalty) * 100) / verified;
            }
        }
    }
    
    /**
     * @notice Get all cases for a verifier
     */
    function getVerifierCases(address verifier) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return verifierRecords[verifier].caseIds;
    }
    
    /**
     * @notice Get public record for verifier
     */
    function getVerifierRecord(address verifier)
        external
        view
        returns (
            VerifierStatus status,
            uint256 totalVerifications,
            uint256 totalFraudCases,
            uint256 verificationLimit,
            bool canStillVerify
        )
    {
        VerifierRecord memory record = verifierRecords[verifier];
        return (
            record.status,
            record.totalVerifications,
            record.fraudCases,
            record.verificationLimit,
            record.canVerify
        );
    }
    
    /* ==================== ADMIN FUNCTIONS ==================== */
    
    function setAdjudicator(address adjudicator, bool status) external onlyOwner {
        isAdjudicator[adjudicator] = status;
    }
    
    function setJudge(address judge, bool status) external onlyOwner {
        isJudge[judge] = status;
    }
}
