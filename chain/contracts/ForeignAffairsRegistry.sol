// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IForeignSeatSBT {
    function owner() external view returns (address);
    function setMinter(address newMinter) external;

    function mint(address to, bytes32 passportHash, string calldata uri) external returns (uint256);
    function burn(uint256 id) external;

    function ownerOf(uint256 id) external view returns (address);
}

contract ForeignAffairsRegistry {
    error NotOwner();
    error NotOfficer();
    error AlreadyOfficer();
    error NotSeatOwner();
    error ZeroHash();
    error PassportAlreadyBound();

    event OfficerSet(address indexed officer, bool ok);
    event ForeignSeatIssued(uint256 indexed foreignSeatId, address indexed to, bytes32 indexed passportHash, string uri);
    event ForeignSeatRevoked(uint256 indexed foreignSeatId, address indexed from);
    event PassportBound(bytes32 indexed passportHash, uint256 indexed foreignSeatId);

    address public owner;
    IForeignSeatSBT public immutable foreignSeatSbt;

    // MFA/MVP: human officers (embassy/consulate staff)
    mapping(address => bool) public officer;

    // passportHash -> foreignSeatId (prevents duplicates)
    mapping(bytes32 => uint256) public seatOfPassport;

    constructor(address foreignSeatSbt_, address owner_) {
        foreignSeatSbt = IForeignSeatSBT(foreignSeatSbt_);
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOfficer() {
        if (!officer[msg.sender] && msg.sender != owner) revert NotOfficer();
        _;
    }

    function setOfficer(address a, bool ok) external onlyOwner {
        officer[a] = ok;
        emit OfficerSet(a, ok);
    }

    // issue foreign seat after offchain KYC/legalization; store only passportHash anchor
    function issueForeignSeat(address to, bytes32 passportHash, string calldata uri) external onlyOfficer returns (uint256 id) {
        if (passportHash == bytes32(0)) revert ZeroHash();
        if (seatOfPassport[passportHash] != 0) revert PassportAlreadyBound();

        id = foreignSeatSbt.mint(to, passportHash, uri);
        seatOfPassport[passportHash] = id;

        emit PassportBound(passportHash, id);
        emit ForeignSeatIssued(id, to, passportHash, uri);
    }

    function revokeForeignSeat(uint256 foreignSeatId) external onlyOfficer {
        address o = foreignSeatSbt.ownerOf(foreignSeatId);

        // find passportHash by reading event index offchain; onchain we only clear via reverse mapping known by officer
        // MVP: officer supplies passportHash to clear mapping (safer than scanning)
        foreignSeatSbt.burn(foreignSeatId);

        emit ForeignSeatRevoked(foreignSeatId, o);
    }

    // admin: allow owner to rotate owner (ministry leadership)
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
