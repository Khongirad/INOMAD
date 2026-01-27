// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICitizenRegistry2 {
    function citizenOfSeat(uint256 seatId) external view returns (address);
}

interface IArbanRegistryMembers {
    function getMembers(uint256 arbanId) external view returns (uint256[] memory);
    function applyArbanLeader(uint256 arbanId, address newLeader) external; // <-- ВАЖНО: имя как в ArbanRegistry
}

contract ArbanLeaderAppointment {
    address public immutable arbanRegistry;
    address public immutable citizenRegistry;

    uint256 public immutable arbanId;
    address public immutable newLeader; // CitizenAccount
    bytes32 public immutable docHash;
    uint256 public immutable minSignatures;

    uint256[] private _seatIds;

    mapping(uint256 => bool) public signedSeat;
    uint256 public signedCount;
    bool public finalized;

    event Signed(uint256 indexed seatId, address indexed citizenAccount);
    event Finalized(uint256 indexed arbanId, address indexed newLeader);

    error ZeroAddress();
    error InvalidSeat();
    error SeatNotAllowed(uint256 seatId);
    error NotCitizenAccountForSeat(uint256 seatId, address expected, address got);
    error AlreadySigned(uint256 seatId);
    error NotEnoughSignatures(uint256 have, uint256 need);
    error AlreadyFinalized();

    constructor(
        address arbanRegistry_,
        address citizenRegistry_,
        uint256 arbanId_,
        address newLeaderCitizenAccount_,
        uint256 minSignatures_,
        bytes32 docHash_
    ) {
        if (arbanRegistry_ == address(0) || citizenRegistry_ == address(0)) revert ZeroAddress();
        if (newLeaderCitizenAccount_ == address(0)) revert ZeroAddress();
        if (arbanId_ == 0) revert InvalidSeat();

        arbanRegistry = arbanRegistry_;
        citizenRegistry = citizenRegistry_;
        arbanId = arbanId_;
        newLeader = newLeaderCitizenAccount_;
        docHash = docHash_;
        minSignatures = minSignatures_;

        uint256[] memory members = IArbanRegistryMembers(arbanRegistry_).getMembers(arbanId_);
        if (members.length < 2 || members.length > 10) revert InvalidSeat();
        if (minSignatures_ < 2 || minSignatures_ > members.length) revert InvalidSeat();

        for (uint256 i = 0; i < members.length; i++) {
            uint256 s = members[i];
            if (s == 0) revert InvalidSeat();
            for (uint256 j = i + 1; j < members.length; j++) {
                if (s == members[j]) revert InvalidSeat();
            }
            _seatIds.push(s);
        }
    }

    function seatIds() external view returns (uint256[] memory) {
        return _seatIds;
    }

    function isSeatAllowed(uint256 seatId) public view returns (bool) {
        for (uint256 i = 0; i < _seatIds.length; i++) {
            if (_seatIds[i] == seatId) return true;
        }
        return false;
    }

    function sign(uint256 seatId) external {
        if (finalized) revert AlreadyFinalized();
        if (seatId == 0) revert InvalidSeat();
        if (!isSeatAllowed(seatId)) revert SeatNotAllowed(seatId);
        if (signedSeat[seatId]) revert AlreadySigned(seatId);

        address expected = ICitizenRegistry2(citizenRegistry).citizenOfSeat(seatId);
        if (expected == address(0)) revert ZeroAddress();
        if (msg.sender != expected) revert NotCitizenAccountForSeat(seatId, expected, msg.sender);

        signedSeat[seatId] = true;
        signedCount += 1;

        emit Signed(seatId, msg.sender);
    }

    function finalize() external {
        if (finalized) revert AlreadyFinalized();
        if (signedCount < minSignatures) revert NotEnoughSignatures(signedCount, minSignatures);

        finalized = true;

        // Applies leader via authorized updater path
        IArbanRegistryMembers(arbanRegistry).applyArbanLeader(arbanId, newLeader);

        emit Finalized(arbanId, newLeader);
    }
}
