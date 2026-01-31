// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/FounderBootstrap.sol";
import "../contracts/CitizenRegistry.sol";
import "../contracts/CoreLaw.sol";
import "../contracts/SeatSBT.sol";
import "../contracts/NationRegistry.sol";
import "../contracts/ConstitutionAcceptanceRegistry.sol";
import "../contracts/AltanWalletRegistry.sol";

/**
 * @title FounderBootstrapTest
 * @notice Comprehensive tests for renewable epoch-based founder verification
 */
contract FounderBootstrapTest is Test {
    FounderBootstrap public bootstrap;
    CitizenRegistry public citizenRegistry;
    CoreLaw public coreLaw;
    SeatSBT public seatSbt;
    NationRegistry public nationRegistry;
    ConstitutionAcceptanceRegistry public acceptance;
    AltanWalletRegistry public walletRegistry;
    
    address public khural = address(this);
    address public founder = address(0x1);
    address public citizen1 = address(0x2);
    address public citizen2 = address(0x3);
    
    bytes32 public constant CONST_HASH = keccak256("CONSTITUTION_V1");
    bytes32 public constant VERSION_HASH = keccak256("V1");
    bytes32 public NATION_ID = keccak256(abi.encodePacked("NATION:", unicode"Буряад-Монголы"));
    uint32 public constant ARBAN_ID = 101;
    bytes32 public constant ETHICS_HASH = keccak256("ETHICS");
    
    function setUp() public {
        // Deploy CoreLaw
        coreLaw = new CoreLaw();
        
        // Deploy NationRegistry
        nationRegistry = new NationRegistry(khural);
        
        // Deploy ConstitutionAcceptanceRegistry
        acceptance = new ConstitutionAcceptanceRegistry(CONST_HASH, VERSION_HASH);
        
        // Deploy SeatSBT
        seatSbt = new SeatSBT();
        
        // Deploy CitizenRegistry
        citizenRegistry = new CitizenRegistry(
            address(acceptance),
            address(nationRegistry),
            address(coreLaw)
        );
        
        // Wiring
        seatSbt.setIssuer(address(citizenRegistry), true);
        citizenRegistry.setSeatSBT(address(seatSbt));
        
        // Deploy bootstrap
        bootstrap = new FounderBootstrap(address(citizenRegistry), address(coreLaw));
        
        // Grant bootstrap contract permission to mint seats
        seatSbt.setIssuer(address(bootstrap), true);
        
        // Transfer CitizenRegistry ownership to bootstrap so it can call registerByOwner
        citizenRegistry.transferOwnership(address(bootstrap));
        
        // Create and configure WalletRegistry
        walletRegistry = new AltanWalletRegistry(address(seatSbt));
        
        // IMPORTANT: Transfer walletRegistry ownership to citizenRegistry (not bootstrap)
        // because citizenRegistry.registerByOwner() calls walletRegistry.createWallet()
        walletRegistry.transferOwnership(address(citizenRegistry));
        
        // Set wallet registry in CitizenRegistry (bootstrap owns citizenRegistry)
        vm.prank(address(bootstrap));
        citizenRegistry.setWalletRegistry(address(walletRegistry));
    }
    
    /* ==================== BOOTSTRAP TESTS ==================== */
    
    function test_BootstrapFounder() public {
        // Founder must accept constitution first
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        uint256 seatId = bootstrap.bootstrapFounder(
            founder,
            NATION_ID,
            ARBAN_ID,
            ETHICS_HASH
        );
        
        assertEq(seatId, 1, "Founder should be seat #1");
        assertEq(bootstrap.founder(), founder, "Founder address mismatch");
        assertTrue(bootstrap.bootstrapped(), "Should be bootstrapped");
        assertTrue(bootstrap.isBootstrapActive(), "Bootstrap should be active");
    }
    
    function test_RevertWhen_BootstrapTwice() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        vm.expectRevert();
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH); // Should fail
    }
    
    /* ==================== SINGLE EPOCH TESTS ==================== */
    
    function test_VerifyInEpoch0() public {
        // Bootstrap founder
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        // Citizen must accept constitution before verification
        vm.prank(citizen1);
        acceptance.acceptDirect(0);
        
        // Founder verifies citizen
        vm.prank(founder);
        uint256 seatId = bootstrap.verifyNewCitizen(
            citizen1,
            NATION_ID,
            ARBAN_ID,
            ETHICS_HASH
        );
        
        assertEq(seatId, 2, "First verified citizen should be seat #2");
        assertEq(bootstrap.getCurrentEpoch(), 0, "Should be epoch 0");
        assertEq(bootstrap.getCurrentEpochVerifications(), 1, "Should have 1 verification");
        assertEq(bootstrap.getTotalVerified(), 1, "Total verified should be 1");
        assertTrue(bootstrap.wasVerifiedByFounder(seatId), "Should be verified by founder");
    }
    
    function test_RemainingVerifications() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        assertEq(bootstrap.getRemainingVerifications(), 100, "Should have 100 remaining");
        
        // Citizen must accept constitution
        vm.prank(citizen1);
        acceptance.acceptDirect(0);
        
        // Verify one citizen
        vm.prank(founder);
        bootstrap.verifyNewCitizen(citizen1, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        assertEq(bootstrap.getRemainingVerifications(), 99, "Should have 99 remaining");
    }
    
    function test_Verify10InEpoch0() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        // Each citizen must accept constitution, then verify
        for (uint160 i = 0; i < 10; i++) {
            address citizen = address(uint160(0x1000) + i);
            vm.prank(citizen);
            acceptance.acceptDirect(0);
        }
        
        // Verify 10 citizens
        vm.startPrank(founder);
        for (uint160 i = 0; i < 10; i++) {
            address citizen = address(uint160(0x1000) + i);
            bootstrap.verifyNewCitizen(citizen, NATION_ID, ARBAN_ID, ETHICS_HASH);
        }
        vm.stopPrank();
        
        assertEq(bootstrap.getCurrentEpochVerifications(), 10, "Should have 10 verifications");
        assertEq(bootstrap.getTotalVerified(), 10, "Total should be 10");
        assertEq(bootstrap.getRemainingVerifications(), 90, "Should have 90 remaining");
    }
    
    /* ==================== EPOCH TRANSITION TESTS ==================== */
    
    function test_EpochTransition() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        assertEq(bootstrap.getCurrentEpoch(), 0, "Should start in epoch 0");
        
        // Fast forward 1 day (EPOCH_DURATION = 1 days in contract)
        vm.warp(block.timestamp + 1 days);
        
        assertEq(bootstrap.getCurrentEpoch(), 1, "Should be epoch 1 after 1 day");
    }
    
    function test_Verify10InMultipleEpochs() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        // All citizens must accept constitution first
        for (uint160 i = 0; i < 10; i++) {
            address citizen = address(uint160(0x1000) + i);
            vm.prank(citizen);
            acceptance.acceptDirect(0);
        }
        for (uint160 i = 0; i < 10; i++) {
            address citizen = address(uint160(0x2000) + i);
            vm.prank(citizen);
            acceptance.acceptDirect(0);
        }
        
        // Epoch 0: Verify 10 citizens
        vm.startPrank(founder);
        for (uint160 i = 0; i < 10; i++) {
            address citizen = address(uint160(0x1000) + i);
            bootstrap.verifyNewCitizen(citizen, NATION_ID, ARBAN_ID, ETHICS_HASH);
        }
        vm.stopPrank();
        
        assertEq(bootstrap.getCurrentEpochVerifications(), 10, "Epoch 0 should have 10");
        assertEq(bootstrap.getTotalVerified(), 10, "Total should be 10");
        
        // Move to epoch 1 (1 day = EPOCH_DURATION)
        vm.warp(block.timestamp + 1 days);
        assertEq(bootstrap.getCurrentEpoch(), 1, "Should be epoch 1");
        assertEq(bootstrap.getCurrentEpochVerifications(), 0, "Epoch 1 should start at 0");
        assertEq(bootstrap.getRemainingVerifications(), 100, "Should have 100 remaining in epoch 1");
        
        // Epoch 1: Verify 10 MORE citizens
        vm.startPrank(founder);
        for (uint160 i = 0; i < 10; i++) {
            address citizen = address(uint160(0x2000) + i);
            bootstrap.verifyNewCitizen(citizen, NATION_ID, ARBAN_ID, ETHICS_HASH);
        }
        vm.stopPrank();
        
        assertEq(bootstrap.getCurrentEpochVerifications(), 10, "Epoch 1 should have 10");
        assertEq(bootstrap.getTotalVerified(), 20, "Total should be 20");
    }
    
    function test_MultipleEpochTransitions() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        // Pre-accept constitution for all citizens across 3 epochs
        for (uint256 epoch = 0; epoch < 3; epoch++) {
            for (uint160 i = 0; i < 5; i++) {
                address citizen = address(uint160(0x1000 * (epoch + 1)) + i);
                vm.prank(citizen);
                acceptance.acceptDirect(0);
            }
        }
        
        // Verify across 3 epochs
        for (uint256 epoch = 0; epoch < 3; epoch++) {
            assertEq(bootstrap.getCurrentEpoch(), epoch, "Epoch mismatch");
            
            // Verify 5 citizens in this epoch
            vm.startPrank(founder);
            for (uint160 i = 0; i < 5; i++) {
                address citizen = address(uint160(0x1000 * (epoch + 1)) + i);
                bootstrap.verifyNewCitizen(citizen, NATION_ID, ARBAN_ID, ETHICS_HASH);
            }
            vm.stopPrank();
            
            assertEq(bootstrap.getCurrentEpochVerifications(), 5, "Should have 5 in epoch");
            assertEq(bootstrap.getTotalVerified(), (epoch + 1) * 5, "Total mismatch");
            
            // Move to next epoch only if not the last iteration
            if (epoch < 2) {
                vm.warp(block.timestamp + 1 days);
            }
        }
    }
    
    /* ==================== EPOCH STATS TESTS ==================== */
    
    function test_GetEpochStats() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        uint64 bootstrapTime = uint64(block.timestamp);
        
        (uint256 verified, uint256 startTime, uint256 endTime, bool isActive) = 
            bootstrap.getEpochStats(0);
        
        assertEq(verified, 0, "Epoch 0 should have 0 verified");
        assertEq(startTime, bootstrapTime, "Start time should match bootstrap");
        assertEq(endTime, bootstrapTime + 1 days, "End time should be +1 day");
        assertTrue(isActive, "Epoch 0 should be active");
    }
    
    function test_TimeRemainingInEpoch() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        uint256 timeRemaining = bootstrap.getTimeRemainingInEpoch();
        assertEq(timeRemaining, 1 days, "Should have 1 day remaining");
        
        // Fast forward 12 hours
        vm.warp(block.timestamp + 12 hours);
        timeRemaining = bootstrap.getTimeRemainingInEpoch();
        assertEq(timeRemaining, 12 hours, "Should have 12 hours remaining");
    }
    
    /* ==================== SECURITY TESTS ==================== */
    
    function test_RevertWhen_NonFounderCannotVerify() public {
        vm.prank(founder);
        acceptance.acceptDirect(0);
        
        bootstrap.bootstrapFounder(founder, NATION_ID, ARBAN_ID, ETHICS_HASH);
        
        // Non-founder tries to verify
        vm.expectRevert();
        vm.prank(citizen1);
        bootstrap.verifyNewCitizen(citizen2, NATION_ID, ARBAN_ID, ETHICS_HASH);
        // Should fail
    }
    
    function test_RevertWhen_VerifyBeforeBootstrap() public {
        vm.expectRevert();
        vm.prank(founder);
        bootstrap.verifyNewCitizen(citizen1, NATION_ID, ARBAN_ID, ETHICS_HASH);
        // Should fail - not bootstrapped
    }
}
