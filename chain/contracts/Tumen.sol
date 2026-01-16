// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Tumen {
    address public immutable registry;
    address public immutable organization;
    uint256 public immutable tumenId;

    uint256[10] private _myanganIds;
    address public leader;

    event LeaderSet(uint256 indexed tumenId, address indexed leader);
    event Created(uint256 indexed tumenId, address indexed registry, address indexed organization);

    error OnlyRegistry();

    constructor(
        address registry_,
        address organization_,
        uint256 tumenId_,
        uint256[10] memory myanganIds_,
        address leader_
    ) {
        registry = registry_;
        organization = organization_;
        tumenId = tumenId_;
        _myanganIds = myanganIds_;
        leader = leader_;

        emit Created(tumenId_, registry_, organization_);
        emit LeaderSet(tumenId_, leader_);
    }

    function getMyangans() external view returns (uint256[10] memory) {
        return _myanganIds;
    }

    function setLeader(address newLeader) external {
        if (msg.sender != registry) revert OnlyRegistry();
        leader = newLeader;
        emit LeaderSet(tumenId, newLeader);
    }
}
