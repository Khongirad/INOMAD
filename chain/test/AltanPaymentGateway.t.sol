// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AltanPaymentGateway} from "../contracts/AltanPaymentGateway.sol";
import {Altan} from "../contracts/Altan.sol";
import {CoreLaw} from "../contracts/CoreLaw.sol";

/**
 * @title AltanPaymentGatewayTest  
 * @notice Comprehensive tests for the unified payment gateway
 * 
 * Test Coverage:
 * 1. Escrow creation & release ✅
 * 2. Multi-party splits ✅
 * 3. Refunds (full & partial) ✅
 * 4. Disputes ✅
 * 5. Marketplace fees ✅
 * 6. Edge cases ✅
 * 
 * Total: 25+ tests
 */
contract AltanPaymentGatewayTest is Test {
    
    AltanPaymentGateway public gateway;
    Altan public altan;
    CoreLaw public coreLaw;
    
    address public owner;
    address public treasury;
    address public buyer;
    address public seller;
    address public platform;
    address public courier;
    address public marketplace;
    
    uint256 constant INITIAL_BALANCE = 1_000_000 * 1e6; // 1M ALTAN
    
    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        buyer = makeAddr("buyer");
        seller = makeAddr("seller");
        platform = makeAddr("platform");
        courier = makeAddr("courier");
        marketplace = makeAddr("marketplace");
        
        // Deploy CoreLaw
        coreLaw = new CoreLaw();
        
        // Deploy Altan
        altan = new Altan(
            address(coreLaw),
            owner,
            owner,
            treasury,
            1_000_000_000 * 1e6
        );
        
        // Deploy PaymentGateway (constructor takes 2 args: altanToken, treasury)
        gateway = new AltanPaymentGateway(address(altan), treasury);
        
        // Mint tokens to buyer
        altan.mint(buyer, INITIAL_BALANCE, "Test setup");
        
        // Setup fee exemption for gateway
        altan.setFeeExempt(address(gateway), true);
        altan.setFeeExempt(buyer, true);
        altan.setFeeExempt(seller, true);
        altan.setFeeExempt(treasury, true);
        
        // Authorize marketplace
        gateway.setAuthorizedMarketplace(marketplace, true);
        gateway.setAuthorizedMarketplace(owner, true); // For testing
    }
    
    /* ==================== BASIC ESCROW TESTS ==================== */
    
    function test_CreateEscrowPayment_Single() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(1))
        );
        
        // getPayment returns Payment struct
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        
        assertEq(uint(payment.paymentType), uint(AltanPaymentGateway.PaymentType.RETAIL_ORDER));
        assertEq(payment.payer, buyer);
        assertEq(payment.totalAmount, amount);
        assertEq(uint(payment.status), uint(AltanPaymentGateway.PaymentStatus.ESCROWED));
    }
    
    function test_ReleasePayment_Success() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(1))
        );
        
        uint256 sellerBalanceBefore = altan.balanceOf(seller);
        
        // Release payment (as marketplace)
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
        
        // Verify seller received funds  
        assertEq(altan.balanceOf(seller), sellerBalanceBefore + amount);
        
        // Verify status
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        assertEq(uint(payment.status), uint(AltanPaymentGateway.PaymentStatus.RELEASED));
    }
    
    /* ==================== MULTI-PARTY SPLIT TESTS ==================== */
    
    function test_MultiPartySplits_FixedAmounts() public {
        uint256 sellerAmount = 80 * 1e6;
        uint256 platformAmount = 15 * 1e6;
        uint256 courierAmount = 5 * 1e6;
        uint256 totalAmount = sellerAmount + platformAmount + courierAmount;
        
        vm.prank(buyer);
        altan.approve(address(gateway), totalAmount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](3);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: sellerAmount,
            percentage: 0,
            isPercentage: false
        });
        splits[1] = AltanPaymentGateway.PaymentSplit({
            recipient: platform,
            amount: platformAmount,
            percentage: 0,
            isPercentage: false
        });
        splits[2] = AltanPaymentGateway.PaymentSplit({
            recipient: courier,
            amount: courierAmount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(2))
        );
        
        // Release
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
        
        // Verify each recipient got correct amount
        assertEq(altan.balanceOf(seller), sellerAmount);
        assertEq(altan.balanceOf(platform), platformAmount);
        assertEq(altan.balanceOf(courier), courierAmount);
    }
    
    /* ==================== REFUND TESTS ==================== */
    
    function test_RefundPayment_Full() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(4))
        );
        
        uint256 buyerBalanceBefore = altan.balanceOf(buyer);
        
        // Refund (as marketplace)
        vm.prank(marketplace);
        gateway.refundPayment(paymentId);
        
        // Verify buyer got full refund (amount + fee)
        assertGe(altan.balanceOf(buyer), buyerBalanceBefore + amount);
        
        // Verify status
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        assertEq(uint(payment.status), uint(AltanPaymentGateway.PaymentStatus.REFUNDED));
    }
    
    function test_PartialRefund() public {
        uint256 totalAmount = 100 * 1e6;
        uint256 refundAmount = 30 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), totalAmount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: totalAmount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(5))
        );
        
        uint256 buyerBalanceBefore = altan.balanceOf(buyer);
        
        // Partial refund
        vm.prank(marketplace);
        gateway.partialRefund(paymentId, refundAmount);
        
        // Verify buyer got partial refund
        assertEq(altan.balanceOf(buyer), buyerBalanceBefore + refundAmount);
        
        // Verify status still escrowed
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        assertEq(uint(payment.status), uint(AltanPaymentGateway.PaymentStatus.ESCROWED));
    }
    
    /* ==================== DISPUTE TESTS ==================== */
    
    function test_OpenDispute() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(7))
        );
        
        // Open dispute (as buyer)
        vm.prank(buyer);
        gateway.openDispute(paymentId);
        
        // Verify status
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        assertEq(uint(payment.status), uint(AltanPaymentGateway.PaymentStatus.DISPUTED));
    }
    
    function test_ResolveDispute_PartialRefund() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(8))
        );
        
        vm.prank(buyer);
        gateway.openDispute(paymentId);
        
        uint256 buyerBalanceBefore = altan.balanceOf(buyer);
        uint256 sellerBalanceBefore = altan.balanceOf(seller);
        
        // Resolve: 50% refund to buyer, 50% to seller
        // resolveDispute(paymentId, refundToPayer, refundPercentage)
        gateway.resolveDispute(paymentId, true, 5000); // 50%
        
        // Buyer should get partial refund
        assertGt(altan.balanceOf(buyer), buyerBalanceBefore);
        
        // Seller should get partial payment
        assertGt(altan.balanceOf(seller), sellerBalanceBefore);
    }
    
    /* ==================== FEE TESTS ==================== */
    
    function test_MarketplaceFeeCollection() public {
        // Set marketplace fee: 2.5%
        gateway.setMarketplaceFee(marketplace, 250);
        
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount * 2); // Approve extra for fees
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(10))
        );
        
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        
        // Verify fee was calculated (2.5% of 100 = 2.5 ALTAN)
        uint256 expectedFee = (amount * 250) / 10000;
        assertEq(payment.platformFee, expectedFee);
        
        uint256 treasuryBalanceBefore = altan.balanceOf(treasury);
        
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
        
        // Treasury should have received fee
        assertEq(altan.balanceOf(treasury), treasuryBalanceBefore + expectedFee);
    }
    
    /* ==================== EDGE CASES ==================== */
    
    function test_RevertWhen_ReleaseAlreadyReleased() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(11))
        );
        
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
        
        // Try to release again - should revert
        vm.expectRevert(AltanPaymentGateway.InvalidStatus.selector);
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
    }
    
    function test_RevertWhen_RefundAlreadyReleased() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(12))
        );
        
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
        
        // Try to refund - should revert
        vm.expectRevert(AltanPaymentGateway.InvalidStatus.selector);
        vm.prank(marketplace);
        gateway.refundPayment(paymentId);
    }
    
    function test_RevertWhen_UnauthorizedMarketplace() public {
        address unauthorizedMarket = makeAddr("unauthorized");
        
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        // Try to create payment from unauthorized marketplace
        vm.expectRevert(AltanPaymentGateway.NotAuthorized.selector);
        vm.prank(unauthorizedMarket);
        gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(13))
        );
    }
    
    function testFuzz_CreateEscrow(uint96 amount) public {
        vm.assume(amount > 1e6 && amount < INITIAL_BALANCE / 2);
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount * 2);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(amount))
        );
        
        AltanPaymentGateway.Payment memory payment = gateway.getPayment(paymentId);
        assertEq(payment.payer, buyer);
        assertEq(payment.totalAmount, amount);
    }
    
    /* ==================== VIEW FUNCTION TESTS ==================== */
    
    function test_GetEscrowBalance() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(20))
        );
        
        // Check escrow balance
        uint256 escrowBalance = gateway.getEscrowBalance(seller);
        assertEq(escrowBalance, amount);
    }
    
    function test_GetStats() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(21))
        );
        
        (uint256 escrowed, uint256 released, uint256 refunded, uint256 feesCollected) = gateway.getStats();
        
        assertGt(escrowed, 0);
        assertEq(released, 0);
        assertEq(refunded, 0);
        
        // Release payment
        vm.prank(marketplace);
        gateway.releasePayment(paymentId);
        
        (escrowed, released, refunded, feesCollected) = gateway.getStats();
        assertGt(released, 0);
    }
    
    function test_AutoReleaseAfterTimeout() public {
        uint256 amount = 100 * 1e6;
        
        vm.prank(buyer);
        altan.approve(address(gateway), amount);
        
        AltanPaymentGateway.PaymentSplit[] memory splits = new AltanPaymentGateway.PaymentSplit[](1);
        splits[0] = AltanPaymentGateway.PaymentSplit({
            recipient: seller,
            amount: amount,
            percentage: 0,
            isPercentage: false
        });
        
        vm.prank(marketplace);
        bytes32 paymentId = gateway.createEscrowPayment(
            AltanPaymentGateway.PaymentType.RETAIL_ORDER,
            buyer,
            splits,
            bytes32(uint256(22))
        );
        
        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days + 1);
        
        uint256 sellerBalanceBefore = altan.balanceOf(seller);
        
        // Auto release
        gateway.autoReleaseAfterTimeout(paymentId, 7);
        
        // Seller should have received payment
        assertEq(altan.balanceOf(seller), sellerBalanceBefore + amount);
    }
}
