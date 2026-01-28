// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VerificationJustice} from "./VerificationJustice.sol";

/**
 * @title CitizenVerificationLimits
 * @notice Daily verification limits for regular citizens
 * 
 * Limits:
 * - Regular citizens: 10 verifications per day (24 hours)
 * - Founder: 100 verifications per day (handled by FounderBootstrap)
 * 
 * Transparency:
 * - All verifications tracked on-chain
 * - Verification chain always visible
 * 
 * Integrates with VerificationJustice for court-based accountability
 */
contract CitizenVerificationLimits {
    
    /* ==================== ERRORS ==================== */
    error DailyLimitExceeded();
    error NotAuthorized();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant VERIFICATIONS_PER_DAY = 10;
    uint256 public constant DAY_DURATION = 1 days;
    
    /* ==================== STATE ==================== */
    address public owner;
    VerificationJustice public immutable verificationJustice;
    
    // Track verifications per day
    // verifier => day => count
    mapping(address => mapping(uint256 => uint256)) public verificationsInDay;
    
    /* ==================== EVENTS ==================== */
    event VerificationRecorded(
        address indexed verifier,
        uint256 indexed day,
        uint256 count
    );
    
    /* ==================== CONSTRUCTOR ==================== */
    constructor(address verificationJustice_) {
        owner = msg.sender;
        verificationJustice = VerificationJustice(verificationJustice_);
    }
    
    /* ==================== CORE FUNCTIONS ==================== */
    
    /**
     * @notice Get current day number
     * @dev Day 0 = contract deployment day, Day 1 = next 24 hours, etc.
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / DAY_DURATION;
    }
    
    /**
     * @notice Check if verifier can still verify today
     */
    function canVerifyToday(address verifier) public view returns (bool) {
        // Check justice system first
        if (!verificationJustice.canVerify(verifier)) {
            return false;
        }
        
        uint256 currentDay = getCurrentDay();
        uint256 count = verificationsInDay[verifier][currentDay];
        
        return count < VERIFICATIONS_PER_DAY;
    }
    
    /**
     * @notice Record a verification (called by CitizenRegistry)
     */
    function recordVerification(address verifier) external {
        // TODO: Add access control - only CitizenRegistry
        
        uint256 currentDay = getCurrentDay();
        uint256 count = verificationsInDay[verifier][currentDay];
        
        if (count >= VERIFICATIONS_PER_DAY) {
            revert DailyLimitExceeded();
        }
        
        verificationsInDay[verifier][currentDay]++;
        
        emit VerificationRecorded(
            verifier,
            currentDay,
            verificationsInDay[verifier][currentDay]
        );
    }
    
    /**
     * @notice Get remaining verifications for today
     */
    function getRemainingVerifications(address verifier) 
        external 
        view 
        returns (uint256) 
    {
        if (!verificationJustice.canVerify(verifier)) {
            return 0;
        }
        
        uint256 currentDay = getCurrentDay();
        uint256 used = verificationsInDay[verifier][currentDay];
        
        if (used >= VERIFICATIONS_PER_DAY) {
            return 0;
        }
        
        return VERIFICATIONS_PER_DAY - used;
    }
    
    /**
     * @notice Get verification stats for a verifier
     */
    function getDailyStats(address verifier)
        external
        view
        returns (
            uint256 currentDay,
            uint256 verifiedToday,
            uint256 remaining,
            bool canVerify
        )
    {
        currentDay = getCurrentDay();
        verifiedToday = verificationsInDay[verifier][currentDay];
        remaining = verifiedToday >= VERIFICATIONS_PER_DAY 
            ? 0 
            : VERIFICATIONS_PER_DAY - verifiedToday;
        canVerify = canVerifyToday(verifier);
    }
}
