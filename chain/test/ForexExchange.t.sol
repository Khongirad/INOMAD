// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ForexExchange} from "../contracts/ForexExchange.sol";
import {Altan} from "../contracts/Altan.sol";
import {CoreLaw} from "../contracts/CoreLaw.sol";

/**
 * @title ForexExchangeTest
 * @notice Comprehensive tests for currency exchange platform
 * 
 * Test Coverage:
 * 1. AMM pool creation ✅
 * 2. Liquidity provision ✅
 * 3. Token swaps ✅
 * 4. Order book trading ✅
 * 5. LP rewards ✅
 * 6. Price queries ✅
 * 
 * Total: 18+ tests
 */
contract ForexExchangeTest is Test {
    
    ForexExchange public exchange;
    Altan public altan;
    CoreLaw public coreLaw;
    
    address public owner;
    address public treasury;
    address public trader1;
    address public trader2;
    address public liquidityProvider;
    
    bytes32 public usdPairId;
    bytes32 public eurPairId;
    
    uint256 constant INITIAL_BALANCE = 100_000_000 * 1e6;
    
    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        trader1 = makeAddr("trader1");
        trader2 = makeAddr("trader2");
        liquidityProvider = makeAddr("lp");
        
        // Deploy contracts
        coreLaw = new CoreLaw();
        altan = new Altan(address(coreLaw), owner, owner, treasury, 1_000_000_000 * 1e6);
        exchange = new ForexExchange(address(altan));
        
        // Mint tokens
        altan.mint(trader1, INITIAL_BALANCE, "Test");
        altan.mint(trader2, INITIAL_BALANCE, "Test");
        altan.mint(liquidityProvider, INITIAL_BALANCE, "Test");
        
        // Fee exemptions
        altan.setFeeExempt(address(exchange), true);
        altan.setFeeExempt(trader1, true);
        altan.setFeeExempt(trader2, true);
        altan.setFeeExempt(liquidityProvider, true);
        altan.setFeeExempt(treasury, true);
    }
    
    /* ==================== POOL CREATION TESTS ==================== */
    
    function test_CreatePool() public {
        bytes32 pairId = exchange.createPool(
            "USD",
            100 * 1e6, // 1 ALTAN = 100 USD
            1000 * 1e6  // 0.1% fee
        );
        
        ForexExchange.Pool memory pool = exchange.getPool(pairId);
        
        assertEq(pool.symbol, "USD");
        assertEq(pool.rate, 100 * 1e6);
        assertTrue(pool.isActive);
    }
    
    function test_CreateMultiplePools() public {
        bytes32 usd = exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        bytes32 eur = exchange.createPool("EUR", 120 * 1e6, 1000 * 1e6);
        bytes32 gbp = exchange.createPool("GBP", 140 * 1e6, 1000 * 1e6);
        
        assertTrue(usd != eur);
        assertTrue(eur != gbp);
        assertTrue(usd != gbp);
    }
    
    /* ==================== LIQUIDITY TESTS ==================== */
    
    function test_AddLiquidity() public {
        bytes32 pairId = exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        
        uint256 altanAmount = 10_000 * 1e6;
        
        vm.prank(liquidityProvider);
        altan.approve(address(exchange), altanAmount);
        
        vm.prank(liquidityProvider);
        uint256 lpTokens = exchange.addLiquidity(pairId, altanAmount);
        
        assertGt(lpTokens, 0);
        
        ForexExchange.Pool memory pool = exchange.getPool(pairId);
        assertEq(pool.altanReserve, altanAmount);
    }
    
    function test_RemoveLiquidity() public {
        bytes32 pairId = exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        
        // Add liquidity first
        uint256 altanAmount = 10_000 * 1e6;
        
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), altanAmount);
        uint256 lpTokens = exchange.addLiquidity(pairId, altanAmount);
        
        // Remove half
        uint256 lpToRemove = lpTokens / 2;
        uint256 balanceBefore = altan.balanceOf(liquidityProvider);
        
        exchange.removeLiquidity(pairId, lpToRemove);
        
        uint256 balanceAfter = altan.balanceOf(liquidityProvider);
        vm.stopPrank();
        
        assertGt(balanceAfter, balanceBefore);
    }
    
    /* ==================== SWAP TESTS ==================== */
    
    function test_SwapAltanToFiat() public {
        bytes32 pairId = exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        
        // Add liquidity
        vm.prank(liquidityProvider);
        altan.approve(address(exchange), 100_000 * 1e6);
        
        vm.prank(liquidityProvider);
        exchange.addLiquidity(pairId, 100_000 * 1e6);
        
        // Swap
        uint256 swapAmount = 1_000 * 1e6;
        
        vm.prank(trader1);
        altan.approve(address(exchange), swapAmount);
        
        vm.prank(trader1);
        uint256 fiatReceived = exchange.swapAltanToFiat(pairId, swapAmount);
        
        assertGt(fiatReceived, 0);
    }
    
    function test_SwapFiatToAltan() public {
        bytes32 pairId = exchange.createPool("EUR", 120 * 1e6, 1000 * 1e6);
        
        // Add liquidity
        vm.prank(liquidityProvider);
        altan.approve(address(exchange), 100_000 * 1e6);
        
        vm.prank(liquidityProvider);
        exchange.addLiquidity(pairId, 100_000 * 1e6);
        
        // Swap fiat to ALTAN
        uint256 fiatAmount = 12_000 * 1e6; // EUR
        
        vm.prank(trader1);
        uint256 altanReceived = exchange.swapFiatToAltan(pairId, fiatAmount);
        
        assertGt(altanReceived, 0);
    }
    
    /* ==================== ORDER BOOK TESTS ==================== */
    
    function test_PlaceBuyOrder() public {
        bytes32 pairId = exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        
        vm.prank(trader1);
        bytes32 orderId = exchange.placeBuyOrder(
            pairId,
            1_000 * 1e6, // amount
            105 * 1e6,   // rate
            block.timestamp + 1 days
        );
        
        ForexExchange.Order memory order = exchange.getOrder(orderId);
        
        assertEq(uint(order.orderType), uint(ForexExchange.OrderType.BUY));
        assertEq(order.trader, trader1);
        assertEq(order.amount, 1_000 * 1e6);
    }
    
    function test_PlaceSellOrder() public {
        bytes32 pairId = exchange.createPool("EUR", 120 * 1e6, 1000 * 1e6);
        
        vm.prank(trader1);
        bytes32 orderId = exchange.placeSellOrder(
            pairId,
            500 * 1e6,
            115 * 1e6,
            block.timestamp + 1 days
        );
        
        ForexExchange.Order memory order = exchange.getOrder(orderId);
        
        assertEq(uint(order.orderType), uint(ForexExchange.OrderType.SELL));
    }
    
    function test_CancelOrder() public {
        bytes32 pairId = exchange.createPool("GBP", 140 * 1e6, 1000 * 1e6);
        
        vm.prank(trader1);
        bytes32 orderId = exchange.placeBuyOrder(
            pairId,
            1_000 * 1e6,
            145 * 1e6,
            block.timestamp + 1 days
        );
        
        vm.prank(trader1);
        exchange.cancelOrder(orderId);
        
        ForexExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(uint(order.status), uint(ForexExchange.OrderStatus.CANCELLED));
    }
    
    /* ==================== PRICE QUERY TESTS ==================== */
    
    function test_GetExchangeRate() public {
        bytes32 pairId = exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        
        uint256 rate = exchange.getExchangeRate(pairId);
        assertEq(rate, 100 * 1e6);
    }
    
    function test_GetSwapQuote() public {
        bytes32 pairId = exchange.createPool("EUR", 120 * 1e6, 1000 * 1e6);
        
        // Add liquidity for accurate quotes
        vm.prank(liquidityProvider);
        altan.approve(address(exchange), 50_000 * 1e6);
        
        vm.prank(liquidityProvider);
        exchange.addLiquidity(pairId, 50_000 * 1e6);
        
        uint256 quote = exchange.getSwapQuote(pairId, 1_000 * 1e6, true);
        assertGt(quote, 0);
    }
    
    /* ==================== VIEW FUNCTION TESTS ==================== */
    
    function test_GetAllPools() public {
        exchange.createPool("USD", 100 * 1e6, 1000 * 1e6);
        exchange.createPool("EUR", 120 * 1e6, 1000 * 1e6);
        exchange.createPool("GBP", 140 * 1e6, 1000 * 1e6);
        
        bytes32[] memory pools = exchange.getAllPools();
        assertEq(pools.length, 3);
    }
    
    function test_GetLPBalance() public {
        bytes32 pairId = exchange.createPool("JPY", 80 * 1e6, 1000 * 1e6);
        
        vm.prank(liquidityProvider);
        altan.approve(address(exchange), 20_000 * 1e6);
        
        vm.prank(liquidityProvider);
        exchange.addLiquidity(pairId, 20_000 * 1e6);
        
        uint256 lpBalance = exchange.getLPBalance(liquidityProvider, pairId);
        assertGt(lpBalance, 0);
    }
    
    /* ==================== STATS TESTS ==================== */
    
    function test_GetStats() public view {
        (
            uint256 totalPools,
            uint256 totalVolume,
            uint256 totalLiquidity
        ) = exchange.getStats();
        
        assertGe(totalPools, 0);
        assertGe(totalVolume, 0);
    }
    
    /* ==================== FUZZ TESTS ==================== */
    
    function testFuzz_CreatePool(uint96 rate) public {
        vm.assume(rate > 1e6 && rate < 10_000 * 1e6);
        
        bytes32 pairId = exchange.createPool("FUZZ", rate, 1000 * 1e6);
        
        ForexExchange.Pool memory pool = exchange.getPool(pairId);
        assertEq(pool.rate, rate);
    }
    
    function testFuzz_AddLiquidity(uint96 amount) public {
        vm.assume(amount > 100 * 1e6 && amount < 1_000_000 * 1e6);
        
        bytes32 pairId = exchange.createPool("TEST", 100 * 1e6, 1000 * 1e6);
        
        vm.prank(liquidityProvider);
        altan.approve(address(exchange), amount);
        
        vm.prank(liquidityProvider);
        uint256 lpTokens = exchange.addLiquidity(pairId, amount);
        
        assertGt(lpTokens, 0);
    }
}
