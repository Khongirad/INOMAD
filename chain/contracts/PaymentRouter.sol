// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILedger {
    function transferBetweenAccounts(bytes32 fromId, bytes32 toId, address asset, uint256 amount, bytes32 memo) external;
}

interface IFeeEngine {
    function collectFee(bytes32 payerAccountId, address asset, uint256 amount, bytes32 memo) external returns (uint256 fee);
    function quoteFee(uint256 amount) external pure returns (uint256);
}

interface ITaxEngine {
    function collectTax(bytes32 payerAccountId, bytes32 republicKey, address asset, uint256 amount, bytes32 memo)
        external
        returns (uint256 republicTax, uint256 confedTax);
    function quoteTax(uint256 amount) external pure returns (uint256 republicTax, uint256 confedTax);
}

contract PaymentRouter {
    address public owner;
    ILedger public ledger;
    IFeeEngine public feeEngine;
    ITaxEngine public taxEngine;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event Wired(address indexed ledger, address indexed feeEngine, address indexed taxEngine);

    event Routed(
        bytes32 indexed payer,
        bytes32 indexed payee,
        bytes32 indexed republicKey,
        address asset,
        uint256 amount,
        uint256 fee,
        uint256 republicTax,
        uint256 confedTax,
        uint256 netAmount,
        bytes32 memo
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address ledgerAddr, address feeAddr, address taxAddr) {
        owner = msg.sender;
        ledger = ILedger(ledgerAddr);
        feeEngine = IFeeEngine(feeAddr);
        taxEngine = ITaxEngine(taxAddr);
        emit Wired(ledgerAddr, feeAddr, taxAddr);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // Main payment: fee(0.03%) + tax(10% split 7/3) + transfer net to payee
    function pay(
        bytes32 payerAccountId,
        bytes32 payeeAccountId,
        bytes32 republicKey,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external returns (uint256 netAmount) {
        // Collect fee + tax from payer
        uint256 fee = feeEngine.collectFee(payerAccountId, asset, amount, memo);
        (uint256 repTax, uint256 confTax) = taxEngine.collectTax(payerAccountId, republicKey, asset, amount, memo);

        uint256 total = fee + repTax + confTax;
        require(amount >= total, "AMOUNT_LT_CHARGES");

        netAmount = amount - total;

        // Move remaining amount to payee
        if (netAmount > 0) {
            ledger.transferBetweenAccounts(payerAccountId, payeeAccountId, asset, netAmount, memo);
        }

        emit Routed(payerAccountId, payeeAccountId, republicKey, asset, amount, fee, repTax, confTax, netAmount, memo);
    }
}
