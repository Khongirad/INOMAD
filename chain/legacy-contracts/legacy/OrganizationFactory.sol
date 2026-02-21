// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./Organization.sol";
import "./Arban.sol";
import "./SeatSBT.sol";
import "./StructureRegistry.sol";

/**
 * OrganizationFactory
 * - создает Organization (паспорт)
 * - создает StructureRegistry (Tumen-каркас) и сразу собирает полный Tumen
 * - сразу создает первый Arban (десятку)
 * - хранит orgId -> (org, structureRegistry, firstArban)
 */
contract OrganizationFactory is AccessControl {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");

    SeatSBT public immutable seat;

    uint256 public nextOrgId = 1;
    uint256 public nextArbanId = 1;

    struct OrgRecord {
        address org;
        address founder;
        Organization.OrgType orgType;
        Organization.Branch branch;
        address notary;
        address archivist;

        address structureRegistry;
        uint256 tumenId;

        address firstArban;
        uint256 firstArbanId;
    }

    mapping(uint256 => OrgRecord) public orgOf;

    event OrganizationDeployed(
        uint256 indexed orgId,
        address indexed org,
        address indexed founder,
        Organization.OrgType orgType,
        Organization.Branch branch
    );

    event StructureRegistryCreated(
        uint256 indexed orgId,
        address indexed structureRegistry,
        uint256 indexed tumenId
    );

    event FirstArbanCreated(
        uint256 indexed orgId,
        uint256 indexed arbanId,
        address indexed arban,
        address leader
    );

    constructor(address seatSbt) {
        seat = SeatSBT(seatSbt);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FACTORY_ADMIN_ROLE, msg.sender);
    }

    function createOrganizationWithArban(
        Organization.OrgType orgType,
        Organization.Branch branch,
        address notary,
        address archivist
    ) external returns (uint256 orgId, address orgAddr, uint256 arbanId, address arbanAddr) {
        orgId = nextOrgId++;
        uint256 tId = orgId;

        // 1) deploy StructureRegistry
        StructureRegistry structure = new StructureRegistry(tId, msg.sender);
        address structureAddr = address(structure);

        // 2) deploy Organization
        Organization org = new Organization(
            msg.sender,
            orgType,
            branch,
            notary,
            archivist,
            structureAddr,
            address(0)
        );

        // 3) deploy first Arban
        arbanId = nextArbanId++;
        Arban arban = new Arban(address(org), address(seat), arbanId, msg.sender);

        // 4) build full tumen skeleton now
        structure.buildFullTumen();

        // 5) store record (минимум локалок)
        OrgRecord storage r = orgOf[orgId];
        r.org = address(org);
        r.founder = msg.sender;
        r.orgType = orgType;
        r.branch = branch;
        r.notary = notary;
        r.archivist = archivist;
        r.structureRegistry = structureAddr;
        r.tumenId = tId;
        r.firstArban = address(arban);
        r.firstArbanId = arbanId;

        emit StructureRegistryCreated(orgId, structureAddr, tId);
        emit OrganizationDeployed(orgId, address(org), msg.sender, orgType, branch);
        emit FirstArbanCreated(orgId, arbanId, address(arban), msg.sender);

        // returns
        orgAddr = address(org);
        arbanAddr = address(arban);
    }

    function getOrg(uint256 orgId) external view returns (OrgRecord memory) {
        return orgOf[orgId];
    }
}
