// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreLaw} from "./CoreLaw.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Altan
 * @notice Суверенная валюта Сибирской Конфедерации
 * @dev Собственная реализация валюты (НЕ ERC20) с интеграцией CoreLaw
 *
 * Основано на CoreLaw:
 * - Статья 26: "Единой валютой является Алтан. Эмиссия — исключительно Центральным Банком."
 * - Статья 27: "Единая комиссия — 0,03%. Иные сетевые комиссии запрещены."
 *
 * Ключевые отличия от ERC20:
 * 1. Автоматическая комиссия 0.03% на каждую транзакцию
 * 2. Все параметры из CoreLaw (единый источник истины)
 * 3. Эмиссия только Центральным Банком
 * 4. Суверенная валюта, не токен
 */
contract Altan is AccessControl {
    /*//////////////////////////////////////////////////////////////
                            CORELAW INTEGRATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Ссылка на CoreLaw - единый источник истины
    CoreLaw public immutable coreLaw;

    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Центральный Банк — право эмиссии
    bytes32 public constant CENTRAL_BANK_ROLE = keccak256("CENTRAL_BANK_ROLE");

    /// @notice Хурал — высший орган управления
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error InsufficientAllowance();
    error ExceedsMaxSupply();
    error InvalidCoreLaw();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event FeeCollected(address indexed from, address indexed to, uint256 amount, uint256 fee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Mint(address indexed to, uint256 amount, string reason);
    event Burn(address indexed from, uint256 amount, string reason);
    event FeeExemptionSet(address indexed account, bool exempt);

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Общее предложение
    uint256 private _totalSupply;

    /// @notice Балансы адресов
    mapping(address => uint256) private _balances;

    /// @notice Разрешения на расходование
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice Адрес казны инфраструктуры (получает комиссии)
    address public infrastructureTreasury;

    /// @notice Максимальное предложение
    uint256 public maxSupply;

    /// @notice Общая сумма собранных комиссий
    uint256 public totalFeesCollected;

    /// @notice Адреса, освобождённые от комиссии
    mapping(address => bool) public feeExempt;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _coreLaw,
        address _khural,
        address _centralBank,
        address _infrastructureTreasury,
        uint256 _initialMaxSupply
    ) {
        if (_coreLaw == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();
        if (_centralBank == address(0)) revert ZeroAddress();
        if (_infrastructureTreasury == address(0)) revert ZeroAddress();

        coreLaw = CoreLaw(_coreLaw);
        
        // Проверить целостность CoreLaw
        if (!coreLaw.verifyIntegrity()) revert InvalidCoreLaw();

        infrastructureTreasury = _infrastructureTreasury;
        maxSupply = _initialMaxSupply;

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(CENTRAL_BANK_ROLE, _centralBank);

        // Системные адреса освобождены от комиссии
        feeExempt[_infrastructureTreasury] = true;
        feeExempt[address(this)] = true;
    }

    /*//////////////////////////////////////////////////////////////
                        METADATA (ИЗ CORELAW)
    //////////////////////////////////////////////////////////////*/

    /// @notice Название валюты из CoreLaw Статья 26
    function name() public view returns (string memory) {
        return coreLaw.CURRENCY_NAME();
    }

    /// @notice Символ валюты из CoreLaw Статья 26
    function symbol() public view returns (string memory) {
        return coreLaw.CURRENCY_SYMBOL();
    }

    /// @notice Десятичные знаки из CoreLaw Статья 26
    function decimals() public view returns (uint8) {
        return coreLaw.CURRENCY_DECIMALS();
    }

    /*//////////////////////////////////////////////////////////////
                        SUPPLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Общее предложение
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /// @notice Баланс адреса
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /*//////////////////////////////////////////////////////////////
                        ALLOWANCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Разрешение на расходование
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice Одобрить расходование
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice Увеличить разрешение
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    /// @notice Уменьшить разрешение
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "Decreased below zero");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                    TRANSFER WITH AUTO FEE (0.03%)
    //////////////////////////////////////////////////////////////*/

    /// @notice Перевод с автоматической комиссией 0.03% (из CoreLaw Статья 27)
    function transfer(address to, uint256 amount) public returns (bool) {
        _transferWithFee(msg.sender, to, amount);
        return true;
    }

    /// @notice Перевод от имени с автоматической комиссией
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transferWithFee(from, to, amount);
        return true;
    }

    /// @notice Внутренняя функция перевода с комиссией из CoreLaw
    function _transferWithFee(address from, address to, uint256 amount) internal {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 fee = 0;

        // Комиссия рассчитывается из CoreLaw (Статья 27: 0.03%)
        if (!feeExempt[from] && !feeExempt[to]) {
            fee = coreLaw.calculateNetworkFee(amount);
        }

        uint256 totalRequired = amount + fee;
        if (_balances[from] < totalRequired) revert InsufficientBalance();

        // Переводим основную сумму
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);

        // Переводим комиссию в казну
        if (fee > 0) {
            _balances[from] -= fee;
            _balances[infrastructureTreasury] += fee;
            totalFeesCollected += fee;
            emit FeeCollected(from, to, amount, fee);
            emit Transfer(from, infrastructureTreasury, fee);
        }
    }

    /*//////////////////////////////////////////////////////////////
                    MINT & BURN (CENTRAL BANK ONLY)
    //////////////////////////////////////////////////////////////*/

    /// @notice Эмиссия (только Центральный Банк) - CoreLaw Статья 26
    function mint(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyRole(CENTRAL_BANK_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_totalSupply + amount > maxSupply) revert ExceedsMaxSupply();

        _totalSupply += amount;
        _balances[to] += amount;

        emit Transfer(address(0), to, amount);
        emit Mint(to, amount, reason);
    }

    /// @notice Сжигание (только Центральный Банк) - CoreLaw Статья 26
    function burn(
        address from,
        uint256 amount,
        string calldata reason
    ) external onlyRole(CENTRAL_BANK_ROLE) {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_balances[from] < amount) revert InsufficientBalance();

        _totalSupply -= amount;
        _balances[from] -= amount;

        emit Transfer(from, address(0), amount);
        emit Burn(from, amount, reason);
    }

    /// @notice Добровольное сжигание своих токенов
    function burnOwn(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (_balances[msg.sender] < amount) revert InsufficientBalance();

        _totalSupply -= amount;
        _balances[msg.sender] -= amount;

        emit Transfer(msg.sender, address(0), amount);
        emit Burn(msg.sender, amount, "voluntary");
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    function _approve(address owner, address spender, uint256 amount) internal {
        if (owner == address(0)) revert ZeroAddress();
        if (spender == address(0)) revert ZeroAddress();

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance();
            _allowances[owner][spender] = currentAllowance - amount;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Установить освобождение от комиссии (только Хурал)
    function setFeeExempt(address account, bool exempt) external onlyRole(KHURAL_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        feeExempt[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }

    /// @notice Обновить казну (только Хурал)
    function setInfrastructureTreasury(address newTreasury) external onlyRole(KHURAL_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();

        address oldTreasury = infrastructureTreasury;
        feeExempt[oldTreasury] = false;

        infrastructureTreasury = newTreasury;
        feeExempt[newTreasury] = true;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Изменить максимальное предложение (только Хурал)
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(KHURAL_ROLE) {
        require(newMaxSupply >= _totalSupply, "Cannot set below current supply");
        maxSupply = newMaxSupply;
    }

    /*//////////////////////////////////////////////////////////////
                        UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить детали транзакции (сумма, комиссия, итого)
    function getTransferDetails(uint256 amount) external view returns (
        uint256 fee,
        uint256 recipientReceives,
        uint256 totalFromSender
    ) {
        fee = coreLaw.calculateNetworkFee(amount);
        recipientReceives = amount;
        totalFromSender = amount + fee;
    }

    /// @notice Проверить, достаточно ли средств для перевода
    function canTransfer(address from, uint256 amount) external view returns (bool) {
        uint256 fee = 0;
        if (!feeExempt[from]) {
            fee = coreLaw.calculateNetworkFee(amount);
        }
        return _balances[from] >= amount + fee;
    }

    /// @notice Получить статистику валюты
    function getStats() external view returns (
        uint256 supply,
        uint256 maxSupp,
        uint256 feesCollected,
        uint256 treasuryBalance
    ) {
        return (
            _totalSupply,
            maxSupply,
            totalFeesCollected,
            _balances[infrastructureTreasury]
        );
    }

    /// @notice Проверить целостность CoreLaw
    function verifyCoreLawIntegrity() external view returns (bool) {
        return coreLaw.verifyIntegrity();
    }

    /// @notice Получить статью CoreLaw
    function getCoreLawArticle(uint8 number) external view returns (string memory) {
        return coreLaw.getArticle(number);
    }
}
