// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CitizenRegistry} from "./CitizenRegistry.sol";
import {CoreLaw} from "./CoreLaw.sol";

/**
 * @title FounderBootstrap
 * @notice Bootstrap contract for the first founder/creator with DAILY RENEWABLE limits
 * 
 * Purpose:
 * 1. Mint SeatSBT #1 to the founder
 * 2. Grant SUPER_VERIFIER status (bypass single-verifier requirement)
 * 3. Enable founder to verify initial citizens rapidly
 * 
 * Founder Role:
 * - First citizen (seatId = 1)
 * - Can verify up to 100 citizens PER DAY (renewable daily)
 * - Limits automatically reset every 24 hours
 * - NO TOTAL LIMIT - only daily limit
 * 
 * Daily Epoch System:
 * - Day 0: First 24 hours (0-86400 seconds)
 * - Day 1: Next 24 hours (86400-172800 seconds)
 * - Day 2: Next 24 hours, etc.
 * - Each day allows fresh 100 verifications
 * 
 * Transparency:
 * - All verifications tracked on-chain
 * - Verification chain always visible
 * - Court can investigate fraud cases
 * 
 * Security:
 * - One-time founder bootstrap
 * - Daily renewable limits (anti-spam)
 * - Court-based accountability
 * - Permanent on-chain audit trail
 */
contract FounderBootstrap {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error ZeroAddress();
    error AlreadyBootstrapped();
    error NotFounder();
    error VerificationLimitReachedForEpoch();
    
    /* ==================== STATE ==================== */
    address public owner;
    address public founder;                    // The first creator
    bool public bootstrapped;                  // Has bootstrap completed?
    uint64 public bootstrapTimestamp;          // When was founder registered?
    
    // Epoch-based limits (RENEWABLE every 24 hours = 1 day)
    uint256 public constant CITIZENS_PER_EPOCH = 100;    // Max citizens per day
    uint256 public constant EPOCH_DURATION = 1 days;      // Duration of each day
    
    // Tracking per epoch
    mapping(uint256 => uint256) public verifiedInEpoch;   // epoch => count
    mapping(uint256 => bool) public verifiedByFounder;    // seatId => was verified by founder
    
    uint256 public totalFounderVerified;       // Total all-time count
    
    /* ==================== DEPENDENCIES ==================== */
    CitizenRegistry public immutable citizenRegistry;
    CoreLaw public immutable coreLaw;
    
    /* ==================== EVENTS ==================== */
    event FounderBootstrapped(address indexed founder, uint256 seatId, uint64 timestamp);
    event CitizenVerifiedByFounder(
        address indexed founder, 
        uint256 indexed seatId, 
        uint256 epoch,
        uint256 epochCount,
        uint256 totalCount
    );
    event EpochRenewed(uint256 indexed newEpoch, uint256 timestamp);
    
    /* ==================== MODIFIERS ==================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyFounder() {
        if (msg.sender != founder) revert NotFounder();
        _;
    }
    
    modifier checkEpochLimit() {
        uint256 currentEpoch = getCurrentEpoch();
        
        // Check epoch limit
        if (verifiedInEpoch[currentEpoch] >= CITIZENS_PER_EPOCH) {
            revert VerificationLimitReachedForEpoch();
        }
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    constructor(
        address citizenRegistry_,
        address coreLaw_
    ) {
        if (citizenRegistry_ == address(0)) revert ZeroAddress();
        if (coreLaw_ == address(0)) revert ZeroAddress();
        
        owner = msg.sender;
        citizenRegistry = CitizenRegistry(citizenRegistry_);
        coreLaw = CoreLaw(coreLaw_);
    }
    
    /* ==================== BOOTSTRAP FOUNDER ==================== */
    
    /**
     * @notice Bootstrap the founder as first citizen
     * @dev Mints SeatSBT #1 and grants super-verification rights
     * @param founderAddress Address of the founder
     * @param nationId Nation ID for the founder
     * @param cohortArbanId Arban ID
     * @param ethicsHash Ethics profile hash
     */
    function bootstrapFounder(
        address founderAddress,
        bytes32 nationId,
        uint32 cohortArbanId,
        bytes32 ethicsHash
    ) external onlyOwner returns (uint256 seatId) {
        if (founderAddress == address(0)) revert ZeroAddress();
        if (bootstrapped) revert AlreadyBootstrapped();
        
        // Register founder through CitizenRegistry
        // This will mint SeatSBT #1 (since nextSeatId starts at 1)
        seatId = citizenRegistry.registerByOwner(
            founderAddress,
            nationId,
            cohortArbanId,
            0,  // civ (initial)
            0,  // dom (initial)
            0,  // exp (initial)
            ethicsHash,
            bytes32("FOUNDER_BOOTSTRAP")
        );
        
        // Should be seatId = 1
        require(seatId == 1, "Founder must be seat #1");
        
        founder = founderAddress;
        bootstrapped = true;
        bootstrapTimestamp = uint64(block.timestamp);
        
        emit FounderBootstrapped(founderAddress, seatId, bootstrapTimestamp);
    }
    
    /* ==================== SUPER VERIFICATION (RENEWABLE MONTHLY) ==================== */
    
    /**
     * @notice Founder verifies a new citizen (bypass 3-citizen quorum)
     * @dev Renewable: 100 citizens per 30-day month
     * @param citizenAddress Address of citizen to verify
     * @param nationId Nation ID
     * @param cohortArbanId Arban ID
     * @param ethicsHash Ethics profile hash
     */
    function verifyNewCitizen(
        address citizenAddress,
        bytes32 nationId,
        uint32 cohortArbanId,
        bytes32 ethicsHash
    ) external onlyFounder checkEpochLimit returns (uint256 seatId) {
        if (!bootstrapped) revert AlreadyBootstrapped();
        if (citizenAddress == address(0)) revert ZeroAddress();
        
        uint256 currentEpoch = getCurrentEpoch();
        
        // Register citizen through CitizenRegistry
        seatId = citizenRegistry.registerByOwner(
            citizenAddress,
            nationId,
            cohortArbanId,
            0,  // civ
            0,  // dom
            0,  // exp
            ethicsHash,
            bytes32("FOUNDER_VERIFIED")
        );
        
        verifiedByFounder[seatId] = true;
        verifiedInEpoch[currentEpoch]++;
        totalFounderVerified++;
        
        emit CitizenVerifiedByFounder(
            founder, 
            seatId, 
            currentEpoch,
            verifiedInEpoch[currentEpoch],
            totalFounderVerified
        );
        
        // Emit epoch renewal if this is first verification in new epoch
        if (verifiedInEpoch[currentEpoch] == 1 && currentEpoch > 0) {
            emit EpochRenewed(currentEpoch, block.timestamp);
        }
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    /**
     * @notice Get current epoch number
     * @dev Epoch 0 = first 30 days, Epoch 1 = next 30 days, etc.
     */
    function getCurrentEpoch() public view returns (uint256) {
        if (!bootstrapped) return 0;
        return (block.timestamp - bootstrapTimestamp) / EPOCH_DURATION;
    }
    
    /**
     * @notice Check if bootstrap is active (backward compatibility)
     * @dev Always returns true for founder (renewable limits)
     */
    function isBootstrapActive() external view returns (bool) {
        return bootstrapped;
    }
    
    /**
     * @notice Get verifications done in current epoch
     */
    function getCurrentEpochVerifications() external view returns (uint256) {
        return verifiedInEpoch[getCurrentEpoch()];
    }
    
    /**
     * @notice Get remaining verifications in current epoch
     */
    function getRemainingVerifications() external view returns (uint256) {
        if (!bootstrapped) return 0;
        uint256 currentEpoch = getCurrentEpoch();
        uint256 used = verifiedInEpoch[currentEpoch];
        if (used >= CITIZENS_PER_EPOCH) return 0;
        return CITIZENS_PER_EPOCH - used;
    }
    
    /**
     * @notice Get time remaining in current epoch
     */
    function getTimeRemainingInEpoch() external view returns (uint256) {
        if (!bootstrapped) return 0;
        uint256 currentEpoch = getCurrentEpoch();
        uint256 epochEnd = bootstrapTimestamp + ((currentEpoch + 1) * EPOCH_DURATION);
        if (block.timestamp >= epochEnd) return 0;
        return epochEnd - block.timestamp;
    }
    
    /**
     * @notice Get stats for a specific epoch
     */
    function getEpochStats(uint256 epoch) external view returns (
        uint256 verified,
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) {
        verified = verifiedInEpoch[epoch];
        startTime = bootstrapTimestamp + (epoch * EPOCH_DURATION);
        endTime = startTime + EPOCH_DURATION;
        isActive = (getCurrentEpoch() == epoch);
    }
    
    /**
     * @notice Check if a citizen was verified by founder
     */
    function wasVerifiedByFounder(uint256 seatId) external view returns (bool) {
        return verifiedByFounder[seatId];
    }
    
    /**
     * @notice Get total citizens verified by founder (all epochs)
     */
    function getTotalVerified() external view returns (uint256) {
        return totalFounderVerified;
    }
}
