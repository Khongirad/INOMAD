// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBranchRegistry {
    enum Branch { NONE, LEGISLATIVE, EXECUTIVE, JUDICIAL, FINANCIAL }
    function activeBranch(uint256 seatId) external view returns (Branch);
}
