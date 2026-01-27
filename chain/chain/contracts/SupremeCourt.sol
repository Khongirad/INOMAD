// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SupremeCourt MVP
 * - root authority for sanctions (expand later)
 * - for now: placeholder address used by ActivationRegistry
 */
contract SupremeCourt {
    address public owner;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerChanged(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
