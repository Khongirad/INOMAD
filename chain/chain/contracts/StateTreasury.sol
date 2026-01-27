// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract StateTreasury {
    // Pure “account anchor” contract for clarity (can later add governance spending rules)
    bytes32 public immutable treasuryAccountId;

    constructor(bytes32 accountId) {
        treasuryAccountId = accountId;
    }
}
