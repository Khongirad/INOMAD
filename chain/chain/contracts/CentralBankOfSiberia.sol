// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBankLicenseRegistry {
    function issueLicense(address bank, bytes32 nameHash, bytes32 metaHash) external;
    function revokeLicense(address bank) external;
}

interface IAltanBankLedger {
    function mint(bytes32 accountId, address asset, uint256 amount, bytes32 memo) external;
    function burn(bytes32 accountId, address asset, uint256 amount, bytes32 memo) external;
    function setCentralBank(address cb) external;
}

contract CentralBankOfSiberia {
    address public owner;

    IBankLicenseRegistry public licenseRegistry;
    IAltanBankLedger public ledger;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event LicenseRegistrySet(address indexed reg);
    event LedgerSet(address indexed ledger);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setLicenseRegistry(address reg) external onlyOwner {
        require(reg != address(0), "ZERO_ADDR");
        licenseRegistry = IBankLicenseRegistry(reg);
        emit LicenseRegistrySet(reg);
    }

    function setLedger(address l) external onlyOwner {
        require(l != address(0), "ZERO_ADDR");
        ledger = IAltanBankLedger(l);
        emit LedgerSet(l);
    }

    // --- Monetary authority ---

    function mintToAccount(bytes32 accountId, address asset, uint256 amount, bytes32 memo) external onlyOwner {
        require(address(ledger) != address(0), "LEDGER_NOT_SET");
        ledger.mint(accountId, asset, amount, memo);
    }

    function burnFromAccount(bytes32 accountId, address asset, uint256 amount, bytes32 memo) external onlyOwner {
        require(address(ledger) != address(0), "LEDGER_NOT_SET");
        ledger.burn(accountId, asset, amount, memo);
    }

    // --- Licensing authority ---

    function issueBankLicense(address bank, bytes32 nameHash, bytes32 metaHash) external onlyOwner {
        require(address(licenseRegistry) != address(0), "REG_NOT_SET");
        licenseRegistry.issueLicense(bank, nameHash, metaHash);
    }

    function revokeBankLicense(address bank) external onlyOwner {
        require(address(licenseRegistry) != address(0), "REG_NOT_SET");
        licenseRegistry.revokeLicense(bank);
    }
}
