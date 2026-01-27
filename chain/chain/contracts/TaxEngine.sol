// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAltanBankLedgerTaxOps {
    function transferBetweenAccounts(bytes32 fromId, bytes32 toId, address asset, uint256 amount, bytes32 memo) external;
}

contract TaxEngine {
    address public owner;
    IAltanBankLedgerTaxOps public ledger;

    // Tax = 10% = 1000 bps
    uint16 public constant TAX_BPS = 1000;

    // Split: 7% republic / 3% confederation (of original amount)
    uint16 public constant REPUBLIC_BPS = 700;
    uint16 public constant CONFED_BPS = 300;

    // Confederative Siberian budget account
    bytes32 public confederationAccountId;

    // Republic account mapping (by republic key)
    mapping(bytes32 => bytes32) public republicAccountIdOf; // republicKey => accountId

    // Allowed callers (system contracts/routers)
    mapping(address => bool) public isCollector;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event LedgerSet(address indexed ledger);
    event ConfederationSet(bytes32 indexed confederationAccountId);
    event RepublicSet(bytes32 indexed republicKey, bytes32 indexed republicAccountId);
    event CollectorSet(address indexed collector, bool ok);

    event TaxCollected(
        bytes32 indexed payerAccountId,
        bytes32 indexed republicKey,
        bytes32 indexed republicAccountId,
        bytes32 confederationAccountId,
        address asset,
        uint256 amount,
        uint256 republicTax,
        uint256 confedTax,
        bytes32 memo
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyCollector() {
        require(isCollector[msg.sender], "NOT_COLLECTOR");
        _;
    }

    constructor(address ledgerAddr, bytes32 confedAccountId) {
        owner = msg.sender;
        ledger = IAltanBankLedgerTaxOps(ledgerAddr);
        confederationAccountId = confedAccountId;
        emit LedgerSet(ledgerAddr);
        emit ConfederationSet(confedAccountId);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setLedger(address ledgerAddr) external onlyOwner {
        require(ledgerAddr != address(0), "ZERO_ADDR");
        ledger = IAltanBankLedgerTaxOps(ledgerAddr);
        emit LedgerSet(ledgerAddr);
    }

    function setCollector(address collector, bool ok) external onlyOwner {
        require(collector != address(0), "ZERO_ADDR");
        isCollector[collector] = ok;
        emit CollectorSet(collector, ok);
    }

    function setConfederationAccount(bytes32 confedAccountId) external onlyOwner {
        confederationAccountId = confedAccountId;
        emit ConfederationSet(confedAccountId);
    }

    function setRepublic(bytes32 republicKey, bytes32 republicAccountId) external onlyOwner {
        republicAccountIdOf[republicKey] = republicAccountId;
        emit RepublicSet(republicKey, republicAccountId);
    }

    function quoteTax(uint256 amount) public pure returns (uint256 republicTax, uint256 confedTax) {
        // 7% + 3% of original amount
        republicTax = (amount * REPUBLIC_BPS) / 10000;
        confedTax = (amount * CONFED_BPS) / 10000;
    }

    function collectTax(
        bytes32 payerAccountId,
        bytes32 republicKey,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external onlyCollector returns (uint256 republicTax, uint256 confedTax) {
        bytes32 repAcc = republicAccountIdOf[republicKey];
        require(repAcc != bytes32(0), "REPUBLIC_NOT_SET");
        require(confederationAccountId != bytes32(0), "CONFED_NOT_SET");

        (republicTax, confedTax) = quoteTax(amount);

        if (republicTax > 0) {
            ledger.transferBetweenAccounts(payerAccountId, repAcc, asset, republicTax, memo);
        }
        if (confedTax > 0) {
            ledger.transferBetweenAccounts(payerAccountId, confederationAccountId, asset, confedTax, memo);
        }

        emit TaxCollected(
            payerAccountId,
            republicKey,
            repAcc,
            confederationAccountId,
            asset,
            amount,
            republicTax,
            confedTax,
            memo
        );
    }
}
