// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SeatSBT — конституционная "сидушка" гражданина.
 * Закон: once minted -> NEVER transferable, NEVER burnable, NEVER revocable.
 *
 * Важно:
 * - Санкции/ограничения делаются через ActivationRegistry (BANNED/LOCKED),
 *   а НЕ через уничтожение seat.
 * - SeatSBT не принимает ETH и не является кошельком.
 */
contract SeatSBT {
    /* ===================== Errors ===================== */
    error NotIssuer();
    error ZeroAddress();
    error SeatExists();
    error NonexistentSeat();
    error Soulbound();
    error ApprovalsDisabled();
    error Unsupported();

    /* ===================== EIP-165 Interface IDs ===================== */
    bytes4 private constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;

    /* ===================== Metadata ===================== */
    string public constant name = "SeatSBT";
    string public constant symbol = "SEAT";

    /* ===================== Core storage ===================== */
    address public immutable issuer;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    uint256 public totalSupply;

    /* ===================== Events ===================== */
    event Transfer(address indexed from, address indexed to, uint256 indexed seatId);
    event SeatMinted(address indexed to, uint256 indexed seatId);

    constructor(address issuer_) {
        if (issuer_ == address(0)) revert ZeroAddress();
        issuer = issuer_;
    }

    /* ===================== Views ===================== */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == _INTERFACE_ID_ERC165 ||
            interfaceId == _INTERFACE_ID_ERC721 ||
            interfaceId == _INTERFACE_ID_ERC721_METADATA;
    }

    function balanceOf(address account) public view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balanceOf[account];
    }

    function ownerOf(uint256 seatId) public view returns (address) {
        address seatOwner = _ownerOf[seatId];
        if (seatOwner == address(0)) revert NonexistentSeat();
        return seatOwner;
    }

    function exists(uint256 seatId) public view returns (bool) {
        return _ownerOf[seatId] != address(0);
    }

    // Metadata intentionally unsupported at Seat level (lives in CitizenRegistry/DocumentRegistry)
    function tokenURI(uint256) external pure returns (string memory) {
        revert Unsupported();
    }

    /* ===================== Soulbound: hard-disable transfers/approvals ===================== */
    function transferFrom(address, address, uint256) public pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) public pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) public pure { revert Soulbound(); }

    function approve(address, uint256) public pure { revert ApprovalsDisabled(); }
    function setApprovalForAll(address, bool) public pure { revert ApprovalsDisabled(); }
    function getApproved(uint256) public pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) public pure returns (bool) { return false; }

    /* ===================== Issuance ===================== */
    function mintSeat(address to, uint256 seatId) external {
        if (msg.sender != issuer) revert NotIssuer();
        if (to == address(0)) revert ZeroAddress();
        if (_ownerOf[seatId] != address(0)) revert SeatExists();

        _ownerOf[seatId] = to;
        unchecked {
            _balanceOf[to] += 1;
            totalSupply += 1;
        }

        emit Transfer(address(0), to, seatId);
        emit SeatMinted(to, seatId);
    }

    // No burn/revoke/owner-change functions by constitutional law.
}
