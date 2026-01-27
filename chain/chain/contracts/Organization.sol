// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Organization = "корабль" (паспорт организации)
 */
contract Organization is AccessControl {
    bytes32 public constant ORG_ADMIN_ROLE = keccak256("ORG_ADMIN_ROLE");

    enum OrgType { PRIVATE, STATE, PPP }
    enum Branch { NONE, LEGISLATIVE, EXECUTIVE, JUDICIAL, BANKING }

    OrgType public immutable orgType;
    Branch public immutable branch;
    address public immutable founder;

    address public notary;
    address public archivist;

    address public structureRegistry;
    address public documentRegistry;

    event OrganizationCreated(address indexed org, address indexed founder, OrgType orgType, Branch branch);
    event CenterUpdated(address indexed notary, address indexed archivist);
    event ModulesUpdated(address indexed structureRegistry, address indexed documentRegistry);

    error ZERO_ADDRESS();

    constructor(
        address _founder,
        OrgType _orgType,
        Branch _branch,
        address _notary,
        address _archivist,
        address _structureRegistry,
        address _documentRegistry
    ) {
        if (_founder == address(0)) revert ZERO_ADDRESS();

        founder = _founder;
        orgType = _orgType;
        branch = _branch;

        _grantRole(DEFAULT_ADMIN_ROLE, _founder);
        _grantRole(ORG_ADMIN_ROLE, _founder);

        notary = _notary;
        archivist = _archivist;

        structureRegistry = _structureRegistry;
        documentRegistry = _documentRegistry;

        emit OrganizationCreated(address(this), _founder, _orgType, _branch);
        emit CenterUpdated(_notary, _archivist);
        emit ModulesUpdated(_structureRegistry, _documentRegistry);
    }

    function setCenter(address _notary, address _archivist) external onlyRole(ORG_ADMIN_ROLE) {
        notary = _notary;
        archivist = _archivist;
        emit CenterUpdated(_notary, _archivist);
    }

    function setModules(address _structureRegistry, address _documentRegistry) external onlyRole(ORG_ADMIN_ROLE) {
        structureRegistry = _structureRegistry;
        documentRegistry = _documentRegistry;
        emit ModulesUpdated(_structureRegistry, _documentRegistry);
    }
}
