// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ZunRegistry (MVP)
 * - Zun (100) = exactly 10 Arban units
 * - Zun stores composition as arbanIds (NOT individuals)
 * - Leader is an Arban leader seatId (from one of member arbans) OR later via ElectionRegistry adapter
 *
 * Invariants:
 * - Each Arban belongs to at most one Zun
 * - Zun is created by system owner (MVP)
 */

interface IArbanRegistry {
    function arbans(uint32 arbanId) external view returns (uint256 leaderSeatId, uint256[10] memory seats, bool exists);
}

contract ZunRegistry {
    IArbanRegistry public immutable arbanRegistry;
    address public owner;

    uint32 public nextZunId = 1;

    struct Zun {
        uint32[10] arbans;      // arbanIds
        uint256 leaderSeatId;   // leader seatId (must be leader of one of the included arbans)
        bool exists;
    }

    mapping(uint32 => Zun) public zuns;          // zunId -> Zun
    mapping(uint32 => uint32) public arbanToZun; // arbanId -> zunId

    event OwnerSet(address indexed newOwner);
    event ZunCreated(uint32 indexed zunId, uint32[10] arbans);
    event LeaderSet(uint32 indexed zunId, uint256 indexed leaderSeatId);

    error NotOwner();
    error BadParam();
    error ArbanNotFound(uint32 arbanId);
    error ArbanAlreadyInZun(uint32 arbanId);
    error ZunNotFound();
    error NotMemberArbanLeader(); // leaderSeatId must be leader of a member arban

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address arbanRegistry_, address owner_) {
        if (arbanRegistry_ == address(0) || owner_ == address(0)) revert BadParam();
        arbanRegistry = IArbanRegistry(arbanRegistry_);
        owner = owner_;
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert BadParam();
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function createZun(uint32[10] calldata arbans_) external onlyOwner returns (uint32 zunId) {
        // validate arbans exist + not used
        for (uint256 i = 0; i < 10; i++) {
            uint32 aId = arbans_[i];
            if (aId == 0) revert BadParam();

            (, , bool exists) = arbanRegistry.arbans(aId);
            if (!exists) revert ArbanNotFound(aId);

            if (arbanToZun[aId] != 0) revert ArbanAlreadyInZun(aId);
        }

        zunId = nextZunId++;
        Zun storage z = zuns[zunId];
        z.exists = true;
        z.arbans = arbans_;

        for (uint256 i = 0; i < 10; i++) {
            arbanToZun[arbans_[i]] = zunId;
        }

        emit ZunCreated(zunId, arbans_);
    }

    function setLeader(uint32 zunId, uint256 leaderSeatId) external onlyOwner {
        Zun storage z = zuns[zunId];
        if (!z.exists) revert ZunNotFound();

        // leaderSeatId must be leader of one of included arbans
        bool ok = false;
        for (uint256 i = 0; i < 10; i++) {
            uint32 aId = z.arbans[i];
            (uint256 aLeader, , bool exists) = arbanRegistry.arbans(aId);
            if (exists && aLeader == leaderSeatId) { ok = true; break; }
        }
        if (!ok) revert NotMemberArbanLeader();

        z.leaderSeatId = leaderSeatId;
        emit LeaderSet(zunId, leaderSeatId);
    }

    function getArbans(uint32 zunId) external view returns (uint32[10] memory) {
        Zun storage z = zuns[zunId];
        if (!z.exists) revert ZunNotFound();
        return z.arbans;
    }

    function getLeader(uint32 zunId) external view returns (uint256) {
        Zun storage z = zuns[zunId];
        if (!z.exists) revert ZunNotFound();
        return z.leaderSeatId;
    }
}
