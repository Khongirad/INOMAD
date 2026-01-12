// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * SeatSBT = "цифровой гражданин" (Soulbound)
 * - не передается
 * - хранит статус
 * - хранит привязанный SeatTamga (смарт-кошелек)
 */
contract SeatSBT is ERC721, AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum Status {
        Draft,
        Verified10,
        VerifiedMarriage,
        Citizen
    }

    uint256 public nextId = 1;

    mapping(uint256 => Status) public statusOf;
    mapping(uint256 => address) public tamgaOf; // seatId -> SeatTamga

    constructor() ERC721("INOMAD Seat", "SEAT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function mintSeat(address to) external onlyRole(REGISTRAR_ROLE) returns (uint256 seatId) {
        seatId = nextId++;
        _safeMint(to, seatId);
        statusOf[seatId] = Status.Draft;
    }

    function setStatus(uint256 seatId, Status s) external onlyRole(REGISTRAR_ROLE) {
        require(_ownerOf(seatId) != address(0), "Seat: nonexistent");
        statusOf[seatId] = s;
    }

    function setTamga(uint256 seatId, address seatTamga) external onlyRole(REGISTRAR_ROLE) {
        require(_ownerOf(seatId) != address(0), "Seat: nonexistent");
        tamgaOf[seatId] = seatTamga;
    }

    function isCitizen(uint256 seatId) external view returns (bool) {
        return statusOf[seatId] == Status.Citizen;
    }

    // Soulbound: запрещаем трансферы
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = _ownerOf(tokenId);
        // разрешаем mint (from == 0) и burn (to == 0), но запрещаем обычный transfer
        if (from != address(0) && to != address(0)) revert("SeatSBT: non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
