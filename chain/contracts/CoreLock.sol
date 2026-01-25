// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CoreLock {
    address public owner;
    bytes32 public docHash;
    bool public frozen;
    uint64 public frozenAt;

    event CoreHashSet(bytes32 hash);
    event Frozen(bytes32 hash, uint64 time);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error ZeroAddress();
    error AlreadyFrozen();
    error HashAlreadySet();
    error HashNotSet();

    constructor(address _owner) {
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setDocHash(bytes32 _hash) external onlyOwner {
        if (frozen) revert AlreadyFrozen();
        if (docHash != bytes32(0)) revert HashAlreadySet();
        docHash = _hash;
        emit CoreHashSet(_hash);
    }

    function freeze() external onlyOwner {
        if (frozen) revert AlreadyFrozen();
        if (docHash == bytes32(0)) revert HashNotSet();
        frozen = true;
        frozenAt = uint64(block.timestamp);
        emit Frozen(docHash, frozenAt);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
