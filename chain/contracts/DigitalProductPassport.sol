// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DigitalProductPassport (DPP)
 * @notice Цифровой паспорт товара — ядро системы трекинга
 * 
 * Каждый товар получает уникальный ID с 4 блоками данных:
 * 1. Identity Block — происхождение
 * 2. Compliance Block — юридическая чистота
 * 3. Logistics Block — движение
 * 4. Transaction Block — собственность
 * 
 * Интеграция: DocumentRegistry, AntiFraudEngine, NotaryRegistry
 */
contract DigitalProductPassport {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error PassportNotFound();
    error PassportAlreadyExists();
    error InvalidStage();
    error PassportBlocked();
    error ZeroAddress();
    
    /* ==================== ENUMS ==================== */
    
    enum ProductStatus {
        DRAFT,          // Черновик
        ACTIVE,         // Активный
        IN_TRANSIT,     // В пути
        SOLD,           // Продан
        RECALLED,       // Отозван
        BLOCKED         // Заблокирован (контрафакт)
    }
    
    enum ProductCategory {
        RAW_MATERIAL,   // Сырьё
        SEMI_FINISHED,  // Полуфабрикат
        FINISHED_GOOD,  // Готовый товар
        FOOD,           // Продукты питания
        PHARMA,         // Фармацевтика
        ELECTRONICS,    // Электроника
        OTHER
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Блок 1: Происхождение
    struct IdentityBlock {
        bytes32 originLicenseId;      // Лицензия на недропользование
        bytes32 manufacturerId;        // Код завода-изготовителя
        bytes32 rawMaterialCertId;     // Сертификат сырья
        bytes32 batchNumber;           // Номер партии
        uint256 productionDate;        // Дата производства
        string countryOfOrigin;        // Страна происхождения
        string productName;            // Название товара
        ProductCategory category;
    }
    
    /// @notice Блок 2: Юридическая чистота
    struct ComplianceBlock {
        bytes32[] certifications;       // Сертификаты соответствия
        bytes32 testProtocolHash;       // Протоколы испытаний
        bytes32 phytosanitaryHash;      // Фитосанитарные акты
        bytes32 qualityCertHash;        // Сертификат качества
        uint256 validUntil;             // Срок действия сертификатов
        bool isFullyCompliant;          // Полное соответствие
    }
    
    /// @notice Пересечение границы
    struct BorderCrossing {
        bytes32 declarationNumber;      // Номер таможенной декларации
        string fromCountry;
        string toCountry;
        uint256 crossingDate;
        bytes32 customsOfficerId;       // Кто оформил
        uint256 dutiesPaid;             // Сумма пошлин
    }
    
    /// @notice Условия поставки
    struct IncotermRecord {
        string incoterm;                // EXW, FOB, CIF, etc.
        uint256 effectiveFrom;
        bytes32 contractHash;
    }
    
    /// @notice Блок 3: Логистика
    struct LogisticsBlock {
        bytes32 currentLocationId;      // Текущая локация (склад ID)
        string currentLocationName;
        uint256 lastMovementDate;
        uint256 borderCrossingCount;
        uint256 incotermCount;
    }
    
    /// @notice Передача права собственности
    struct TransferRecord {
        address fromOwner;
        address toOwner;
        bytes32 invoiceHash;
        bytes32 actHash;                // Акт приёма-передачи
        uint256 transferDate;
        uint256 price;                  // Цена в ALTAN (6 decimals)
    }
    
    /// @notice Блок 4: Транзакции
    struct TransactionBlock {
        address currentOwner;
        bytes32[] invoiceHashes;        // Все инвойсы
        uint256 transferCount;
        uint256 totalValueExchanged;    // Общая сумма сделок
    }
    
    /// @notice Полный паспорт товара
    struct ProductPassport {
        bytes32 passportId;
        uint256 createdAt;
        address creator;
        ProductStatus status;
        
        // 4 Blocks (stored separately for gas efficiency)
        bool hasIdentity;
        bool hasCompliance;
        bool hasLogistics;
        bool hasTransaction;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public documentRegistry;
    address public antiFraudEngine;
    
    // Passports
    uint256 public nextPassportNonce = 1;
    mapping(bytes32 => ProductPassport) public passports;
    mapping(bytes32 => IdentityBlock) public identityBlocks;
    mapping(bytes32 => ComplianceBlock) public complianceBlocks;
    mapping(bytes32 => LogisticsBlock) public logisticsBlocks;
    mapping(bytes32 => TransactionBlock) public transactionBlocks;
    
    // History arrays
    mapping(bytes32 => BorderCrossing[]) public borderCrossings;
    mapping(bytes32 => IncotermRecord[]) public incotermHistory;
    mapping(bytes32 => TransferRecord[]) public transferHistory;
    
    // Quantities (for anti-fraud)
    mapping(bytes32 => uint256) public quantities;       // Current quantity
    mapping(bytes32 => uint256) public originalQuantity; // Initial quantity
    mapping(bytes32 => uint256) public conversionRatio;  // e.g., 1:3 for juice
    
    // Authorized operators
    mapping(address => bool) public isOperator;
    
    /* ==================== EVENTS ==================== */
    
    event PassportCreated(
        bytes32 indexed passportId,
        address indexed creator,
        string productName,
        uint256 timestamp
    );
    
    event IdentityBlockSet(
        bytes32 indexed passportId,
        bytes32 indexed originLicenseId,
        bytes32 manufacturerId,
        uint256 timestamp
    );
    
    event ComplianceBlockUpdated(
        bytes32 indexed passportId,
        bytes32 indexed certificationHash,
        bool isFullyCompliant,
        uint256 timestamp
    );
    
    event BorderCrossed(
        bytes32 indexed passportId,
        bytes32 indexed declarationNumber,
        string fromCountry,
        string toCountry,
        uint256 timestamp
    );
    
    event OwnershipTransferred(
        bytes32 indexed passportId,
        address indexed fromOwner,
        address indexed toOwner,
        bytes32 invoiceHash,
        uint256 price,
        uint256 timestamp
    );
    
    event PassportStatusChanged(
        bytes32 indexed passportId,
        ProductStatus oldStatus,
        ProductStatus newStatus,
        uint256 timestamp
    );
    
    event PassportBlockedEvent(
        bytes32 indexed passportId,
        string reason,
        uint256 timestamp
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyOperator() {
        if (!isOperator[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    modifier passportExists(bytes32 passportId) {
        if (passports[passportId].passportId == bytes32(0)) revert PassportNotFound();
        _;
    }
    
    modifier notBlocked(bytes32 passportId) {
        if (passports[passportId].status == ProductStatus.BLOCKED) revert PassportBlocked();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        isOperator[msg.sender] = true;
    }
    
    /* ==================== PASSPORT CREATION ==================== */
    
    /**
     * @notice Создать новый паспорт товара
     */
    function createPassport(
        string calldata productName,
        ProductCategory category,
        uint256 initialQuantity,
        uint256 _conversionRatio
    ) external onlyOperator returns (bytes32 passportId) {
        passportId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            nextPassportNonce++,
            productName
        ));
        
        if (passports[passportId].passportId != bytes32(0)) revert PassportAlreadyExists();
        
        passports[passportId] = ProductPassport({
            passportId: passportId,
            createdAt: block.timestamp,
            creator: msg.sender,
            status: ProductStatus.DRAFT,
            hasIdentity: false,
            hasCompliance: false,
            hasLogistics: false,
            hasTransaction: false
        });
        
        // Initialize quantity tracking
        quantities[passportId] = initialQuantity;
        originalQuantity[passportId] = initialQuantity;
        conversionRatio[passportId] = _conversionRatio > 0 ? _conversionRatio : 1;
        
        // Initialize transaction block
        transactionBlocks[passportId].currentOwner = msg.sender;
        
        emit PassportCreated(passportId, msg.sender, productName, block.timestamp);
    }
    
    /* ==================== IDENTITY BLOCK ==================== */
    
    /**
     * @notice Установить блок происхождения
     */
    function setIdentityBlock(
        bytes32 passportId,
        bytes32 originLicenseId,
        bytes32 manufacturerId,
        bytes32 rawMaterialCertId,
        bytes32 batchNumber,
        uint256 productionDate,
        string calldata countryOfOrigin,
        string calldata productName,
        ProductCategory category
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        identityBlocks[passportId] = IdentityBlock({
            originLicenseId: originLicenseId,
            manufacturerId: manufacturerId,
            rawMaterialCertId: rawMaterialCertId,
            batchNumber: batchNumber,
            productionDate: productionDate,
            countryOfOrigin: countryOfOrigin,
            productName: productName,
            category: category
        });
        
        passports[passportId].hasIdentity = true;
        
        emit IdentityBlockSet(passportId, originLicenseId, manufacturerId, block.timestamp);
    }
    
    /* ==================== COMPLIANCE BLOCK ==================== */
    
    /**
     * @notice Добавить сертификат соответствия
     */
    function addCertification(
        bytes32 passportId,
        bytes32 certificationHash
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        complianceBlocks[passportId].certifications.push(certificationHash);
        passports[passportId].hasCompliance = true;
        
        emit ComplianceBlockUpdated(
            passportId, 
            certificationHash, 
            complianceBlocks[passportId].isFullyCompliant,
            block.timestamp
        );
    }
    
    /**
     * @notice Установить полный compliance статус
     */
    function setComplianceStatus(
        bytes32 passportId,
        bytes32 testProtocolHash,
        bytes32 phytosanitaryHash,
        bytes32 qualityCertHash,
        uint256 validUntil,
        bool isFullyCompliant
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        ComplianceBlock storage cb = complianceBlocks[passportId];
        cb.testProtocolHash = testProtocolHash;
        cb.phytosanitaryHash = phytosanitaryHash;
        cb.qualityCertHash = qualityCertHash;
        cb.validUntil = validUntil;
        cb.isFullyCompliant = isFullyCompliant;
        
        passports[passportId].hasCompliance = true;
        
        // Activate passport if fully compliant
        if (isFullyCompliant && passports[passportId].status == ProductStatus.DRAFT) {
            _changeStatus(passportId, ProductStatus.ACTIVE);
        }
    }
    
    /* ==================== LOGISTICS BLOCK ==================== */
    
    /**
     * @notice Зарегистрировать пересечение границы
     */
    function recordBorderCrossing(
        bytes32 passportId,
        bytes32 declarationNumber,
        string calldata fromCountry,
        string calldata toCountry,
        bytes32 customsOfficerId,
        uint256 dutiesPaid
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        borderCrossings[passportId].push(BorderCrossing({
            declarationNumber: declarationNumber,
            fromCountry: fromCountry,
            toCountry: toCountry,
            crossingDate: block.timestamp,
            customsOfficerId: customsOfficerId,
            dutiesPaid: dutiesPaid
        }));
        
        logisticsBlocks[passportId].borderCrossingCount++;
        logisticsBlocks[passportId].lastMovementDate = block.timestamp;
        passports[passportId].hasLogistics = true;
        
        _changeStatus(passportId, ProductStatus.IN_TRANSIT);
        
        emit BorderCrossed(passportId, declarationNumber, fromCountry, toCountry, block.timestamp);
    }
    
    /**
     * @notice Обновить текущую локацию
     */
    function updateLocation(
        bytes32 passportId,
        bytes32 locationId,
        string calldata locationName
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        LogisticsBlock storage lb = logisticsBlocks[passportId];
        lb.currentLocationId = locationId;
        lb.currentLocationName = locationName;
        lb.lastMovementDate = block.timestamp;
        
        passports[passportId].hasLogistics = true;
    }
    
    /**
     * @notice Добавить условия поставки (Incoterms)
     */
    function addIncoterm(
        bytes32 passportId,
        string calldata incoterm,
        bytes32 contractHash
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        incotermHistory[passportId].push(IncotermRecord({
            incoterm: incoterm,
            effectiveFrom: block.timestamp,
            contractHash: contractHash
        }));
        
        logisticsBlocks[passportId].incotermCount++;
    }
    
    /* ==================== TRANSACTION BLOCK ==================== */
    
    /**
     * @notice Передать право собственности (продажа)
     */
    function transferOwnership(
        bytes32 passportId,
        address newOwner,
        bytes32 invoiceHash,
        bytes32 actHash,
        uint256 price
    ) external passportExists(passportId) notBlocked(passportId) {
        TransactionBlock storage tb = transactionBlocks[passportId];
        
        // Only current owner can transfer
        require(msg.sender == tb.currentOwner, "Not current owner");
        require(newOwner != address(0), "Zero address");
        
        address previousOwner = tb.currentOwner;
        
        // Record transfer
        transferHistory[passportId].push(TransferRecord({
            fromOwner: previousOwner,
            toOwner: newOwner,
            invoiceHash: invoiceHash,
            actHash: actHash,
            transferDate: block.timestamp,
            price: price
        }));
        
        // Update state
        tb.currentOwner = newOwner;
        tb.invoiceHashes.push(invoiceHash);
        tb.transferCount++;
        tb.totalValueExchanged += price;
        
        passports[passportId].hasTransaction = true;
        
        emit OwnershipTransferred(passportId, previousOwner, newOwner, invoiceHash, price, block.timestamp);
    }
    
    /**
     * @notice Финальная продажа (вывод из оборота)
     */
    function markAsSold(
        bytes32 passportId,
        bytes32 receiptHash,
        uint256 quantity
    ) external passportExists(passportId) notBlocked(passportId) {
        require(msg.sender == transactionBlocks[passportId].currentOwner, "Not owner");
        
        // Deduct sold quantity
        require(quantities[passportId] >= quantity, "Insufficient quantity");
        quantities[passportId] -= quantity;
        
        // If all sold, mark as SOLD
        if (quantities[passportId] == 0) {
            _changeStatus(passportId, ProductStatus.SOLD);
        }
    }
    
    /* ==================== STATUS MANAGEMENT ==================== */
    
    function _changeStatus(bytes32 passportId, ProductStatus newStatus) internal {
        ProductStatus oldStatus = passports[passportId].status;
        passports[passportId].status = newStatus;
        
        emit PassportStatusChanged(passportId, oldStatus, newStatus, block.timestamp);
    }
    
    /**
     * @notice Заблокировать паспорт (контрафакт)
     */
    function blockPassport(
        bytes32 passportId,
        string calldata reason
    ) external onlyOperator passportExists(passportId) {
        _changeStatus(passportId, ProductStatus.BLOCKED);
        
        emit PassportBlockedEvent(passportId, reason, block.timestamp);
    }
    
    /**
     * @notice Отозвать товар
     */
    function recallProduct(bytes32 passportId) external onlyOperator passportExists(passportId) {
        _changeStatus(passportId, ProductStatus.RECALLED);
    }
    
    /* ==================== QUANTITY MANAGEMENT ==================== */
    
    /**
     * @notice Обновить количество (после переработки)
     */
    function updateQuantity(
        bytes32 passportId,
        uint256 newQuantity,
        bytes32 processingDocHash
    ) external onlyOperator passportExists(passportId) notBlocked(passportId) {
        quantities[passportId] = newQuantity;
    }
    
    /**
     * @notice Проверить баланс (anti-fraud)
     */
    function checkQuantityBalance(bytes32 passportId) external view returns (
        uint256 original,
        uint256 current,
        uint256 expectedMax,
        bool hasAnomaly
    ) {
        original = originalQuantity[passportId];
        current = quantities[passportId];
        expectedMax = original * conversionRatio[passportId];
        hasAnomaly = current > expectedMax;
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getPassport(bytes32 passportId) external view returns (
        uint256 createdAt,
        address creator,
        ProductStatus status,
        bool hasIdentity,
        bool hasCompliance,
        bool hasLogistics,
        bool hasTransaction
    ) {
        ProductPassport storage p = passports[passportId];
        return (
            p.createdAt,
            p.creator,
            p.status,
            p.hasIdentity,
            p.hasCompliance,
            p.hasLogistics,
            p.hasTransaction
        );
    }
    
    function getIdentityBlock(bytes32 passportId) external view returns (IdentityBlock memory) {
        return identityBlocks[passportId];
    }
    
    function getComplianceBlock(bytes32 passportId) external view returns (
        bytes32[] memory certifications,
        bytes32 testProtocolHash,
        bytes32 phytosanitaryHash,
        bytes32 qualityCertHash,
        uint256 validUntil,
        bool isFullyCompliant
    ) {
        ComplianceBlock storage cb = complianceBlocks[passportId];
        return (
            cb.certifications,
            cb.testProtocolHash,
            cb.phytosanitaryHash,
            cb.qualityCertHash,
            cb.validUntil,
            cb.isFullyCompliant
        );
    }
    
    function getLogisticsBlock(bytes32 passportId) external view returns (LogisticsBlock memory) {
        return logisticsBlocks[passportId];
    }
    
    function getCurrentOwner(bytes32 passportId) external view returns (address) {
        return transactionBlocks[passportId].currentOwner;
    }
    
    function getBorderCrossings(bytes32 passportId) external view returns (BorderCrossing[] memory) {
        return borderCrossings[passportId];
    }
    
    function getTransferHistory(bytes32 passportId) external view returns (TransferRecord[] memory) {
        return transferHistory[passportId];
    }
    
    /* ==================== ADMIN ==================== */
    
    function setOperator(address operator, bool authorized) external onlyOwner {
        isOperator[operator] = authorized;
    }
    
    function setDocumentRegistry(address registry) external onlyOwner {
        documentRegistry = registry;
    }
    
    function setAntiFraudEngine(address engine) external onlyOwner {
        antiFraudEngine = engine;
    }
    
    function transferOwnershipContract(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
