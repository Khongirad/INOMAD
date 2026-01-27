// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IOrgRegistry {
    function orgs(uint256 orgId) external view returns (
        uint256 _orgId,
        uint256 adminSeatId,
        address wallet,
        string memory metadataURI,
        uint256 rootUnitId,
        bool exists
    );

    function units(uint256 unitId) external view returns (
        uint256 _unitId,
        uint256 orgId,
        uint8 level,
        uint256 parentUnitId,
        uint256 indexInParent,
        string memory label,
        bool exists
    );
}

contract OrgPositionsRegistry {
    error OrgNotFound();
    error UnitNotFound();
    error NotOrgAdmin();
    error InvalidRole();
    error SlotAlreadyOccupied();
    error SlotEmpty();

    struct Role {
        uint32 roleId;
        string name;
        uint256 permissions;
        uint256 maxValuePerTx;
        bool exists;
    }

    mapping(uint256 => mapping(uint16 => uint256)) public occupantSeatOfSlot; // unitId => slotId => seatId
    mapping(uint256 => mapping(uint32 => Role)) public roles;                // orgId => roleId => Role
    mapping(uint256 => mapping(uint16 => uint32)) public slotRole;           // unitId => slotId => roleId

    ISeatSBT public immutable seatSbt;
    IOrgRegistry public immutable orgRegistry;

    event RoleDefined(uint256 indexed orgId, uint32 indexed roleId, string name, uint256 permissions, uint256 maxValuePerTx);
    event SlotAssigned(uint256 indexed orgId, uint256 indexed unitId, uint16 indexed slotId, uint32 roleId, uint256 occupantSeatId);
    event SlotCleared(uint256 indexed orgId, uint256 indexed unitId, uint16 indexed slotId, uint256 oldOccupantSeatId);

    constructor(address seatSbt_, address orgRegistry_) {
        seatSbt = ISeatSBT(seatSbt_);
        orgRegistry = IOrgRegistry(orgRegistry_);
    }

    function _orgAdminSeat(uint256 orgId) internal view returns (uint256 adminSeatId) {
        bool exists;
        (, adminSeatId, , , , exists) = orgRegistry.orgs(orgId);
        if (!exists) revert OrgNotFound();
    }

    modifier onlyOrgAdmin(uint256 orgId) {
        uint256 adminSeatId = _orgAdminSeat(orgId);
        if (seatSbt.ownerOf(adminSeatId) != msg.sender) revert NotOrgAdmin();
        _;
    }

    function defineRole(
        uint256 orgId,
        uint32 roleId,
        string calldata name,
        uint256 permissions,
        uint256 maxValuePerTx
    ) external onlyOrgAdmin(orgId) {
        roles[orgId][roleId] = Role({
            roleId: roleId,
            name: name,
            permissions: permissions,
            maxValuePerTx: maxValuePerTx,
            exists: true
        });
        emit RoleDefined(orgId, roleId, name, permissions, maxValuePerTx);
    }

    function assign(uint256 unitId, uint16 slotId, uint32 roleId, uint256 occupantSeatId) external {
        (, uint256 orgId, , , , , bool unitExists) = orgRegistry.units(unitId);
        if (!unitExists) revert UnitNotFound();

        uint256 adminSeatId = _orgAdminSeat(orgId);
        if (seatSbt.ownerOf(adminSeatId) != msg.sender) revert NotOrgAdmin();

        Role storage r = roles[orgId][roleId];
        if (!r.exists) revert InvalidRole();

        if (occupantSeatOfSlot[unitId][slotId] != 0) revert SlotAlreadyOccupied();

        // revert if seat doesn't exist
        seatSbt.ownerOf(occupantSeatId);

        occupantSeatOfSlot[unitId][slotId] = occupantSeatId;
        slotRole[unitId][slotId] = roleId;

        emit SlotAssigned(orgId, unitId, slotId, roleId, occupantSeatId);
    }

    function clear(uint256 unitId, uint16 slotId) external {
        (, uint256 orgId, , , , , bool unitExists) = orgRegistry.units(unitId);
        if (!unitExists) revert UnitNotFound();

        uint256 adminSeatId = _orgAdminSeat(orgId);
        if (seatSbt.ownerOf(adminSeatId) != msg.sender) revert NotOrgAdmin();

        uint256 oldSeat = occupantSeatOfSlot[unitId][slotId];
        if (oldSeat == 0) revert SlotEmpty();

        delete occupantSeatOfSlot[unitId][slotId];
        delete slotRole[unitId][slotId];

        emit SlotCleared(orgId, unitId, slotId, oldSeat);
    }

    function getSlot(uint256 unitId, uint16 slotId) external view returns (uint256 occupantSeatId, uint32 roleId) {
        occupantSeatId = occupantSeatOfSlot[unitId][slotId];
        roleId = slotRole[unitId][slotId];
    }
}
