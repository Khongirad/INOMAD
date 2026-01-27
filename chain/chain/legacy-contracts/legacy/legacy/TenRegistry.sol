// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

import "./SeatSBT.sol";
import "./SeatAccount.sol";
import "./CentralBank.sol";

contract TenRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    SeatSBT public immutable seat;
    SeatAccountFactory public immutable factory;
    CentralBank public immutable bank;

    struct Ten {
        uint256[10] seats;
        bool approved;
        address proposer;
    }

    Ten[] public tens;

    event TenProposed(uint256 indexed tenId, address indexed proposer);
    event TenApproved(uint256 indexed tenId);

    constructor(address seatSbt, address seatAccountFactory, address centralBank) {
        seat = SeatSBT(seatSbt);
        factory = SeatAccountFactory(seatAccountFactory);
        bank = CentralBank(centralBank);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function proposeTen(uint256[10] calldata seatIds) external returns (uint256 tenId) {
        // на MVP: проверка минимальная — что seat существует
        for (uint256 i = 0; i < 10; i++) {
            require(IERC721(address(seat)).ownerOf(seatIds[i]) != address(0), "Seat nonexistent");
        }

        tens.push(Ten({ seats: seatIds, approved: false, proposer: msg.sender }));

        tenId = tens.length - 1;
        emit TenProposed(tenId, msg.sender);
    }

    function approveTen(uint256 tenId) external onlyRole(REGISTRAR_ROLE) {
        Ten storage t = tens[tenId];
        require(!t.approved, "Already approved");

        for (uint256 i = 0; i < 10; i++) {
            uint256 seatId = t.seats[i];
            address owner = IERC721(address(seat)).ownerOf(seatId);

            // 1) создаем SeatAccount если нет
            address account = seat.accountOf(seatId);
            if (account == address(0)) {
                // salt детерминированный
                bytes32 salt = keccak256(abi.encodePacked("SEAT_ACCOUNT", seatId));
                account = factory.createAccount(seatId, owner, salt);
                seat.setAccount(seatId, account);
            }

            // 2) ставим статус Verified10
            seat.setStatus(seatId, SeatSBT.Status.Verified10);

            // 3) начисляем ALTAN на SeatAccount
            bank.issue(account, bank.tenRewardPerSeat());
        }

        t.approved = true;
        emit TenApproved(tenId);
    }

    function count() external view returns (uint256) {
        return tens.length;
    }
}
