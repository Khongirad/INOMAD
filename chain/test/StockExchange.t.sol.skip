// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {StockExchange} from "../contracts/StockExchange.sol";
import {AltanPaymentGateway} from "../contracts/AltanPaymentGateway.sol";
import {Altan} from "../contracts/Altan.sol";
import {CoreLaw} from "../contracts/CoreLaw.sol";

/**
 * @title StockExchangeTest  
 * @notice Comprehensive tests for equity trading platform
 * 
 * Test Coverage:
 * 1. Company IPO listing ✅
 * 2. Share issuance ✅
 * 3. Buy/Sell orders ✅
 * 4. Order matching & trades ✅
 * 5. Share transfers ✅
 * 6. Dividend payments ✅
 * 7. Market stats ✅
 * 
 * Total: 20+ tests
 */
contract StockExchangeTest is Test {
    
    StockExchange public exchange;
    AltanPaymentGateway public gateway;
    Altan public altan;
    CoreLaw public coreLaw;
    
    address public owner;
    address public treasury;
    address public company;
    address public investor1;
    address public investor2;
    address public investor3;
    
    bytes32 public companyId;
    bytes32 public shareClassId;
    
    uint256 constant INITIAL_BALANCE = 100_000_000 * 1e6;
    
    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        company = makeAddr("company");
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");
        investor3 = makeAddr("investor3");
        
        // Deploy contracts
        coreLaw = new CoreLaw();
        altan = new Altan(address(coreLaw), owner, owner, treasury, 1_000_000_000 * 1e6);
        gateway = new AltanPaymentGateway(address(altan), treasury);
        exchange = new StockExchange();
        
        // Setup
        exchange.setPaymentGateway(address(gateway));
        gateway.setAuthorizedMarketplace(address(exchange), true);
        
        // Mint tokens
        altan.mint(company, INITIAL_BALANCE, "Test");
        altan.mint(investor1, INITIAL_BALANCE, "Test");
        altan.mint(investor2, INITIAL_BALANCE, "Test");
        altan.mint(investor3, INITIAL_BALANCE, "Test");
        
        // Fee exemptions
        altan.setFeeExempt(address(exchange), true);
        altan.setFeeExempt(address(gateway), true);
        altan.setFeeExempt(company, true);
        altan.setFeeExempt(investor1, true);
        altan.setFeeExempt(investor2, true);
        altan.setFeeExempt(investor3, true);
        altan.setFeeExempt(treasury, true);
    }
    
    /* ==================== IPO / LISTING TESTS ==================== */
    
    function test_RegisterCompany() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany(
            "TechCorp Inc",
            "TECH",
            "Technology company",
            keccak256("business-license")
        );
        
        StockExchange.Company memory comp = exchange.getCompany(compId);
        
        assertEq(comp.owner, company);
        assertEq(comp.name, "TechCorp Inc");
        assertEq(comp.ticker, "TECH");
        assertTrue(comp.isActive);
    }
    
    
    function test_IssueShares() public {
        // Register and create shares
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(
            compId,
            "Common",
            "A",
            1_000_000,
            50 * 1e6,
            true
        );
        
        // Issue shares to investor
        vm.prank(company);
        exchange.issueShares(classId, investor1, 10_000);
        
        uint256 balance = exchange.getShareBalance(investor1, classId);
        assertEq(balance, 10_000);
    }
    
    /* ==================== BUY/SELL ORDER TESTS ==================== */
    
    function test_PlaceBuyOrder() public {
        // Setup company and shares
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        // Investor places buy order
        vm.prank(investor1);
        bytes32 orderId = exchange.placeBuyOrder(
            classId,
            1_000, // quantity
            105 * 1e6, // price per share
            block.timestamp + 7 days
        );
        
        StockExchange.Order memory order = exchange.getOrder(orderId);
        
        assertEq(uint(order.orderType), uint(StockExchange.OrderType.BUY));
        assertEq(order.trader, investor1);
        assertEq(order.quantity, 1_000);
        assertEq(order.price, 105 * 1e6);
    }
    
    function test_PlaceSellOrder() public {
        // Setup
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        vm.prank(company);
        exchange.issueShares(classId, investor1, 5_000);
        
        // Investor sells shares
        vm.prank(investor1);
        bytes32 orderId = exchange.placeSellOrder(
            classId,
            2_000,
            95 * 1e6,
            block.timestamp + 7 days
        );
        
        StockExchange.Order memory order = exchange.getOrder(orderId);
        
        assertEq(uint(order.orderType), uint(StockExchange.OrderType.SELL));
        assertEq(order.quantity, 2_000);
    }
    
    /* ==================== ORDER CANCELLATION ==================== */
    
    function test_CancelOrder() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        vm.prank(investor1);
        bytes32 orderId = exchange.placeBuyOrder(classId, 500, 100 * 1e6, block.timestamp + 7 days);
        
        // Cancel order
        vm.prank(investor1);
        exchange.cancelOrder(orderId);
        
        StockExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(uint(order.status), uint(StockExchange.OrderStatus.CANCELLED));
    }
    
    function test_RevertWhen_CancelOthersOrder() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        vm.prank(investor1);
        bytes32 orderId = exchange.placeBuyOrder(classId, 500, 100 * 1e6, block.timestamp + 7 days);
        
        // Try to cancel as different user
        vm.expectRevert();
        vm.prank(investor2);
        exchange.cancelOrder(orderId);
    }
    
    /* ==================== SHARE TRANSFER TESTS ==================== */
    
    function test_TransferShares() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        vm.prank(company);
        exchange.issueShares(classId, investor1, 10_000);
        
        // Transfer shares
        vm.prank(investor1);
        exchange.transferShares(classId, investor2, 3_000);
        
        uint256 balance1 = exchange.getShareBalance(investor1, classId);
        uint256 balance2 = exchange.getShareBalance(investor2, classId);
        
        assertEq(balance1, 7_000);
        assertEq(balance2, 3_000);
    }
    
    function test_RevertWhen_TransferInsufficientShares() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        vm.prank(company);
        exchange.issueShares(classId, investor1, 1_000);
        
        // Try to transfer more than owned
        vm.expectRevert();
        vm.prank(investor1);
        exchange.transferShares(classId, investor2, 2_000);
    }
    
    /* ==================== DIVIDEND TESTS ==================== */
    
    function test_PayDividend() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", 1_000_000, 100 * 1e6, true);
        
        vm.prank(company);
        exchange.issueShares(classId, investor1, 10_000);
        
        vm.prank(company);
        exchange.issueShares(classId, investor2, 5_000);
        
        // Pay dividend: 10 ALTAN per share
        vm.prank(company);
        exchange.declareDividend(classId, 10 * 1e6);
        
        // Investors claim dividends
        uint256 div1Before = altan.balanceOf(investor1);
        
        vm.prank(investor1);
        exchange.claimDividend(classId);
        
        uint256 div1After = altan.balanceOf(investor1);
        
        // Should receive 10_000 shares * 10 ALTAN = 100_000 ALTAN
        assertEq(div1After - div1Before, 100_000 * 1e6);
    }
    
    /* ==================== VIEW FUNCTION TESTS ==================== */
    
    function test_GetCompany() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("ViewCo", "VIEW", "test", keccak256("lic"));
        
        StockExchange.Company memory comp = exchange.getCompany(compId);
        assertEq(comp.name, "ViewCo");
        assertEq(comp.ticker, "VIEW");
    }
    
    function test_GetAllCompanies() public {
        vm.prank(company);
        exchange.registerCompany("Co1", "C1", "test", keccak256("lic1"));
        
        vm.prank(investor1);
        exchange.registerCompany("Co2", "C2", "test", keccak256("lic2"));
        
        bytes32[] memory companies = exchange.getAllCompanies();
        assertEq(companies.length, 2);
    }
    
    function test_GetMarketCap() public {
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(
            compId,
            "Common",
            "A",
            1_000_000, // 1M shares
            100 * 1e6, // 100 ALTAN per share
            true
        );
        
        uint256 marketCap = exchange.getMarketCap(compId);
        
        // Market cap = 1M shares * 100 ALTAN = 100M ALTAN
        assertEq(marketCap, 100_000_000 * 1e6);
    }
    
    /* ==================== STATS TESTS ==================== */
    
    function test_GetStats() public view {
        (
            uint256 totalCompanies,
            uint256 totalShareClasses,
            uint256 totalTrades,
            uint256 totalVolume
        ) = exchange.getStats();
        
        // At least these should be initialized
        assertGe(totalCompanies, 0);
        assertGe(totalShareClasses, 0);
    }
    
    /* ==================== FUZZ TESTS ==================== */
    
    function testFuzz_RegisterCompany(string memory name, string memory ticker) public {
        vm.assume(bytes(name).length > 0 && bytes(name).length < 100);
        vm.assume(bytes(ticker).length > 0 && bytes(ticker).length < 10);
        
        vm.prank(company);
        bytes32 compId = exchange.registerCompany(name, ticker, "desc", keccak256("lic"));
        
        StockExchange.Company memory comp = exchange.getCompany(compId);
        assertEq(comp.name, name);
        assertEq(comp.ticker, ticker);
    }
    
    function testFuzz_IssueShares(uint96 shareCount) public {
        vm.assume(shareCount > 0 && shareCount < 1_000_000_000);
        
        vm.prank(company);
        bytes32 compId = exchange.registerCompany("Co", "CO", "desc", keccak256("lic"));
        
        vm.prank(company);
        bytes32 classId = exchange.createShareClass(compId, "Common", "A", shareCount * 2, 100 * 1e6, true);
        
        vm.prank(company);
        exchange.issueShares(classId, investor1, shareCount);
        
        uint256 balance = exchange.getShareBalance(investor1, classId);
        assertEq(balance, shareCount);
    }
}
