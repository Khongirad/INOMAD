// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/JudicialMultiSig.sol";
import "../contracts/CitizenWalletGuard.sol";

/**
 * @title JudicialMultiSigTest
 * @notice Tests for 3-of-5 judicial freeze orders
 */
contract JudicialMultiSigTest is Test {
    JudicialMultiSig public multiSig;
    CitizenWalletGuard public guard;

    address public admin = address(0x1);
    address public judge1 = address(0x10);
    address public judge2 = address(0x11);
    address public judge3 = address(0x12);
    address public judge4 = address(0x13);
    address public judge5 = address(0x14);
    address public targetWallet = address(0x999);

    function setUp() public {
        // Deploy guard
        guard = new CitizenWalletGuard(admin);

        // Deploy multi-sig (constructor: admin, walletGuard)
        multiSig = new JudicialMultiSig(admin, address(guard));

        // Add judges
        vm.startPrank(admin);
        multiSig.addJudge(judge1);
        multiSig.addJudge(judge2);
        multiSig.addJudge(judge3);
        multiSig.addJudge(judge4);
        multiSig.addJudge(judge5);
        
        // Grant judicial role to multiSig on guard
        guard.grantRole(guard.JUSTICE_ROLE(), address(multiSig));
        vm.stopPrank();
    }

    function test_ProposeFreezeOrder() public {
        bytes32 caseHash = keccak256("CASE_001");
        
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Fraud investigation");

        assertEq(orderId, 1);
        
        JudicialMultiSig.FreezeOrder memory order = multiSig.getOrder(orderId);
        assertEq(order.id, 1);
        assertEq(order.wallet, targetWallet);
        assertEq(order.signatureCount, 1); // Proposer automatically signs
        assertTrue(order.status == JudicialMultiSig.OrderStatus.PENDING);
    }

    function test_SignOrder() public {
        bytes32 caseHash = keccak256("CASE_002");
        
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Investigation");

        // Judge 2 signs
        vm.prank(judge2);
        multiSig.signOrder(orderId);

        JudicialMultiSig.FreezeOrder memory order = multiSig.getOrder(orderId);
        assertEq(order.signatureCount, 2);
    }

    function test_ExecuteOrder_3of5() public {
        bytes32 caseHash = keccak256("CASE_003");
        
        // Judge 1 proposes (1 signature)
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Court order");

        // Judge 2 signs (2 signatures)
        vm.prank(judge2);
        multiSig.signOrder(orderId);

        // Judge 3 signs (3 signatures) - threshold reached
        vm.prank(judge3);
        multiSig.signOrder(orderId);

        // Execute
        vm.prank(judge1);
        multiSig.executeOrder(orderId);

        // Verify order is executed
        JudicialMultiSig.FreezeOrder memory order = multiSig.getOrder(orderId);
        assertTrue(order.status == JudicialMultiSig.OrderStatus.EXECUTED);
    }

    function test_CannotExecuteWithoutThreshold() public {
        bytes32 caseHash = keccak256("CASE_004");
        
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Test");

        vm.prank(judge2);
        multiSig.signOrder(orderId);

        // Only 2 signatures, need 3
        vm.prank(judge1);
        vm.expectRevert(JudicialMultiSig.ThresholdNotMet.selector);
        multiSig.executeOrder(orderId);
    }

    function test_CannotSignTwice() public {
        bytes32 caseHash = keccak256("CASE_005");
        
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Test");

        // Judge 1 already signed when proposing
        vm.prank(judge1);
        vm.expectRevert(JudicialMultiSig.AlreadySigned.selector);
        multiSig.signOrder(orderId);
    }

    function test_CancelOrder() public {
        bytes32 caseHash = keccak256("CASE_006");
        
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Test");

        // Only proposer can cancel
        vm.prank(judge1);
        multiSig.cancelOrder(orderId);

        JudicialMultiSig.FreezeOrder memory order = multiSig.getOrder(orderId);
        assertTrue(order.status == JudicialMultiSig.OrderStatus.CANCELLED);
    }

    function test_CanExecute() public {
        bytes32 caseHash = keccak256("CASE_007");
        
        vm.prank(judge1);
        uint256 orderId = multiSig.proposeFreezeOrder(targetWallet, caseHash, "Test");
        
        vm.prank(judge2);
        multiSig.signOrder(orderId);
        
        vm.prank(judge3);
        multiSig.signOrder(orderId);

        assertTrue(multiSig.canExecute(orderId));
    }
}
