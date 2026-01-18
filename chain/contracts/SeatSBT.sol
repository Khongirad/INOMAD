// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SeatSBT v1 (Soulbound)
 * - mint/burn only by authorized registries (issuers)
 * - cohortArbanId required
 * - servedLevels bitmask + per-level lastTermEnd
 * - competencyFlags bitmask (CIV/DOM)
 */
contract SeatSBT {
    string public name = "SeatSBT";
    string public symbol = "SEAT";

    address public owner;

    // --- minimal ERC721-like storage ---
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    // --- access control ---
    mapping(address => bool) public isIssuer; // ElectionRegistry, CentralBank, etc.

    // --- identity metadata ---
    // cohortArbanId MUST be non-zero after mint
    mapping(uint256 => uint32) public cohortArbanId;

    // competencyFlags:
    // bit0 = CIV (civil citizen)
    // bit1 = DOM (domicile / internal rights)
    mapping(uint256 => uint16) public competencyFlags;

    // servedLevels: bitmask for served level IDs (0..255)
    mapping(uint256 => uint256) public servedLevels;

    // last term end per (seatId, level)
    mapping(uint256 => mapping(uint8 => uint64)) public lastTermEnd;

    event Transfer(address indexed from, address indexed to, uint256 indexed seatId);
    event IssuerSet(address indexed issuer, bool ok);
    event CohortSet(uint256 indexed seatId, uint32 arbanId);
    event CompetencySet(uint256 indexed seatId, uint16 flags);
    event ServedMarked(uint256 indexed seatId, uint8 indexed level, uint64 termEndTs);

    error NotAuthorized();
    error Soulbound();
    error ZeroAddress();
    error SeatExists();
    error Nonexistent();
    error InvalidCohort();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert NotAuthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true; // bootstrap
        emit IssuerSet(msg.sender, true);
    }

    function setIssuer(address issuer, bool ok) external onlyOwner {
        isIssuer[issuer] = ok;
        emit IssuerSet(issuer, ok);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balanceOf[account];
    }

    function ownerOf(uint256 seatId) public view returns (address) {
        address seatOwner = _ownerOf[seatId];
        if (seatOwner == address(0)) revert Nonexistent();
        return seatOwner;
    }

    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    // --- mint/burn: only issuers ---
    function mintSeat(
        address to,
        uint256 seatId,
        uint32 _cohortArbanId,
        uint16 _competencyFlags
    ) external onlyIssuer {
        if (to == address(0)) revert ZeroAddress();
        if (_ownerOf[seatId] != address(0)) revert SeatExists();
        if (_cohortArbanId == 0) revert InvalidCohort();

        _ownerOf[seatId] = to;
        _balanceOf[to] += 1;

        cohortArbanId[seatId] = _cohortArbanId;
        competencyFlags[seatId] = _competencyFlags;

        emit Transfer(address(0), to, seatId);
        emit CohortSet(seatId, _cohortArbanId);
        emit CompetencySet(seatId, _competencyFlags);
    }

    function revokeSeat(uint256 seatId) external onlyIssuer {
        address seatOwner = _ownerOf[seatId];
        if (seatOwner == address(0)) revert Nonexistent();

        _balanceOf[seatOwner] -= 1;
        delete _ownerOf[seatId];

        // cohort/competency/served history deliberately kept (governance audit trail)
        emit Transfer(seatOwner, address(0), seatId);
    }

    // --- admin metadata updates (only issuers) ---
    function setCohort(uint256 seatId, uint32 _cohortArbanId) external onlyIssuer {
        if (_ownerOf[seatId] == address(0)) revert Nonexistent();
        if (_cohortArbanId == 0) revert InvalidCohort();
        cohortArbanId[seatId] = _cohortArbanId;
        emit CohortSet(seatId, _cohortArbanId);
    }

    function setCompetency(uint256 seatId, uint16 flags) external onlyIssuer {
        if (_ownerOf[seatId] == address(0)) revert Nonexistent();
        competencyFlags[seatId] = flags;
        emit CompetencySet(seatId, flags);
    }

    function markServed(uint256 seatId, uint8 level, uint64 termEndTs) external onlyIssuer {
        // seat may be revoked by the time we mark served; keep it allowed
        servedLevels[seatId] |= (uint256(1) << uint256(level));
        lastTermEnd[seatId][level] = termEndTs;
        emit ServedMarked(seatId, level, termEndTs);
    }

    function hasServed(uint256 seatId, uint8 level) external view returns (bool) {
        return (servedLevels[seatId] & (uint256(1) << uint256(level))) != 0;
    }

    function getLastTermEnd(uint256 seatId, uint8 level) external view returns (uint64) {
        return lastTermEnd[seatId][level];
    }

    /// @notice Exists check for external registries
    /// @notice Exists check for external registries
    function exists(uint256 seatId) external view returns (bool) {
        try this.ownerOf(seatId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

}
