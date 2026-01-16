// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStructureRegistryMy {
    function getMyanganChildren(uint256 myanganId) external view returns (uint256[10] memory);
    function zunLeader(uint256 zunId) external view returns (address);
}

contract MyanganResolution {
    IStructureRegistryMy public immutable registry;
    uint256 public immutable myanganId;

    bytes32 public immutable docHash;
    address public immutable notary;

    bool public finalized;

    mapping(address => bool) public signed;
    uint256 public signedCount;

    event Signed(address indexed signer, uint256 signedCount);
    event Finalized(uint256 indexed myanganId);

    error NotLeaderOfThisMyangan();
    error AlreadySigned();
    error FinalizedAlready();
    error NotEnoughSignatures();

    constructor(address registry_, uint256 myanganId_, bytes32 docHash_, address notary_) {
        registry = IStructureRegistryMy(registry_);
        myanganId = myanganId_;
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

        uint256[10] memory zuns = registry.getMyanganChildren(myanganId);
        for (uint256 i = 0; i < 10; i++) {
            address leader = registry.zunLeader(zuns[i]);
            if (leader == address(0) || !signed[leader]) revert NotEnoughSignatures();
        }

        finalized = true;
        emit Finalized(myanganId);
    }
}
