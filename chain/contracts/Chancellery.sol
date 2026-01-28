// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Chancellery (Канцелярия)
 * @notice Расширенная система хранения документов
 * 
 * 3 принципа:
 * 1. IMMUTABILITY — хэш + timestamp
 * 2. LINKING — документы образуют дерево
 * 3. ACCESS LEVELS — PUBLIC/OFFICIAL/SECRET
 */
contract Chancellery {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error DocumentNotFound();
    error ParentRequired();
    error AccessDenied();
    
    /* ==================== ENUMS ==================== */
    
    enum DocType {
        LICENSE,        // Лицензия
        CONTRACT,       // Договор
        INVOICE,        // Счёт-фактура
        ACT,            // Акт приёма-передачи
        SPEC,           // Спецификация
        CERT,           // Сертификат
        DECLARATION,    // Таможенная декларация
        WAYBILL,        // Накладная
        TECH_CARD,      // Технологическая карта
        RECEIPT         // Чек
    }
    
    enum AccessLevel { PUBLIC, OFFICIAL, SECRET }
    enum Status { ACTIVE, AMENDED, ARCHIVED, REVOKED }
    
    /* ==================== STRUCTS ==================== */
    
    struct Document {
        bytes32 docId;
        bytes32 docHash;
        DocType docType;
        AccessLevel accessLevel;
        Status status;
        address creator;
        uint256 createdAt;
        bytes32 parentDocId;
        bytes32 prevVersion;
        bytes32 passportId;
        string title;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    uint256 nextNonce = 1;
    
    mapping(bytes32 => Document) public docs;
    mapping(bytes32 => bytes32[]) public children;
    mapping(bytes32 => bytes32[]) public versions;
    mapping(bytes32 => bytes32[]) public passportDocs;
    mapping(address => AccessLevel) public accessLevel;
    mapping(address => bool) public isRegistrar;
    
    // Linking rules
    mapping(DocType => DocType) public requiredParent;
    mapping(DocType => bool) public needsParent;
    
    /* ==================== EVENTS ==================== */
    
    event DocCreated(bytes32 indexed docId, DocType docType, address indexed creator);
    event DocLinked(bytes32 indexed child, bytes32 indexed parent);
    event DocAmended(bytes32 indexed original, bytes32 indexed newVersion);
    event DocLinkedToPassport(bytes32 indexed docId, bytes32 indexed passportId);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyRegistrar() {
        if (!isRegistrar[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    modifier hasAccess(bytes32 docId) {
        AccessLevel docLevel = docs[docId].accessLevel;
        AccessLevel userLevel = accessLevel[msg.sender];
        if (docLevel == AccessLevel.SECRET && userLevel != AccessLevel.SECRET) revert AccessDenied();
        if (docLevel == AccessLevel.OFFICIAL && userLevel == AccessLevel.PUBLIC) revert AccessDenied();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        isRegistrar[msg.sender] = true;
        accessLevel[msg.sender] = AccessLevel.SECRET;
        
        // Invoice requires Contract
        requiredParent[DocType.INVOICE] = DocType.CONTRACT;
        needsParent[DocType.INVOICE] = true;
        
        // Act requires Invoice
        requiredParent[DocType.ACT] = DocType.INVOICE;
        needsParent[DocType.ACT] = true;
        
        // Receipt requires Invoice
        requiredParent[DocType.RECEIPT] = DocType.INVOICE;
        needsParent[DocType.RECEIPT] = true;
        
        // Declaration requires Waybill
        requiredParent[DocType.DECLARATION] = DocType.WAYBILL;
        needsParent[DocType.DECLARATION] = true;
    }
    
    /* ==================== DOCUMENT CREATION ==================== */
    
    function createDocument(
        bytes32 docHash,
        DocType docType,
        AccessLevel level,
        bytes32 parentDocId,
        string calldata title
    ) external onlyRegistrar returns (bytes32 docId) {
        // Validate linking
        if (needsParent[docType]) {
            if (parentDocId == bytes32(0)) revert ParentRequired();
            if (docs[parentDocId].docId == bytes32(0)) revert DocumentNotFound();
        }
        
        docId = keccak256(abi.encodePacked(block.timestamp, msg.sender, nextNonce++));
        
        docs[docId] = Document({
            docId: docId,
            docHash: docHash,
            docType: docType,
            accessLevel: level,
            status: Status.ACTIVE,
            creator: msg.sender,
            createdAt: block.timestamp,
            parentDocId: parentDocId,
            prevVersion: bytes32(0),
            passportId: bytes32(0),
            title: title
        });
        
        if (parentDocId != bytes32(0)) {
            children[parentDocId].push(docId);
            emit DocLinked(docId, parentDocId);
        }
        
        emit DocCreated(docId, docType, msg.sender);
    }
    
    function createPrimaryDoc(
        bytes32 docHash,
        DocType docType,
        AccessLevel level,
        string calldata title
    ) external onlyRegistrar returns (bytes32 docId) {
        require(!needsParent[docType], "Needs parent");
        
        docId = keccak256(abi.encodePacked(block.timestamp, msg.sender, nextNonce++));
        
        docs[docId] = Document({
            docId: docId,
            docHash: docHash,
            docType: docType,
            accessLevel: level,
            status: Status.ACTIVE,
            creator: msg.sender,
            createdAt: block.timestamp,
            parentDocId: bytes32(0),
            prevVersion: bytes32(0),
            passportId: bytes32(0),
            title: title
        });
        
        emit DocCreated(docId, docType, msg.sender);
    }
    
    /* ==================== AMENDMENT ==================== */
    
    function amendDocument(
        bytes32 originalId,
        bytes32 newHash,
        string calldata title
    ) external onlyRegistrar returns (bytes32 newId) {
        Document storage orig = docs[originalId];
        if (orig.docId == bytes32(0)) revert DocumentNotFound();
        
        orig.status = Status.AMENDED;
        
        newId = keccak256(abi.encodePacked(block.timestamp, msg.sender, nextNonce++));
        
        docs[newId] = Document({
            docId: newId,
            docHash: newHash,
            docType: orig.docType,
            accessLevel: orig.accessLevel,
            status: Status.ACTIVE,
            creator: msg.sender,
            createdAt: block.timestamp,
            parentDocId: orig.parentDocId,
            prevVersion: originalId,
            passportId: orig.passportId,
            title: title
        });
        
        versions[originalId].push(newId);
        
        emit DocAmended(originalId, newId);
    }
    
    /* ==================== DPP LINKAGE ==================== */
    
    function linkToPassport(bytes32 docId, bytes32 passportId) external onlyRegistrar {
        if (docs[docId].docId == bytes32(0)) revert DocumentNotFound();
        docs[docId].passportId = passportId;
        passportDocs[passportId].push(docId);
        
        emit DocLinkedToPassport(docId, passportId);
    }
    
    /* ==================== VERIFICATION ==================== */
    
    function verify(bytes32 docId, bytes32 hash) external view returns (bool valid, bool amended) {
        Document storage doc = docs[docId];
        return (doc.docHash == hash, doc.status == Status.AMENDED);
    }
    
    function getVersions(bytes32 docId) external view returns (bytes32[] memory) {
        return versions[docId];
    }
    
    function getChildren(bytes32 docId) external view returns (bytes32[] memory) {
        return children[docId];
    }
    
    function getPassportDocs(bytes32 passportId) external view returns (bytes32[] memory) {
        return passportDocs[passportId];
    }
    
    /* ==================== VIEW ==================== */
    
    function getDocument(bytes32 docId) external view hasAccess(docId) returns (Document memory) {
        return docs[docId];
    }
    
    function getPublicInfo(bytes32 docId) external view returns (
        DocType docType,
        Status status,
        uint256 createdAt,
        string memory title
    ) {
        Document storage d = docs[docId];
        return (d.docType, d.status, d.createdAt, d.title);
    }
    
    /* ==================== ADMIN ==================== */
    
    function setAccess(address user, AccessLevel level) external onlyOwner {
        accessLevel[user] = level;
    }
    
    function setRegistrar(address reg, bool auth) external onlyOwner {
        isRegistrar[reg] = auth;
    }
    
    function archive(bytes32 docId) external onlyRegistrar {
        docs[docId].status = Status.ARCHIVED;
    }
    
    function revoke(bytes32 docId) external onlyRegistrar {
        docs[docId].status = Status.REVOKED;
    }
}
