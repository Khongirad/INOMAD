// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IBranchRegistry.sol";

/// @notice Tumen (10000) council capsule. One-branch enforcement is externalized to BranchRegistry.
contract Tumen {
    address public immutable registry;
    address public immutable organization;
    uint256 public immutable tumenId;

    IBranchRegistry public immutable branchRegistry;
    IBranchRegistry.Branch public immutable branch;

    uint256[10] private _myanganIds;
    address public leader;

    event LeaderSet(uint256 indexed tumenId, address indexed leader);
    event Created(
        uint256 indexed tumenId,
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
        uint256 tumenId_,
        uint256[10] memory myanganIds_,
        address leader_,
        address branchRegistry_,
        IBranchRegistry.Branch branch_
    ) {
        registry = registry_;
        organization = organization_;
        tumenId = tumenId_;
        _myanganIds = myanganIds_;
        leader = leader_;
        branchRegistry = IBranchRegistry(branchRegistry_);
        branch = branch_;
        emit Created(tumenId_, registry_, organization_, branchRegistry_, uint8(branch_));
        emit LeaderSet(tumenId_, leader_);
    }

    modifier onlyLeader() {
        if (msg.sender != leader) revert NotLeader();
        _;
    }

    function _requireSeatInBranch(uint256 seatId) internal view {
        if (branchRegistry.activeBranch(seatId) != branch) revert WrongBranch();
    }

    function getMyangans() external view returns (uint256[10] memory) {
        return _myanganIds;
    }

    /// @notice Leader rotation. Branch check must be done by the caller/factory using seatId.
    /// @dev If you want on-chain enforcement here, add leaderSeatId and require it matches branch.
    function setLeader(address newLeader) external onlyLeader {
        leader = newLeader;
        emit LeaderSet(tumenId, newLeader);
    }
}
