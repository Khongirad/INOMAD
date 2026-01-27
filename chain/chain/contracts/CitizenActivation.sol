// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function mintSeat(address to, uint256 seatId, uint32 cohortArbanId, uint16 competencyFlags) external;
    function setIssuer(address issuer, bool ok) external;
    function isIssuer(address) external view returns (bool);
    function owner() external view returns (address);
}

/**
 * CitizenActivation (MVP)
 * - Owner issues seats (SeatSBT.mintSeat)
 * - Allowed verifiers attest
 * - After N attestations: seat becomes ACTIVE
 */
contract CitizenActivation {
    enum Status { NONE, ISSUED, ACTIVE }

    ISeatSBT public immutable seatSbt;
    address public owner;
    uint8 public requiredAttestations;

    mapping(uint256 => Status) public status; // seatId -> status
    mapping(address => bool) public isVerifier;
    mapping(uint256 => uint8) public attestCount;
    mapping(uint256 => mapping(address => bool)) public attestedBy;

    event OwnerSet(address indexed newOwner);
    event VerifierSet(address indexed verifier, bool ok);
    event RequiredAttestationsSet(uint8 n);

    event SeatIssued(uint256 indexed seatId, address indexed to);
    event Attested(uint256 indexed seatId, address indexed verifier, uint8 count);
    event Activated(uint256 indexed seatId);

    error NotOwner();
    error NotVerifier();
    error AlreadyIssued();
    error NotIssued();
    error AlreadyAttested();
    error BadParam();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address seatSbt_, address owner_, uint8 requiredAttestations_) {
        if (seatSbt_ == address(0) || owner_ == address(0)) revert BadParam();
        if (requiredAttestations_ == 0) revert BadParam();
        seatSbt = ISeatSBT(seatSbt_);
        owner = owner_;
        requiredAttestations = requiredAttestations_;
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert BadParam();
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function setRequiredAttestations(uint8 n) external onlyOwner {
        if (n == 0) revert BadParam();
        requiredAttestations = n;
        emit RequiredAttestationsSet(n);
    }

    function setVerifier(address v, bool ok) external onlyOwner {
        isVerifier[v] = ok;
        emit VerifierSet(v, ok);
    }

    function issue(address to, uint256 seatId, uint32 cohortArbanId, uint16 competencyFlags) external onlyOwner {
        if (status[seatId] != Status.NONE) revert AlreadyIssued();
        status[seatId] = Status.ISSUED;
        seatSbt.mintSeat(to, seatId, cohortArbanId, competencyFlags);
        emit SeatIssued(seatId, to);
    }

    function attest(uint256 seatId) external {
        if (!isVerifier[msg.sender]) revert NotVerifier();
        if (status[seatId] != Status.ISSUED) revert NotIssued();
        if (attestedBy[seatId][msg.sender]) revert AlreadyAttested();

        attestedBy[seatId][msg.sender] = true;
        uint8 c = ++attestCount[seatId];
        emit Attested(seatId, msg.sender, c);

        if (c >= requiredAttestations) {
            status[seatId] = Status.ACTIVE;
            emit Activated(seatId);
        }
    }

    function isActive(uint256 seatId) external view returns (bool) {
        return status[seatId] == Status.ACTIVE;
    }
}
