// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStructureRegistryZLA {
    function getZunChildren(uint256 zunId) external view returns (uint256[10] memory);
    function arbanLeader(uint256 arbanId) external view returns (address);
    function applyZunLeader(uint256 zunId, address leader) external;
}

contract ZunLeaderAppointment {
    IStructureRegistryZLA public immutable registry;

    uint256 public immutable zunId;
    address public immutable newLeader;

    bytes32 public immutable docHash;
    address public immutable notary;

    bool public finalized;

    mapping(address => bool) public signed;
    uint256 public signedCount;

    event Signed(address indexed signer, uint256 signedCount);
    event Finalized(uint256 indexed zunId, address indexed newLeader);

    error FinalizedAlready();
    error AlreadySigned();
    error NotLeaderOfThisZun();
    error InvalidNewLeader();
    error NotEnoughSignatures();

    constructor(
        address registry_,
        uint256 zunId_,
        address newLeader_,
        bytes32 docHash_,
        address notary_
    ) {
        if (newLeader_ == address(0)) revert InvalidNewLeader();

        registry = IStructureRegistryZLA(registry_);
        zunId = zunId_;
        newLeader = newLeader_;
        docHash = docHash_;
        notary = notary_;
    }

    function _isAllowedSigner(address signer) internal view returns (bool) {
        uint256[10] memory arbans = registry.getZunChildren(zunId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.arbanLeader(arbans[i]);
            if (leader == signer && leader != address(0)) return true;
        }
        return false;
    }

    function sign() external {
        if (finalized) revert FinalizedAlready();
        if (signed[msg.sender]) revert AlreadySigned();
        if (!_isAllowedSigner(msg.sender)) revert NotLeaderOfThisZun();

        signed[msg.sender] = true;
        signedCount += 1;
        emit Signed(msg.sender, signedCount);
    }

    function finalize() external {
        if (finalized) revert FinalizedAlready();
        if (signedCount < 10) revert NotEnoughSignatures();

        // железобетон: проверяем подписи всех 10 лидеров текущего состава Arbans этого Zun
        uint256[10] memory arbans = registry.getZunChildren(zunId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.arbanLeader(arbans[i]);
            if (leader == address(0) || !signed[leader]) revert NotEnoughSignatures();
        }

        finalized = true;

        // ключ: после финализации — применяем изменение в реестре
        registry.applyZunLeader(zunId, newLeader);

        emit Finalized(zunId, newLeader);
    }
}
