// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ImmutableAxioms.sol";

/**
 * @title ConstitutionRegistry
 * @notice Реестр Конституции Сибирской Конфедерации
 *
 * Хранит статьи, версии и историю поправок.
 *
 * ВАЖНО: Все статьи Конституции ДОЛЖНЫ соответствовать ImmutableAxioms.
 * ImmutableAxioms — это фундамент, который НЕ МОЖЕТ быть изменён.
 * ConstitutionRegistry — это изменяемая надстройка.
 *
 * Иерархия:
 * 1. ImmutableAxioms (неизменяемые аксиомы) — высший закон
 * 2. ConstitutionRegistry (конституция) — изменяется только Хуралом
 * 3. Законы и подзаконные акты
 *
 * ⚠️ Does NOT enforce rules — only records supreme law.
 * Enforcement happens in other registries (Election, Bank, Judiciary).
 */
contract ConstitutionRegistry {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error NotAuthorized();
    error ArticleNotFound();
    error VersionNotFound();
    error AlreadyExists();
    error InvalidInput();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event ArticleCreated(uint256 indexed articleId, string title);
    event VersionAdded(
        uint256 indexed articleId,
        uint256 indexed version,
        bytes32 contentHash,
        string uri
    );
    event VersionActivated(uint256 indexed articleId, uint256 indexed version);
    event ArticleRepealed(uint256 indexed articleId);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/
    struct Version {
        bytes32 contentHash;   // keccak256 of constitution text
        string uri;            // IPFS / Arweave / HTTPS
        uint64 timestamp;
        bool exists;
    }

    struct Article {
        string title;
        bool exists;
        bool repealed;
        uint256 latestVersion;
        uint256 activeVersion;
    }

    /*//////////////////////////////////////////////////////////////
                            STORAGE
    //////////////////////////////////////////////////////////////*/
    address public immutable khural; // Supreme legislative authority
    ImmutableAxioms public immutable axioms; // Reference to immutable axioms

    uint256 public articleCount;

    mapping(uint256 => Article) public articles;
    mapping(uint256 => mapping(uint256 => Version)) public versions;

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyKhural() {
        if (msg.sender != khural) revert NotAuthorized();
        _;
    }

    modifier articleExists(uint256 articleId) {
        if (!articles[articleId].exists) revert ArticleNotFound();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _khural, address _axioms) {
        if (_khural == address(0)) revert InvalidInput();
        if (_axioms == address(0)) revert InvalidInput();
        khural = _khural;
        axioms = ImmutableAxioms(_axioms);
    }

    /*//////////////////////////////////////////////////////////////
                        AXIOM VERIFICATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить ссылку на неизменяемые аксиомы
    function getAxiomsContract() external view returns (address) {
        return address(axioms);
    }

    /// @notice Проверить целостность аксиом
    function verifyAxiomsIntegrity() external view returns (bool) {
        return axioms.verifyIntegrity();
    }

    /// @notice Получить аксиому по номеру
    function getAxiom(uint8 number) external view returns (string memory) {
        return axioms.getAxiom(number);
    }

    /// @notice Получить все аксиомы
    function getAllAxioms() external view returns (string[15] memory) {
        return axioms.getAllAxioms();
    }

    /*//////////////////////////////////////////////////////////////
                        ARTICLE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// Create a new constitutional article
    function createArticle(string calldata title)
        external
        onlyKhural
        returns (uint256 articleId)
    {
        if (bytes(title).length == 0) revert InvalidInput();

        articleId = ++articleCount;

        articles[articleId] = Article({
            title: title,
            exists: true,
            repealed: false,
            latestVersion: 0,
            activeVersion: 0
        });

        emit ArticleCreated(articleId, title);
    }

    /// Add new version (amendment) to an article
    function addVersion(
        uint256 articleId,
        bytes32 contentHash,
        string calldata uri
    )
        external
        onlyKhural
        articleExists(articleId)
    {
        if (contentHash == bytes32(0)) revert InvalidInput();

        Article storage a = articles[articleId];
        if (a.repealed) revert InvalidInput();

        uint256 newVersion = ++a.latestVersion;

        versions[articleId][newVersion] = Version({
            contentHash: contentHash,
            uri: uri,
            timestamp: uint64(block.timestamp),
            exists: true
        });

        emit VersionAdded(articleId, newVersion, contentHash, uri);
    }

    /// Activate a specific version as constitutional law
    function activateVersion(uint256 articleId, uint256 version)
        external
        onlyKhural
        articleExists(articleId)
    {
        if (!versions[articleId][version].exists) revert VersionNotFound();

        articles[articleId].activeVersion = version;

        emit VersionActivated(articleId, version);
    }

    /// Repeal article completely (constitutional abolition)
    function repealArticle(uint256 articleId)
        external
        onlyKhural
        articleExists(articleId)
    {
        articles[articleId].repealed = true;

        emit ArticleRepealed(articleId);
    }

    /*//////////////////////////////////////////////////////////////
                            READ HELPERS
    //////////////////////////////////////////////////////////////*/

    function getActiveVersion(uint256 articleId)
        external
        view
        articleExists(articleId)
        returns (Version memory)
    {
        uint256 v = articles[articleId].activeVersion;
        if (v == 0) revert VersionNotFound();
        return versions[articleId][v];
    }

    function getVersion(uint256 articleId, uint256 version)
        external
        view
        articleExists(articleId)
        returns (Version memory)
    {
        if (!versions[articleId][version].exists) revert VersionNotFound();
        return versions[articleId][version];
    }
}
