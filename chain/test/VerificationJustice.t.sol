// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VerificationJustice.sol";

/**
 * @title VerificationJusticeTest
 * @notice Tests for invariant: one fake = immediate suspension
 */
contract VerificationJusticeTest is Test {
    VerificationJustice public justice;
    
    address public owner = address(this);
    address public adjudicator = address(0x1);
    address public judge = address(0x2);
    address public verifier1 = address(0x3);
    address public verifier2 = address(0x4);
    
    function setUp() public {
        justice = new VerificationJustice();
        
        // Set roles
        justice.setAdjudicator(adjudicator, true);
        justice.setJudge(judge, true);
        
        // Initialize verifiers
        justice.initializeVerifier(verifier1, 100);
        justice.initializeVerifier(verifier2, 50);
    }
    
    /* ==================== CORE INVARIANT TESTS ==================== */
    
    function test_AutomaticSuspensionOnFraud() public {
        // Record a verification
        justice.recordVerification(verifier1, 1);
        
        // Verifier can verify before fraud
        assertTrue(justice.canVerify(verifier1), "Should be able to verify");
        
        // Report fraud - AUTOMATIC SUSPENSION
        vm.prank(adjudicator);
        uint256 caseId = justice.reportFraudulentVerification(
            1, // fake seat
            keccak256("EVIDENCE")
        );
        
        // Immediate effect - NO human decision needed
        assertFalse(justice.canVerify(verifier1), "Should be suspended immediately");
        
        (
            VerificationJustice.VerifierStatus status,
            ,
            uint256 fraudCases,
            uint256 limit,
            bool canStillVerify
        ) = justice.getVerifierRecord(verifier1);
        
        assertEq(uint(status), uint(VerificationJustice.VerifierStatus.SUSPENDED));
        assertEq(fraudCases, 1, "Should have 1 fraud case");
        assertEq(limit, 0, "Limit should be 0");
        assertFalse(canStillVerify, "Cannot verify");
    }
    
    function test_OneFakeStopsEverything() public {
        justice.recordVerification(verifier1, 1);
        
        // Verifier had 100 limit
        (, , , uint256 limitBefore, ) = justice.getVerifierRecord(verifier1);
        assertEq(limitBefore, 100);
        
        // ONE fake reported
        vm.prank(adjudicator);
        justice.reportFraudulentVerification(1, keccak256("EVIDENCE"));
        
        // ALL verification power lost
        (, , , uint256 limitAfter, bool canVerifyAfter) = justice.getVerifierRecord(verifier1);
        assertEq(limitAfter, 0, "Limit should be zero");
        assertFalse(canVerifyAfter, "Cannot verify at all");
    }
    
    /* ==================== DUE PROCESS TESTS ==================== */
    
    function test_RestorationRequiresCourt() public {
        // Setup fraud case
        justice.recordVerification(verifier1, 1);
        vm.prank(adjudicator);
        uint256 caseId = justice.reportFraudulentVerification(1, keccak256("EVIDENCE"));
        
        // Cannot self-restore
        assertFalse(justice.canVerify(verifier1));
        
        // Only judge can restore
        vm.prank(judge);
        justice.resolveCase(
            caseId,
            VerificationJustice.FraudSeverity.NEGLIGENCE,
            VerificationJustice.Resolution.WARNING,
            50, // Reduced limit
            keccak256("COURT_DECISION")
        );
        
        // Now can verify with reduced limit
        assertTrue(justice.canVerify(verifier1), "Should be restored");
        (, , , uint256 newLimit, ) = justice.getVerifierRecord(verifier1);
        assertEq(newLimit, 50, "Should have reduced limit");
    }
    
    function test_PermanentBanIsIrreversible() public {
        justice.recordVerification(verifier1, 1);
        vm.prank(adjudicator);
        uint256 caseId = justice.reportFraudulentVerification(1, keccak256("EVIDENCE"));
        
        // Permanent ban
        vm.prank(judge);
        justice.resolveCase(
            caseId,
            VerificationJustice.FraudSeverity.MALICIOUS,
            VerificationJustice.Resolution.PERMANENT_BAN,
            0,
            keccak256("PERMANENT_BAN_DECISION")
        );
        
        (VerificationJustice.VerifierStatus status, , , , bool canStillVerify) = 
            justice.getVerifierRecord(verifier1);
        
        assertEq(uint(status), uint(VerificationJustice.VerifierStatus.PERMANENTLY_BANNED));
        assertFalse(canStillVerify, "Should never verify again");
    }
    
    function test_FalsePositiveFullRestoration() public {
        justice.recordVerification(verifier1, 1);
        vm.prank(adjudicator);
        uint256 caseId = justice.reportFraudulentVerification(1, keccak256("EVIDENCE"));
        
        // Investigation finds false positive
        vm.prank(judge);
        justice.resolveCase(
            caseId,
            VerificationJustice.FraudSeverity.PENDING_INVESTIGATION,
            VerificationJustice.Resolution.CLEARED,
            100, // Full restoration
            keccak256("FALSE_POSITIVE")
        );
        
        (VerificationJustice.VerifierStatus status, , , uint256 limit, bool canStillVerify) = 
            justice.getVerifierRecord(verifier1);
        
        assertEq(uint(status), uint(VerificationJustice.VerifierStatus.ACTIVE));
        assertEq(limit, 100, "Should have full limit restored");
        assertTrue(canStillVerify, "Should be able to verify");
    }
    
    /* ==================== TRUST SCORE TESTS ==================== */
    
    function test_TrustScoreCalculation() public {
        // New verifier: 100 score
        (uint256 score1, , , ) = justice.getVerifierTrustScore(verifier1);
        assertEq(score1, 100, "New verifier should have 100 score");
        
        // Record 100 verifications
        for (uint256 i = 1; i <= 100; i++) {
            justice.recordVerification(verifier1, i);
        }
        
        (uint256 score2, , , ) = justice.getVerifierTrustScore(verifier1);
        assertEq(score2, 100, "No frauds = 100 score");
        
        // One fraud in 100 = 0 score
        vm.prank(adjudicator);
        justice.reportFraudulentVerification(50, keccak256("FRAUD"));
        
        (uint256 score3, , uint256 frauds, ) = justice.getVerifierTrustScore(verifier1);
        assertEq(frauds, 1, "Should have 1 fraud");
        assertEq(score3, 0, "One fraud in 100 = 0 score");
    }
    
    /* ==================== MULTIPLE FRAUDS TESTS ==================== */
    
    function test_MultipleFraudsMultipleSuspensions() public {
        // Record multiple verifications
        for (uint256 i = 1; i <= 5; i++) {
            justice.recordVerification(verifier1, i);
        }
        
        // First fraud
        vm.prank(adjudicator);
        uint256 case1 = justice.reportFraudulentVerification(1, keccak256("FRAUD1"));
        
        // Still suspended
        assertFalse(justice.canVerify(verifier1));
        
        // Second fraud while suspended
        vm.prank(adjudicator);
        uint256 case2 = justice.reportFraudulentVerification(2, keccak256("FRAUD2"));
        
        (, , uint256 fraudCases, , ) = justice.getVerifierRecord(verifier1);
        assertEq(fraudCases, 2, "Should have 2 fraud cases");
        
        uint256[] memory cases = justice.getVerifierCases(verifier1);
        assertEq(cases.length, 2, "Should track both cases");
    }
    
    /* ==================== ACCESS CONTROL TESTS ==================== */
    
    function test_RevertWhen_NonAdjudicatorReportsFraud() public {
        justice.recordVerification(verifier1, 1);
        
        // Random address tries to report fraud
        vm.prank(verifier2);
        vm.expectRevert(VerificationJustice.NotAuthorized.selector);
        justice.reportFraudulentVerification(1, keccak256("FAKE"));
    }
    
    function test_RevertWhen_NonJudgeResolvesCase() public {
        justice.recordVerification(verifier1, 1);
        vm.prank(adjudicator);
        uint256 caseId = justice.reportFraudulentVerification(1, keccak256("EVIDENCE"));
        
        // Random address tries to resolve
        vm.prank(verifier2);
        vm.expectRevert(VerificationJustice.NotAuthorized.selector);
        justice.resolveCase(
            caseId,
            VerificationJustice.FraudSeverity.NEGLIGENCE,
            VerificationJustice.Resolution.WARNING,
            50,
            keccak256("FAKE_DECISION")
        );
    }
    
    /* ==================== VERIFICATION TRACKING TESTS ==================== */
    
    function test_RecordVerification() public {
        justice.recordVerification(verifier1, 123);
        
        assertEq(justice.seatToVerifier(123), verifier1, "Should track verifier");
        
        (, uint256 totalVerifications, , , ) = justice.getVerifierRecord(verifier1);
        assertEq(totalVerifications, 1, "Should increment count");
    }
    
    function test_MultipleVerifiers() public {
        // Verifier1 verifies seat 1
        justice.recordVerification(verifier1, 1);
        
        // Verifier2 verifies seat 2
        justice.recordVerification(verifier2, 2);
        
        // Fraud on seat 1 only affects verifier1
        vm.prank(adjudicator);
        justice.reportFraudulentVerification(1, keccak256("FRAUD"));
        
        assertFalse(justice.canVerify(verifier1), "Verifier1 should be suspended");
        assertTrue(justice.canVerify(verifier2), "Verifier2 should still be active");
    }
}
