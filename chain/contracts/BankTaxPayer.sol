// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITaxAuthorityBankOnly {
    function payTax(uint32 year, bytes32 taxpayerAccountId, bytes32 republicKey, address asset, uint256 amount, bytes32 memo) external;
}

contract BankTaxPayer {
    address public owner;
    ITaxAuthorityBankOnly public taxAuthority;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event TaxAuthoritySet(address indexed taxAuthority);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address taxAuthorityAddr) {
        owner = msg.sender;
        taxAuthority = ITaxAuthorityBankOnly(taxAuthorityAddr);
        emit TaxAuthoritySet(taxAuthorityAddr);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setTaxAuthority(address taxAuthorityAddr) external onlyOwner {
        require(taxAuthorityAddr != address(0), "ZERO_ADDR");
        taxAuthority = ITaxAuthorityBankOnly(taxAuthorityAddr);
        emit TaxAuthoritySet(taxAuthorityAddr);
    }

    // This contract calls TaxAuthority.payTax(). It must be licensed as a bank.
    function payTaxForClient(
        uint32 year,
        bytes32 taxpayerAccountId,
        bytes32 republicKey,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external onlyOwner {
        taxAuthority.payTax(year, taxpayerAccountId, republicKey, asset, amount, memo);
    }
}
