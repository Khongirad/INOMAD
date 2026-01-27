// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DocumentRegistry {
    enum Grade { CITIZEN, ZUN, MYANGAN, TUMEN, CHAIRMAN }
    enum Status { NONE, ISSUED, FINALIZED, REVOKED }

    struct DocMeta {
        Grade grade;
        uint256 scopeId;     // для ZUN: zunId; для CITIZEN: citizenId/seatId (потом)
        bytes32 docHash;     // hash контента
        address notary;      // кто выпустил
        address docAddress;  // адрес документа-контракта
        Status status;
    }

    address public owner;
    uint256 public nextDocId = 1;

    mapping(uint256 => DocMeta) public docs;

    event Issued(uint256 indexed docId, Grade grade, uint256 scopeId, address indexed notary, address indexed docAddress, bytes32 docHash);
    event StatusChanged(uint256 indexed docId, Status status);

    error NotOwner();
    error DocNotFound(uint256 docId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function issue(
        Grade grade,
        uint256 scopeId,
        bytes32 docHash,
        address notary,
        address docAddress
    ) external onlyOwner returns (uint256 docId) {
        docId = nextDocId++;
        docs[docId] = DocMeta({
            grade: grade,
            scopeId: scopeId,
            docHash: docHash,
            notary: notary,
            docAddress: docAddress,
            status: Status.ISSUED
        });
        emit Issued(docId, grade, scopeId, notary, docAddress, docHash);
    }

    function setStatus(uint256 docId, Status status) external onlyOwner {
        if (docs[docId].status == Status.NONE) revert DocNotFound(docId);
        docs[docId].status = status;
        emit StatusChanged(docId, status);
    }
}
