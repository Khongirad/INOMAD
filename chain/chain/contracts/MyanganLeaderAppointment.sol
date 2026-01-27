// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStructureRegistryMLA {
    function getMyanganChildren(uint256 myanganId) external view returns (uint256[10] memory);
    function zunLeader(uint256 zunId) external view returns (address);
    function applyMyanganLeader(uint256 myanganId, address leader) external;
}

contract MyanganLeaderAppointment {
    IStructureRegistryMLA public immutable registry;

    uint256 public immutable myanganId;
    address public immutable newLeader;

    bytes32 public immutable docHash;
    address public immutable notary;

    bool public finalized;

    mapping(address => bool) public signed;
    uint256 public signedCount;

    event Signed(address indexed signer, uint256 signedCount);
    event Finalized(uint256 indexed myanganId, address indexed newLeader);

    error FinalizedAlready();
    error AlreadySigned();
    error NotLeaderOfThisMyangan();
    error InvalidNewLeader();
    error NotEnoughSignatures();

    constructor(
        address registry_,
        uint256 myanganId_,
        address newLeader_,
        bytes32 docHash_,
        address notary_
    ) {
        if (newLeader_ == address(0)) revert InvalidNewLeader();

        registry = IStructureRegistryMLA(registry_);
        myanganId = myanganId_;
        newLeader = newLeader_;
        docHash = docHash_;
        notary = notary_;
    }

    function _isAllowedSigner(address signer) internal view returns (bool) {
        uint256[10] memory zuns = registry.getMyanganChildren(myanganId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.zunLeader(zuns[i]);
            if (leader == signer && leader != address(0)) return true;
        }
        return false;
    }

    function sign() external {
        if (finalized) revert FinalizedAlready();
        if (signed[msg.sender]) revert AlreadySigned();
        if (!_isAllowedSigner(msg.sender)) revert NotLeaderOfThisMyangan();

        signed[msg.sender] = true;
        signedCount += 1;
        emit Signed(msg.sender, signedCount);
    }

    function finalize() external {
        if (finalized) revert FinalizedAlready();
        if (signedCount < 10) revert NotEnoughSignatures();

        // железобетон: подписи всех 10 лидеров Zun, входящих в этот Myangan
        uint256[10] memory zuns = registry.getMyanganChildren(myanganId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.zunLeader(zuns[i]);
            if (leader == address(0) || !signed[leader]) revert NotEnoughSignatures();
        }

        finalized = true;

        // ключ: применяем изменение в реестре (требует authorizedUpdater для адреса этого документа)
        registry.applyMyanganLeader(myanganId, newLeader);

        emit Finalized(myanganId, newLeader);
    }
}
