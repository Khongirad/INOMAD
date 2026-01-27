// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBankLicenseRegistryView {
    function isLicensed(address bank) external view returns (bool);
}

contract AltanBankLedger {
    address public centralBank;
    IBankLicenseRegistryView public licenseRegistry;

    // accountId => asset => balance
    mapping(bytes32 => mapping(address => uint256)) public balanceOf;

    event CentralBankSet(address indexed cb);
    event LicenseRegistrySet(address indexed reg);

    event AccountCredited(bytes32 indexed accountId, address indexed asset, uint256 amount, bytes32 memo);
    event AccountDebited(bytes32 indexed accountId, address indexed asset, uint256 amount, bytes32 memo);
    event Transfer(bytes32 indexed fromId, bytes32 indexed toId, address indexed asset, uint256 amount, bytes32 memo);

    modifier onlyCentralBank() {
        require(msg.sender == centralBank, "NOT_CENTRAL_BANK");
        _;
    }

    modifier onlyLicensedBank() {
        require(address(licenseRegistry) != address(0), "REG_NOT_SET");
        require(licenseRegistry.isLicensed(msg.sender), "NOT_LICENSED_BANK");
        _;
    }

    constructor(address cb, address reg) {
        require(cb != address(0), "ZERO_CB");
        centralBank = cb;
        licenseRegistry = IBankLicenseRegistryView(reg);
        emit CentralBankSet(cb);
        emit LicenseRegistrySet(reg);
    }

    function setCentralBank(address cb) external onlyCentralBank {
        require(cb != address(0), "ZERO_ADDR");
        centralBank = cb;
        emit CentralBankSet(cb);
    }

    function setLicenseRegistry(address reg) external onlyCentralBank {
        require(reg != address(0), "ZERO_ADDR");
        licenseRegistry = IBankLicenseRegistryView(reg);
        emit LicenseRegistrySet(reg);
    }

    // ---- Monetary base ops (only Central Bank) ----

    function mint(bytes32 accountId, address asset, uint256 amount, bytes32 memo) external onlyCentralBank {
        balanceOf[accountId][asset] += amount;
        emit AccountCredited(accountId, asset, amount, memo);
    }

    function burn(bytes32 accountId, address asset, uint256 amount, bytes32 memo) external onlyCentralBank {
        uint256 b = balanceOf[accountId][asset];
        require(b >= amount, "INSUFFICIENT");
        unchecked { balanceOf[accountId][asset] = b - amount; }
        emit AccountDebited(accountId, asset, amount, memo);
    }

    // ---- Bank ops (licensed banks) ----

    function transferBetweenAccounts(
        bytes32 fromId,
        bytes32 toId,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external onlyLicensedBank {
        uint256 b = balanceOf[fromId][asset];
        require(b >= amount, "INSUFFICIENT");
        unchecked { balanceOf[fromId][asset] = b - amount; }
        balanceOf[toId][asset] += amount;

        emit Transfer(fromId, toId, asset, amount, memo);
    }
}
