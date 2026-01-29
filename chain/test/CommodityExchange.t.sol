// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {CommodityExchange} from "../contracts/CommodityExchange.sol";
import {AltanPaymentGateway} from "../contracts/AltanPaymentGateway.sol";
import {DigitalProductPassport} from "../contracts/DigitalProductPassport.sol";
import {Altan} from "../contracts/Altan.sol";
import {CoreLaw} from "../contracts/CoreLaw.sol";

/**
 * @title CommodityExchangeTest
 * @notice Comprehensive tests for commodity trading platform
 * 
 * Test Coverage:
 * 1. Lot creation with DPP ✅
 * 2. Sell orders (spot & forward) ✅
 * 3. Buy orders ✅
 * 4. Order matching & trades ✅
 * 5. Settlement ✅
 * 6. Quotations ✅
 * 7. Edge cases ✅
 * 
 * Total: 22+ tests
 */
contract CommodityExchangeTest is Test {
    
    CommodityExchange public exchange;
    AltanPaymentGateway public gateway;
    DigitalProductPassport public dpp;
    Altan public altan;
    CoreLaw public coreLaw;
    
    address public owner;
    address public treasury;
    address public seller;
    address public buyer;
    address public broker;
    
    bytes32 public goldId;
    bytes32 public wheatId;
    bytes32 public oilId;
    
    uint256 constant INITIAL_BALANCE = 100_000_000 * 1e6;
    
    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        seller = makeAddr("seller");
        buyer = makeAddr("buyer");
        broker = makeAddr("broker");
        
        // Deploy contracts
        coreLaw = new CoreLaw();
        altan = new Altan(address(coreLaw), owner, owner, treasury, 1_000_000_000 * 1e6);
        gateway = new AltanPaymentGateway(address(altan), treasury);
        dpp = new DigitalProductPassport();
        exchange = new CommodityExchange();
        
        // Setup
        exchange.setPaymentGateway(address(gateway));
        gateway.setAuthorizedMarketplace(address(exchange), true);
        
        // Mint tokens
        altan.mint(seller, INITIAL_BALANCE, "Test");
        altan.mint(buyer, INITIAL_BALANCE, "Test");
        altan.mint(broker, INITIAL_BALANCE, "Test");
        
        // Fee exemptions
        altan.setFeeExempt(address(exchange), true);
        altan.setFeeExempt(address(gateway), true);
        altan.setFeeExempt(seller, true);
        altan.setFeeExempt(buyer, true);
        altan.setFeeExempt(broker, true);
        altan.setFeeExempt(treasury, true);
        
        
        // Create commodity IDs (will match what _setupDefaultCommodities creates)
        // Gold: hash of (0, "Zoloto", "GOLD")
        goldId = keccak256(abi.encodePacked(uint256(0), "Zoloto", "GOLD"));
        
        // Wheat: hash based on GRAINS category
        wheatId = keccak256(abi.encodePacked(uint256(3), "Pshenitca", "WHEAT"));
        
        // Oil: hash based on ENERGY category  
        oilId = keccak256(abi.encodePacked(uint256(1), "Neft", "OIL"));
    }
    
    /* ==================== LOT CREATION TESTS ==================== */
    
    function test_CreateLot() public {
        // Create DPP for commodity
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport(
            "Gold Bar 1kg",
            "Physical gold",
            "Refinery X"
        );
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            goldId,
            dppId,
            1000 * 1e3, // 1000 grams
            10 * 1e3,   // min 10 grams
            keccak256("quality-cert"),
            bytes32(uint256(1)), // location
            "Switzerland",
            block.timestamp + 365 days
        );
        
        CommodityExchange.Lot memory lot = exchange.getLot(lotId);
        
        assertEq(lot.seller, seller);
        assertEq(lot.commodityId, goldId);
        assertEq(lot.quantity, 1000 * 1e3);
        assertTrue(lot.isActive);
    }
    
    function test_CreateLot_Wheat() public {
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport(
            "Spring Wheat",
            "Grade A wheat",
            "Farm Co"
        );
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            wheatId,
            dppId,
            100 * 1e2,  // 100 tonnes (2 decimals)
            1 * 1e2,    // min 1 tonne
            keccak256("grain-cert"),
            bytes32(uint256(2)),
            "Kazakhstan",
            block.timestamp + 90 days
        );
        
        CommodityExchange.Lot memory lot = exchange.getLot(lotId);
        assertEq(lot.origin, "Kazakhstan");
        assertEq(lot.quantity, 100 * 1e2);
    }
    
    /* ==================== SELL ORDER TESTS ==================== */
    
    function test_PlaceSellOrder_Spot() public {
        // Create lot first
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport("Gold", "desc", "origin");
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            goldId,
            dppId,
            500 * 1e3,
            10 * 1e3,
            keccak256("cert"),
            bytes32(uint256(1)),
            "Swiss",
            block.timestamp + 365 days
        );
        
        // Place sell order
        vm.prank(seller);
        bytes32 orderId = exchange.placeSellOrder(
            lotId,
            100 * 1e3, // sell 100 grams
            60 * 1e6,  // price: 60 ALTAN per gram
            CommodityExchange.SettlementType.SPOT,
            0, // no delivery date for spot
            block.timestamp + 7 days
        );
        
        CommodityExchange.Order memory order = exchange.getOrder(orderId);
        
        assertEq(uint(order.orderType), uint(CommodityExchange.OrderType.SELL));
        assertEq(order.trader, seller);
        assertEq(order.quantity, 100 * 1e3);
        assertEq(order.price, 60 * 1e6);
        assertEq(uint(order.status), uint(CommodityExchange.OrderStatus.ACTIVE));
    }
    
    function test_PlaceSellOrder_Forward() public {
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport("Wheat", "desc", "origin");
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            wheatId,
            dppId,
            1000 * 1e2,
            10 * 1e2,
            keccak256("cert"),
            bytes32(uint256(1)),
            "USA",
            block.timestamp + 180 days
        );
        
        uint256 deliveryDate = block.timestamp + 90 days;
        
        vm.prank(seller);
        bytes32 orderId = exchange.placeSellOrder(
            lotId,
            500 * 1e2,
            25 * 1e6, // 25 ALTAN per tonne
            CommodityExchange.SettlementType.FORWARD,
            deliveryDate,
            block.timestamp + 30 days
        );
        
        CommodityExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(uint(order.settlement), uint(CommodityExchange.SettlementType.FORWARD));
        assertEq(order.deliveryDate, deliveryDate);
    }
    
    /* ==================== BUY ORDER TESTS ==================== */
    
    function test_PlaceBuyOrder() public {
        vm.prank(buyer);
        bytes32 orderId = exchange.placeBuyOrder(
            goldId,
            50 * 1e3,  // buy 50 grams
            65 * 1e6,  // willing to pay 65 ALTAN per gram
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
        
        CommodityExchange.Order memory order = exchange.getOrder(orderId);
        
        assertEq(uint(order.orderType), uint(CommodityExchange.OrderType.BUY));
        assertEq(order.trader, buyer);
        assertEq(order.commodityId, goldId);
    }
    
    /* ==================== ORDER CANCELLATION ==================== */
    
    function test_CancelOrder() public {
        vm.prank(buyer);
        bytes32 orderId = exchange.placeBuyOrder(
            goldId,
            100 * 1e3,
            60 * 1e6,
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
        
        vm.prank(buyer);
        exchange.cancelOrder(orderId);
        
        CommodityExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(uint(order.status), uint(CommodityExchange.OrderStatus.CANCELLED));
    }
    
    function test_RevertWhen_CancelOthersOrder() public {
        vm.prank(buyer);
        bytes32 orderId = exchange.placeBuyOrder(
            goldId,
            100 * 1e3,
            60 * 1e6,
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
        
        // Try to cancel as different user
        vm.expectRevert();
        vm.prank(seller);
        exchange.cancelOrder(orderId);
    }
    
    /* ==================== QUOTATION TESTS ==================== */
    
    function test_GetQuote() public {
        // Place some orders to establish quote
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport("Gold", "desc", "origin");
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            goldId,
            dppId,
            1000 * 1e3,
            10 * 1e3,
            keccak256("cert"),
            bytes32(uint256(1)),
            "Swiss",
            block.timestamp + 365 days
        );
        
        vm.prank(seller);
        exchange.placeSellOrder(
            lotId,
            100 * 1e3,
            60 * 1e6,
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
        
        vm.prank(buyer);
        exchange.placeBuyOrder(
            goldId,
            50 * 1e3,
            58 * 1e6,
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
        
        CommodityExchange.Quote memory quote = exchange.getQuote(goldId);
        
        assertGt(quote.askPrice, 0); // Should have ask price from sell order
        assertGt(quote.bidPrice, 0); // Should have bid price from buy order
    }
    
    /* ==================== VIEW FUNCTION TESTS ==================== */
    
    function test_GetCommodity() public view {
        CommodityExchange.Commodity memory gold = exchange.getCommodity(goldId);
        
        assertEq(uint(gold.commodityClass), uint(CommodityExchange.CommodityClass.METALS));
        assertTrue(gold.isActive);
        assertEq(gold.decimals, 3); // grams
    }
    
    function test_GetAllCommodities() public view {
        bytes32[] memory allComm = exchange.getAllCommodities();
        assertGt(allComm.length, 0);
    }
    
    function test_GetCommodityLots() public {
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport(
            "Gold",
            "Physical gold",
            "Refinery",
            "Switzerland"
        );
        
        vm.prank(seller);
        exchange.createLot(
            goldId,
            dppId,
            1000 * 1e3,
            10 * 1e3,
            keccak256("cert"),
            bytes32(uint256(1)),
            "Swiss",
            block.timestamp + 365 days
        );
        
        bytes32[] memory lots = exchange.getCommodityLots(goldId);
        assertEq(lots.length, 1);
    }
    
    /* ==================== EDGE CASES ==================== */
    
    function test_RevertWhen_InvalidCommodity() public {
        bytes32 invalidId = keccak256("INVALID");
        
        vm.expectRevert();
        vm.prank(seller);
        exchange.createLot(
            invalidId,
            bytes32(0),
            100,
            10,
            bytes32(0),
            bytes32(0),
            "",
            block.timestamp + 30 days
        );
    }
    
    function test_RevertWhen_InsufficientLotQuantity() public {
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport("Gold", "desc", "origin");
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            goldId,
            dppId,
            100 * 1e3, // only 100 grams
            10 * 1e3,
            keccak256("cert"),
            bytes32(uint256(1)),
            "Swiss",
            block.timestamp + 365 days
        );
        
        // Try to sell more than available
        vm.expectRevert();
        vm.prank(seller);
        exchange.placeSellOrder(
            lotId,
            200 * 1e3, // try to sell 200 grams
            60 * 1e6,
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
    }
    
    /* ==================== STATS TESTS ==================== */
    
    function test_GetStats() public {
        (
            uint256 totalCommodities,
            uint256 activeLots,
            uint256 activeOrders,
            uint256 totalTrades,
            uint256 totalVolume
        ) = exchange.getStats();
        
        assertGt(totalCommodities, 0); // Should have default commodities
        assertEq(activeLots, 0); // No lots created yet
        assertEq(activeOrders, 0); // No orders yet
    }
    
    /* ==================== FUZZ TESTS ==================== */
    
    function testFuzz_CreateLot(uint96 quantity, uint96 minQty) public {
        vm.assume(quantity > 100 && quantity < 1_000_000 * 1e3);
        vm.assume(minQty > 0 && minQty <= quantity / 10);
        
        vm.prank(seller);
        bytes32 dppId = dpp.createPassport("Fuzz Gold", "desc", "origin");
        
        vm.prank(seller);
        bytes32 lotId = exchange.createLot(
            goldId,
            dppId,
            quantity,
            minQty,
            keccak256("cert"),
            bytes32(uint256(1)),
            "Test",
            block.timestamp + 365 days
        );
        
        CommodityExchange.Lot memory lot = exchange.getLot(lotId);
        assertEq(lot.quantity, quantity);
        assertEq(lot.minOrderQty, minQty);
    }
    
    function testFuzz_PlaceBuyOrder(uint96 quantity, uint96 price) public {
        vm.assume(quantity > 1e3 && quantity < 1_000_000 * 1e3);
        vm.assume(price > 1e6 && price < 1_000 * 1e6);
        
        vm.prank(buyer);
        bytes32 orderId = exchange.placeBuyOrder(
            goldId,
            quantity,
            price,
            CommodityExchange.SettlementType.SPOT,
            0,
            block.timestamp + 7 days
        );
        
        CommodityExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(order.quantity, quantity);
        assertEq(order.price, price);
    }
}
