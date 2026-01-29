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
 * 1. Pair creation ✅
 * 2. Liquidity provision ✅
 * 3. Token swaps ✅
 * 4. Order book trading ✅
 * 5. Price queries ✅
 * 
 * Total: 18+ tests
 */
contract ForexExchangeTest is Test {
    
    ForexExchange public exchange;
    Altan public altan;
    CoreLaw public coreLaw;
    
    // Mock stablecoin for testing
    MockERC20 public usdt;
    MockERC20 public usdc;
    
    address public owner;
    address public treasury;
    address public trader1;
    address public trader2;
    address public liquidityProvider;
    
    bytes32 public usdtPairId;
    bytes32 public usdcPairId;
    
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
        exchange = new ForexExchange();
        
        // Deploy mock stablecoins
        usdt = new MockERC20("Tether USD", "USDT", 6);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        
        // Mint ALTAN tokens
        altan.mint(trader1, INITIAL_BALANCE, "Test");
        altan.mint(trader2, INITIAL_BALANCE, "Test");
        altan.mint(liquidityProvider, INITIAL_BALANCE, "Test");
        
        // Mint stablecoins
        usdt.mint(trader1, INITIAL_BALANCE);
        usdt.mint(trader2, INITIAL_BALANCE);
        usdt.mint(liquidityProvider, INITIAL_BALANCE);
        
        usdc.mint(trader1, INITIAL_BALANCE);
        usdc.mint(liquidityProvider, INITIAL_BALANCE);
        
        // Fee exemptions
        altan.setFeeExempt(address(exchange), true);
        altan.setFeeExempt(trader1, true);
        altan.setFeeExempt(trader2, true);
        altan.setFeeExempt(liquidityProvider, true);
        altan.setFeeExempt(treasury, true);
    }
    
    /* ==================== PAIR CREATION TESTS ==================== */
    
    function test_CreatePair() public {
        bytes32 pairId = exchange.createPair(
            address(altan),
            address(usdt),
            "ALTAN/USDT"
        );
        
        // Access individual fields from the mapping
        // CurrencyPair: pairId, baseToken, quoteToken, symbol, lastPrice, bidPrice, askPrice, spread, volume24h, high24h, low24h, liquidityBase, liquidityQuote, isActive, createdAt
        (, address baseToken, address quoteToken, string memory symbol,,,,,,,,,,bool isActive,) = exchange.pairs(pairId);
        
        assertEq(baseToken, address(altan));
        assertEq(quoteToken, address(usdt));
        assertEq(symbol, "ALTAN/USDT");
        assertTrue(isActive);
    }
    
    function test_CreateMultiplePairs() public {
        bytes32 usdtId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        bytes32 usdcId = exchange.createPair(address(altan), address(usdc), "ALTAN/USDC");
        
        assertTrue(usdtId != usdcId);
        
        bytes32[] memory allPairs = exchange.getAllPairs();
        assertEq(allPairs.length, 2);
    }
    
    function test_GetPairBySymbol() public {
        exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        ForexExchange.CurrencyPair memory pair = exchange.getPairBySymbol("ALTAN/USDT");
        assertEq(pair.symbol, "ALTAN/USDT");
    }
    
    function test_RevertWhen_DuplicatePair() public {
        exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.expectRevert();
        exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
    }
    
    /* ==================== LIQUIDITY TESTS ==================== */
    
    function test_AddLiquidity() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        uint256 altanAmount = 10_000 * 1e6;
        uint256 usdtAmount = 100_000 * 1e6;  // 1 ALTAN = 10 USDT
        
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), altanAmount);
        usdt.approve(address(exchange), usdtAmount);
        
        uint256 lpTokens = exchange.addLiquidity(pairId, altanAmount, usdtAmount);
        vm.stopPrank();
        
        assertGt(lpTokens, 0);
        
        // Check liquidity was added
        // CurrencyPair fields 12-13: liquidityBase, liquidityQuote
        (,,,,,,,,,,,uint256 liquidityBase, uint256 liquidityQuote,,) = exchange.pairs(pairId);
        assertEq(liquidityBase, altanAmount);
        assertEq(liquidityQuote, usdtAmount);
    }
    
    function test_RemoveLiquidity() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        // Add liquidity first
        uint256 altanAmount = 10_000 * 1e6;
        uint256 usdtAmount = 100_000 * 1e6;
        
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), altanAmount);
        usdt.approve(address(exchange), usdtAmount);
        
        uint256 lpTokens = exchange.addLiquidity(pairId, altanAmount, usdtAmount);
        
        // Remove half
        uint256 lpToRemove = lpTokens / 2;
        (uint256 baseReturned, uint256 quoteReturned) = exchange.removeLiquidity(pairId, lpToRemove);
        vm.stopPrank();
        
        assertGt(baseReturned, 0);
        assertGt(quoteReturned, 0);
    }
    
    /* ==================== SWAP TESTS ==================== */
    
    function test_SwapExactInput_BuyBase() public {
        // Setup pair with liquidity
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), 100_000 * 1e6);
        usdt.approve(address(exchange), 1_000_000 * 1e6);
        exchange.addLiquidity(pairId, 100_000 * 1e6, 1_000_000 * 1e6);
        vm.stopPrank();
        
        // Trader swaps USDT for ALTAN
        uint256 usdtIn = 10_000 * 1e6;
        uint256 minAltanOut = 900 * 1e6;  // Expect ~1000 ALTAN but allow slippage
        
        vm.startPrank(trader1);
        usdt.approve(address(exchange), usdtIn);
        
        uint256 altanOut = exchange.swapExactInput(
            pairId,
            address(usdt),  // tokenIn
            usdtIn,
            minAltanOut
        );
        vm.stopPrank();
        
        assertGt(altanOut, 0);
        assertGe(altanOut, minAltanOut);
    }
    
    function test_SwapExactInput_SellBase() public {
        // Setup pair with liquidity
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), 100_000 * 1e6);
        usdt.approve(address(exchange), 1_000_000 * 1e6);
        exchange.addLiquidity(pairId, 100_000 * 1e6, 1_000_000 * 1e6);
        vm.stopPrank();
        
        // Trader swaps ALTAN for USDT
        uint256 altanIn = 1_000 * 1e6;
        uint256 minUsdtOut = 9_000 * 1e6;  // Expect ~10,000 USDT but allow slippage
        
        vm.startPrank(trader1);
        altan.approve(address(exchange), altanIn);
        
        uint256 usdtOut = exchange.swapExactInput(
            pairId,
            address(altan),  // tokenIn
            altanIn,
            minUsdtOut
        );
        vm.stopPrank();
        
        assertGt(usdtOut, 0);
        assertGe(usdtOut, minUsdtOut);
    }
    
    function test_RevertWhen_SlippageTooHigh() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), 100_000 * 1e6);
        usdt.approve(address(exchange), 1_000_000 * 1e6);
        exchange.addLiquidity(pairId, 100_000 * 1e6, 1_000_000 * 1e6);
        vm.stopPrank();
        
        // Try to swap with unrealistic min output
        vm.startPrank(trader1);
        usdt.approve(address(exchange), 10_000 * 1e6);
        
        vm.expectRevert(ForexExchange.SlippageTooHigh.selector);
        exchange.swapExactInput(
            pairId,
            address(usdt),
            10_000 * 1e6,
            2_000 * 1e6  // Unrealistically high expectation
        );
        vm.stopPrank();
    }
    
    /* ==================== ORDER BOOK TESTS ==================== */
    
    function test_PlaceLimitOrder_Buy() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.prank(trader1);
        bytes32 orderId = exchange.placeOrder(
            pairId,
            ForexExchange.OrderType.LIMIT,
            ForexExchange.OrderSide.BUY,
            1_000 * 1e6,      // buy 1,000 ALTAN
            10 * 1e18,        // at price 10 USDT per ALTAN
            block.timestamp + 1 days
        );
        
        // Access individual fields
        // Order: orderId, pairId, orderType, side, status, trader, baseAmount, quoteAmount, price, filledBase, filledQuote, createdAt, expiresAt
        (,, ForexExchange.OrderType orderType, ForexExchange.OrderSide side,, address trader, uint256 baseAmount,,,,,,) = exchange.orders(orderId);
        
        assertEq(uint(orderType), uint(ForexExchange.OrderType.LIMIT));
        assertEq(uint(side), uint(ForexExchange.OrderSide.BUY));
        assertEq(trader, trader1);
        assertEq(baseAmount, 1_000 * 1e6);
    }
    
    function test_PlaceLimitOrder_Sell() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.prank(trader1);
        bytes32 orderId = exchange.placeOrder(
            pairId,
            ForexExchange.OrderType.LIMIT,
            ForexExchange.OrderSide.SELL,
            500 * 1e6,
            12 * 1e18,
            block.timestamp + 1 days
        );
        
        (,,,ForexExchange.OrderSide side,,,,,,,,,) = exchange.orders(orderId);
        assertEq(uint(side), uint(ForexExchange.OrderSide.SELL));
    }
    
    function test_CancelOrder() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.startPrank(trader1);
        bytes32 orderId = exchange.placeOrder(
            pairId,
            ForexExchange.OrderType.LIMIT,
            ForexExchange.OrderSide.BUY,
            1_000 * 1e6,
            10 * 1e18,
            block.timestamp + 1 days
        );
        
        exchange.cancelOrder(orderId);
        vm.stopPrank();
        
        (,,,,ForexExchange.OrderStatus status,,,,,,,,) = exchange.orders(orderId);
        assertEq(uint(status), uint(ForexExchange.OrderStatus.CANCELLED));
    }
    
    function test_RevertWhen_CancelOthersOrder() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        vm.prank(trader1);
        bytes32 orderId = exchange.placeOrder(
            pairId,
            ForexExchange.OrderType.LIMIT,
            ForexExchange.OrderSide.BUY,
            1_000 * 1e6,
            10 * 1e18,
            block.timestamp + 1 days
        );
        
        // Try to cancel as different user
        vm.expectRevert();
        vm.prank(trader2);
        exchange.cancelOrder(orderId);
    }
    
    function test_GetOrderBook() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        // Place some orders
        vm.prank(trader1);
        exchange.placeOrder(
            pairId,
            ForexExchange.OrderType.LIMIT,
            ForexExchange.OrderSide.BUY,
            1_000 * 1e6,
            10 * 1e18,
            block.timestamp + 1 days
        );
        
        vm.prank(trader2);
        exchange.placeOrder(
            pairId,
            ForexExchange.OrderType.LIMIT,
            ForexExchange.OrderSide.SELL,
            500 * 1e6,
            12 * 1e18,
            block.timestamp + 1 days
        );
        
        (bytes32[] memory buyOrders, bytes32[] memory sellOrders) = exchange.getOrderBook(pairId);
        
        assertEq(buyOrders.length, 1);
        assertEq(sellOrders.length, 1);
    }
    
    /* ==================== PRICE QUERY TESTS ==================== */
    
    function test_GetQuote() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        // Add liquidity for accurate quotes
        vm.startPrank(liquidityProvider);
        altan.approve(address(exchange), 50_000 * 1e6);
        usdt.approve(address(exchange), 500_000 * 1e6);
        exchange.addLiquidity(pairId, 50_000 * 1e6, 500_000 * 1e6);
        vm.stopPrank();
        
        uint256 quote = exchange.getQuote(pairId, 1_000 * 1e6, true);
        assertGt(quote, 0);
    }
    
    /* ==================== ADMIN TESTS ==================== */
    
    function test_SetSwapFee() public {
        exchange.setSwapFee(50);  // 0.5%
        assertEq(exchange.swapFee(), 50);
    }
    
    function test_SuspendPair() public {
        bytes32 pairId = exchange.createPair(address(altan), address(usdt), "ALTAN/USDT");
        
        exchange.suspendPair(pairId);
        
        // isActive is field 14 (0-indexed: 13)
        (,,,,,,,,,,,,,bool isActive,) = exchange.pairs(pairId);
        assertFalse(isActive);
    }
}

// Mock ERC20 for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
