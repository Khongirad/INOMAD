// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function mintSeat(address to) external returns (uint256 seatId);
}

/**
 * Minimal ElectionRegistry demo:
 * - registerWinner(positionId, winner)
 * - finalize(positionId) mints SeatSBT to winner
 *
 * NOTE:
 * Здесь seatId НЕ задается извне, его выдаёт SeatSBT (nextId++).
 * Поэтому используем positionId (или electionId) как ключ реестра победителя.
 */
contract ElectionRegistry {
    address public immutable admin;
    ISeatSBT public immutable seat;

    // positionId/electionId -> winner
    mapping(uint256 => address) public winnerOf;

    error NOT_ADMIN();
    error WINNER_ALREADY_SET();
    error INVALID_WINNER();

    constructor(address seat_) {
        admin = msg.sender;
        seat = ISeatSBT(seat_);
    }

    function registerWinner(uint256 positionId, address winner) external {
        if (msg.sender != admin) revert NOT_ADMIN();
        if (winnerOf[positionId] != address(0)) revert WINNER_ALREADY_SET();
        if (winner == address(0)) revert INVALID_WINNER();
        winnerOf[positionId] = winner;
    }

    function finalize(uint256 positionId) external {
        if (msg.sender != admin) revert NOT_ADMIN();
        address winner = winnerOf[positionId];
        if (winner == address(0)) revert INVALID_WINNER();

        // mint SeatSBT to winner; SeatSBT returns newly created seatId
        seat.mintSeat(winner);
    }
}
