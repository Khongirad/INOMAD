// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ForeignSeatSBT (Soulbound):
 * - non-transferable
 * - mint/burn only by minter (ForeignAffairsRegistry / GatewayRouter)
 * - minimal ERC721-like: ownerOf, balanceOf
 */
contract ForeignSeatSBT {
    error NotOwner();
    error NotMinter();
    error NonTransferable();

    event MinterChanged(address indexed oldMinter, address indexed newMinter);
    event Minted(uint256 indexed foreignSeatId, address indexed to, bytes32 indexed passportHash);
    event Burned(uint256 indexed foreignSeatId, address indexed from);

    string public name = "Altan Foreign Seat (SBT)";
    string public symbol = "FSEAT";

    address public owner;
    address public minter;

    uint256 public nextId = 1;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    mapping(uint256 => bytes32) public passportHashOfSeat; // attestation anchor
    mapping(uint256 => string)  public tokenURI;           // optional metadata pointer

    constructor(address owner_) {
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    function setMinter(address newMinter) external onlyOwner {
        emit MinterChanged(minter, newMinter);
        minter = newMinter;
    }

    function ownerOf(uint256 id) external view returns (address) {
        address o = _ownerOf[id];
        require(o != address(0), "NOT_MINTED");
        return o;
    }

    function balanceOf(address a) external view returns (uint256) {
        require(a != address(0), "ZERO_ADDR");
        return _balanceOf[a];
    }

    function mint(address to, bytes32 passportHash, string calldata uri) external onlyMinter returns (uint256 id) {
        require(to != address(0), "ZERO_TO");
        require(passportHash != bytes32(0), "EMPTY_PASSPORT_HASH");

        id = nextId++;
        _ownerOf[id] = to;
        _balanceOf[to] += 1;

        passportHashOfSeat[id] = passportHash;
        if (bytes(uri).length != 0) tokenURI[id] = uri;

        emit Minted(id, to, passportHash);
    }

    function burn(uint256 id) external onlyMinter {
        address from = _ownerOf[id];
        require(from != address(0), "NOT_MINTED");

        delete _ownerOf[id];
        _balanceOf[from] -= 1;

        delete passportHashOfSeat[id];
        delete tokenURI[id];

        emit Burned(id, from);
    }

    // Soulbound: block all transfers/approvals
    function approve(address, uint256) external pure { revert NonTransferable(); }
    function setApprovalForAll(address, bool) external pure { revert NonTransferable(); }
    function getApproved(uint256) external pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }

    function transferFrom(address, address, uint256) external pure { revert NonTransferable(); }
    function safeTransferFrom(address, address, uint256) external pure { revert NonTransferable(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert NonTransferable(); }
}
