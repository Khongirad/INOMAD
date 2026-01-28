// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DigitalProductPassport} from "./DigitalProductPassport.sol";

/**
 * @title AntiFraudEngine
 * @notice Система обнаружения аномалий в цепочке поставок
 * 
 * Логика: баланс ввода/вывода
 * - Ввезено 1000L концентрата
 * - Коэффициент 1:3 (разбавление)
 * - Максимум = 3000L сока
 * - Продано 5000L → Аномалия! 2000L = контрафакт
 * 
 * Автоматическая блокировка и уведомление
 */
contract AntiFraudEngine {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error AlreadyBlocked();
    error NoAnomaly();
    
    /* ==================== ENUMS ==================== */
    
    enum AnomalyType {
        QUANTITY_SURPLUS,       // Больше выхода чем ввода
        QUANTITY_DEFICIT,       // Необъяснимая потеря
        DUPLICATE_SALE,         // Дублирование продаж
        INVALID_ORIGIN,         // Неверное происхождение
        EXPIRED_CERT,           // Истёкший сертификат
        OTHER
    }
    
    enum AlertStatus {
        DETECTED,
        UNDER_REVIEW,
        CONFIRMED_FRAUD,
        FALSE_POSITIVE,
        RESOLVED
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct BalanceCheck {
        bytes32 productId;
        uint256 inputQuantity;
        uint256 conversionRatio;
        uint256 expectedMaxOutput;
        uint256 actualOutput;
        uint256 surplus;
        bool hasAnomaly;
    }
    
    struct FraudAlert {
        uint256 alertId;
        bytes32 productId;
        AnomalyType anomalyType;
        AlertStatus status;
        
        uint256 expectedValue;
        uint256 actualValue;
        uint256 surplusAmount;
        
        address detectedBy;
        uint256 detectedAt;
        address resolvedBy;
        uint256 resolvedAt;
        
        string description;
        bytes32 evidenceHash;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    DigitalProductPassport public dpp;
    
    // Alerts
    uint256 public nextAlertId = 1;
    mapping(uint256 => FraudAlert) public alerts;
    mapping(bytes32 => uint256[]) public productAlerts;  // productId => alertIds
    
    // Statistics
    uint256 public totalAlertsGenerated;
    uint256 public totalFraudConfirmed;
    uint256 public totalBlockedValue;
    
    // Authorized validators
    mapping(address => bool) public isValidator;
    
    // Auto-block threshold
    uint256 public autoBlockThreshold = 10;  // % surplus triggers auto-block
    
    /* ==================== EVENTS ==================== */
    
    event AnomalyDetected(
        uint256 indexed alertId,
        bytes32 indexed productId,
        AnomalyType anomalyType,
        uint256 surplus,
        uint256 timestamp
    );
    
    event AlertStatusChanged(
        uint256 indexed alertId,
        AlertStatus oldStatus,
        AlertStatus newStatus,
        address indexed changedBy,
        uint256 timestamp
    );
    
    event ProductBlocked(
        bytes32 indexed productId,
        uint256 indexed alertId,
        uint256 blockedQuantity,
        uint256 timestamp
    );
    
    event FraudConfirmed(
        uint256 indexed alertId,
        bytes32 indexed productId,
        uint256 fraudAmount,
        uint256 timestamp
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyValidator() {
        if (!isValidator[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(address _dpp) {
        owner = msg.sender;
        dpp = DigitalProductPassport(_dpp);
        isValidator[msg.sender] = true;
    }
    
    /* ==================== BALANCE CHECK ==================== */
    
    /**
     * @notice Проверить баланс продукта
     * @param productId ID паспорта товара
     * @return check Результат проверки
     */
    function checkBalance(bytes32 productId) external view returns (BalanceCheck memory check) {
        (
            uint256 original,
            uint256 current,
            uint256 expectedMax,
            bool hasAnomaly
        ) = dpp.checkQuantityBalance(productId);
        
        check = BalanceCheck({
            productId: productId,
            inputQuantity: original,
            conversionRatio: dpp.conversionRatio(productId),
            expectedMaxOutput: expectedMax,
            actualOutput: current,
            surplus: hasAnomaly ? current - expectedMax : 0,
            hasAnomaly: hasAnomaly
        });
    }
    
    /**
     * @notice Запустить полную проверку и создать alert при аномалии
     */
    function runCheck(bytes32 productId) external onlyValidator returns (uint256 alertId) {
        (
            uint256 original,
            uint256 current,
            uint256 expectedMax,
            bool hasAnomaly
        ) = dpp.checkQuantityBalance(productId);
        
        if (!hasAnomaly) return 0;
        
        uint256 surplus = current - expectedMax;
        
        alertId = _createAlert(
            productId,
            AnomalyType.QUANTITY_SURPLUS,
            expectedMax,
            current,
            surplus,
            "Automatic balance check detected surplus"
        );
        
        // Auto-block if surplus exceeds threshold
        uint256 surplusPercent = (surplus * 100) / expectedMax;
        if (surplusPercent >= autoBlockThreshold) {
            _blockProduct(productId, alertId, surplus);
        }
    }
    
    /* ==================== ALERT MANAGEMENT ==================== */
    
    function _createAlert(
        bytes32 productId,
        AnomalyType anomalyType,
        uint256 expectedValue,
        uint256 actualValue,
        uint256 surplusAmount,
        string memory description
    ) internal returns (uint256 alertId) {
        alertId = nextAlertId++;
        
        alerts[alertId] = FraudAlert({
            alertId: alertId,
            productId: productId,
            anomalyType: anomalyType,
            status: AlertStatus.DETECTED,
            expectedValue: expectedValue,
            actualValue: actualValue,
            surplusAmount: surplusAmount,
            detectedBy: msg.sender,
            detectedAt: block.timestamp,
            resolvedBy: address(0),
            resolvedAt: 0,
            description: description,
            evidenceHash: bytes32(0)
        });
        
        productAlerts[productId].push(alertId);
        totalAlertsGenerated++;
        
        emit AnomalyDetected(alertId, productId, anomalyType, surplusAmount, block.timestamp);
    }
    
    /**
     * @notice Создать ручной alert
     */
    function createManualAlert(
        bytes32 productId,
        AnomalyType anomalyType,
        uint256 expectedValue,
        uint256 actualValue,
        string calldata description
    ) external onlyValidator returns (uint256 alertId) {
        uint256 surplus = actualValue > expectedValue ? actualValue - expectedValue : 0;
        
        alertId = _createAlert(
            productId,
            anomalyType,
            expectedValue,
            actualValue,
            surplus,
            description
        );
    }
    
    /**
     * @notice Изменить статус alert
     */
    function updateAlertStatus(
        uint256 alertId,
        AlertStatus newStatus,
        bytes32 evidenceHash
    ) external onlyValidator {
        FraudAlert storage alert = alerts[alertId];
        require(alert.alertId != 0, "Not found");
        
        AlertStatus oldStatus = alert.status;
        alert.status = newStatus;
        alert.evidenceHash = evidenceHash;
        
        if (newStatus == AlertStatus.CONFIRMED_FRAUD) {
            totalFraudConfirmed++;
            alert.resolvedBy = msg.sender;
            alert.resolvedAt = block.timestamp;
            
            emit FraudConfirmed(alertId, alert.productId, alert.surplusAmount, block.timestamp);
        }
        
        if (newStatus == AlertStatus.FALSE_POSITIVE || newStatus == AlertStatus.RESOLVED) {
            alert.resolvedBy = msg.sender;
            alert.resolvedAt = block.timestamp;
        }
        
        emit AlertStatusChanged(alertId, oldStatus, newStatus, msg.sender, block.timestamp);
    }
    
    /* ==================== BLOCKING ==================== */
    
    function _blockProduct(bytes32 productId, uint256 alertId, uint256 quantity) internal {
        dpp.blockPassport(productId, "Anti-fraud: surplus detected");
        totalBlockedValue += quantity;
        
        emit ProductBlocked(productId, alertId, quantity, block.timestamp);
    }
    
    /**
     * @notice Ручная блокировка продукта
     */
    function blockProduct(bytes32 productId, uint256 alertId) external onlyValidator {
        FraudAlert storage alert = alerts[alertId];
        require(alert.productId == productId, "Mismatch");
        
        _blockProduct(productId, alertId, alert.surplusAmount);
    }
    
    /* ==================== EXAMPLE: JUICE CALCULATION ==================== */
    
    /**
     * @notice Пример: проверка сока
     * Input: 1000L концентрата
     * Ratio: 1:3
     * Expected: max 3000L
     * Actual: 5000L
     * Surplus: 2000L = КОНТРАФАКТ
     */
    function calculateJuiceExample(
        uint256 concentrateLiters,
        uint256 dilutionRatio,
        uint256 actualSoldLiters
    ) external pure returns (
        uint256 expectedMax,
        uint256 surplus,
        bool isCounterfeit
    ) {
        expectedMax = concentrateLiters * dilutionRatio;
        
        if (actualSoldLiters > expectedMax) {
            surplus = actualSoldLiters - expectedMax;
            isCounterfeit = true;
        } else {
            surplus = 0;
            isCounterfeit = false;
        }
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getAlert(uint256 alertId) external view returns (FraudAlert memory) {
        return alerts[alertId];
    }
    
    function getProductAlerts(bytes32 productId) external view returns (uint256[] memory) {
        return productAlerts[productId];
    }
    
    function getStats() external view returns (
        uint256 totalAlerts,
        uint256 confirmedFraud,
        uint256 blockedValue
    ) {
        return (totalAlertsGenerated, totalFraudConfirmed, totalBlockedValue);
    }
    
    /* ==================== ADMIN ==================== */
    
    function setValidator(address validator, bool authorized) external onlyOwner {
        isValidator[validator] = authorized;
    }
    
    function setDpp(address _dpp) external onlyOwner {
        dpp = DigitalProductPassport(_dpp);
    }
    
    function setAutoBlockThreshold(uint256 threshold) external onlyOwner {
        autoBlockThreshold = threshold;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
