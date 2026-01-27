// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TumenAuthorityMock {
    address public owner;
    mapping(address => bool) public isTumen;

    constructor() {
        owner = msg.sender;
        isTumen[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    function setTumenLeader(address who, bool ok) external onlyOwner {
        isTumen[who] = ok;
    }

    function isTumenLeader(address who) external view returns (bool) {
        return isTumen[who];
    }
}
