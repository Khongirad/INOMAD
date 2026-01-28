// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ComplianceMatrix
 * @notice Матрица соответствия: 7 этапов жизненного цикла товара
 * 
 * Этапы:
 * 1. EXTRACTION (Добыча) — Лицензия, Рапорт
 * 2. PROCESSING (Переработка) — Накладная М-11, Техкарта
 * 3. MANUFACTURING (Производство) — BOM, Паспорт изделия
 * 4. WAREHOUSING (Складирование) — Приходный ордер
 * 5. SALES (Продажа) — Контракт, Инвойс
 * 6. BORDER (Пересечение границы) — Декларация, CMR
 * 7. FINAL (Конечная продажа) — Акт, УПД, Чек
 */
contract ComplianceMatrix {
    
    /* ==================== ERRORS ==================== */
    error NotAuthorized();
    error InvalidStage();
    error StageNotCompleted();
    error DocumentMissing();
    
    /* ==================== ENUMS ==================== */
    
    enum LifecycleStage {
        NONE,
        EXTRACTION,     // 1. Добыча сырья
        PROCESSING,     // 2. Переработка
        MANUFACTURING,  // 3. Производство изделия
        WAREHOUSING,    // 4. Складирование
        SALES,          // 5. Продажа / Экспорт
        BORDER,         // 6. Пересечение границы
        FINAL           // 7. Финальная продажа
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct StageRecord {
        LifecycleStage stage;
        bytes32 primaryDocHash;     // Основной документ
        bytes32[] supportingDocs;   // Сопроводительные
        address responsibleParty;   // Кто внёс данные
        uint256 timestamp;
        uint256 quantity;           // Количество
        bytes32 quantityProofHash;  // Подтверждение количества
        bool completed;
    }
    
    struct StageRequirement {
        string primaryDocName;      // "Лицензия на недропользование"
        string[] requiredFields;    // Обязательные поля
        string responsibleRole;     // "Недропользователь"
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public digitalProductPassport;
    address public chancellery;
    
    // Stage records per product
    mapping(bytes32 => mapping(LifecycleStage => StageRecord)) public stageRecords;
    mapping(bytes32 => LifecycleStage) public currentStage;
    
    // Stage requirements
    mapping(LifecycleStage => StageRequirement) public requirements;
    
    // Authorized roles per stage
    mapping(LifecycleStage => mapping(address => bool)) public stageOperators;
    
    /* ==================== EVENTS ==================== */
    
    event StageCompleted(
        bytes32 indexed productId,
        LifecycleStage stage,
        bytes32 primaryDocHash,
        address indexed responsible,
        uint256 quantity,
        uint256 timestamp
    );
    
    event StageAdvanced(
        bytes32 indexed productId,
        LifecycleStage fromStage,
        LifecycleStage toStage,
        uint256 timestamp
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    modifier canOperateStage(LifecycleStage stage) {
        if (!stageOperators[stage][msg.sender] && msg.sender != owner) 
            revert NotAuthorized();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        _setupRequirements();
    }
    
    function _setupRequirements() internal {
        // Stage 1: Extraction
        string[] memory extractionFields = new string[](3);
        extractionFields[0] = "volume_mass";
        extractionFields[1] = "chemical_composition";
        extractionFields[2] = "coordinates";
        requirements[LifecycleStage.EXTRACTION] = StageRequirement({
            primaryDocName: "Mining License + Extraction Report",
            requiredFields: extractionFields,
            responsibleRole: "Subsoil User"
        });
        
        // Stage 2: Processing
        string[] memory processingFields = new string[](2);
        processingFields[0] = "input_material";
        processingFields[1] = "output_coefficient";
        requirements[LifecycleStage.PROCESSING] = StageRequirement({
            primaryDocName: "M-11 Waybill + Tech Card",
            requiredFields: processingFields,
            responsibleRole: "Factory Technologist"
        });
        
        // Stage 3: Manufacturing
        string[] memory mfgFields = new string[](2);
        mfgFields[0] = "BOM_components";
        mfgFields[1] = "product_id_link";
        requirements[LifecycleStage.MANUFACTURING] = StageRequirement({
            primaryDocName: "BOM Specification + Product Passport",
            requiredFields: mfgFields,
            responsibleRole: "Chief Engineer"
        });
        
        // Stage 4: Warehousing
        string[] memory warehouseFields = new string[](2);
        warehouseFields[0] = "warehouse_location";
        warehouseFields[1] = "inventory_balance";
        requirements[LifecycleStage.WAREHOUSING] = StageRequirement({
            primaryDocName: "Receipt Order + Inventory Act",
            requiredFields: warehouseFields,
            responsibleRole: "Warehouse Operator"
        });
        
        // Stage 5: Sales
        string[] memory salesFields = new string[](3);
        salesFields[0] = "price";
        salesFields[1] = "incoterms";
        salesFields[2] = "buyer";
        requirements[LifecycleStage.SALES] = StageRequirement({
            primaryDocName: "Contract + Invoice + Specification",
            requiredFields: salesFields,
            responsibleRole: "Sales Department"
        });
        
        // Stage 6: Border Crossing
        string[] memory borderFields = new string[](3);
        borderFields[0] = "declaration_number";
        borderFields[1] = "hs_code";
        borderFields[2] = "duties_paid";
        requirements[LifecycleStage.BORDER] = StageRequirement({
            primaryDocName: "Customs Declaration + CMR/Bill of Lading",
            requiredFields: borderFields,
            responsibleRole: "Customs Broker"
        });
        
        // Stage 7: Final Sale
        string[] memory finalFields = new string[](1);
        finalFields[0] = "sold_status";
        requirements[LifecycleStage.FINAL] = StageRequirement({
            primaryDocName: "Acceptance Act + UPD + Receipt",
            requiredFields: finalFields,
            responsibleRole: "Retailer/Buyer"
        });
    }
    
    /* ==================== STAGE COMPLETION ==================== */
    
    /**
     * @notice Завершить этап жизненного цикла
     */
    function completeStage(
        bytes32 productId,
        LifecycleStage stage,
        bytes32 primaryDocHash,
        bytes32[] calldata supportingDocs,
        uint256 quantity,
        bytes32 quantityProofHash
    ) external canOperateStage(stage) {
        // Validate stage order
        LifecycleStage current = currentStage[productId];
        if (stage != LifecycleStage.EXTRACTION && uint8(stage) != uint8(current) + 1) {
            revert InvalidStage();
        }
        
        // Record stage
        stageRecords[productId][stage] = StageRecord({
            stage: stage,
            primaryDocHash: primaryDocHash,
            supportingDocs: supportingDocs,
            responsibleParty: msg.sender,
            timestamp: block.timestamp,
            quantity: quantity,
            quantityProofHash: quantityProofHash,
            completed: true
        });
        
        // Advance current stage
        LifecycleStage previousStage = currentStage[productId];
        currentStage[productId] = stage;
        
        emit StageCompleted(
            productId,
            stage,
            primaryDocHash,
            msg.sender,
            quantity,
            block.timestamp
        );
        
        emit StageAdvanced(productId, previousStage, stage, block.timestamp);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getStageRecord(bytes32 productId, LifecycleStage stage) 
        external view 
        returns (StageRecord memory) 
    {
        return stageRecords[productId][stage];
    }
    
    function getCurrentStage(bytes32 productId) external view returns (LifecycleStage) {
        return currentStage[productId];
    }
    
    function isStageCompleted(bytes32 productId, LifecycleStage stage) 
        external view 
        returns (bool) 
    {
        return stageRecords[productId][stage].completed;
    }
    
    function getRequirement(LifecycleStage stage) 
        external view 
        returns (StageRequirement memory) 
    {
        return requirements[stage];
    }
    
    /**
     * @notice Получить полную историю этапов
     */
    function getFullHistory(bytes32 productId) 
        external view 
        returns (StageRecord[] memory history) 
    {
        LifecycleStage current = currentStage[productId];
        if (current == LifecycleStage.NONE) return history;
        
        uint8 count = uint8(current);
        history = new StageRecord[](count);
        
        for (uint8 i = 1; i <= count; i++) {
            history[i - 1] = stageRecords[productId][LifecycleStage(i)];
        }
    }
    
    /**
     * @notice Проверить можно ли продвинуть на следующий этап
     */
    function canAdvanceToStage(bytes32 productId, LifecycleStage nextStage) 
        external view 
        returns (bool) 
    {
        if (nextStage == LifecycleStage.EXTRACTION) return true;
        
        LifecycleStage current = currentStage[productId];
        return uint8(nextStage) == uint8(current) + 1;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setStageOperator(
        LifecycleStage stage, 
        address operator, 
        bool authorized
    ) external onlyOwner {
        stageOperators[stage][operator] = authorized;
    }
    
    function setDpp(address _dpp) external onlyOwner {
        digitalProductPassport = _dpp;
    }
    
    function setChancellery(address _chancellery) external onlyOwner {
        chancellery = _chancellery;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
