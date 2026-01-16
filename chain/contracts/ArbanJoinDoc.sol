// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * PATCHED: ArbanJoinDoc (CitizenRegistry enforcement)
 * -----------------------------------------------
 * - Signer is ALWAYS CitizenAccount (SeatAccount/Tamga), not EOA.
 * - For each seatId signature, expected signer = CitizenRegistry.citizenOfSeat(seatId).
 * - finalize() calls ArbanRegistry.finalizeArbanJoin(...)
 *
 * Expected external dependencies:
 * - CitizenRegistry: citizenOfSeat(seatId) -> citizenAccount
 * - ArbanRegistry: setJoinDoc(doc, ok) + finalizeArbanJoin(arbanId, leader, seatIds)
 */
interface ICitizenRegistry {
    function citizenOfSeat(uint256 seatId) external view returns (address);
}

interface IArbanRegistryFinalize {
    function setJoinDoc(address doc, bool ok) external;
    function finalizeArbanJoin(uint256 arbanId, address leader, uint256[] calldata seatIds) external;
}

contract ArbanJoinDoc {
    // ====== IMMUTABLES ======
    address public immutable arbanRegistry;
    address public immutable citizenRegistry;

    uint256 public immutable arbanId;
    address public immutable leader; // MUST be CitizenAccount (Tamga)
    bytes32 public immutable docHash;
    uint256 public immutable minSignatures;

    // seatIds to join (2..10)
    uint256[] private _seatIds;

    // seatId => signed?
    mapping(uint256 => bool) public signedSeat;
    uint256 public signedCount;
    bool public finalized;

    event Joined(uint256 indexed seatId, address indexed citizenAccount);
    event Finalized(uint256 indexed arbanId);

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
        address leaderCitizenAccount_,
        uint256[] memory seatIds_,
        uint256 minSignatures_,
        bytes32 docHash_
    ) {
        if (arbanRegistry_ == address(0) || citizenRegistry_ == address(0)) revert ZeroAddress();
        if (leaderCitizenAccount_ == address(0)) revert ZeroAddress();
        if (arbanId_ == 0) revert InvalidSeat();
        if (seatIds_.length < 2 || seatIds_.length > 10) revert InvalidSeat();
        if (minSignatures_ < 2 || minSignatures_ > seatIds_.length) revert InvalidSeat();

        arbanRegistry = arbanRegistry_;
        citizenRegistry = citizenRegistry_;
        arbanId = arbanId_;
        leader = leaderCitizenAccount_;
        minSignatures = minSignatures_;
        docHash = docHash_;

        // copy seatIds + validate uniqueness + nonzero
        for (uint256 i = 0; i < seatIds_.length; i++) {
            uint256 s = seatIds_[i];
            if (s == 0) revert InvalidSeat();

            for (uint256 j = i + 1; j < seatIds_.length; j++) {
                if (s == seatIds_[j]) revert InvalidSeat();
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

    /**
     * join(seatId)
     * - msg.sender MUST be CitizenAccount of this seatId
     */
    function join(uint256 seatId) external {
        if (finalized) revert AlreadyFinalized();
        if (seatId == 0) revert InvalidSeat();
        if (!isSeatAllowed(seatId)) revert SeatNotAllowed(seatId);
        if (signedSeat[seatId]) revert AlreadySigned(seatId);

        address expected = ICitizenRegistry(citizenRegistry).citizenOfSeat(seatId);
        if (expected == address(0)) revert ZeroAddress();
        if (msg.sender != expected) revert NotCitizenAccountForSeat(seatId, expected, msg.sender);

        signedSeat[seatId] = true;
        signedCount += 1;

        emit Joined(seatId, msg.sender);
    }

    /**
     * finalize()
     * - requires minSignatures
     * - authorizes itself in ArbanRegistry (join doc allowlist), calls finalizeArbanJoin
     * NOTE: ArbanRegistry owner must be NotaryHub for this to work, or ArbanRegistry must already authorize this doc.
     */
    function finalize() external {
        if (finalized) revert AlreadyFinalized();
        if (signedCount < minSignatures) revert NotEnoughSignatures(signedCount, minSignatures);

        finalized = true;

        // ensure ArbanRegistry will accept this doc
        IArbanRegistryFinalize(arbanRegistry).setJoinDoc(address(this), true);

        IArbanRegistryFinalize(arbanRegistry).finalizeArbanJoin(arbanId, leader, _seatIds);

        emit Finalized(arbanId);
    }
}
