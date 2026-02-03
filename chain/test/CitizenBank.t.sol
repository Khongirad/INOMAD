// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/CitizenBank.sol";
import "../contracts/Altan.sol";
import "../contracts/CoreLaw.sol";

/**
 * @title CitizenBankTest
 * @notice Tests for CitizenBank retail banking functionality
 */
contract CitizenBankTest is Test {
    CitizenBank public bank;
    Altan public altan;
    CoreLaw public coreLaw;

    address public chairman = address(0x1);
    address public officer = address(0x2);
    address public verifier = address(0x3);
    address public citizen1 = address(0x100);
    address public citizen2 = address(0x101);
    address public distributionPool = address(0x999);

    uint256 constant INITIAL_SUPPLY = 1_000_000_000 * 1e6;

    function setUp() public {
        // Deploy CoreLaw
        coreLaw = new CoreLaw();

        // Deploy Altan
        altan = new Altan(
            address(coreLaw),
            address(this),     // khural
            address(0xDEAD),   // coreLedger
            address(0x888),    // treasury
            10_000_000_000_000 * 1e6
        );

        // Deploy CitizenBank (constructor: altan, centralBank, chairman)
        bank = new CitizenBank(
            address(altan),
            address(0xCB),      // centralBank placeholder
            chairman
        );

        // Grant roles
        vm.startPrank(chairman);
        bank.grantRole(bank.OFFICER_ROLE(), officer);
        bank.grantRole(bank.VERIFIER_ROLE(), verifier);
        bank.setDistributionPool(distributionPool);
        vm.stopPrank();

        // Mint ALTAN to distribution pool
        bytes32 cbRole = altan.CENTRAL_BANK_ROLE();
        altan.grantRole(cbRole, address(this));
        vm.prank(address(this));
        altan.mint(distributionPool, INITIAL_SUPPLY, "Initial supply for tests");
        
        // Approve bank to spend from distributionPool
        vm.prank(distributionPool);
        altan.approve(address(bank), type(uint256).max);
    }

    function test_OpenCitizenAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openAccount(
            citizen1,
            123,  // seatId
            bytes32("KYC_HASH"),
            "Citizen One"
        );

        assertEq(accId, 1);
        
        CitizenBank.CitizenAccount memory acc = bank.getAccount(accId);
        assertEq(acc.wallet, citizen1);
        assertEq(acc.seatId, 123);
        assertTrue(acc.status == CitizenBank.AccountStatus.ACTIVE);
    }

    function test_UnlockAccount_1ofN() public {
        // Open account
        vm.prank(officer);
        uint256 accId = bank.openAccount(citizen1, 123, bytes32("KYC"), "Citizen");

        // Account starts locked (isUnlocked = false)
        CitizenBank.CitizenAccount memory accBefore = bank.getAccount(accId);
        assertFalse(accBefore.isUnlocked);

        // Unlock with single verifier (1-of-N)
        vm.prank(verifier);
        bank.unlockAccount(accId);

        CitizenBank.CitizenAccount memory accAfter = bank.getAccount(accId);
        assertTrue(accAfter.isUnlocked);
    }

    function test_TierDistribution() public {
        // Setup account
        vm.prank(officer);
        uint256 accId = bank.openAccount(citizen1, 123, bytes32("KYC"), "Citizen");
        vm.prank(verifier);
        bank.unlockAccount(accId);

        // Distribute Tier 1 (takes seatId, accountId)
        vm.prank(officer);
        bank.distributeTier1(123, accId);

        uint256 tier1Amount = bank.tier1Amount();
        assertEq(altan.balanceOf(citizen1), tier1Amount);
    }

    function test_FreezeAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openAccount(citizen1, 123, bytes32("KYC"), "Citizen");

        // Freeze
        vm.prank(officer);
        bank.freezeAccount(accId, "Court order");

        CitizenBank.CitizenAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.status == CitizenBank.AccountStatus.FROZEN);
    }

    function test_UnfreezeAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openAccount(citizen1, 123, bytes32("KYC"), "Citizen");

        vm.prank(officer);
        bank.freezeAccount(accId, "Test");

        vm.prank(chairman);
        bank.unfreezeAccount(accId);

        CitizenBank.CitizenAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.status == CitizenBank.AccountStatus.ACTIVE);
    }

    function test_Transfer() public {
        // Setup two accounts
        vm.startPrank(officer);
        uint256 acc1 = bank.openAccount(citizen1, 1, bytes32("KYC1"), "C1");
        uint256 acc2 = bank.openAccount(citizen2, 2, bytes32("KYC2"), "C2");
        vm.stopPrank();

        vm.prank(verifier);
        bank.unlockAccount(acc1);
        vm.prank(verifier);
        bank.unlockAccount(acc2);

        // Give citizen1 some ALTAN
        vm.prank(address(this));
        altan.mint(citizen1, 10000 * 1e6, "Test funds");

        // Approve bank to transfer
        vm.prank(citizen1);
        altan.approve(address(bank), type(uint256).max);

        // Transfer
        vm.prank(citizen1);
        bank.transfer(acc1, acc2, 1000 * 1e6);

        assertEq(altan.balanceOf(citizen2), 1000 * 1e6);
    }
}
