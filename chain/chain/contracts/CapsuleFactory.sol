// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BranchRegistry.sol";
import "./IBranchRegistry.sol";
import "./Myangan.sol";
import "./Tumen.sol";

/// @notice Factory that binds capsules to a branch at creation time.
/// @dev Owner-gated for MVP. Later replace with governance rules.
contract CapsuleFactory {
    address public owner;
    BranchRegistry public immutable branches;

    event OwnerSet(address indexed owner);
    event MyanganCreated(uint256 indexed myanganId, address myangan, BranchRegistry.Branch branch, uint256 leaderSeatId);
    event TumenCreated(uint256 indexed tumenId, address tumen, BranchRegistry.Branch branch, uint256 leaderSeatId);

    error NotOwner();
    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    constructor(address branchRegistry, address owner_) {
        branches = BranchRegistry(branchRegistry);
        owner = owner_;
        emit OwnerSet(owner_);
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function createMyangan(
        address registry,
        address organization,
        uint256 myanganId,
        uint256[10] memory zunIds,
        address leaderAddr,
        uint256 leaderSeatId,
        BranchRegistry.Branch branch
    ) external onlyOwner returns (address) {
        require(branches.activeBranch(leaderSeatId) == branch, "leader branch mismatch");
        // promote leader progress (optional)
        branches.setProgress(leaderSeatId, branch, BranchRegistry.Level.MYANGAN, myanganId);

        Myangan m = new Myangan(
            registry,
            organization,
            myanganId,
            zunIds,
            leaderAddr,
            address(branches),
            IBranchRegistry.Branch(uint8(branch))
        );

        emit MyanganCreated(myanganId, address(m), branch, leaderSeatId);
        return address(m);
    }

    function createTumen(
        address registry,
        address organization,
        uint256 tumenId,
        uint256[10] memory myanganIds,
        address leaderAddr,
        uint256 leaderSeatId,
        BranchRegistry.Branch branch
    ) external onlyOwner returns (address) {
        require(branches.activeBranch(leaderSeatId) == branch, "leader branch mismatch");
        branches.setProgress(leaderSeatId, branch, BranchRegistry.Level.TUMEN, tumenId);

        Tumen t = new Tumen(
            registry,
            organization,
            tumenId,
            myanganIds,
            leaderAddr,
            address(branches),
            IBranchRegistry.Branch(uint8(branch))
        );

        emit TumenCreated(tumenId, address(t), branch, leaderSeatId);
        return address(t);
    }
}
