// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IChairmanRegistryView {
    function chairman() external view returns (address);
}

contract ChairmanResolution {
    IChairmanRegistryView public immutable chairmanRegistry;

    bytes32 public immutable docHash;
    address public immutable notary;

    bool public finalized;
    bool public signed;

    event Signed(address indexed chairman);
    event Finalized();

    error NotChairman();
    error AlreadySigned();
    error FinalizedAlready();
    error NotSigned();

    constructor(address chairmanRegistry_, bytes32 docHash_, address notary_) {
        chairmanRegistry = IChairmanRegistryView(chairmanRegistry_);
        docHash = docHash_;
        notary = notary_;
    }

    function sign() external {
        if (finalized) revert FinalizedAlready();
        if (signed) revert AlreadySigned();

        address ch = chairmanRegistry.chairman();
        if (msg.sender != ch || ch == address(0)) revert NotChairman();

        signed = true;
        emit Signed(msg.sender);
    }

    function finalize() external {
        if (finalized) revert FinalizedAlready();
        if (!signed) revert NotSigned();

        finalized = true;
        emit Finalized();
    }
}
