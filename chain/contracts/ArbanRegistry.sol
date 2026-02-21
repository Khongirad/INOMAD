// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICitizenActivation {
    function isActive(uint256 seatId) external view returns (bool);
}

interface ISeatSBT {
    function ownerOf(uint256 seatId) external view returns (address);
}

/**
 * ArbanRegistry (MVP)
 * - Create arbans (exactly 10 seats for v1)
 * - All seats must be ACTIVE in CitizenActivation
 * - Set leader (must be a member)
 * - Membership is one-arban-only
 */
contract ArbanRegistry {
    ISeatSBT public immutable seatSbt;
    ICitizenActivation public immutable activation;
    address public owner;

    uint32 public nextArbanId = 1;

    struct Arban {
        uint256 leaderSeatId;
        uint256[10] seats;
        bool exists;
    }

    mapping(uint32 => Arban) public arbans;        // arbanId -> Arban
    mapping(uint256 => uint32) public seatToArban; // seatId -> arbanId

    event OwnerSet(address indexed newOwner);
    event ArbanCreated(uint32 indexed arbanId, uint256[10] seats);
    event LeaderSet(uint32 indexed arbanId, uint256 indexed leaderSeatId);

    error NotOwner();
    error BadParam();
    error SeatNotActive(uint256 seatId);
    error SeatAlreadyInArban(uint256 seatId);
    error ArbanNotFound();
    error NotMember();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address seatSbt_, address activation_, address owner_) {
        if (seatSbt_ == address(0) || activation_ == address(0) || owner_ == address(0)) revert BadParam();
        seatSbt = ISeatSBT(seatSbt_);
        activation = ICitizenActivation(activation_);
        owner = owner_;
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert BadParam();
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function createArban(uint256[10] calldata seats) external onlyOwner returns (uint32 arbanId) {
        // validate seats
        for (uint256 i = 0; i < 10; i++) {
            uint256 seatId = seats[i];
            if (!activation.isActive(seatId)) revert SeatNotActive(seatId);
            if (seatToArban[seatId] != 0) revert SeatAlreadyInArban(seatId);
        }

        arbanId = nextArbanId++;
        Arban storage a = arbans[arbanId];
        a.exists = true;
        a.seats = seats;

        for (uint256 i = 0; i < 10; i++) {
            seatToArban[seats[i]] = arbanId;
        }

        emit ArbanCreated(arbanId, seats);
    }

    function setLeader(uint32 arbanId, uint256 leaderSeatId) external onlyOwner {
        Arban storage a = arbans[arbanId];
        if (!a.exists) revert ArbanNotFound();

        bool ok = false;
        for (uint256 i = 0; i < 10; i++) {
            if (a.seats[i] == leaderSeatId) { ok = true; break; }
        }
        if (!ok) revert NotMember();

        a.leaderSeatId = leaderSeatId;
        emit LeaderSet(arbanId, leaderSeatId);
    }

    function getSeats(uint32 arbanId) external view returns (uint256[10] memory) {
        Arban storage a = arbans[arbanId];
        if (!a.exists) revert ArbanNotFound();
        return a.seats;
    }
}
