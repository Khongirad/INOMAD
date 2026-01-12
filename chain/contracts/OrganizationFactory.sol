// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./Organization.sol";
import "./Arban.sol";
import "./SeatSBT.sol";

/**
 * OrganizationFactory
 * - создает Organization (паспорт)
 * - сразу создает первый Arban (десятку)
 * - хранит orgId -> (org, firstArban)
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

    /**
     * MVP: любой может создать организацию.
     * Сразу создаётся первый Arban (десятка), лидер = msg.sender.
     */
    function createOrganizationWithArban(
        Organization.OrgType orgType,
        Organization.Branch branch,
        address notary,
        address archivist
    ) external returns (uint256 orgId, address orgAddr, uint256 arbanId, address arbanAddr) {
        orgId = nextOrgId++;

        Organization org = new Organization(
            msg.sender,
            orgType,
            branch,
            notary,
            archivist
        );
        orgAddr = address(org);

        arbanId = nextArbanId++;
        Arban arban = new Arban(
            orgAddr,
            address(seat),
            arbanId,
            msg.sender
        );
        arbanAddr = address(arban);

        orgOf[orgId] = OrgRecord({
            org: orgAddr,
            founder: msg.sender,
            orgType: orgType,
            branch: branch,
            notary: notary,
            archivist: archivist,
            firstArban: arbanAddr,
            firstArbanId: arbanId
        });

        emit OrganizationDeployed(orgId, orgAddr, msg.sender, orgType, branch);
        emit FirstArbanCreated(orgId, arbanId, arbanAddr, msg.sender);
    }

    function getOrg(uint256 orgId) external view returns (OrgRecord memory) {
        return orgOf[orgId];
    }
}
