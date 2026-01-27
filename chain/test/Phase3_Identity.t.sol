// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/CoreLaw.sol";
import "../contracts/NationRegistry.sol";
import "../contracts/CitizenRegistry.sol";
import "../contracts/SeatSBT.sol";
import "../contracts/AltanWalletRegistry.sol";
import "../contracts/ConstitutionAcceptanceRegistry.sol";
import "../contracts/AltanWallet.sol";

contract Phase3_IdentityTest is Test {
    CoreLaw public coreLaw;
    NationRegistry public nationRegistry;
    CitizenRegistry public citizenRegistry;
    SeatSBT public seatSbt;
    AltanWalletRegistry public walletRegistry;
    ConstitutionAcceptanceRegistry public acceptance;

    address public khural = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    bytes32 public constant CONST_HASH = keccak256("CONSTITUTION_V1");
    bytes32 public constant VERSION_HASH = keccak256("V1");

    // Nation IDs (must match initialization in NationRegistry)
    bytes32 public BURYAD_ID = keccak256(abi.encodePacked("NATION:", unicode"Буряад-Монголы"));

    function setUp() public {
        // 1. Deploy CoreLaw
        coreLaw = new CoreLaw();

        // 2. Deploy NationRegistry
        nationRegistry = new NationRegistry(khural);

        // 3. Deploy ConstitutionAcceptanceRegistry
        acceptance = new ConstitutionAcceptanceRegistry(CONST_HASH, VERSION_HASH);

        // 4. Deploy SeatSBT
        seatSbt = new SeatSBT();

        // 5. Deploy AltanWalletRegistry
        walletRegistry = new AltanWalletRegistry(address(seatSbt));

        // 6. Deploy CitizenRegistry
        citizenRegistry = new CitizenRegistry(
            address(acceptance),
            address(nationRegistry),
            address(coreLaw)
        );

        // 7. Wiring
        // CitizenRegistry needs to be issuer of SeatSBT
        seatSbt.setIssuer(address(citizenRegistry), true);
        
        // CitizenRegistry needs to own WalletRegistry (to call createWallet)
        walletRegistry.transferOwnership(address(citizenRegistry));
        
        // Configure CitizenRegistry
        citizenRegistry.setSeatSBT(address(seatSbt));
        citizenRegistry.setWalletRegistry(address(walletRegistry));
    }

    function test_IdentityFlow() public {
        vm.startPrank(alice);

        // 1. Accept Constitution
        acceptance.acceptDirect(0);

        // 2. Register Self
        uint256 seatId = citizenRegistry.registerSelf(
            BURYAD_ID,
            101, // Arbitrary Arban ID
            0, 0, 0, // Stats
            bytes32("ETHICS"),
            bytes32("PROOF")
        );

        vm.stopPrank();

        // Verifications
        assertEq(seatId, 1);
        
        // SeatSBT ownership
        assertEq(seatSbt.ownerOf(seatId), alice);
        assertEq(seatSbt.balanceOf(alice), 1);
        
        // CitizenRegistry state
        assertEq(citizenRegistry.seatOf(alice), seatId);
        assertEq(citizenRegistry.ownerOfSeat(seatId), alice);
        
        (bytes32 nid,,,,,, bool exists) = citizenRegistry.metaOf(seatId);
        assertEq(nid, BURYAD_ID);
        assertTrue(exists);

        // Wallet creation
        address walletAddr = walletRegistry.walletOf(seatId);
        assertTrue(walletAddr != address(0));
        
        // Wallet state
        AltanWallet wallet = AltanWallet(payable(walletAddr));
        assertEq(wallet.seatId(), seatId);
        assertEq(wallet.registry(), address(walletRegistry));
        assertFalse(wallet.unlocked()); // Should be locked by default
    }

    function test_RevertIfInvalidNation() public {
        vm.startPrank(alice);
        acceptance.acceptDirect(0);

        vm.expectRevert(CitizenRegistry.NationNotFound.selector);
        citizenRegistry.registerSelf(
            keccak256("FAKE_NATION"),
            101,
            0, 0, 0,
            bytes32("ETHICS"),
            bytes32("PROOF")
        );
        vm.stopPrank();
    }

    function test_RevertIfNoConstitution() public {
        vm.startPrank(alice);
        // Skip acceptance
        
        vm.expectRevert(CitizenRegistry.NotAcceptedConstitution.selector);
        citizenRegistry.registerSelf(
            BURYAD_ID,
            101,
            0, 0, 0,
            bytes32("ETHICS"),
            bytes32("PROOF")
        );
        vm.stopPrank();
    }

    function test_OneHumanOneSeat() public {
        vm.startPrank(alice);
        acceptance.acceptDirect(0);

        // Register once
        citizenRegistry.registerSelf(
            BURYAD_ID,
            101,
            0, 0, 0,
            bytes32("ETHICS"),
            bytes32("PROOF")
        );

        // Register again
        vm.expectRevert(CitizenRegistry.AlreadyHasSeat.selector);
        citizenRegistry.registerSelf(
            BURYAD_ID,
            101,
            0, 0, 0,
            bytes32("ETHICS"),
            bytes32("PROOF")
        );
        vm.stopPrank();
    }
}
