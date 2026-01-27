// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILedgerMove {
    function transferBetweenAccounts(
        bytes32 fromId,
        bytes32 toId,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external;
}

interface IBankLicenseRegistryView {
    function isLicensed(address bank) external view returns (bool);
}

contract TaxAuthority {
    uint16 public constant TAX_BPS = 1000;      // 10%
    uint16 public constant REPUBLIC_BPS = 700;  // 7%
    uint16 public constant CONFED_BPS = 300;    // 3%

    address public owner;
    ILedgerMove public ledger;
    IBankLicenseRegistryView public licenseRegistry;

    bytes32 public confederationBudgetAccountId;
    mapping(bytes32 => bytes32) public republicBudgetAccountIdOf;

    struct Record {
        uint256 declaredProfit;
        uint256 taxDue;
        uint256 taxPaid;
        uint64 declaredAt;
        uint64 lastPaidAt;
    }

    mapping(uint32 => mapping(bytes32 => Record)) public recordOf;

    event Declared(
        uint32 indexed year,
        bytes32 indexed taxpayerAccountId,
        bytes32 indexed republicKey,
        uint256 profit,
        uint256 taxDue
    );

    event TaxPaid(
        uint32 indexed year,
        bytes32 indexed taxpayerAccountId,
        bytes32 indexed republicKey,
        uint256 amount,
        uint256 repPart,
        uint256 confPart,
        uint256 totalPaid
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyLicensedBank() {
        require(licenseRegistry.isLicensed(msg.sender), "NOT_LICENSED_BANK");
        _;
    }

    constructor(
        address ledgerAddr,
        address licenseRegAddr,
        bytes32 confedBudgetAccountId
    ) {
        owner = msg.sender;
        ledger = ILedgerMove(ledgerAddr);
        licenseRegistry = IBankLicenseRegistryView(licenseRegAddr);
        confederationBudgetAccountId = confedBudgetAccountId;
    }

    function setRepublic(bytes32 republicKey, bytes32 budgetAccountId) external onlyOwner {
        republicBudgetAccountIdOf[republicKey] = budgetAccountId;
    }

    function declareProfit(
        uint32 year,
        bytes32 taxpayerAccountId,
        bytes32 republicKey,
        uint256 profit
    ) external {
        require(profit > 0, "ZERO_PROFIT");
        require(republicBudgetAccountIdOf[republicKey] != bytes32(0), "REPUBLIC_NOT_SET");

        Record storage r = recordOf[year][taxpayerAccountId];
        r.declaredProfit = profit;
        r.taxDue = (profit * TAX_BPS) / 10000;
        r.declaredAt = uint64(block.timestamp);

        emit Declared(year, taxpayerAccountId, republicKey, profit, r.taxDue);
    }

    function payTax(
        uint32 year,
        bytes32 taxpayerAccountId,
        bytes32 republicKey,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external onlyLicensedBank {
        Record storage r = recordOf[year][taxpayerAccountId];
        require(r.taxDue > 0, "NO_DECLARATION");
        require(r.taxPaid < r.taxDue, "ALREADY_PAID");

        uint256 remaining = r.taxDue - r.taxPaid;
        uint256 payAmount = amount > remaining ? remaining : amount;

        uint256 repPart = (payAmount * REPUBLIC_BPS) / 10000;
        uint256 confPart = (payAmount * CONFED_BPS) / 10000;

        bytes32 repBudget = republicBudgetAccountIdOf[republicKey];

        ledger.transferBetweenAccounts(taxpayerAccountId, repBudget, asset, repPart, memo);
        ledger.transferBetweenAccounts(taxpayerAccountId, confederationBudgetAccountId, asset, confPart, memo);

        r.taxPaid += payAmount;
        r.lastPaidAt = uint64(block.timestamp);

        emit TaxPaid(year, taxpayerAccountId, republicKey, payAmount, repPart, confPart, r.taxPaid);
    }

    function isCompliant(uint32 year, bytes32 taxpayerAccountId) external view returns (bool) {
        Record memory r = recordOf[year][taxpayerAccountId];
        return r.taxDue > 0 && r.taxPaid >= r.taxDue;
    }
}
