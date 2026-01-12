// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./Organization.sol";
import "./SeatSBT.sol";

/**
 * Arban = базовая ячейка (десятка)
 * - принадлежит одной Organization
 * - до 10 участников (seatId)
 * - имеет лидера (десятника)
 */
contract Arban is AccessControl {
    bytes32 public constant ARBAN_ADMIN_ROLE = keccak256("ARBAN_ADMIN_ROLE");

    Organization public immutable organization;
    SeatSBT public immutable seat;

    uint256 public immutable arbanId;
    address public leader; // десятник (EOA)

    uint256[] private members; // seatId[]
    mapping(uint256 => bool) public isMember; // seatId -> bool

    event MemberAdded(uint256 indexed seatId);
    event LeaderChanged(address indexed oldLeader, address indexed newLeader);

    error ARBAN_FULL();
    error ALREADY_MEMBER();
    error NOT_MEMBER();
    error ZERO_ADDRESS();

    constructor(
        address _organization,
        address _seatSbt,
        uint256 _arbanId,
        address _leader
    ) {
        if (_leader == address(0)) revert ZERO_ADDRESS();

        organization = Organization(_organization);
        seat = SeatSBT(_seatSbt);
        arbanId = _arbanId;
        leader = _leader;

        _grantRole(DEFAULT_ADMIN_ROLE, _leader);
        _grantRole(ARBAN_ADMIN_ROLE, _leader);
    }

    function addMember(uint256 seatId) external onlyRole(ARBAN_ADMIN_ROLE) {
        if (members.length >= 10) revert ARBAN_FULL();
        if (isMember[seatId]) revert ALREADY_MEMBER();

        members.push(seatId);
        isMember[seatId] = true;

        emit MemberAdded(seatId);
    }

    function changeLeader(address newLeader) external onlyRole(ARBAN_ADMIN_ROLE) {
        if (newLeader == address(0)) revert ZERO_ADDRESS();

        address old = leader;
        leader = newLeader;

        _grantRole(ARBAN_ADMIN_ROLE, newLeader);
        _revokeRole(ARBAN_ADMIN_ROLE, old);

        emit LeaderChanged(old, newLeader);
    }

    function memberCount() external view returns (uint256) {
        return members.length;
    }

    function getMembers() external view returns (uint256[] memory) {
        return members;
    }
}
