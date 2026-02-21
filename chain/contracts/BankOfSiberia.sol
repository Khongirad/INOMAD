// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAltanBankLedgerBankOps {
    function transferBetweenAccounts(bytes32 fromId, bytes32 toId, address asset, uint256 amount, bytes32 memo) external;
}

contract BankOfSiberia {
    address public owner;
    IAltanBankLedgerBankOps public ledger;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event LedgerSet(address indexed ledger);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address l) {
        owner = msg.sender;
        ledger = IAltanBankLedgerBankOps(l);
        emit LedgerSet(l);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setLedger(address l) external onlyOwner {
        require(l != address(0), "ZERO_ADDR");
        ledger = IAltanBankLedgerBankOps(l);
        emit LedgerSet(l);
    }

    // Bank service: internal transfers between accounts
    function bankTransfer(
        bytes32 fromId,
        bytes32 toId,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external onlyOwner {
        ledger.transferBetweenAccounts(fromId, toId, asset, amount, memo);
    }
}
