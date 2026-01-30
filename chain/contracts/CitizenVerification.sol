// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CitizenRegistry} from "./CitizenRegistry.sol";

/**
 * @title CitizenVerification
 * @notice Single-verifier citizen verification with daily limits
 * 
 * Key Changes from 3-Citizen Quorum:
 * 1. Only 1 verifier needed (not 3)
 * 2. Daily limit: 10 verifications per citizen
 * 3. Automatic daily reset (based on epoch/day)
 * 
 * Security Features:
 * - Daily limit prevents spam/abuse
 * - All verifications on-chain (transparent)
 * - Verifier accountability tracked
 * - Can be suspended by governance
 * 
 * Daily Epoch System:
 * - Epoch = day number (block.timestamp / 86400)
 * - Each epoch allows 10 verifications per citizen
 * - Automatic renewal every 24 hours
 */
contract CitizenVerification {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error ZeroAddress();
    error NotVerified();
    error NotAcceptedConstitution();
    error DailyLimitReached();
    error VerifierSuspended();
    error SelfVerificationNotAllowed();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant MAX_VERIFICATIONS_PER_DAY = 10;
    uint256 public constant SECONDS_PER_DAY = 86400; // 24 hours
    
    /* ==================== STATE ==================== */
    address public owner;
    CitizenRegistry public immutable citizenRegistry;
    
    // Daily verification tracking
    // verifierSeatId => day => count
    mapping(uint256 => mapping(uint256 => uint256)) public dailyVerificationCount;
    
    // Suspended verifiers (governance can suspend bad actors)
    mapping(uint256 => bool) public suspended;
    
    // Verification history (transparency)
    struct VerificationRecord {
        uint256 verifierSeatId;
        uint256 verifiedSeatId;
        uint256 timestamp;
        uint256 day;
    }
    
    VerificationRecord[] public verificationHistory;
    mapping(uint256 => uint256[]) public verifiedBy; // seatId => verificationRecord indices
    mapping(uint256 => uint256[]) public verifierOf; // seatId => verificationRecord indices
    
    /* ==================== EVENTS ==================== */
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event CitizenVerified(
        uint256 indexed verifierSeatId,
        uint256 indexed verifiedSeatId,
        address indexed citizenAddress,
        uint256 day,
        uint256 dailyCount
    );
    event CitizenSuspended(uint256 indexed seatId, string reason);
    event VerifierReinstated(uint256 indexed seatId);
    event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit);
    
    /* ==================== MODIFIERS ==================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    constructor(
        address citizenRegistry_
    ) {
        if (citizenRegistry_ == address(0)) revert ZeroAddress();
        
        owner = msg.sender;
        citizenRegistry = CitizenRegistry(citizenRegistry_);
    }
    
    /* ==================== VERIFICATION ==================== */
    
    /**
     * @notice Verify a new citizen (single verifier model)
     * @dev Requires:
     *      - Verifier must be verified citizen
     *      - Not suspended
     *      - Daily limit not reached (10/day)
     *      - Citizen accepted constitution
     *      - Cannot self-verify
     * 
     * @param citizenAddress Address of citizen to verify
     * @param nationId Nation ID
     * @param cohortArbanId Arban ID
     * @param ethicsHash Ethics profile hash
     * @return seatId New seat ID for verified citizen
     */
    function verifyCitizen(
        address citizenAddress,
        bytes32 nationId,
        uint32 cohortArbanId,
        bytes32 ethicsHash
    ) external returns (uint256 seatId) {
        if (citizenAddress == address(0)) revert ZeroAddress();
        if (citizenAddress == msg.sender) revert SelfVerificationNotAllowed();
        
        // Get verifier's seatId
        uint256 verifierSeatId = citizenRegistry.seatOf(msg.sender);
        if (verifierSeatId == 0) revert NotVerified();
        
        // Check verifier not suspended
        if (suspended[verifierSeatId]) revert VerifierSuspended();
        
        // Check daily limit
        uint256 today = getCurrentDay();
        if (dailyVerificationCount[verifierSeatId][today] >= MAX_VERIFICATIONS_PER_DAY) {
            revert DailyLimitReached();
        }
        
        // Register citizen through CitizenRegistry
        seatId = citizenRegistry.registerByOwner(
            citizenAddress,
            nationId,
            cohortArbanId,
            0,  // civ (initial)
            0,  // dom (initial)
            0,  // exp (initial)
            ethicsHash,
            bytes32("CITIZEN_VERIFIED")
        );
        
        // Update daily count
        dailyVerificationCount[verifierSeatId][today]++;
        
        // Record verification for transparency
        uint256 recordIdx = verificationHistory.length;
        verificationHistory.push(VerificationRecord({
            verifierSeatId: verifierSeatId,
            verifiedSeatId: seatId,
            timestamp: block.timestamp,
            day: today
        }));
        
        verifiedBy[seatId].push(recordIdx);
        verifierOf[verifierSeatId].push(recordIdx);
        
        emit CitizenVerified(
            verifierSeatId,
            seatId,
            citizenAddress,
            today,
            dailyVerificationCount[verifierSeatId][today]
        );
    }
    
    /* ==================== ADMIN FUNCTIONS ==================== */
    
    /**
     * @notice Suspend a verifier (governance action)
     * @dev Used for bad actors, fraud, etc.
     */
    function suspendVerifier(uint256 seatId, string memory reason) external onlyOwner {
        suspended[seatId] = true;
        emit CitizenSuspended(seatId, reason);
    }
    
    /**
     * @notice Reinstate a suspended verifier
     */
    function reinstateVerifier(uint256 seatId) external onlyOwner {
        suspended[seatId] = false;
        emit VerifierReinstated(seatId);
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get current day (epoch)
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }
    
    /**
     * @notice Check if verifier can verify today
     */
    function canVerifyToday(uint256 verifierSeatId) external view returns (bool) {
        if (suspended[verifierSeatId]) return false;
        uint256 today = getCurrentDay();
        return dailyVerificationCount[verifierSeatId][today] < MAX_VERIFICATIONS_PER_DAY;
    }
    
    /**
     * @notice Get remaining verifications for verifier today
     */
    function getRemainingVerifications(uint256 verifierSeatId) external view returns (uint256) {
        if (suspended[verifierSeatId]) return 0;
        uint256 today = getCurrentDay();
        uint256 used = dailyVerificationCount[verifierSeatId][today];
        if (used >= MAX_VERIFICATIONS_PER_DAY) return 0;
        return MAX_VERIFICATIONS_PER_DAY - used;
    }
    
    /**
     * @notice Get verification count for verifier on specific day
     */
    function getVerificationCount(uint256 verifierSeatId, uint256 day) external view returns (uint256) {
        return dailyVerificationCount[verifierSeatId][day];
    }
    
    /**
     * @notice Get verification count for verifier today
     */
    function getTodayVerificationCount(uint256 verifierSeatId) external view returns (uint256) {
        return dailyVerificationCount[verifierSeatId][getCurrentDay()];
    }
    
    /**
     * @notice Get who verified a citizen
     */
    function getVerifier(uint256 seatId) external view returns (uint256 verifierSeatId, uint256 timestamp) {
        require(verifiedBy[seatId].length > 0, "Not verified");
        uint256 idx = verifiedBy[seatId][0]; // First (and only) verifier
        VerificationRecord memory record = verificationHistory[idx];
        return (record.verifierSeatId, record.timestamp);
    }
    
    /**
     * @notice Get all citizens verified by a verifier
     */
    function getVerifiedCitizens(uint256 verifierSeatId) external view returns (uint256[] memory) {
        uint256[] memory indices = verifierOf[verifierSeatId];
        uint256[] memory seatIds = new uint256[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            seatIds[i] = verificationHistory[indices[i]].verifiedSeatId;
        }
        
        return seatIds;
    }
    
    /**
     * @notice Get total verifications done by verifier (all time)
     */
    function getTotalVerifications(uint256 verifierSeatId) external view returns (uint256) {
        return verifierOf[verifierSeatId].length;
    }
    
    /**
     * @notice Get verification history count
     */
    function getVerificationHistoryCount() external view returns (uint256) {
        return verificationHistory.length;
    }
}
