// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./RegionRegistry.sol";

/**
 * @title CitizenDocument
 * @notice Документ принадлежности гражданина Сибирской Конфедерации
 *
 * Формат: [Союз]-[Республика]
 * Примеры:
 * - Сибирь-Буряад-Монголия
 * - Сибирь-Республика Саха
 * - Северный Кавказ-Дагестан
 * - Северный Кавказ-Республика Ичкерия
 * - Золотое Кольцо-Московская область
 *
 * Право на документ имеют:
 * - Коренные народы
 * - Рождённые на территории (право рождения)
 *
 * Документ является Soul Bound Token (SBT) — не передаётся.
 * Один человек = один документ.
 */
contract CitizenDocument is ERC721, AccessControl {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error AlreadyHasDocument();
    error DocumentNotFound();
    error TransferNotAllowed();
    error RepublicNotActive();
    error InvalidBirthData();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event DocumentIssued(
        uint256 indexed documentId,
        address indexed citizen,
        bytes32 indexed republicId,
        string fullName,
        uint64 birthDate
    );

    event DocumentRevoked(uint256 indexed documentId, string reason);
    event ResidencyChanged(uint256 indexed documentId, bytes32 oldRepublicId, bytes32 newRepublicId);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Основание для получения документа
    enum BasisType {
        INDIGENOUS,     // Коренной народ
        BIRTHRIGHT,     // Право рождения на территории
        NATURALIZATION  // Натурализация (через проживание)
    }

    /// @notice Данные документа
    struct Document {
        uint256 id;
        address holder;
        bytes32 republicId;         // Республика принадлежности
        bytes32 birthRepublicId;    // Республика рождения
        string fullName;            // ФИО
        string fullNameLocal;       // ФИО на местном языке (если есть)
        string ethnicity;           // Этническая принадлежность
        uint64 birthDate;           // Дата рождения (unix timestamp)
        uint64 issuedAt;            // Дата выдачи
        BasisType basis;            // Основание
        bool active;
        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    RegionRegistry public immutable regionRegistry;

    uint256 public nextDocumentId;
    mapping(uint256 => Document) public documents;
    mapping(address => uint256) public documentByHolder;  // holder => documentId
    mapping(bytes32 => uint256) public documentCountByRepublic;  // republicId => count

    // Общая статистика
    uint256 public totalDocumentsIssued;
    uint256 public totalActiveDocuments;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _regionRegistry,
        address _khural
    ) ERC721(unicode"Документ Гражданина Сибирской Конфедерации", "CITIZEN-DOC") {
        if (_regionRegistry == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        regionRegistry = RegionRegistry(_regionRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(REGISTRAR_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                        ВЫДАЧА ДОКУМЕНТОВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Выдать документ гражданину
    function issueDocument(
        address citizen,
        bytes32 republicId,
        bytes32 birthRepublicId,
        string calldata fullName,
        string calldata fullNameLocal,
        string calldata ethnicity,
        uint64 birthDate,
        BasisType basis
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 documentId) {
        if (citizen == address(0)) revert ZeroAddress();
        if (documentByHolder[citizen] != 0) revert AlreadyHasDocument();
        if (!regionRegistry.isRepublicActive(republicId)) revert RepublicNotActive();
        if (birthDate == 0 || birthDate > block.timestamp) revert InvalidBirthData();
        if (bytes(fullName).length == 0) revert InvalidBirthData();

        documentId = ++nextDocumentId;

        documents[documentId] = Document({
            id: documentId,
            holder: citizen,
            republicId: republicId,
            birthRepublicId: birthRepublicId,
            fullName: fullName,
            fullNameLocal: fullNameLocal,
            ethnicity: ethnicity,
            birthDate: birthDate,
            issuedAt: uint64(block.timestamp),
            basis: basis,
            active: true,
            exists: true
        });

        documentByHolder[citizen] = documentId;
        documentCountByRepublic[republicId]++;
        totalDocumentsIssued++;
        totalActiveDocuments++;

        // Mint SBT
        _mint(citizen, documentId);

        emit DocumentIssued(documentId, citizen, republicId, fullName, birthDate);
    }

    /// @notice Отозвать документ (только по решению суда/Хурала)
    function revokeDocument(uint256 documentId, string calldata reason) external onlyRole(KHURAL_ROLE) {
        Document storage doc = documents[documentId];
        if (!doc.exists) revert DocumentNotFound();

        doc.active = false;
        documentCountByRepublic[doc.republicId]--;
        totalActiveDocuments--;

        // Burn SBT
        _burn(documentId);
        delete documentByHolder[doc.holder];

        emit DocumentRevoked(documentId, reason);
    }

    /// @notice Изменить республику проживания (переезд)
    function changeResidency(
        uint256 documentId,
        bytes32 newRepublicId
    ) external onlyRole(REGISTRAR_ROLE) {
        Document storage doc = documents[documentId];
        if (!doc.exists || !doc.active) revert DocumentNotFound();
        if (!regionRegistry.isRepublicActive(newRepublicId)) revert RepublicNotActive();

        bytes32 oldRepublicId = doc.republicId;

        documentCountByRepublic[oldRepublicId]--;
        documentCountByRepublic[newRepublicId]++;
        doc.republicId = newRepublicId;

        emit ResidencyChanged(documentId, oldRepublicId, newRepublicId);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить документ по ID
    function getDocument(uint256 documentId) external view returns (Document memory) {
        if (!documents[documentId].exists) revert DocumentNotFound();
        return documents[documentId];
    }

    /// @notice Получить документ по адресу владельца
    function getDocumentByHolder(address holder) external view returns (Document memory) {
        uint256 docId = documentByHolder[holder];
        if (docId == 0) revert DocumentNotFound();
        return documents[docId];
    }

    /// @notice Получить полное название документа: "Союз-Республика"
    function getDocumentTitle(uint256 documentId) external view returns (string memory) {
        Document storage doc = documents[documentId];
        if (!doc.exists) revert DocumentNotFound();

        return regionRegistry.getDocumentPrefix(doc.republicId);
    }

    /// @notice Проверить, есть ли у адреса действующий документ
    function hasActiveDocument(address holder) external view returns (bool) {
        uint256 docId = documentByHolder[holder];
        if (docId == 0) return false;
        return documents[docId].active;
    }

    /// @notice Проверить, является ли держатель гражданином указанной республики
    function isCitizenOf(address holder, bytes32 republicId) external view returns (bool) {
        uint256 docId = documentByHolder[holder];
        if (docId == 0) return false;
        Document storage doc = documents[docId];
        return doc.active && doc.republicId == republicId;
    }

    /// @notice Получить статистику по республике
    function getRepublicStats(bytes32 republicId) external view returns (uint256 citizenCount) {
        return documentCountByRepublic[republicId];
    }

    /*//////////////////////////////////////////////////////////////
                        SOUL BOUND (НЕ ПЕРЕДАЁТСЯ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Документ не может быть передан
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Разрешаем только mint (from == 0) и burn (to == 0)
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }

        return super._update(to, tokenId, auth);
    }

    /// @notice Approve не работает для SBT
    function approve(address, uint256) public pure override {
        revert TransferNotAllowed();
    }

    /// @notice SetApprovalForAll не работает для SBT
    function setApprovalForAll(address, bool) public pure override {
        revert TransferNotAllowed();
    }

    /*//////////////////////////////////////////////////////////////
                            METADATA
    //////////////////////////////////////////////////////////////*/

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!documents[tokenId].exists) revert DocumentNotFound();

        // В production здесь будет ссылка на IPFS/Arweave с метаданными
        return string(abi.encodePacked(
            "https://khural.network/citizen/",
            _toString(tokenId)
        ));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERFACE
    //////////////////////////////////////////////////////////////*/

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
