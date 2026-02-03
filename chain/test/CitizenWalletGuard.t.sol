// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/CitizenWalletGuard.sol";

/**
 * @title CitizenWalletGuardTest
 * @notice Tests for hybrid security policy executor
 */
contract CitizenWalletGuardTest is Test {
    CitizenWalletGuard public guard;

    address public admin = address(0x1);
    address public guardian = address(0x2);  // GUARDIAN_ROLE (backend)
    address public justice = address(0x3);   // JUSTICE_ROLE (judicial)
    address public wallet1 = address(0x100);
    address public wallet2 = address(0x101);

    function setUp() public {
        guard = new CitizenWalletGuard(admin);

        vm.startPrank(admin);
        guard.addGuardian(guardian);
        guard.addJustice(justice);
        vm.stopPrank();
    }

    function test_LockWallet() public {
        vm.prank(guardian);
        guard.lockWallet(wallet1, "Suspicious activity detected");

        (bool isLocked, , , ) = guard.getLockStatus(wallet1);
        assertTrue(isLocked);
    }

    function test_UnlockWallet() public {
        vm.prank(guardian);
        guard.lockWallet(wallet1, "Test lock");

        vm.prank(guardian);
        guard.unlockWallet(wallet1);

        (bool isLocked, , , ) = guard.getLockStatus(wallet1);
        assertFalse(isLocked);
    }

    function test_JudicialFreeze() public {
        bytes32 caseHash = keccak256("COURT_CASE_001");
        
        vm.prank(justice);
        guard.judicialFreeze(wallet1, caseHash);

        (bool isLocked, CitizenWalletGuard.LockReason reason, bytes32 storedCase, ) = guard.getLockStatus(wallet1);
        assertTrue(isLocked);
        assertEq(storedCase, caseHash);
        assertTrue(reason == CitizenWalletGuard.LockReason.JUDICIAL_ORDER);
    }

    function test_JudicialUnlock() public {
        bytes32 caseHash = keccak256("COURT_CASE_002");
        
        vm.prank(justice);
        guard.judicialFreeze(wallet1, caseHash);

        // Only justice can unlock judicial freeze
        vm.prank(justice);
        guard.unlockWallet(wallet1);

        (bool isLocked, , , ) = guard.getLockStatus(wallet1);
        assertFalse(isLocked);
    }

    function test_UpdateRiskScore() public {
        vm.prank(guardian);
        guard.updateRiskScore(wallet1, 75);

        uint256 score = guard.riskScores(wallet1);
        assertEq(score, 75);
    }

    function test_AutoLockOnHighRisk() public {
        // Default threshold is 80
        vm.prank(guardian);
        guard.updateRiskScore(wallet1, 85);

        (bool isLocked, , , ) = guard.getLockStatus(wallet1);
        assertTrue(isLocked);
    }

    function test_CheckTransaction_Allowed() public {
        // Wallet not locked, no high risk
        (bool allowed, ) = guard.checkTransaction(wallet1, wallet2, 1000 * 1e6);
        assertTrue(allowed);
    }

    function test_CheckTransaction_Blocked_Locked() public {
        // Lock wallet
        vm.prank(guardian);
        guard.lockWallet(wallet1, "Blocked");

        (bool allowed, string memory reason) = guard.checkTransaction(wallet1, wallet2, 1000 * 1e6);
        assertFalse(allowed);
        assertEq(reason, "Wallet is locked");
    }

    function test_CheckTransaction_Blocked_Blacklist() public {
        // Add recipient to blacklist
        vm.prank(admin);
        guard.addToBlacklist(wallet2);

        (bool allowed, string memory reason) = guard.checkTransaction(wallet1, wallet2, 1000 * 1e6);
        assertFalse(allowed);
        assertEq(reason, "Recipient is blacklisted");
    }

    function test_AddToBlacklist() public {
        vm.prank(admin);
        guard.addToBlacklist(wallet1);

        assertTrue(guard.globalBlacklist(wallet1));
    }

    function test_RemoveFromBlacklist() public {
        vm.prank(admin);
        guard.addToBlacklist(wallet1);
        
        vm.prank(admin);
        guard.removeFromBlacklist(wallet1);

        assertFalse(guard.globalBlacklist(wallet1));
    }

    function test_EmergencyMode() public {
        vm.prank(admin);
        guard.setEmergencyMode(true);

        // Check transaction with high amount - should fail
        (bool allowed, ) = guard.checkTransaction(wallet1, wallet2, 100_000 * 1e6);
        assertFalse(allowed);
    }

    function test_OnlyGuardianCanLock() public {
        address nonGuardian = address(0xBAD);
        
        vm.prank(nonGuardian);
        vm.expectRevert();
        guard.lockWallet(wallet1, "Unauthorized");
    }

    function test_OnlyJusticeCanJudicialFreeze() public {
        vm.prank(guardian); // guardian, not justice
        vm.expectRevert();
        guard.judicialFreeze(wallet1, bytes32("CASE"));
    }

    function test_GetStats() public {
        vm.prank(guardian);
        guard.lockWallet(wallet1, "Test");

        (uint256 totalLocked, , , ) = guard.getStats();
        assertEq(totalLocked, 1);
    }
}
