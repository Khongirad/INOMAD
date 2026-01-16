// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ChairmanRegistry {
    address public owner;
    address public chairman;

    mapping(address => bool) public authorizedElection;

    event OwnerSet(address indexed owner);
    event ElectionAuthorized(address indexed election, bool allowed);
    event ChairmanSet(address indexed chairman);

    error NotOwner();
    error NotAuthorizedElection();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyElection() {
        if (!authorizedElection[msg.sender]) revert NotAuthorizedElection();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerSet(msg.sender);
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function setElection(address election, bool allowed) external onlyOwner {
        authorizedElection[election] = allowed;
        emit ElectionAuthorized(election, allowed);
    }

    function setChairman(address newChairman) external onlyElection {
        chairman = newChairman;
        emit ChairmanSet(newChairman);
    }
}
