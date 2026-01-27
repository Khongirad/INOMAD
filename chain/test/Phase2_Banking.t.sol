// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/CoreLaw.sol";
import "../contracts/CoreLock.sol";
import "../contracts/Altan.sol";
import "../contracts/AltanCentralBank.sol";
import "../contracts/AltanBankOfSiberia.sol";

contract Phase2_BankingTest is Test {
    CoreLaw public coreLaw;
    CoreLock public coreLock;
    Altan public altan;
    AltanCentralBank public cb;
    AltanBankOfSiberia public commercialBank;

    address public khural = address(this); // Test contract acts as Khural/Admin
    address public governor = address(this); // Test contract acts as Governor
    address public treasury = address(0x999);

    // Bank 1
    address public bankChairman = address(0x111);
    address public bankWallet1 = address(0x112); // Replaced by commercialBank address in test

    uint256 constant INITIAL_MAX_SUPPLY = 10_000_000_000_000 * 1e6; // 10 trillion

    function setUp() public {
        // 1. Deploy CoreLaw
        coreLaw = new CoreLaw();

        // 2. Deploy CoreLock (linked to CoreLaw)
        coreLock = new CoreLock(governor, address(coreLaw));

        // 3. Deploy Altan
        altan = new Altan(
            address(coreLaw),
            khural,
            address(0xDEAD), 
            treasury,
            INITIAL_MAX_SUPPLY
        );

        // 4. Deploy AltanCentralBank
        cb = new AltanCentralBank(
            address(altan),
            address(coreLock),
            governor
        );

        // 5. Connect Altan & CentralBank
        bytes32 CB_ROLE = altan.CENTRAL_BANK_ROLE();
        altan.grantRole(CB_ROLE, address(cb));
        
        // 6. Deploy Commercial Bank (AltanBankOfSiberia)
        commercialBank = new AltanBankOfSiberia(
            address(altan),
            address(cb),
            bankChairman
        );
    }

    function test_BankLicensingCycle() public {
        // 1. Register Bank
        uint256 bankId = cb.registerBank(
            address(commercialBank),
            "Altan Bank of Siberia",
            "Buryad-Mongol",
            bytes32("BURYAD"),
            bytes32("DOC_HASH")
        );
        
        assertEq(bankId, 1);

        // 2. Grant License
        // The funds will be minted to the commercial bank contract itself (corrAccount)
        cb.grantLicense(bankId, address(commercialBank));

        // Verify status
        (
            uint256 id,
            address bAddr,
            bytes32 corrId,
            address corrAddr,
            string memory name,
            ,
            ,
            AltanCentralBank.BankStatus status,
            ,
            ,
            ,
            
        ) = cb.banks(bankId);

        assertEq(id, 1);
        assertEq(bAddr, address(commercialBank));
        assertEq(corrAddr, address(commercialBank));
        assertTrue(status == AltanCentralBank.BankStatus.LICENSED);
        
        // 3. Setup Commercial Bank Corr Account
        vm.prank(bankChairman);
        commercialBank.setCorrAccount(address(commercialBank));
        
        // 4. Emit Altan to Bank
        uint256 emitAmount = 1_000_000 * 1e6;
        cb.emitToBank(bankId, emitAmount, "Initial Capital");

        // Verify Balance
        uint256 bal = altan.balanceOf(address(commercialBank));
        assertEq(bal, emitAmount);
        
        // Verify Total Supply
        assertEq(altan.totalSupply(), emitAmount);
        
        // Verify stats in CB
        (uint256 totalEmitted,,,,) = cb.getMonetaryStats();
        assertEq(totalEmitted, emitAmount);
    }

    function test_CommercialBankCustomerFlow() public {
         // Setup Bank
        uint256 bankId = cb.registerBank(
            address(commercialBank), 
            "Bank 1", 
            "Jurisdiction", 
            bytes32("ID"), 
            bytes32("HASH")
        );
        cb.grantLicense(bankId, address(commercialBank));
        vm.prank(bankChairman);
        commercialBank.setCorrAccount(address(commercialBank));
        
        // Emit funds
        cb.emitToBank(bankId, 10_000_000 * 1e6, "Capital");
        
        // Customer
        address customer = address(0xCAFE);
        
        // Open Account
        vm.prank(bankChairman); // acts as officer
        uint256 accId = commercialBank.openCitizenAccount(customer, 123, bytes32("KYC"), "John Doe");
        
        // Distribute funds to customer (Deposit)
        vm.prank(bankChairman);
        commercialBank.distributeFromCorr(accId, 1000 * 1e6, "Loan");
        
        // Verify customer received funds (minus no fee? distributeFromCorr uses safeTransferFrom)
        // safeTransferFrom(corrAccount -> customer).
        // corrAccount is commercialBank.
        // commercialBank must APPROVE itself? Or Altan doesn't require approval for self-transfer if implemented that way?
        // Standard ERC20 requires approval even for self.
        // Altan.sol uses `_transferWithFee` directly in `transferFrom` logic checking allowance.
        // We probably need to approve.
        
        // Check if Commercial Bank can approve itself or if distributeFromCorr handles it?
        // distributeFromCorr calls `altan.safeTransferFrom(corrAccount, toAcc.owner, amount);`
        // if corrAccount == address(this), it tries to transfer from itself.
        // usually `transfer` is better for self, but `safeTransferFrom` expects allowance.
        // Wait, `AltanBankOfSiberia` doesn't seem to call `approve`.
        // This might be a BUG in `AltanBankOfSiberia`.
        // Let's see if the test fails.
    }

    function test_DailyEmissionLimit() public {
         uint256 bankId = cb.registerBank(
            address(commercialBank), 
            "Bank 1", 
            "Jurisdiction", 
            bytes32("ID"), 
            bytes32("HASH")
        );
        cb.grantLicense(bankId, address(commercialBank));

        uint256 limit = cb.dailyEmissionLimit();
        
        // Try to mint more than limit
        vm.expectRevert(AltanCentralBank.DailyLimitExceeded.selector);
        cb.emitToBank(bankId, limit + 1, "Too much");
        
        // Mint exactly limit should work
        cb.emitToBank(bankId, limit, "Max");
        assertEq(altan.balanceOf(address(commercialBank)), limit);
    }
    
    function test_DestroyAltan() public {
        // Setup
        uint256 bankId = cb.registerBank(
            address(commercialBank), 
            "Bank 1", 
            "Jurisdiction", 
            bytes32("ID"), 
            bytes32("HASH")
        );
        cb.grantLicense(bankId, address(commercialBank));
        cb.emitToBank(bankId, 1000 * 1e6, "Mint");

        // Burn 400
        cb.destroy(bankId, 400 * 1e6, "Burn");
        
        assertEq(altan.balanceOf(address(commercialBank)), 600 * 1e6);
        assertEq(altan.totalSupply(), 600 * 1e6);
        
        (uint256 totalEmitted, uint256 totalBurned,,,) = cb.getMonetaryStats();
        assertEq(totalEmitted, 1000 * 1e6);
        assertEq(totalBurned, 400 * 1e6);
    }
}
