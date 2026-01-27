// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import {AltanCoreLedger} from "./AltanCoreLedger.sol";
import {CoreLaw} from "./CoreLaw.sol";
import {CoreLock} from "./CoreLock.sol";

/**
 * @title AltanCentralBank
 * @notice Центральный Банк Сибирской Конфедерации
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ЧЕТВЁРТАЯ ВЕТВЬ ВЛАСТИ — БАНКОВСКАЯ                                     ║
 * ║  Согласно Статье 26 CoreLaw: эмиссия АЛТАН — исключительно ЦБ            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ИСКЛЮЧИТЕЛЬНЫЕ ПОЛНОМОЧИЯ:
 * - Эмиссия (создание) ALTAN
 * - Уничтожение (сжигание) ALTAN
 * - Денежно-кредитная политика
 * - Лицензирование банков
 * - Официальный курс ALTAN/USD
 * - Выпуск и управление государственными облигациями
 *
 * Аналоги: Федеральный Резерв, ЕЦБ, Банк России
 *
 * Начальная эмиссия: 2,500,000,000,000 ALTAN (2.5 триллиона)
 * Целевое население: 145,000,000 граждан
 * На душу населения: ~17,241 ALTAN на гражданина
 *
 * НЕ ОСУЩЕСТВЛЯЕТ:
 * - Ведение счетов граждан (делегировано лицензированным банкам)
 * - Розничные транзакции (делегировано лицензированным банкам)
 *
 * Архитектура:
 * ┌─────────────────────────────────────────┐
 * │ CoreLaw → CoreLock (заморожен)          │
 * ├─────────────────────────────────────────┤
 * │ AltanCoreLedger (суверенный реестр)     │
 * ├─────────────────────────────────────────┤
 * │ AltanCentralBank (этот контракт)        │ ← ВЫ ЗДЕСЬ
 * │ - Эмитирует в CoreLedger                │
 * │ - Лицензирует банки                     │
 * │ - Создаёт корр. счета (bytes32)         │
 * └─────────────────────────────────────────┘
 */
contract AltanCentralBank is AccessControl {
    /*//////////////////////////////////////////////////////////////
                                РОЛИ
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant BOARD_MEMBER_ROLE = keccak256("BOARD_MEMBER_ROLE");

    /*//////////////////////////////////////////////////////////////
                        СУВЕРЕННАЯ ИНФРАСТРУКТУРА
    //////////////////////////////////////////////////////////////*/

    /// @notice Суверенный реестр ALTAN (источник истины)
    AltanCoreLedger public immutable coreLedger;

    /// @notice Ссылка на CoreLock для проверки заморозки закона
    CoreLock public immutable coreLock;

    /// @notice Ссылка на CoreLaw для чтения констант
    CoreLaw public immutable coreLaw;

    /*//////////////////////////////////////////////////////////////
                        ЛИЦЕНЗИРОВАНИЕ БАНКОВ
    //////////////////////////////////////////////////////////////*/

    enum BankStatus { NONE, PENDING, LICENSED, SUSPENDED, REVOKED }

    struct LicensedBank {
        uint256 id;
        address bankAddress;            // Адрес контракта/управления банка
        bytes32 corrAccountId;          // ID корр. счёта в CoreLedger
        address corrAccountAddress;     // Ethereum адрес для ERC20 адаптера
        string name;
        string jurisdiction;            // Юрисдикция (государство народа)
        bytes32 nationId;               // ID государства народа
        BankStatus status;
        uint64 licensedAt;
        uint64 lastAuditAt;
        uint256 reserveRequirementBps;  // Норма резервирования в базисных пунктах
        bytes32 licenseDocHash;         // Хеш лицензионных документов
    }

    uint256 public nextBankId;
    mapping(uint256 => LicensedBank) public banks;
    mapping(address => uint256) public bankByAddress;
    mapping(bytes32 => uint256) public bankByCorrAccountId;

    /// @notice Главный банк (Банк Сибири)
    uint256 public primaryBankId;

    /*//////////////////////////////////////////////////////////////
                        ГОСУДАРСТВЕННЫЕ ОБЛИГАЦИИ
    //////////////////////////////////////////////////////////////*/

    enum BondStatus { NONE, ACTIVE, MATURED, CANCELLED }

    struct GovernmentBond {
        uint256 id;
        string name;                    // напр., "ОФЗ-001", "ALTAN-BOND-2026"
        uint256 faceValue;              // Номинал в ALTAN
        uint256 couponRateBps;          // Годовая ставка купона в базисных пунктах
        uint256 totalIssued;            // Всего выпущено облигаций
        uint256 totalSold;              // Продано инвесторам
        uint256 totalRedeemed;          // Погашено при наступлении срока
        uint64 issuedAt;                // Дата выпуска
        uint64 maturityAt;              // Дата погашения
        uint64 couponPeriodDays;        // Дней между купонными выплатами
        BondStatus status;
        bytes32 prospectusHash;         // Хеш проспекта эмиссии
    }

    uint256 public nextBondId;
    mapping(uint256 => GovernmentBond) public bonds;

    /// @notice Владение облигациями: bondId => accountId => количество
    mapping(uint256 => mapping(bytes32 => uint256)) public bondHoldings;

    /// @notice Статистика облигаций
    uint256 public totalBondsOutstanding;
    uint256 public totalCouponsPaid;

    /*//////////////////////////////////////////////////////////////
                    КОНСТАНТЫ НАЧАЛЬНОЙ ЭМИССИИ
    //////////////////////////////////////////////////////////////*/

    uint256 public constant INITIAL_EMISSION = 2_500_000_000_000 * 1e6;  // 2.5 трлн ALTAN (6 decimals)
    uint256 public constant TARGET_POPULATION = 145_000_000;
    uint256 public constant PER_CAPITA_AMOUNT = 17_241 * 1e6;

    bool public initialEmissionComplete;

    /*//////////////////////////////////////////////////////////////
                        ДЕНЕЖНАЯ ПОЛИТИКА
    //////////////////////////////////////////////////////////////*/

    /// @notice Официальный курс: базисные пункты (10000 = 1 ALTAN : 1 USD)
    uint256 public officialRateBps;

    /// @notice Норма резервирования по умолчанию
    uint256 public defaultReserveRequirementBps;

    /// @notice Лимиты эмиссии
    uint256 public dailyEmissionLimit;
    uint256 public dailyEmissionUsed;
    uint256 public lastEmissionDay;

    /// @notice Статистика
    uint256 public totalEmitted;
    uint256 public totalBurned;

    /// @notice Счёт казначейства инфраструктуры
    bytes32 public infrastructureTreasuryId;

    /*//////////////////////////////////////////////////////////////
                            СОБЫТИЯ
    //////////////////////////////////////////////////////////////*/

    event GovernorSet(address indexed oldGovernor, address indexed newGovernor);
    event OfficialRateSet(uint256 oldRate, uint256 newRate);
    event ReserveRequirementSet(uint256 oldReq, uint256 newReq);
    event DailyEmissionLimitSet(uint256 oldLimit, uint256 newLimit);

    // События лицензирования банков
    event BankRegistered(uint256 indexed id, address indexed bankAddress, string name);
    event BankLicensed(uint256 indexed id, bytes32 indexed corrAccountId);
    event BankSuspended(uint256 indexed id, string reason);
    event BankRevoked(uint256 indexed id, string reason);
    event BankAudited(uint256 indexed id, bytes32 auditHash);
    event PrimaryBankSet(uint256 indexed oldId, uint256 indexed newId);

    // События эмиссии
    event Emission(
        uint256 indexed bankId,
        bytes32 indexed corrAccountId,
        uint256 amount,
        string reason
    );
    event Destruction(
        uint256 indexed bankId,
        bytes32 indexed corrAccountId,
        uint256 amount,
        string reason
    );
    event InitialEmissionCompleted(
        uint256 amount,
        bytes32 indexed corrAccountId,
        uint256 targetPopulation
    );

    // События казначейства
    event InfrastructureTreasurySet(bytes32 indexed treasuryId);

    /*//////////////////////////////////////////////////////////////
                            ОШИБКИ
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ZeroAmount();
    error ZeroAccountId();
    error BankNotFound();
    error BankNotLicensed();
    error InvalidStatus();
    error AlreadyRegistered();
    error DailyLimitExceeded();
    error InsufficientBalance();
    error NotCorrAccount();
    error CoreLawNotFrozen();
    error TreasuryNotSet();

    /*//////////////////////////////////////////////////////////////
                            МОДИФИКАТОРЫ
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernor() {
        _checkRole(GOVERNOR_ROLE);
        _;
    }

    modifier onlyBoard() {
        if (!hasRole(GOVERNOR_ROLE, msg.sender) && !hasRole(BOARD_MEMBER_ROLE, msg.sender)) {
            revert("not board member");
        }
        _;
    }

    modifier onlyWhenCoreFrozen() {
        if (!coreLock.isFrozen()) revert CoreLawNotFrozen();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            КОНСТРУКТОР
    //////////////////////////////////////////////////////////////*/

    constructor(address _coreLedger, address _governor) {
        if (_coreLedger == address(0)) revert ZeroAddress();
        if (_governor == address(0)) revert ZeroAddress();

        coreLedger = AltanCoreLedger(_coreLedger);
        coreLock = coreLedger.coreLock();
        coreLaw = coreLedger.coreLaw();

        _grantRole(DEFAULT_ADMIN_ROLE, _governor);
        _grantRole(GOVERNOR_ROLE, _governor);
        _grantRole(BOARD_MEMBER_ROLE, _governor);

        // Начальная денежная политика
        officialRateBps = 10000;              // 1:1 с USD
        defaultReserveRequirementBps = 1000;  // 10% резервирование
        dailyEmissionLimit = 10_000_000 * 1e6; // 10M ALTAN (6 decimals)

        emit GovernorSet(address(0), _governor);
        emit OfficialRateSet(0, 10000);
        emit ReserveRequirementSet(0, 1000);
        emit DailyEmissionLimitSet(0, dailyEmissionLimit);
    }

    /*//////////////////////////////////////////////////////////////
                    ИНИЦИАЛИЗАЦИЯ КАЗНАЧЕЙСТВА
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать и установить счёт казначейства инфраструктуры
    function createInfrastructureTreasury() external onlyGovernor returns (bytes32 treasuryId) {
        treasuryId = keccak256(abi.encodePacked("INFRASTRUCTURE_TREASURY", block.timestamp));

        coreLedger.createAccount(
            treasuryId,
            AltanCoreLedger.AccountType.TREASURY,
            bytes32(0) // Конфедерация, не конкретное государство народа
        );

        infrastructureTreasuryId = treasuryId;
        coreLedger.setInfrastructureTreasury(treasuryId);

        emit InfrastructureTreasurySet(treasuryId);
    }

    /*//////////////////////////////////////////////////////////////
                        ЛИЦЕНЗИРОВАНИЕ БАНКОВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Зарегистрировать банк для лицензирования (статус PENDING)
    function registerBank(
        address bankAddress,
        string calldata name,
        string calldata jurisdiction,
        bytes32 nationId,
        bytes32 licenseDocHash
    ) external onlyGovernor returns (uint256 id) {
        if (bankAddress == address(0)) revert ZeroAddress();
        if (bankByAddress[bankAddress] != 0) revert AlreadyRegistered();

        id = ++nextBankId;

        banks[id] = LicensedBank({
            id: id,
            bankAddress: bankAddress,
            corrAccountId: bytes32(0),      // Устанавливается при лицензировании
            corrAccountAddress: address(0), // Устанавливается при лицензировании
            name: name,
            jurisdiction: jurisdiction,
            nationId: nationId,
            status: BankStatus.PENDING,
            licensedAt: 0,
            lastAuditAt: 0,
            reserveRequirementBps: defaultReserveRequirementBps,
            licenseDocHash: licenseDocHash
        });

        bankByAddress[bankAddress] = id;

        emit BankRegistered(id, bankAddress, name);
    }

    /// @notice Выдать лицензию банку и создать корреспондентский счёт
    function grantLicense(
        uint256 bankId,
        address corrAccountAddress
    ) external onlyGovernor returns (bytes32 corrAccountId) {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.PENDING && bank.status != BankStatus.SUSPENDED) {
            revert InvalidStatus();
        }
        if (corrAccountAddress == address(0)) revert ZeroAddress();

        // Создать уникальный ID корр. счёта
        corrAccountId = keccak256(abi.encodePacked(
            "BANK_CORR_ACCOUNT",
            bankId,
            bank.bankAddress,
            block.timestamp
        ));

        // Создать счёт в суверенном реестре
        coreLedger.createAccount(
            corrAccountId,
            AltanCoreLedger.AccountType.BANK_CORRESPONDENT,
            bank.nationId
        );

        // Связать Ethereum адрес со счётом (для ERC20 адаптера)
        coreLedger.linkAddress(corrAccountId, corrAccountAddress);

        // Обновить запись банка
        bank.corrAccountId = corrAccountId;
        bank.corrAccountAddress = corrAccountAddress;
        bank.status = BankStatus.LICENSED;
        bank.licensedAt = uint64(block.timestamp);

        bankByCorrAccountId[corrAccountId] = bankId;

        emit BankLicensed(bankId, corrAccountId);
    }

    /// @notice Приостановить лицензию банка
    function suspendBank(uint256 bankId, string calldata reason) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.LICENSED) revert InvalidStatus();

        bank.status = BankStatus.SUSPENDED;

        emit BankSuspended(bankId, reason);
    }

    /// @notice Отозвать лицензию банка (навсегда)
    function revokeBank(uint256 bankId, string calldata reason) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();

        bank.status = BankStatus.REVOKED;

        emit BankRevoked(bankId, reason);
    }

    /// @notice Записать результат аудита банка
    function recordAudit(uint256 bankId, bytes32 auditHash) external onlyBoard {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();

        bank.lastAuditAt = uint64(block.timestamp);

        emit BankAudited(bankId, auditHash);
    }

    /// @notice Установить главный банк (Банк Сибири)
    function setPrimaryBank(uint256 bankId) external onlyGovernor {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();

        uint256 oldId = primaryBankId;
        primaryBankId = bankId;

        emit PrimaryBankSet(oldId, bankId);
    }

    /*//////////////////////////////////////////////////////////////
                    ЭМИССИЯ (СОЗДАНИЕ ALTAN)
    //////////////////////////////////////////////////////////////*/

    /// @notice Эмитировать ALTAN на корр. счёт лицензированного банка
    /// @dev Только Центральный Банк может создавать новые ALTAN (Статья 26)
    function emitToBank(
        uint256 bankId,
        uint256 amount,
        string calldata reason
    ) external onlyGovernor {
        if (amount == 0) revert ZeroAmount();

        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();
        if (bank.corrAccountId == bytes32(0)) revert NotCorrAccount();

        // Проверить дневной лимит
        _checkDailyLimit(amount);

        // Эмитировать в суверенный реестр
        coreLedger.emit_(bank.corrAccountId, amount, reason);

        totalEmitted += amount;
        dailyEmissionUsed += amount;

        emit Emission(bankId, bank.corrAccountId, amount, reason);
    }

    /// @notice Эмитировать в главный банк (удобная функция)
    function emitToPrimaryBank(uint256 amount, string calldata reason) external onlyGovernor {
        if (primaryBankId == 0) revert BankNotFound();

        LicensedBank storage bank = banks[primaryBankId];
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();

        _checkDailyLimit(amount);

        coreLedger.emit_(bank.corrAccountId, amount, reason);

        totalEmitted += amount;
        dailyEmissionUsed += amount;

        emit Emission(primaryBankId, bank.corrAccountId, amount, reason);
    }

    /// @notice Выполнить начальную эмиссию в главный банк
    function executeInitialEmission() external onlyGovernor {
        require(!initialEmissionComplete, "already executed");
        if (primaryBankId == 0) revert BankNotFound();

        LicensedBank storage bank = banks[primaryBankId];
        if (bank.status != BankStatus.LICENSED) revert BankNotLicensed();

        // Начальная эмиссия не учитывает дневной лимит
        coreLedger.emit_(bank.corrAccountId, INITIAL_EMISSION, "Initial Emission");

        totalEmitted += INITIAL_EMISSION;
        initialEmissionComplete = true;

        emit InitialEmissionCompleted(INITIAL_EMISSION, bank.corrAccountId, TARGET_POPULATION);
    }

    function _checkDailyLimit(uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        if (today != lastEmissionDay) {
            lastEmissionDay = today;
            dailyEmissionUsed = 0;
        }

        if (dailyEmissionUsed + amount > dailyEmissionLimit) {
            revert DailyLimitExceeded();
        }
    }

    /*//////////////////////////////////////////////////////////////
                    УНИЧТОЖЕНИЕ (СЖИГАНИЕ ALTAN)
    //////////////////////////////////////////////////////////////*/

    /// @notice Уничтожить ALTAN с корр. счёта банка
    /// @dev Используется когда банки возвращают ALTAN в ЦБ (напр., для обмена на USD)
    function destroy(
        uint256 bankId,
        uint256 amount,
        string calldata reason
    ) external onlyGovernor {
        if (amount == 0) revert ZeroAmount();

        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        if (bank.corrAccountId == bytes32(0)) revert NotCorrAccount();

        // Проверить баланс
        if (coreLedger.balanceOf(bank.corrAccountId) < amount) {
            revert InsufficientBalance();
        }

        // Уничтожить из суверенного реестра
        coreLedger.destroy(bank.corrAccountId, amount, reason);

        totalBurned += amount;

        emit Destruction(bankId, bank.corrAccountId, amount, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        ДЕНЕЖНАЯ ПОЛИТИКА
    //////////////////////////////////////////////////////////////*/

    /// @notice Установить официальный курс ALTAN/USD
    function setOfficialRate(uint256 newRateBps) external onlyBoard {
        require(newRateBps > 0, "rate must be positive");
        uint256 oldRate = officialRateBps;
        officialRateBps = newRateBps;
        emit OfficialRateSet(oldRate, newRateBps);
    }

    /// @notice Установить норму резервирования по умолчанию
    function setReserveRequirement(uint256 newReqBps) external onlyBoard {
        require(newReqBps <= 10000, "max 100%");
        uint256 oldReq = defaultReserveRequirementBps;
        defaultReserveRequirementBps = newReqBps;
        emit ReserveRequirementSet(oldReq, newReqBps);
    }

    /// @notice Установить норму резервирования для конкретного банка
    function setBankReserveRequirement(uint256 bankId, uint256 reqBps) external onlyBoard {
        LicensedBank storage bank = banks[bankId];
        if (bank.bankAddress == address(0)) revert BankNotFound();
        require(reqBps <= 10000, "max 100%");

        bank.reserveRequirementBps = reqBps;
    }

    /// @notice Установить дневной лимит эмиссии
    function setDailyEmissionLimit(uint256 newLimit) external onlyBoard {
        uint256 oldLimit = dailyEmissionLimit;
        dailyEmissionLimit = newLimit;
        emit DailyEmissionLimitSet(oldLimit, newLimit);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить информацию о банке
    function getBank(uint256 bankId) external view returns (LicensedBank memory) {
        return banks[bankId];
    }

    /// @notice Получить информацию о главном банке
    function getPrimaryBank() external view returns (LicensedBank memory) {
        return banks[primaryBankId];
    }

    /// @notice Проверить, является ли счёт корр. счётом лицензированного банка
    function isLicensedCorrAccount(bytes32 accountId) external view returns (bool) {
        uint256 bankId = bankByCorrAccountId[accountId];
        if (bankId == 0) return false;
        return banks[bankId].status == BankStatus.LICENSED;
    }

    /// @notice Получить баланс корр. счёта банка
    function getBankBalance(uint256 bankId) external view returns (uint256) {
        LicensedBank storage bank = banks[bankId];
        if (bank.corrAccountId == bytes32(0)) return 0;
        return coreLedger.balanceOf(bank.corrAccountId);
    }

    /// @notice Получить статистику денежной массы
    function getMonetaryStats() external view returns (
        uint256 _totalEmitted,
        uint256 _totalBurned,
        uint256 _netSupply,
        uint256 _dailyLimitRemaining,
        uint256 _coreLedgerSupply
    ) {
        _totalEmitted = totalEmitted;
        _totalBurned = totalBurned;
        _netSupply = totalEmitted - totalBurned;
        _coreLedgerSupply = coreLedger.totalSupply();

        uint256 today = block.timestamp / 1 days;
        if (today == lastEmissionDay) {
            _dailyLimitRemaining = dailyEmissionLimit > dailyEmissionUsed
                ? dailyEmissionLimit - dailyEmissionUsed
                : 0;
        } else {
            _dailyLimitRemaining = dailyEmissionLimit;
        }
    }

    /// @notice Проверить целостность CoreLaw
    function verifyCoreLawIntegrity() external view returns (bool) {
        return coreLock.verifyIntegrity();
    }

    /// @notice Проверить заморожен ли CoreLaw
    function isCoreLawFrozen() external view returns (bool) {
        return coreLock.isFrozen();
    }

    /*//////////////////////////////////////////////////////////////
                            АДМИНИСТРИРОВАНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Добавить члена правления
    function addBoardMember(address member) external onlyGovernor {
        if (member == address(0)) revert ZeroAddress();
        _grantRole(BOARD_MEMBER_ROLE, member);
    }

    /// @notice Удалить члена правления
    function removeBoardMember(address member) external onlyGovernor {
        _revokeRole(BOARD_MEMBER_ROLE, member);
    }

    /// @notice Передать полномочия управляющего
    function setGovernor(address newGovernor) external onlyGovernor {
        if (newGovernor == address(0)) revert ZeroAddress();

        address oldGovernor = msg.sender;

        _revokeRole(GOVERNOR_ROLE, oldGovernor);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldGovernor);

        _grantRole(GOVERNOR_ROLE, newGovernor);
        _grantRole(DEFAULT_ADMIN_ROLE, newGovernor);
        _grantRole(BOARD_MEMBER_ROLE, newGovernor);

        emit GovernorSet(oldGovernor, newGovernor);
    }
}
