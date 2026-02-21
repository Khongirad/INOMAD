// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStructureRegistryTLA {
    function getTumenChildren(uint256 tumenId) external view returns (uint256[10] memory);
    function myanganLeader(uint256 myanganId) external view returns (address);
    function applyTumenLeader(uint256 tumenId, address leader) external;
}

contract TumenLeaderAppointment {
    IStructureRegistryTLA public immutable registry;

    uint256 public immutable tumenId;
    address public immutable newLeader;

    bytes32 public immutable docHash;
    address public immutable notary;

    bool public finalized;

    mapping(address => bool) public signed;
    uint256 public signedCount;

    event Signed(address indexed signer, uint256 signedCount);
    event Finalized(uint256 indexed tumenId, address indexed newLeader);

    error FinalizedAlready();
    error AlreadySigned();
    error NotLeaderOfThisTumen();
    error InvalidNewLeader();
    error NotEnoughSignatures();

    constructor(
        address registry_,
        uint256 tumenId_,
        address newLeader_,
        bytes32 docHash_,
        address notary_
    ) {
        if (newLeader_ == address(0)) revert InvalidNewLeader();

        registry = IStructureRegistryTLA(registry_);
        tumenId = tumenId_;
        newLeader = newLeader_;
        docHash = docHash_;
        notary = notary_;
    }

    function _isAllowedSigner(address signer) internal view returns (bool) {
        uint256[10] memory myangans = registry.getTumenChildren(tumenId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.myanganLeader(myangans[i]);
            if (leader == signer && leader != address(0)) return true;
        }
        return false;
    }

    function sign() external {
        if (finalized) revert FinalizedAlready();
        if (signed[msg.sender]) revert AlreadySigned();
        if (!_isAllowedSigner(msg.sender)) revert NotLeaderOfThisTumen();

        signed[msg.sender] = true;
        signedCount += 1;
        emit Signed(msg.sender, signedCount);
    }

    function finalize() external {
        if (finalized) revert FinalizedAlready();
        if (signedCount < 10) revert NotEnoughSignatures();

        // железобетон: подписи всех 10 лидеров Myangan, входящих в этот Tumen
        uint256[10] memory myangans = registry.getTumenChildren(tumenId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.myanganLeader(myangans[i]);
            if (leader == address(0) || !signed[leader]) revert NotEnoughSignatures();
        }

        finalized = true;

        // применяем изменение в реестре (требует authorizedUpdater для адреса этого документа)
        registry.applyTumenLeader(tumenId, newLeader);

        emit Finalized(tumenId, newLeader);
    }
}
