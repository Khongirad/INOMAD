// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AltanWallet.sol";

interface ISeatSBTFull {
    function ownerOf(uint256 seatId) external view returns (address);
    function cohortArbanId(uint256 seatId) external view returns (uint32);
}

contract AltanWalletRegistry {
    address public owner;         // Central Bank / Root Authority
    ISeatSBTFull public seatSbt;

    uint256 public constant THRESHOLD = 3;

    mapping(uint256 => address) public walletOf;              // seatId -> wallet
    mapping(uint256 => bool) public isUnlocked;               // seatId -> unlocked
    mapping(uint256 => uint256) public approvalCount;         // seatId -> count
    mapping(uint256 => mapping(uint256 => bool)) public approvedBySeat; // targetSeatId -> approverSeatId -> bool

    // optional: notary/delegate addresses allowed as extra approvers (not required in v1)
    mapping(address => bool) public privilegedApprover;

    event WalletCreated(uint256 indexed seatId, address wallet);
    event UnlockApproved(uint256 indexed targetSeatId, uint256 indexed approverSeatId, uint256 count);
    event WalletUnlocked(uint256 indexed seatId);

    error NotAuthorized();
    error WalletExists();
    error InvalidCohort();
    error BadApprover();
    error AlreadyApproved();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    constructor(address _seatSbt) {
        owner = msg.sender;
        seatSbt = ISeatSBTFull(_seatSbt);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setPrivilegedApprover(address a, bool ok) external onlyOwner {
        privilegedApprover[a] = ok;
    }

    /**
     * Создаётся автоматически при регистрации гражданина (вызовит CentralBank).
     */
    function createWallet(uint256 seatId) external onlyOwner returns (address w) {
        if (walletOf[seatId] != address(0)) revert WalletExists();

        // cohort must already be set in SeatSBT at mint time
        uint32 cohort = seatSbt.cohortArbanId(seatId);
        if (cohort == 0) revert InvalidCohort();

        AltanWallet wallet = new AltanWallet(address(seatSbt), seatId, address(this));
        w = address(wallet);

        walletOf[seatId] = w;

        emit WalletCreated(seatId, w);
    }

    /**
     * Подпись-разрешение на unlock.
     * approverSeatId должен принадлежать msg.sender.
     * По умолчанию: approver должен быть из того же cohortArbanId, что и target.
     */
    function approveUnlock(uint256 targetSeatId, uint256 approverSeatId) external {
        if (approvedBySeat[targetSeatId][approverSeatId]) revert AlreadyApproved();

        // msg.sender must own approverSeatId
        if (seatSbt.ownerOf(approverSeatId) != msg.sender) revert BadApprover();

        uint32 targetCohort = seatSbt.cohortArbanId(targetSeatId);
        if (targetCohort == 0) revert InvalidCohort();

        uint32 approverCohort = seatSbt.cohortArbanId(approverSeatId);

        // either same cohort OR privileged approver address (notary/delegate in MVP)
        if (approverCohort != targetCohort && !privilegedApprover[msg.sender]) revert BadApprover();

        approvedBySeat[targetSeatId][approverSeatId] = true;
        uint256 cnt = ++approvalCount[targetSeatId];

        emit UnlockApproved(targetSeatId, approverSeatId, cnt);

        if (cnt >= THRESHOLD) {
            _unlock(targetSeatId);
        }
    }

    function _unlock(uint256 seatId) internal {
        address w = walletOf[seatId];
        require(w != address(0), "NO_WALLET");
        if (!isUnlocked[seatId]) {
            isUnlocked[seatId] = true;
            AltanWallet(payable(w)).setUnlocked(true);
            emit WalletUnlocked(seatId);
        }
    }
}
