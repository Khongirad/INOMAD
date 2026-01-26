// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreLaw} from "./CoreLaw.sol";
import {CoreLock, ICoreFreezable} from "./CoreLock.sol";

/**
 * @title ConstitutionRegistry
 * @notice Реестр Конституции государства народа
 * @dev Каждое государство народа имеет свой ConstitutionRegistry
 *
 * Хранит статьи, версии и историю поправок.
 *
 * ВАЖНО: Все статьи Конституции ДОЛЖНЫ соответствовать CoreLaw.
 * CoreLaw (Основной Закон) — это фундамент, который НЕ МОЖЕТ быть изменён.
 * ConstitutionRegistry — это изменяемая надстройка для конкретного народа.
 *
 * Иерархия:
 * 1. CoreLaw (Основной Закон Сибирской Конфедерации) — высший закон
 * 2. ConstitutionRegistry (конституция государства народа) — изменяется Хуралом народа
 * 3. Законы и подзаконные акты государства народа
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
    error CoreLawNotFrozen();

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
    address public immutable khural;        // Хурал государства народа
    CoreLock public immutable coreLock;     // Ссылка на CoreLock
    CoreLaw public immutable coreLaw;       // Ссылка на CoreLaw
    bytes32 public immutable nationId;      // ID государства народа
    string public nationName;               // Название государства народа

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

    modifier onlyWhenCoreFrozen() {
        if (!coreLock.isFrozen()) revert CoreLawNotFrozen();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(
        address _khural,
        address _coreLock,
        bytes32 _nationId,
        string memory _nationName
    ) {
        if (_khural == address(0)) revert InvalidInput();
        if (_coreLock == address(0)) revert InvalidInput();
        if (_nationId == bytes32(0)) revert InvalidInput();

        khural = _khural;
        coreLock = CoreLock(_coreLock);
        coreLaw = coreLock.coreLaw();
        nationId = _nationId;
        nationName = _nationName;
    }

    /*//////////////////////////////////////////////////////////////
                        CORELAW VERIFICATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить ссылку на CoreLaw
    function getCoreLawContract() external view returns (address) {
        return address(coreLaw);
    }

    /// @notice Получить ссылку на CoreLock
    function getCoreLockContract() external view returns (address) {
        return address(coreLock);
    }

    /// @notice Проверить заморожен ли CoreLaw
    function isCoreLawFrozen() external view returns (bool) {
        return coreLock.isFrozen();
    }

    /// @notice Проверить целостность CoreLaw
    function verifyCoreLawIntegrity() external view returns (bool) {
        return coreLock.verifyIntegrity();
    }

    /// @notice Получить статью CoreLaw по номеру (1-37)
    function getCoreLawArticle(uint8 number) external view returns (string memory) {
        return coreLaw.getArticle(number);
    }

    /// @notice Получить преамбулу CoreLaw
    function getCoreLawPreamble() external view returns (string memory) {
        return coreLaw.getPreamble();
    }

    /// @notice Получить общее количество статей CoreLaw
    function getCoreLawArticleCount() external view returns (uint8) {
        return coreLaw.TOTAL_ARTICLES();
    }

    /*//////////////////////////////////////////////////////////////
                        ARTICLE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать новую статью конституции (только после заморозки CoreLaw)
    function createArticle(string calldata title)
        external
        onlyKhural
        onlyWhenCoreFrozen
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

    /// @notice Добавить новую версию (поправку) к статье
    function addVersion(
        uint256 articleId,
        bytes32 contentHash,
        string calldata uri
    )
        external
        onlyKhural
        onlyWhenCoreFrozen
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

    /// @notice Активировать версию как действующий конституционный закон
    function activateVersion(uint256 articleId, uint256 version)
        external
        onlyKhural
        onlyWhenCoreFrozen
        articleExists(articleId)
    {
        if (!versions[articleId][version].exists) revert VersionNotFound();

        articles[articleId].activeVersion = version;

        emit VersionActivated(articleId, version);
    }

    /// @notice Отменить статью полностью (конституционная отмена)
    function repealArticle(uint256 articleId)
        external
        onlyKhural
        onlyWhenCoreFrozen
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

    /// @notice Получить информацию о государстве народа
    function getNationInfo() external view returns (bytes32, string memory) {
        return (nationId, nationName);
    }

    /// @notice Получить статистику конституции
    function getStats() external view returns (
        uint256 _articleCount,
        bool _coreLawFrozen,
        bytes32 _coreLawHash
    ) {
        return (
            articleCount,
            coreLock.isFrozen(),
            coreLock.getLawHash()
        );
    }
}
