// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * LawRegistry (MVP)
 * - Stores laws as articles with versions (hash + uri)
 * - Activation selects which version is in force
 * - Update authority is external (KhuralLawProcess)
 */
contract LawRegistry {
    error NotAuthorized();
    error LawNotFound();
    error VersionNotFound();
    error InvalidInput();

    event LawCreated(uint256 indexed lawId, string title);
    event LawVersionAdded(uint256 indexed lawId, uint256 indexed version, bytes32 contentHash, string uri);
    event LawVersionActivated(uint256 indexed lawId, uint256 indexed version);
    event LawRepealed(uint256 indexed lawId);

    address public authority; // KhuralLawProcess

    struct Version {
        bytes32 contentHash;
        string uri;
        uint64 timestamp;
        bool exists;
    }

    struct Law {
        string title;
        bool exists;
        bool repealed;
        uint256 latestVersion;
        uint256 activeVersion;
    }

    uint256 public lawCount;
    mapping(uint256 => Law) public laws;
    mapping(uint256 => mapping(uint256 => Version)) public versions;

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthorized();
        _;
    }

    modifier lawExists(uint256 lawId) {
        if (!laws[lawId].exists) revert LawNotFound();
        _;
    }

    constructor(address _authority) {
        if (_authority == address(0)) revert InvalidInput();
        authority = _authority;
    }

    function setAuthority(address _authority) external onlyAuthority {
        if (_authority == address(0)) revert InvalidInput();
        authority = _authority;
    }

    function createLaw(string calldata title) external onlyAuthority returns (uint256 lawId) {
        if (bytes(title).length == 0) revert InvalidInput();
        lawId = ++lawCount;
        laws[lawId] = Law({
            title: title,
            exists: true,
            repealed: false,
            latestVersion: 0,
            activeVersion: 0
        });
        emit LawCreated(lawId, title);
    }

    function addVersion(uint256 lawId, bytes32 contentHash, string calldata uri)
        external
        onlyAuthority
        lawExists(lawId)
    {
        if (contentHash == bytes32(0)) revert InvalidInput();
        Law storage l = laws[lawId];
        if (l.repealed) revert InvalidInput();

        uint256 v = ++l.latestVersion;
        versions[lawId][v] = Version({
            contentHash: contentHash,
            uri: uri,
            timestamp: uint64(block.timestamp),
            exists: true
        });

        emit LawVersionAdded(lawId, v, contentHash, uri);
    }

    function activateVersion(uint256 lawId, uint256 version)
        external
        onlyAuthority
        lawExists(lawId)
    {
        if (!versions[lawId][version].exists) revert VersionNotFound();
        laws[lawId].activeVersion = version;
        emit LawVersionActivated(lawId, version);
    }

    function repealLaw(uint256 lawId) external onlyAuthority lawExists(lawId) {
        laws[lawId].repealed = true;
        emit LawRepealed(lawId);
    }

    function getActiveVersion(uint256 lawId)
        external
        view
        lawExists(lawId)
        returns (Version memory)
    {
        uint256 v = laws[lawId].activeVersion;
        if (v == 0) revert VersionNotFound();
        return versions[lawId][v];
    }
}
