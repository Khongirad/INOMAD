// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IBranchRegistry.sol";

/// @notice Myangan (1000) council capsule. One-branch enforcement is externalized to BranchRegistry.
contract Myangan {
    address public immutable registry;
    address public immutable organization;
    uint256 public immutable myanganId;

    IBranchRegistry public immutable branchRegistry;
    IBranchRegistry.Branch public immutable branch;

    uint256[10] private _zunIds;
    address public leader;

    event LeaderSet(uint256 indexed myanganId, address indexed leader);
    event Created(
        uint256 indexed myanganId,
        address indexed registry,
        address indexed organization,
        address branchRegistry,
        uint8 branch
    );

    error NotLeader();
    error WrongBranch();

    constructor(
        address registry_,
        address organization_,
        uint256 myanganId_,
        uint256[10] memory zunIds_,
        address leader_,
        address branchRegistry_,
        IBranchRegistry.Branch branch_
    ) {
        registry = registry_;
        organization = organization_;
        myanganId = myanganId_;
        _zunIds = zunIds_;
        leader = leader_;
        branchRegistry = IBranchRegistry(branchRegistry_);
        branch = branch_;
        emit Created(myanganId_, registry_, organization_, branchRegistry_, uint8(branch_));
        emit LeaderSet(myanganId_, leader_);
    }

    modifier onlyLeader() {
        if (msg.sender != leader) revert NotLeader();
        _;
    }

    /// @dev Optional: enforce that a seatId belongs to this capsule's branch before leader changes.
    ///      If you don't have seatId in Myangan yet, keep branch enforcement at Factory/Registry layer.
    function _requireSeatInBranch(uint256 seatId) internal view {
        if (branchRegistry.activeBranch(seatId) != branch) revert WrongBranch();
    }

    function getZuns() external view returns (uint256[10] memory) {
        return _zunIds;
    }

    /// @notice Leader rotation. Branch check must be done by the caller/factory using seatId.
    /// @dev If you want on-chain enforcement here, add leaderSeatId and require it matches branch.
    function setLeader(address newLeader) external onlyLeader {
        leader = newLeader;
        emit LeaderSet(myanganId, newLeader);
    }
}
