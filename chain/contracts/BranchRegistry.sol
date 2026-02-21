// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice One-seat-one-branch. Switching branch resets progress to CITIZEN.
contract BranchRegistry {
    enum Branch { NONE, LEGISLATIVE, EXECUTIVE, JUDICIAL, FINANCIAL }
    enum Level  { CITIZEN, ARBAN, ZUN, MYANGAN, TUMEN }

    address public owner;
    mapping(address => bool) public operators; // CapsuleFactory, etc.

    mapping(uint256 => Branch) public activeBranch; // seatId -> branch
    mapping(uint256 => Level)  public activeLevel;  // seatId -> level (within activeBranch)
    mapping(uint256 => uint256) public activeUnitId; // seatId -> unitId (optional)

    event OwnerSet(address indexed owner);
    event OperatorSet(address indexed operator, bool allowed);
    event BranchJoined(uint256 indexed seatId, Branch indexed branch);
    event BranchSwitched(uint256 indexed seatId, Branch indexed fromBranch, Branch indexed toBranch);
    event ProgressSet(uint256 indexed seatId, Branch indexed branch, Level level, uint256 unitId);

    error NotOwner();
    error NotOperator();
    error BranchAlreadyChosen();
    error SameBranch();
    error WrongBranch();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != owner && !operators[msg.sender]) revert NotOperator();
        _;
    }

    constructor(address owner_) {
        owner = owner_;
        emit OwnerSet(owner_);
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit OperatorSet(operator, allowed);
    }

    /// @notice First-time selection only.
    function joinBranch(uint256 seatId, Branch branch) external onlyOperator {
        if (activeBranch[seatId] != Branch.NONE) revert BranchAlreadyChosen();
        require(branch != Branch.NONE, "branch=NONE");
        activeBranch[seatId] = branch;
        activeLevel[seatId] = Level.CITIZEN;
        activeUnitId[seatId] = 0;
        emit BranchJoined(seatId, branch);
    }

    /// @notice Switch branch => reset progress to CITIZEN.
    function switchBranch(uint256 seatId, Branch newBranch) external onlyOperator {
        Branch cur = activeBranch[seatId];
        if (cur == newBranch) revert SameBranch();
        require(newBranch != Branch.NONE, "branch=NONE");
        activeBranch[seatId] = newBranch;
        activeLevel[seatId] = Level.CITIZEN;
        activeUnitId[seatId] = 0;
        emit BranchSwitched(seatId, cur, newBranch);
    }

    /// @notice Called by registries/factories when promoting a seat within its active branch.
    function setProgress(uint256 seatId, Branch branch, Level level, uint256 unitId) external onlyOperator {
        if (activeBranch[seatId] != branch) revert WrongBranch();
        activeLevel[seatId] = level;
        activeUnitId[seatId] = unitId;
        emit ProgressSet(seatId, branch, level, unitId);
    }
}
