// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Myangan {
    address public immutable registry;
    address public immutable organization;
    uint256 public immutable myanganId;

    uint256[10] private _zunIds;
    address public leader;

    event LeaderSet(uint256 indexed myanganId, address indexed leader);
    event Created(uint256 indexed myanganId, address indexed registry, address indexed organization);

    error OnlyRegistry();

    constructor(
        address registry_,
        address organization_,
        uint256 myanganId_,
        uint256[10] memory zunIds_,
        address leader_
    ) {
        registry = registry_;
        organization = organization_;
        myanganId = myanganId_;
        _zunIds = zunIds_;
        leader = leader_;

        emit Created(myanganId_, registry_, organization_);
        emit LeaderSet(myanganId_, leader_);
    }

    function getZuns() external view returns (uint256[10] memory) {
        return _zunIds;
    }

    function setLeader(address newLeader) external {
        if (msg.sender != registry) revert OnlyRegistry();
        leader = newLeader;
        emit LeaderSet(myanganId, newLeader);
    }
}
