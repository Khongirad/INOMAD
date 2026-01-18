// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SeatSBT.sol";

/**
 * ElectionRegistry v1
 * - assign seat -> revokes old, mints new
 * - marks served level on replacement (cooldown base)
 *
 * ВАЖНО: Этот контракт должен быть setIssuer=true в SeatSBT.
 */
contract ElectionRegistry {
    address public owner;
    SeatSBT public seatToken;

    // levelId for this registry context (например: 1=ARBAN_LEADER, 2=ZUUN, 3=MYANGAN, 4=TUMEN, ...)
    uint8 public immutable levelId;

    struct SeatInfo {
        address occupant;
        uint64 lastElection;
    }

    mapping(uint256 => SeatInfo) public seats;

    event SeatAssigned(uint256 indexed seatId, address indexed occupant, uint64 ts);

    error NotAuthorized();
    error InvalidCohort();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    constructor(address seatTokenAddress, uint8 _levelId) {
        owner = msg.sender;
        seatToken = SeatSBT(seatTokenAddress);
        levelId = _levelId;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /**
     * @param seatId            уникальный seatId
     * @param occupant          новый владелец места
     * @param cohortArbanId_    обязательный cohort (арбан-десятка)
     * @param competencyFlags_  CIV/DOM флаги
     */
    function assignSeat(
        uint256 seatId,
        address occupant,
        uint32 cohortArbanId_,
        uint16 competencyFlags_
    ) external onlyOwner {
        if (cohortArbanId_ == 0) revert InvalidCohort();

        // revoke old occupant token (if any) + mark served cooldown anchor
        SeatInfo memory oldSeat = seats[seatId];
        if (oldSeat.occupant != address(0)) {
            // mark served BEFORE revoke (order не критичен)
            seatToken.markServed(seatId, levelId, uint64(block.timestamp));
            seatToken.revokeSeat(seatId);
        }

        seats[seatId] = SeatInfo({ occupant: occupant, lastElection: uint64(block.timestamp) });

        // mint new SBT with mandatory cohort + competency
        seatToken.mintSeat(occupant, seatId, cohortArbanId_, competencyFlags_);

        emit SeatAssigned(seatId, occupant, uint64(block.timestamp));
    }
}
