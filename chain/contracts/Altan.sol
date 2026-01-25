// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Altan
 * @notice Единая валюта Сибирской Конфедерации
 *
 * Согласно Аксиоме 9: "Алтан — единая валюта Сибирской Конфедерации.
 * Право эмиссии принадлежит исключительно Центральному Банку Сибири.
 * Алтан обеспечен словом народов Сибири и богатствами нашего народа."
 *
 * Согласно Аксиоме 10: "Любая транзакция в системе стоит 0.03% Алтан от суммы транзакции.
 * Не должно быть иных комиссий или связей с внешними операторами.
 * Комиссия идёт на поддержание инфраструктуры."
 *
 * Символ: ₳ (Алтан)
 * Комиссия: 0.03% (3 базисных пункта) — автоматически на каждую транзакцию
 * Комиссия направляется в казну инфраструктуры
 *
 * ALTAN свободен для использования каждым гражданином в системе.
 */
contract Altan is ERC20, ERC20Permit, AccessControl {
    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Комиссия 0.03% = 3 базисных пункта = 3/10000
    uint256 public constant FEE_BASIS_POINTS = 3;
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10000;

    /// @notice Минимальная сумма для взимания комиссии (защита от пыли)
    uint256 public constant MIN_TRANSFER_FOR_FEE = 1000; // 0.001 ALTAN (с 6 decimals)

    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Центральный Банк Сибири — право эмиссии
    bytes32 public constant CENTRAL_BANK_ROLE = keccak256("CENTRAL_BANK_ROLE");

    /// @notice Казначейство — получатель комиссий
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    /// @notice Хурал — высший орган управления
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error ExceedsMaxSupply();
    error AddressExemptionNotAllowed();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event FeeCollected(address indexed from, address indexed to, uint256 amount, uint256 fee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Mint(address indexed to, uint256 amount, string reason);
    event Burn(address indexed from, uint256 amount, string reason);
    event FeeExemptionSet(address indexed account, bool exempt);

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Адрес казны инфраструктуры (получает комиссии)
    address public infrastructureTreasury;

    /// @notice Максимальное предложение (может быть изменено Хуралом)
    uint256 public maxSupply;

    /// @notice Общая сумма собранных комиссий
    uint256 public totalFeesCollected;

    /// @notice Адреса, освобождённые от комиссии (системные контракты)
    mapping(address => bool) public feeExempt;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _khural,
        address _centralBank,
        address _infrastructureTreasury,
        uint256 _initialMaxSupply
    ) ERC20(unicode"Алтан", "ALTAN") ERC20Permit(unicode"Алтан") {
        if (_khural == address(0)) revert ZeroAddress();
        if (_centralBank == address(0)) revert ZeroAddress();
        if (_infrastructureTreasury == address(0)) revert ZeroAddress();

        infrastructureTreasury = _infrastructureTreasury;
        maxSupply = _initialMaxSupply;

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(CENTRAL_BANK_ROLE, _centralBank);
        _grantRole(TREASURY_ROLE, _infrastructureTreasury);

        // Системные адреса освобождены от комиссии
        feeExempt[_infrastructureTreasury] = true;
        feeExempt[address(this)] = true;
    }

    /*//////////////////////////////////////////////////////////////
                            DECIMALS
    //////////////////////////////////////////////////////////////*/

    /// @notice 6 знаков после запятой (как USDC, удобно для расчётов)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /*//////////////////////////////////////////////////////////////
                            ЭМИССИЯ И СЖИГАНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Эмиссия новых Алтанов (только Центральный Банк)
    function mint(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyRole(CENTRAL_BANK_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalSupply() + amount > maxSupply) revert ExceedsMaxSupply();

        _mint(to, amount);

        emit Mint(to, amount, reason);
    }

    /// @notice Сжигание Алтанов (только Центральный Банк)
    function burn(
        address from,
        uint256 amount,
        string calldata reason
    ) external onlyRole(CENTRAL_BANK_ROLE) {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (balanceOf(from) < amount) revert InsufficientBalance();

        _burn(from, amount);

        emit Burn(from, amount, reason);
    }

    /// @notice Владелец может сжечь свои токены добровольно
    function burnOwn(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < amount) revert InsufficientBalance();

        _burn(msg.sender, amount);

        emit Burn(msg.sender, amount, "voluntary");
    }

    /*//////////////////////////////////////////////////////////////
                        РАСЧЁТ КОМИССИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Рассчитать комиссию 0.03% для суммы
    function calculateFee(uint256 amount) public pure returns (uint256) {
        if (amount < MIN_TRANSFER_FOR_FEE) return 0;
        return (amount * FEE_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
    }

    /*//////////////////////////////////////////////////////////////
                    ПЕРЕОПРЕДЕЛЕНИЕ TRANSFER С КОМИССИЕЙ
    //////////////////////////////////////////////////////////////*/

    /// @notice Transfer с автоматической комиссией 0.03%
    function transfer(address to, uint256 amount) public override returns (bool) {
        return _transferWithFee(msg.sender, to, amount);
    }

    /// @notice TransferFrom с автоматической комиссией 0.03%
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        return _transferWithFee(from, to, amount);
    }

    /// @notice Внутренняя функция трансфера с комиссией
    function _transferWithFee(address from, address to, uint256 amount) internal returns (bool) {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 fee = 0;

        // Комиссия не взимается с освобождённых адресов
        if (!feeExempt[from] && !feeExempt[to]) {
            fee = calculateFee(amount);
        }

        uint256 totalRequired = amount + fee;
        if (balanceOf(from) < totalRequired) revert InsufficientBalance();

        // Переводим основную сумму получателю
        _transfer(from, to, amount);

        // Переводим комиссию в казну инфраструктуры
        if (fee > 0) {
            _transfer(from, infrastructureTreasury, fee);
            totalFeesCollected += fee;

            emit FeeCollected(from, to, amount, fee);
        }

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                    СИСТЕМНЫЙ ТРАНСФЕР БЕЗ КОМИССИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Системный трансфер без комиссии (для банковских операций)
    /// @dev Только освобождённые адреса могут вызывать
    function transferNoFee(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        if (!feeExempt[msg.sender]) revert AddressExemptionNotAllowed();
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _transfer(from, to, amount);
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                            УПРАВЛЕНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Установить освобождение от комиссии (только Хурал)
    function setFeeExempt(address account, bool exempt) external onlyRole(KHURAL_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        feeExempt[account] = exempt;

        emit FeeExemptionSet(account, exempt);
    }

    /// @notice Обновить адрес казны инфраструктуры (только Хурал)
    function setInfrastructureTreasury(address newTreasury) external onlyRole(KHURAL_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();

        address oldTreasury = infrastructureTreasury;

        // Убираем освобождение со старого адреса
        feeExempt[oldTreasury] = false;

        infrastructureTreasury = newTreasury;

        // Добавляем освобождение новому адресу
        feeExempt[newTreasury] = true;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Изменить максимальное предложение (только Хурал)
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(KHURAL_ROLE) {
        require(newMaxSupply >= totalSupply(), "Cannot set below current supply");
        maxSupply = newMaxSupply;
    }

    /*//////////////////////////////////////////////////////////////
                        ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить детали транзакции (сумма, комиссия, итого)
    function getTransferDetails(uint256 amount) external pure returns (
        uint256 fee,
        uint256 recipientReceives,
        uint256 totalFromSender
    ) {
        fee = calculateFee(amount);
        recipientReceives = amount;
        totalFromSender = amount + fee;
    }

    /// @notice Проверить, достаточно ли средств для перевода с комиссией
    function canTransfer(address from, uint256 amount) external view returns (bool) {
        uint256 fee = 0;
        if (!feeExempt[from]) {
            fee = calculateFee(amount);
        }
        return balanceOf(from) >= amount + fee;
    }

    /// @notice Получить статистику валюты
    function getStats() external view returns (
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _totalFeesCollected,
        uint256 _treasuryBalance
    ) {
        return (
            totalSupply(),
            maxSupply,
            totalFeesCollected,
            balanceOf(infrastructureTreasury)
        );
    }
}
