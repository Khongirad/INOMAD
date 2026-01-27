// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Zun — артефакт уровня 100 (союз 10 Arbans).
 * MVP: хранит только связь и лидера. Логику голосования добавим позже.
 */
contract Zun {
    address public immutable registry;      // StructureRegistry
    address public immutable organization;  // опционально (может быть 0x0 на MVP)
    uint256 public immutable zunId;

    uint256[10] private _arbanIds;
    address public leader; // MVP: назначается при создании

    event LeaderSet(uint256 indexed zunId, address indexed leader);
    event Created(uint256 indexed zunId, address indexed registry, address indexed organization);

    error OnlyRegistry();

    constructor(
        address registry_,
        address organization_,
        uint256 zunId_,
        uint256[10] memory arbanIds_,
        address leader_
    ) {
        registry = registry_;
        organization = organization_;
        zunId = zunId_;
        _arbanIds = arbanIds_;
        leader = leader_;

        emit Created(zunId_, registry_, organization_);
        emit LeaderSet(zunId_, leader_);
    }

    function getArbans() external view returns (uint256[10] memory) {
        return _arbanIds;
    }

    // MVP: менять лидера может только реестр (позже сюда прикрутим on-chain голосование)
    function setLeader(address newLeader) external {
        if (msg.sender != registry) revert OnlyRegistry();
        leader = newLeader;
        emit LeaderSet(zunId, newLeader);
    }
}
