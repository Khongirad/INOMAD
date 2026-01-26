// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreLaw} from "./CoreLaw.sol";
import {CoreLock, ICoreFreezable} from "./CoreLock.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title StateChancellery
 * @notice Государственная Канцелярия Сибирской Конфедерации
 * @dev Центральный архив правовых документов и реестр юридических специалистов
 *
 * Функции:
 * 1. Хранение и верификация правовых документов
 * 2. Регистрация конституций государств народов
 * 3. Управление реестром юристов и нотариусов высшего ранга
 * 4. Архивирование законов и подзаконных актов
 *
 * Иерархия:
 * CoreLaw (frozen) → StateChancellery → NationConstitution → Laws
 *
 * Должностные лица:
 * - Chief Archivist (Главный архивариус) — управляет канцелярией
 * - Master Notary (Мастер-нотариус) — заверяет документы
 * - Master Lawyer (Юрист высшего ранга) — проверяет соответствие CoreLaw
 */
contract StateChancellery is AccessControl {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant YEHE_KHURAL_ROLE = keccak256("YEHE_KHURAL_ROLE");
    bytes32 public constant CHIEF_ARCHIVIST_ROLE = keccak256("CHIEF_ARCHIVIST_ROLE");
    bytes32 public constant MASTER_NOTARY_ROLE = keccak256("MASTER_NOTARY_ROLE");
    bytes32 public constant MASTER_LAWYER_ROLE = keccak256("MASTER_LAWYER_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    enum DocumentType {
        NATION_CONSTITUTION,    // Конституция государства народа
        LAW,                    // Закон
        DECREE,                 // Указ
        TREATY,                 // Договор между народами
        ARCHIVE                 // Архивный документ
    }

    enum DocumentStatus {
        DRAFT,                  // Черновик
        PENDING_REVIEW,         // На проверке юристом
        PENDING_NOTARY,         // На заверении нотариусом
        REGISTERED,             // Зарегистрирован
        SUPERSEDED,             // Заменён новой версией
        REVOKED                 // Отменён
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error CoreLawNotFrozen();
    error DocumentNotFound();
    error InvalidDocumentType();
    error InvalidStatus();
    error NationAlreadyHasConstitution();
    error NotAuthorized();
    error InvalidInput();
    error ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event DocumentSubmitted(
        uint256 indexed docId,
        bytes32 indexed nationId,
        DocumentType docType,
        bytes32 contentHash
    );
    event DocumentReviewed(uint256 indexed docId, address indexed lawyer, bool approved);
    event DocumentCertified(uint256 indexed docId, address indexed notary);
    event DocumentRegistered(uint256 indexed docId, uint64 timestamp);
    event DocumentSuperseded(uint256 indexed oldDocId, uint256 indexed newDocId);
    event DocumentRevoked(uint256 indexed docId, string reason);
    event OfficialAppointed(address indexed official, bytes32 role, string name);
    event OfficialRemoved(address indexed official, bytes32 role);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    struct Document {
        uint256 id;
        bytes32 nationId;           // ID государства народа (или bytes32(0) для конфедерации)
        DocumentType docType;
        DocumentStatus status;
        bytes32 contentHash;        // keccak256 полного текста
        string title;
        string uri;                 // IPFS / Arweave
        address submittedBy;
        address reviewedBy;         // Юрист
        address certifiedBy;        // Нотариус
        uint64 submittedAt;
        uint64 registeredAt;
        uint256 supersededBy;       // ID нового документа (если заменён)
        bool exists;
    }

    struct Official {
        address wallet;
        string fullName;
        string credentials;         // Квалификация
        bytes32 nationId;           // Государство народа
        uint64 appointedAt;
        bool isActive;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    CoreLock public immutable coreLock;
    CoreLaw public immutable coreLaw;

    uint256 public nextDocumentId;
    mapping(uint256 => Document) public documents;
    mapping(bytes32 => uint256) public nationConstitutionId;  // nationId => docId
    mapping(bytes32 => uint256[]) public documentsByNation;   // nationId => docIds[]

    mapping(address => Official) public officials;
    address[] public masterNotaries;
    address[] public masterLawyers;
    address public chiefArchivist;

    uint256 public totalRegisteredDocuments;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _yeheKhural, address _coreLock) {
        if (_yeheKhural == address(0)) revert ZeroAddress();
        if (_coreLock == address(0)) revert ZeroAddress();

        coreLock = CoreLock(_coreLock);
        coreLaw = coreLock.coreLaw();

        _grantRole(DEFAULT_ADMIN_ROLE, _yeheKhural);
        _grantRole(YEHE_KHURAL_ROLE, _yeheKhural);
    }

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyWhenCoreFrozen() {
        if (!coreLock.isFrozen()) revert CoreLawNotFrozen();
        _;
    }

    modifier documentExists(uint256 docId) {
        if (!documents[docId].exists) revert DocumentNotFound();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                    УПРАВЛЕНИЕ ДОЛЖНОСТНЫМИ ЛИЦАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Назначить Главного архивариуса
    function appointChiefArchivist(
        address wallet,
        string calldata fullName,
        string calldata credentials,
        bytes32 nationId
    ) external onlyRole(YEHE_KHURAL_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();

        if (chiefArchivist != address(0)) {
            _revokeRole(CHIEF_ARCHIVIST_ROLE, chiefArchivist);
        }

        chiefArchivist = wallet;
        officials[wallet] = Official({
            wallet: wallet,
            fullName: fullName,
            credentials: credentials,
            nationId: nationId,
            appointedAt: uint64(block.timestamp),
            isActive: true
        });

        _grantRole(CHIEF_ARCHIVIST_ROLE, wallet);

        emit OfficialAppointed(wallet, CHIEF_ARCHIVIST_ROLE, fullName);
    }

    /// @notice Назначить мастер-нотариуса
    function appointMasterNotary(
        address wallet,
        string calldata fullName,
        string calldata credentials,
        bytes32 nationId
    ) external onlyRole(YEHE_KHURAL_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();
        if (hasRole(MASTER_NOTARY_ROLE, wallet)) revert InvalidInput();

        officials[wallet] = Official({
            wallet: wallet,
            fullName: fullName,
            credentials: credentials,
            nationId: nationId,
            appointedAt: uint64(block.timestamp),
            isActive: true
        });

        _grantRole(MASTER_NOTARY_ROLE, wallet);
        masterNotaries.push(wallet);

        emit OfficialAppointed(wallet, MASTER_NOTARY_ROLE, fullName);
    }

    /// @notice Назначить юриста высшего ранга
    function appointMasterLawyer(
        address wallet,
        string calldata fullName,
        string calldata credentials,
        bytes32 nationId
    ) external onlyRole(YEHE_KHURAL_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();
        if (hasRole(MASTER_LAWYER_ROLE, wallet)) revert InvalidInput();

        officials[wallet] = Official({
            wallet: wallet,
            fullName: fullName,
            credentials: credentials,
            nationId: nationId,
            appointedAt: uint64(block.timestamp),
            isActive: true
        });

        _grantRole(MASTER_LAWYER_ROLE, wallet);
        masterLawyers.push(wallet);

        emit OfficialAppointed(wallet, MASTER_LAWYER_ROLE, fullName);
    }

    /// @notice Отстранить должностное лицо
    function removeOfficial(address wallet, bytes32 role) external onlyRole(YEHE_KHURAL_ROLE) {
        if (!hasRole(role, wallet)) revert NotAuthorized();

        officials[wallet].isActive = false;
        _revokeRole(role, wallet);

        if (role == CHIEF_ARCHIVIST_ROLE && chiefArchivist == wallet) {
            chiefArchivist = address(0);
        }

        emit OfficialRemoved(wallet, role);
    }

    /*//////////////////////////////////////////////////////////////
                    РЕГИСТРАЦИЯ ДОКУМЕНТОВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Подать документ на регистрацию
    function submitDocument(
        bytes32 nationId,
        DocumentType docType,
        bytes32 contentHash,
        string calldata title,
        string calldata uri
    ) external onlyWhenCoreFrozen returns (uint256 docId) {
        if (contentHash == bytes32(0)) revert InvalidInput();
        if (bytes(title).length == 0) revert InvalidInput();

        // Конституцию народа может быть только одна активная
        if (docType == DocumentType.NATION_CONSTITUTION) {
            uint256 existingId = nationConstitutionId[nationId];
            if (existingId != 0 && documents[existingId].status == DocumentStatus.REGISTERED) {
                revert NationAlreadyHasConstitution();
            }
        }

        docId = ++nextDocumentId;

        documents[docId] = Document({
            id: docId,
            nationId: nationId,
            docType: docType,
            status: DocumentStatus.PENDING_REVIEW,
            contentHash: contentHash,
            title: title,
            uri: uri,
            submittedBy: msg.sender,
            reviewedBy: address(0),
            certifiedBy: address(0),
            submittedAt: uint64(block.timestamp),
            registeredAt: 0,
            supersededBy: 0,
            exists: true
        });

        documentsByNation[nationId].push(docId);

        emit DocumentSubmitted(docId, nationId, docType, contentHash);
    }

    /// @notice Юрист проверяет соответствие документа CoreLaw
    function reviewDocument(
        uint256 docId,
        bool approved
    ) external onlyRole(MASTER_LAWYER_ROLE) documentExists(docId) {
        Document storage doc = documents[docId];
        if (doc.status != DocumentStatus.PENDING_REVIEW) revert InvalidStatus();

        doc.reviewedBy = msg.sender;

        if (approved) {
            doc.status = DocumentStatus.PENDING_NOTARY;
        } else {
            doc.status = DocumentStatus.DRAFT; // Возврат на доработку
        }

        emit DocumentReviewed(docId, msg.sender, approved);
    }

    /// @notice Нотариус заверяет документ
    function certifyDocument(
        uint256 docId
    ) external onlyRole(MASTER_NOTARY_ROLE) documentExists(docId) {
        Document storage doc = documents[docId];
        if (doc.status != DocumentStatus.PENDING_NOTARY) revert InvalidStatus();

        doc.certifiedBy = msg.sender;
        doc.status = DocumentStatus.REGISTERED;
        doc.registeredAt = uint64(block.timestamp);
        totalRegisteredDocuments++;

        // Для конституции — сохраняем как активную конституцию народа
        if (doc.docType == DocumentType.NATION_CONSTITUTION) {
            uint256 oldId = nationConstitutionId[doc.nationId];
            if (oldId != 0) {
                documents[oldId].status = DocumentStatus.SUPERSEDED;
                documents[oldId].supersededBy = docId;
                emit DocumentSuperseded(oldId, docId);
            }
            nationConstitutionId[doc.nationId] = docId;
        }

        emit DocumentCertified(docId, msg.sender);
        emit DocumentRegistered(docId, doc.registeredAt);
    }

    /// @notice Отменить документ (только Ехэ Хурал)
    function revokeDocument(
        uint256 docId,
        string calldata reason
    ) external onlyRole(YEHE_KHURAL_ROLE) documentExists(docId) {
        Document storage doc = documents[docId];
        doc.status = DocumentStatus.REVOKED;

        if (doc.docType == DocumentType.NATION_CONSTITUTION) {
            nationConstitutionId[doc.nationId] = 0;
        }

        emit DocumentRevoked(docId, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить конституцию государства народа
    function getNationConstitution(bytes32 nationId) external view returns (Document memory) {
        uint256 docId = nationConstitutionId[nationId];
        if (docId == 0) revert DocumentNotFound();
        return documents[docId];
    }

    /// @notice Получить документ по ID
    function getDocument(uint256 docId) external view returns (Document memory) {
        if (!documents[docId].exists) revert DocumentNotFound();
        return documents[docId];
    }

    /// @notice Получить документы государства народа
    function getDocumentsByNation(bytes32 nationId) external view returns (Document[] memory) {
        uint256[] storage ids = documentsByNation[nationId];
        Document[] memory result = new Document[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = documents[ids[i]];
        }
        return result;
    }

    /// @notice Получить информацию о должностном лице
    function getOfficial(address wallet) external view returns (Official memory) {
        return officials[wallet];
    }

    /// @notice Получить всех мастер-нотариусов
    function getMasterNotaries() external view returns (address[] memory) {
        return masterNotaries;
    }

    /// @notice Получить всех юристов высшего ранга
    function getMasterLawyers() external view returns (address[] memory) {
        return masterLawyers;
    }

    /// @notice Проверить целостность CoreLaw
    function verifyCoreLawIntegrity() external view returns (bool) {
        return coreLock.verifyIntegrity();
    }

    /// @notice Получить статью CoreLaw
    function getCoreLawArticle(uint8 number) external view returns (string memory) {
        return coreLaw.getArticle(number);
    }

    /// @notice Получить статистику канцелярии
    function getStats() external view returns (
        uint256 _totalDocuments,
        uint256 _registeredDocuments,
        uint256 _notariesCount,
        uint256 _lawyersCount,
        bool _coreLawFrozen
    ) {
        return (
            nextDocumentId,
            totalRegisteredDocuments,
            masterNotaries.length,
            masterLawyers.length,
            coreLock.isFrozen()
        );
    }
}
