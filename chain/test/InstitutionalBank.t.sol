// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/InstitutionalBank.sol";
import "../contracts/Altan.sol";
import "../contracts/CoreLaw.sol";

/**
 * @title InstitutionalBankTest
 * @notice Tests for institutional banking (government, org, guild, temple)
 */
contract InstitutionalBankTest is Test {
    InstitutionalBank public bank;
    Altan public altan;
    CoreLaw public coreLaw;

    address public chairman = address(0x1);
    address public officer = address(0x2);
    address public treasurer = address(0x3);
    address public corrAccount = address(0x999);
    
    // Treasury addresses
    address public govTreasury = address(0x100);
    address public orgTreasury = address(0x101);
    address public guildTreasury = address(0x102);
    address public templeTreasury = address(0x103);

    uint256 constant INITIAL_SUPPLY = 100_000_000 * 1e6;

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

        // Deploy InstitutionalBank
        bank = new InstitutionalBank(
            address(altan),
            address(0xCB),
            chairman
        );

        // Grant roles
        vm.startPrank(chairman);
        bank.grantRole(bank.OFFICER_ROLE(), officer);
        bank.grantRole(bank.TREASURER_ROLE(), treasurer);
        bank.setCorrAccount(corrAccount);
        vm.stopPrank();

        // Mint ALTAN to corr account
        bytes32 cbRole = altan.CENTRAL_BANK_ROLE();
        altan.grantRole(cbRole, address(this));
        altan.mint(corrAccount, INITIAL_SUPPLY, "Initial supply");
        
        // Approve bank to spend from corrAccount
        vm.prank(corrAccount);
        altan.approve(address(bank), type(uint256).max);
    }

    // ============ ACCOUNT OPENING TESTS ============

    function test_OpenGovAccount() public {
        vm.prank(chairman);
        uint256 accId = bank.openGovAccount(
            govTreasury,
            1, // entityId
            bytes32("GOV_REG"),
            "State Treasury"
        );

        assertEq(accId, 1);
        
        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertEq(acc.treasury, govTreasury);
        assertTrue(acc.accType == InstitutionalBank.AccountType.GOVERNMENT);
        assertTrue(acc.requiresMultiSig);
    }

    function test_OpenOrgAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(
            orgTreasury,
            100, // orgId
            bytes32("ORG_REG"),
            "Corporation Ltd"
        );

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.accType == InstitutionalBank.AccountType.ORGANIZATION);
        assertFalse(acc.requiresMultiSig);
    }

    function test_OpenGuildAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openGuildAccount(
            guildTreasury,
            200, // guildId
            bytes32("GUILD_REG"),
            "Engineers Guild"
        );

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.accType == InstitutionalBank.AccountType.GUILD);
    }

    function test_OpenTempleAccount() public {
        vm.prank(chairman);
        uint256 accId = bank.openTempleAccount(
            templeTreasury,
            bytes32("TEMPLE_REG"),
            "Temple of Heaven"
        );

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.accType == InstitutionalBank.AccountType.TEMPLE);
        assertTrue(acc.requiresMultiSig);
    }

    function test_OpenSpecialAccount() public {
        address specialTreasury = address(0x200);
        uint256 customLimit = 2_000_000 * 1e6;
        
        vm.prank(chairman);
        uint256 accId = bank.openSpecialAccount(
            specialTreasury,
            300, // purposeId
            bytes32("SPECIAL_REG"),
            "Reserve Fund",
            customLimit,
            true // multiSig
        );

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.accType == InstitutionalBank.AccountType.SPECIAL);
        assertEq(acc.dailyLimit, customLimit);
    }

    // ============ FREEZE/UNFREEZE TESTS ============

    function test_FreezeAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        vm.prank(officer);
        bank.freezeAccount(accId, "Audit required");

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.status == InstitutionalBank.AccountStatus.FROZEN);
    }

    function test_UnfreezeAccount() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        vm.prank(officer);
        bank.freezeAccount(accId, "Test");

        vm.prank(chairman);
        bank.unfreezeAccount(accId);

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertTrue(acc.status == InstitutionalBank.AccountStatus.ACTIVE);
    }

    // ============ DISTRIBUTION TESTS ============

    function test_DistributeFromCorr() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        uint256 amount = 100_000 * 1e6;
        vm.prank(officer);
        bank.distributeFromCorr(accId, amount);

        assertEq(altan.balanceOf(orgTreasury), amount);
    }

    function test_DistributeToFrozenFails() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        vm.prank(officer);
        bank.freezeAccount(accId, "Frozen");

        vm.prank(officer);
        vm.expectRevert(InstitutionalBank.AccountNotActive.selector);
        bank.distributeFromCorr(accId, 1000 * 1e6);
    }

    // ============ TRANSFER TESTS ============

    function test_TransferByTreasuryRole() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        // Fund the account
        vm.prank(officer);
        bank.distributeFromCorr(accId, 100_000 * 1e6);

        // Treasury approves bank
        vm.prank(orgTreasury);
        altan.approve(address(bank), type(uint256).max);

        // Treasurer initiates transfer
        address recipient = address(0x500);
        vm.prank(treasurer);
        bank.transferFrom(accId, recipient, 10_000 * 1e6);

        assertEq(altan.balanceOf(recipient), 10_000 * 1e6);
    }

    // ============ LIMITS TESTS ============

    function test_DailyLimitExceeded() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        // Org daily limit is 1M
        uint256 overLimit = 1_100_000 * 1e6;
        
        vm.prank(officer);
        bank.distributeFromCorr(accId, overLimit);

        vm.prank(orgTreasury);
        altan.approve(address(bank), type(uint256).max);

        vm.prank(treasurer);
        vm.expectRevert(InstitutionalBank.DailyLimitExceeded.selector);
        bank.transferFrom(accId, address(0x500), overLimit);
    }

    function test_SetAccountLimit() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        uint256 newLimit = 5_000_000 * 1e6;
        vm.prank(chairman);
        bank.setAccountLimit(accId, newLimit);

        InstitutionalBank.InstitutionalAccount memory acc = bank.getAccount(accId);
        assertEq(acc.dailyLimit, newLimit);
    }

    // ============ STATS TESTS ============

    function test_GetStats() public {
        vm.startPrank(chairman);
        bank.openGovAccount(govTreasury, 1, bytes32("GOV"), "Gov");
        bank.openTempleAccount(templeTreasury, bytes32("TEMPLE"), "Temple");
        vm.stopPrank();

        vm.startPrank(officer);
        bank.openOrgAccount(orgTreasury, 100, bytes32("ORG"), "Org");
        bank.openGuildAccount(guildTreasury, 200, bytes32("GUILD"), "Guild");
        vm.stopPrank();

        (
            uint256 total,
            uint256 gov,
            uint256 org,
            uint256 guild,
            uint256 temple,
        ) = bank.getStats();

        assertEq(total, 4);
        assertEq(gov, 1);
        assertEq(org, 1);
        assertEq(guild, 1);
        assertEq(temple, 1);
    }

    function test_GetBalance() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        vm.prank(officer);
        bank.distributeFromCorr(accId, 50_000 * 1e6);

        uint256 bal = bank.getBalance(accId);
        assertEq(bal, 50_000 * 1e6);
    }

    // ============ ACCESS CONTROL TESTS ============

    function test_OnlyChairmanCanOpenGov() public {
        vm.prank(officer);
        vm.expectRevert();
        bank.openGovAccount(govTreasury, 1, bytes32("GOV"), "Gov");
    }

    function test_OnlyChairmanCanUnfreeze() public {
        vm.prank(officer);
        uint256 accId = bank.openOrgAccount(orgTreasury, 100, bytes32("REG"), "Org");

        vm.prank(officer);
        bank.freezeAccount(accId, "Frozen");

        vm.prank(officer);
        vm.expectRevert();
        bank.unfreezeAccount(accId);
    }
}
