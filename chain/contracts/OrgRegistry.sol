// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function cohortArbanId(uint256 seatId) external view returns (uint32);
}

contract OrgRegistry {
    enum UnitLevel { ARBAN, ZUN, MYANGAN, TUMEN }

    error NotSeatOwner();
    error OrgNotFound();
    error InvalidParent();
    error InvalidLevel();
    error InvalidWallet();

    struct Org {
        uint256 orgId;
        uint256 adminSeatId;
        address wallet;
        string  metadataURI;
        uint256 rootUnitId;
        bool exists;
    }

    struct Unit {
        uint256 unitId;
        uint256 orgId;
        UnitLevel level;
        uint256 parentUnitId;
        uint256 indexInParent; // 0..9
        string  label;
        bool exists;
    }

    ISeatSBT public immutable seatSbt;

    uint256 public nextOrgId = 1;
    uint256 public nextUnitId = 1;

    mapping(uint256 => Org) public orgs;
    mapping(uint256 => Unit) public units;
    mapping(uint256 => uint256[]) public orgUnits;

    event OrgCreated(uint256 indexed orgId, uint256 indexed adminSeatId, address wallet, uint256 rootUnitId, string metadataURI);
    event OrgUpdated(uint256 indexed orgId, string metadataURI, address wallet);
    event UnitCreated(uint256 indexed orgId, uint256 indexed unitId, UnitLevel level, uint256 parentUnitId, uint256 indexInParent, string label);
    event AdminSeatChanged(uint256 indexed orgId, uint256 indexed oldSeatId, uint256 indexed newSeatId);

    constructor(address seatSbt_) {
        seatSbt = ISeatSBT(seatSbt_);
    }

    modifier onlySeatOwner(uint256 seatId) {
        if (seatSbt.ownerOf(seatId) != msg.sender) revert NotSeatOwner();
        _;
    }

    modifier onlyOrgAdmin(uint256 orgId) {
        Org storage o = orgs[orgId];
        if (!o.exists) revert OrgNotFound();
        if (seatSbt.ownerOf(o.adminSeatId) != msg.sender) revert NotSeatOwner();
        _;
    }

    function createOrg(uint256 adminSeatId, address wallet, string calldata metadataURI)
        external
        onlySeatOwner(adminSeatId)
        returns (uint256 orgId, uint256 rootUnitId)
    {
        if (wallet == address(0)) revert InvalidWallet();

        orgId = nextOrgId++;

        // root unit = ARBAN
        rootUnitId = _createUnit(orgId, UnitLevel.ARBAN, 0, 0, "Arban-Root");

        orgs[orgId] = Org({
            orgId: orgId,
            adminSeatId: adminSeatId,
            wallet: wallet,
            metadataURI: metadataURI,
            rootUnitId: rootUnitId,
            exists: true
        });

        emit OrgCreated(orgId, adminSeatId, wallet, rootUnitId, metadataURI);
    }

    function setOrgMetadata(uint256 orgId, string calldata metadataURI) external onlyOrgAdmin(orgId) {
        orgs[orgId].metadataURI = metadataURI;
        emit OrgUpdated(orgId, metadataURI, orgs[orgId].wallet);
    }

    function setOrgWallet(uint256 orgId, address wallet) external onlyOrgAdmin(orgId) {
        if (wallet == address(0)) revert InvalidWallet();
        orgs[orgId].wallet = wallet;
        emit OrgUpdated(orgId, orgs[orgId].metadataURI, wallet);
    }

    function changeAdminSeat(uint256 orgId, uint256 newAdminSeatId) external onlyOrgAdmin(orgId) {
        if (seatSbt.ownerOf(newAdminSeatId) != msg.sender) revert NotSeatOwner();
        uint256 old = orgs[orgId].adminSeatId;
        orgs[orgId].adminSeatId = newAdminSeatId;
        emit AdminSeatChanged(orgId, old, newAdminSeatId);
    }

    function createUnit(
        uint256 orgId,
        UnitLevel level,
        uint256 parentUnitId,
        uint256 indexInParent,
        string calldata label
    ) external onlyOrgAdmin(orgId) returns (uint256 unitId) {
        if (parentUnitId == 0) revert InvalidParent();
        Unit storage p = units[parentUnitId];
        if (!p.exists || p.orgId != orgId) revert InvalidParent();

        if (uint256(level) != uint256(p.level) + 1) revert InvalidLevel();
        if (indexInParent > 9) revert InvalidParent();

        unitId = _createUnit(orgId, level, parentUnitId, indexInParent, label);
    }

    function _createUnit(
        uint256 orgId,
        UnitLevel level,
        uint256 parentUnitId,
        uint256 indexInParent,
        string memory label
    ) internal returns (uint256 unitId) {
        unitId = nextUnitId++;
        units[unitId] = Unit({
            unitId: unitId,
            orgId: orgId,
            level: level,
            parentUnitId: parentUnitId,
            indexInParent: indexInParent,
            label: label,
            exists: true
        });
        orgUnits[orgId].push(unitId);
        emit UnitCreated(orgId, unitId, level, parentUnitId, indexInParent, label);
    }
}
