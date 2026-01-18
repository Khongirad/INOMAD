// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IForeignAffairsRegistry {
    function issueForeignSeat(address to, bytes32 passportHash, string calldata uri) external returns (uint256);
    function officer(address a) external view returns (bool);
    function owner() external view returns (address);
}

contract GatewayRouter {
    error NotGov();
    error UnknownRoute();

    event RouteSet(bytes32 indexed route, address indexed target, bool ok);
    event ForeignOnboarded(uint256 indexed foreignSeatId, address indexed to, bytes32 indexed passportHash);

    // Gov = MFA / Embassy authority multisig later
    address public gov;

    // routeKey -> contract
    mapping(bytes32 => address) public route;

    constructor(address gov_) {
        gov = gov_;
    }

    modifier onlyGov() {
        if (msg.sender != gov) revert NotGov();
        _;
    }

    function setGov(address newGov) external onlyGov {
        gov = newGov;
    }

    function setRoute(bytes32 routeKey, address target, bool ok) external onlyGov {
        route[routeKey] = ok ? target : address(0);
        emit RouteSet(routeKey, target, ok);
    }

    // Unified entry: onboarding foreigners (delegates to ForeignAffairsRegistry)
    function onboardForeign(
        address foreignAffairsRegistry,
        address to,
        bytes32 passportHash,
        string calldata uri
    ) external onlyGov returns (uint256 foreignSeatId) {
        // gov calls registry; registry itself must have gov/officer rights configured
        foreignSeatId = IForeignAffairsRegistry(foreignAffairsRegistry).issueForeignSeat(to, passportHash, uri);
        emit ForeignOnboarded(foreignSeatId, to, passportHash);
    }
}
