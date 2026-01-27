// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreLaw} from "./CoreLaw.sol";
import {CoreLock} from "./CoreLock.sol";

/**
 * @title AltanCoreLedger
 * @notice Суверенный реестр цифровой валюты АЛТАН
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  АЛТАН — НЕ ERC20 ТОКЕН                                                  ║
 * ║  АЛТАН — СУВЕРЕННАЯ ЦИФРОВАЯ ВАЛЮТА СИБИРСКОЙ КОНФЕДЕРАЦИИ               ║
 * ║  ERC20 — ЛИШЬ ФОРМАТ ИНТЕРФЕЙСА ДЛЯ СОВМЕСТИМОСТИ                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Архитектурные принципы (согласно Основному Закону):
 *
 * 1. ЭМИССИЯ — ИСКЛЮЧИТЕЛЬНОЕ ПРАВО ЦЕНТРАЛЬНОГО БАНКА (Статья 26)
 *    Никакой внешний контракт или протокол не может создавать ALTAN
 *
 * 2. ERC20 — АДАПТЕР, НЕ ИСТОЧНИК ВЛАСТИ
 *    - Core Ledger = источник истины (этот контракт)
 *    - ERC20 Adapter = обёртка для совместимости
 *    - Ethereum — не источник права, а инструмент
 *
 * 3. СТАНДАРТ — СМЕНЯЕМЫЙ
 *    Если ERC20 устареет, можно создать новый адаптер
 *    Core Ledger остаётся неизменным
 *
 * 4. СУВЕРЕНИТЕТ — У НАРОДА
 *    Контроль — у Центрального Банка, подотчётного Хуралу
 *    ERC20 — лишь формат, не угроза автономности
 *
 * Иерархия:
 * ┌─────────────────────────────────────────┐
 * │ CoreLaw (Основной Закон) — неизменяем   │
 * ├─────────────────────────────────────────┤
 * │ AltanCoreLedger — суверенный реестр     │ ← ВЫ ЗДЕСЬ
 * ├─────────────────────────────────────────┤
 * │ AltanCentralBank — эмиссия и политика   │
 * ├─────────────────────────────────────────┤
 * │ AltanERC20Adapter — совместимость       │
 * └─────────────────────────────────────────┘
 */
contract AltanCoreLedger {
    /*//////////////////////////////////////////////////////////////
                            ТИПЫ И СТРУКТУРЫ
    //////////////////////////////////////////////////////////////*/

    /// @notice Тип счёта в системе
    enum AccountType {
        NONE,               // 0 - Не существует
        CITIZEN,            // 1 - Гражданин
        ORGANIZATION,       // 2 - Организация
        BANK_CORRESPONDENT, // 3 - Корреспондентский счёт банка
        TREASURY,           // 4 - Казна (конфедерации или народа)
        SYSTEM              // 5 - Системный счёт
    }

    /// @notice Учётная запись в реестре
    struct Account {
        bytes32 id;                 // Уникальный ID (keccak256)
        AccountType accountType;    // Тип счёта
        uint256 balance;            // Баланс в базовых единицах (6 decimals)
        uint256 frozenBalance;      // Замороженные средства
        bytes32 nationId;           // Государство народа (или bytes32(0) для конфедерации)
        uint64 createdAt;           // Время создания
        bool exists;                // Флаг существования
    }

    /*//////////////////////////////////////////////////////////////
                            КОНСТАНТЫ
    //////////////////////////////////////////////////////////////*/

    /// @notice Название валюты (из CoreLaw Статья 26)
    string public constant NAME = unicode"Алтан";
    string public constant SYMBOL = "ALTAN";
    uint8 public constant DECIMALS = 6;

    /// @notice Сетевая комиссия 0.03% (из CoreLaw Статья 27)
    uint16 public constant NETWORK_FEE_BPS = 3;
    uint16 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_TRANSFER_FOR_FEE = 1000; // 0.001 ALTAN

    /*//////////////////////////////////////////////////////////////
                            ОШИБКИ
    //////////////////////////////////////////////////////////////*/

    error NotCentralBank();
    error NotAuthorized();
    error ZeroAddress();
    error ZeroAmount();
    error AccountNotFound();
    error AccountAlreadyExists();
    error InsufficientBalance();
    error InsufficientUnfrozenBalance();
    error InvalidAccountType();
    error CoreLawNotFrozen();
    error TransferToSelf();

    /*//////////////////////////////////////////////////////////////
                            СОБЫТИЯ
    //////////////////////////////////////////////////////////////*/

    event AccountCreated(
        bytes32 indexed accountId,
        AccountType accountType,
        bytes32 indexed nationId
    );

    event Emission(
        bytes32 indexed toAccountId,
        uint256 amount,
        string reason,
        uint256 newTotalSupply
    );

    event Destruction(
        bytes32 indexed fromAccountId,
        uint256 amount,
        string reason,
        uint256 newTotalSupply
    );

    event Transfer(
        bytes32 indexed fromAccountId,
        bytes32 indexed toAccountId,
        uint256 amount,
        uint256 fee,
        bytes32 memo
    );

    event BalanceFrozen(
        bytes32 indexed accountId,
        uint256 amount,
        string reason
    );

    event BalanceUnfrozen(
        bytes32 indexed accountId,
        uint256 amount,
        string reason
    );

    event CentralBankSet(address indexed oldBank, address indexed newBank);
    event TreasurySet(bytes32 indexed treasuryId);
    event AdapterAuthorized(address indexed adapter, bool authorized);

    /*//////////////////////////////////////////////////////////////
                            ХРАНЕНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Ссылка на CoreLock для проверки заморозки Основного Закона
    CoreLock public immutable coreLock;

    /// @notice Ссылка на CoreLaw для чтения констант
    CoreLaw public immutable coreLaw;

    /// @notice Центральный Банк — единственный эмитент
    address public centralBank;

    /// @notice Казначейство — получатель комиссий
    bytes32 public infrastructureTreasury;

    /// @notice Общее предложение валюты
    uint256 public totalSupply;

    /// @notice Общая сумма собранных комиссий
    uint256 public totalFeesCollected;

    /// @notice Реестр счетов
    mapping(bytes32 => Account) public accounts;

    /// @notice Авторизованные ERC20 адаптеры (для внешней совместимости)
    mapping(address => bool) public authorizedAdapters;

    /// @notice Маппинг адрес → accountId (для адаптеров)
    mapping(address => bytes32) public addressToAccountId;

    /// @notice Маппинг accountId → адрес (для адаптеров)
    mapping(bytes32 => address) public accountIdToAddress;

    /*//////////////////////////////////////////////////////////////
                            МОДИФИКАТОРЫ
    //////////////////////////////////////////////////////////////*/

    modifier onlyCentralBank() {
        if (msg.sender != centralBank) revert NotCentralBank();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != centralBank && !authorizedAdapters[msg.sender]) {
            revert NotAuthorized();
        }
        _;
    }

    modifier accountExists(bytes32 accountId) {
        if (!accounts[accountId].exists) revert AccountNotFound();
        _;
    }

    modifier onlyWhenCoreFrozen() {
        if (!coreLock.isFrozen()) revert CoreLawNotFrozen();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            КОНСТРУКТОР
    //////////////////////////////////////////////////////////////*/

    constructor(address _coreLock, address _centralBank) {
        if (_coreLock == address(0)) revert ZeroAddress();
        if (_centralBank == address(0)) revert ZeroAddress();

        coreLock = CoreLock(_coreLock);
        coreLaw = coreLock.coreLaw();
        centralBank = _centralBank;

        emit CentralBankSet(address(0), _centralBank);
    }

    /*//////////////////////////////////////////////////////////////
                    УПРАВЛЕНИЕ СЧЕТАМИ (ТОЛЬКО ЦБ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать новый счёт в реестре
    function createAccount(
        bytes32 accountId,
        AccountType accountType,
        bytes32 nationId
    ) external onlyCentralBank returns (bytes32) {
        if (accountId == bytes32(0)) revert ZeroAddress();
        if (accounts[accountId].exists) revert AccountAlreadyExists();
        if (accountType == AccountType.NONE) revert InvalidAccountType();

        accounts[accountId] = Account({
            id: accountId,
            accountType: accountType,
            balance: 0,
            frozenBalance: 0,
            nationId: nationId,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        emit AccountCreated(accountId, accountType, nationId);
        return accountId;
    }

    /// @notice Связать Ethereum адрес со счётом (для ERC20 адаптера)
    function linkAddress(
        bytes32 accountId,
        address ethAddress
    ) external onlyCentralBank accountExists(accountId) {
        if (ethAddress == address(0)) revert ZeroAddress();

        addressToAccountId[ethAddress] = accountId;
        accountIdToAddress[accountId] = ethAddress;
    }

    /*//////////////////////////////////////////////////////////////
                    ЭМИССИЯ И УНИЧТОЖЕНИЕ (ТОЛЬКО ЦБ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Эмиссия новых ALTAN (исключительное право ЦБ, Статья 26)
    function emit_(
        bytes32 toAccountId,
        uint256 amount,
        string calldata reason
    ) external onlyCentralBank accountExists(toAccountId) {
        if (amount == 0) revert ZeroAmount();

        accounts[toAccountId].balance += amount;
        totalSupply += amount;

        emit Emission(toAccountId, amount, reason, totalSupply);
    }

    /// @notice Уничтожение ALTAN (исключительное право ЦБ)
    function destroy(
        bytes32 fromAccountId,
        uint256 amount,
        string calldata reason
    ) external onlyCentralBank accountExists(fromAccountId) {
        if (amount == 0) revert ZeroAmount();

        Account storage acc = accounts[fromAccountId];
        uint256 available = acc.balance - acc.frozenBalance;
        if (available < amount) revert InsufficientUnfrozenBalance();

        acc.balance -= amount;
        totalSupply -= amount;

        emit Destruction(fromAccountId, amount, reason, totalSupply);
    }

    /*//////////////////////////////////////////////////////////////
                        ПЕРЕВОДЫ (АВТОРИЗОВАННЫЕ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Внутренний перевод между счетами
    function transfer(
        bytes32 fromAccountId,
        bytes32 toAccountId,
        uint256 amount,
        bytes32 memo
    ) external onlyAuthorized
      accountExists(fromAccountId)
      accountExists(toAccountId)
      returns (bool)
    {
        if (amount == 0) revert ZeroAmount();
        if (fromAccountId == toAccountId) revert TransferToSelf();

        Account storage fromAcc = accounts[fromAccountId];
        Account storage toAcc = accounts[toAccountId];

        // Рассчитать комиссию (0.03%, Статья 27)
        uint256 fee = _calculateFee(amount, fromAcc.accountType, toAcc.accountType);
        uint256 totalDebit = amount + fee;

        // Проверить доступный баланс
        uint256 available = fromAcc.balance - fromAcc.frozenBalance;
        if (available < totalDebit) revert InsufficientUnfrozenBalance();

        // Выполнить перевод
        fromAcc.balance -= totalDebit;
        toAcc.balance += amount;

        // Комиссия в казну
        if (fee > 0 && infrastructureTreasury != bytes32(0)) {
            accounts[infrastructureTreasury].balance += fee;
            totalFeesCollected += fee;
        }

        emit Transfer(fromAccountId, toAccountId, amount, fee, memo);
        return true;
    }

    /// @notice Перевод без комиссии (только для системных операций ЦБ)
    function transferNoFee(
        bytes32 fromAccountId,
        bytes32 toAccountId,
        uint256 amount,
        bytes32 memo
    ) external onlyCentralBank
      accountExists(fromAccountId)
      accountExists(toAccountId)
      returns (bool)
    {
        if (amount == 0) revert ZeroAmount();
        if (fromAccountId == toAccountId) revert TransferToSelf();

        Account storage fromAcc = accounts[fromAccountId];
        Account storage toAcc = accounts[toAccountId];

        uint256 available = fromAcc.balance - fromAcc.frozenBalance;
        if (available < amount) revert InsufficientUnfrozenBalance();

        fromAcc.balance -= amount;
        toAcc.balance += amount;

        emit Transfer(fromAccountId, toAccountId, amount, 0, memo);
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                    ЗАМОРОЗКА СРЕДСТВ (ТОЛЬКО ЦБ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Заморозить средства на счёте (по решению суда и т.д.)
    function freezeBalance(
        bytes32 accountId,
        uint256 amount,
        string calldata reason
    ) external onlyCentralBank accountExists(accountId) {
        Account storage acc = accounts[accountId];
        uint256 unfrozen = acc.balance - acc.frozenBalance;
        if (unfrozen < amount) revert InsufficientUnfrozenBalance();

        acc.frozenBalance += amount;

        emit BalanceFrozen(accountId, amount, reason);
    }

    /// @notice Разморозить средства
    function unfreezeBalance(
        bytes32 accountId,
        uint256 amount,
        string calldata reason
    ) external onlyCentralBank accountExists(accountId) {
        Account storage acc = accounts[accountId];
        if (acc.frozenBalance < amount) revert InsufficientBalance();

        acc.frozenBalance -= amount;

        emit BalanceUnfrozen(accountId, amount, reason);
    }

    /*//////////////////////////////////////////////////////////////
                    УПРАВЛЕНИЕ (ТОЛЬКО ЦБ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Установить казначейство для сбора комиссий
    function setInfrastructureTreasury(bytes32 treasuryId)
        external
        onlyCentralBank
        accountExists(treasuryId)
    {
        infrastructureTreasury = treasuryId;
        emit TreasurySet(treasuryId);
    }

    /// @notice Авторизовать ERC20 адаптер
    function authorizeAdapter(address adapter, bool authorized)
        external
        onlyCentralBank
    {
        if (adapter == address(0)) revert ZeroAddress();
        authorizedAdapters[adapter] = authorized;
        emit AdapterAuthorized(adapter, authorized);
    }

    /// @notice Передать полномочия ЦБ (только текущий ЦБ)
    function setCentralBank(address newCentralBank) external onlyCentralBank {
        if (newCentralBank == address(0)) revert ZeroAddress();

        address oldBank = centralBank;
        centralBank = newCentralBank;

        emit CentralBankSet(oldBank, newCentralBank);
    }

    /*//////////////////////////////////////////////////////////////
                    РАСЧЁТ КОМИССИИ (ВНУТРЕННЯЯ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Рассчитать комиссию согласно Статье 27
    function _calculateFee(
        uint256 amount,
        AccountType fromType,
        AccountType toType
    ) internal pure returns (uint256) {
        // Системные и казначейские счета освобождены от комиссии
        if (fromType == AccountType.TREASURY ||
            fromType == AccountType.SYSTEM ||
            toType == AccountType.TREASURY ||
            toType == AccountType.SYSTEM) {
            return 0;
        }

        // Минимальная сумма для комиссии
        if (amount < MIN_TRANSFER_FOR_FEE) return 0;

        // 0.03% = 3/10000
        return (amount * NETWORK_FEE_BPS) / BPS_DENOMINATOR;
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить баланс счёта
    function balanceOf(bytes32 accountId) external view returns (uint256) {
        return accounts[accountId].balance;
    }

    /// @notice Получить доступный (незамороженный) баланс
    function availableBalance(bytes32 accountId) external view returns (uint256) {
        Account storage acc = accounts[accountId];
        return acc.balance - acc.frozenBalance;
    }

    /// @notice Получить полную информацию о счёте
    function getAccount(bytes32 accountId) external view returns (Account memory) {
        return accounts[accountId];
    }

    /// @notice Получить accountId по Ethereum адресу
    function getAccountIdByAddress(address ethAddress) external view returns (bytes32) {
        return addressToAccountId[ethAddress];
    }

    /// @notice Рассчитать комиссию для суммы
    function calculateFee(uint256 amount) external pure returns (uint256) {
        if (amount < MIN_TRANSFER_FOR_FEE) return 0;
        return (amount * NETWORK_FEE_BPS) / BPS_DENOMINATOR;
    }

    /// @notice Получить статистику реестра
    function getStats() external view returns (
        uint256 _totalSupply,
        uint256 _totalFeesCollected,
        bool _coreLawFrozen
    ) {
        return (
            totalSupply,
            totalFeesCollected,
            coreLock.isFrozen()
        );
    }

    /// @notice Проверить целостность связи с CoreLaw
    function verifyCoreLawIntegrity() external view returns (bool) {
        return coreLock.verifyIntegrity();
    }
}
