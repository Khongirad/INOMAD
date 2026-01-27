// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BankLicenseRegistry {
    address public centralBank;

    struct License {
        bool active;
        bytes32 nameHash;
        bytes32 metaHash;
        uint64 issuedAt;
    }

    mapping(address => License) public licenseOf;

    event CentralBankSet(address indexed cb);
    event LicenseIssued(address indexed bank, bytes32 nameHash, bytes32 metaHash);
    event LicenseRevoked(address indexed bank);

    modifier onlyCentralBank() {
        require(msg.sender == centralBank, "NOT_CENTRAL_BANK");
        _;
    }

    constructor(address cb) {
        require(cb != address(0), "ZERO_ADDR");
        centralBank = cb;
        emit CentralBankSet(cb);
    }

    function setCentralBank(address cb) external onlyCentralBank {
        require(cb != address(0), "ZERO_ADDR");
        centralBank = cb;
        emit CentralBankSet(cb);
    }

    function issueLicense(address bank, bytes32 nameHash, bytes32 metaHash) external onlyCentralBank {
        require(bank != address(0), "ZERO_ADDR");
        licenseOf[bank] = License({
            active: true,
            nameHash: nameHash,
            metaHash: metaHash,
            issuedAt: uint64(block.timestamp)
        });
        emit LicenseIssued(bank, nameHash, metaHash);
    }

    function revokeLicense(address bank) external onlyCentralBank {
        require(bank != address(0), "ZERO_ADDR");
        licenseOf[bank].active = false;
        emit LicenseRevoked(bank);
    }

    function isLicensed(address bank) external view returns (bool) {
        return licenseOf[bank].active;
    }
}
