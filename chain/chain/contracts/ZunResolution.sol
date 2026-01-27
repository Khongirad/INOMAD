// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStructureRegistry {
    function getZunChildren(uint256 zunId) external view returns (uint256[10] memory);
    function arbanLeader(uint256 arbanId) external view returns (address);
}

contract ZunResolution {
    IStructureRegistry public immutable registry;
    uint256 public immutable zunId;

    bytes32 public immutable docHash; // хэш содержимого (off-chain текст/JSON/PDF)
    address public immutable notary;

    bool public finalized;

    mapping(address => bool) public signed;
    uint256 public signedCount;

    event Signed(address indexed signer, uint256 signedCount);
    event Finalized(uint256 indexed zunId);

    error NotLeaderOfThisZun();
    error AlreadySigned();
    error FinalizedAlready();
    error NotEnoughSignatures();

    constructor(address registry_, uint256 zunId_, bytes32 docHash_, address notary_) {
        registry = IStructureRegistry(registry_);
        zunId = zunId_;
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

        // Дополнительная защита: убедиться, что подписали именно 10 лидеров этого Zun
        // (на случай, если кто-то сменил лидеров во время подписания)
        uint256[10] memory arbans = registry.getZunChildren(zunId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.arbanLeader(arbans[i]);
            if (leader == address(0) || !signed[leader]) revert NotEnoughSignatures();
        }

        finalized = true;
        emit Finalized(zunId);
    }
}
