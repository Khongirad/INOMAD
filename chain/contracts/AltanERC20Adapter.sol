// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AltanCoreLedger} from "./AltanCoreLedger.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title AltanERC20Adapter
 * @notice ERC20-совместимый интерфейс для ALTAN
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ЭТО АДАПТЕР, НЕ ИСТОЧНИК ИСТИНЫ                                         ║
 * ║  Источник истины — AltanCoreLedger                                       ║
 * ║  ERC20 — лишь формат для совместимости                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Зачем нужен этот адаптер:
 * - Совместимость с MetaMask, Trust Wallet и другими кошельками
 * - Совместимость с DEX (Uniswap, SushiSwap)
 * - Совместимость с DeFi протоколами
 * - Удобство для разработчиков (стандартный интерфейс)
 *
 * Что этот адаптер НЕ делает:
 * - НЕ хранит балансы (они в AltanCoreLedger)
 * - НЕ эмитирует валюту (это право ЦБ)
 * - НЕ является источником права или власти
 *
 * Архитектура:
 * ┌─────────────────────────────────────────┐
 * │ AltanCoreLedger (источник истины)       │
 * │ - Хранит балансы                        │
 * │ - Эмиссия только через ЦБ               │
 * └─────────────────┬───────────────────────┘
 *                   │ читает/пишет
 *                   ▼
 * ┌─────────────────────────────────────────┐
 * │ AltanERC20Adapter (этот контракт)       │
 * │ - ERC20 интерфейс                       │
 * │ - EIP-2612 Permit                       │
 * │ - Маппинг address ↔ accountId           │
 * └─────────────────┬───────────────────────┘
 *                   │ предоставляет
 *                   ▼
 * ┌─────────────────────────────────────────┐
 * │ Внешние системы                         │
 * │ - Кошельки (MetaMask, etc.)             │
 * │ - DEX / DeFi                            │
 * │ - dApps                                 │
 * └─────────────────────────────────────────┘
 */
contract AltanERC20Adapter is IERC20, IERC20Metadata, IERC20Permit, EIP712, Nonces {
    /*//////////////////////////////////////////////////////////////
                            ОШИБКИ
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();
    error AccountNotLinked();
    error ExpiredDeadline();
    error InvalidSigner();

    /*//////////////////////////////////////////////////////////////
                            СОБЫТИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Событие при связывании адреса со счётом
    event AddressLinked(address indexed ethAddress, bytes32 indexed accountId);

    /*//////////////////////////////////////////////////////////////
                            ХРАНЕНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Ссылка на Core Ledger (источник истины)
    AltanCoreLedger public immutable coreLedger;

    /// @notice Адрес Центрального Банка
    address public immutable centralBank;

    /// @notice Allowances для ERC20 совместимости
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice EIP-712 typehash для permit
    bytes32 private constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    /*//////////////////////////////////////////////////////////////
                            КОНСТРУКТОР
    //////////////////////////////////////////////////////////////*/

    constructor(address _coreLedger, address _centralBank)
        EIP712(unicode"Алтан", "1")
    {
        if (_coreLedger == address(0)) revert ZeroAddress();
        if (_centralBank == address(0)) revert ZeroAddress();

        coreLedger = AltanCoreLedger(_coreLedger);
        centralBank = _centralBank;
    }

    /*//////////////////////////////////////////////////////////////
                        ERC20 METADATA
    //////////////////////////////////////////////////////////////*/

    /// @notice Название валюты
    function name() external pure override returns (string memory) {
        return unicode"Алтан";
    }

    /// @notice Символ валюты
    function symbol() external pure override returns (string memory) {
        return "ALTAN";
    }

    /// @notice Количество десятичных знаков (6, как USDC)
    function decimals() external pure override returns (uint8) {
        return 6;
    }

    /*//////////////////////////////////////////////////////////////
                        ERC20 CORE (READ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Общее предложение (из Core Ledger)
    function totalSupply() external view override returns (uint256) {
        return coreLedger.totalSupply();
    }

    /// @notice Баланс адреса (читает из Core Ledger)
    function balanceOf(address account) external view override returns (uint256) {
        bytes32 accountId = coreLedger.getAccountIdByAddress(account);
        if (accountId == bytes32(0)) return 0;
        return coreLedger.balanceOf(accountId);
    }

    /// @notice Разрешённая сумма для spender
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /*//////////////////////////////////////////////////////////////
                        ERC20 CORE (WRITE)
    //////////////////////////////////////////////////////////////*/

    /// @notice Перевод токенов
    function transfer(address to, uint256 amount) external override returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    /// @notice Одобрить расход токенов
    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice Перевод от имени другого адреса
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        return _transfer(from, to, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        ERC20 ВНУТРЕННИЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Внутренний перевод (делегирует в Core Ledger)
    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();

        bytes32 fromAccountId = coreLedger.getAccountIdByAddress(from);
        bytes32 toAccountId = coreLedger.getAccountIdByAddress(to);

        if (fromAccountId == bytes32(0)) revert AccountNotLinked();
        if (toAccountId == bytes32(0)) revert AccountNotLinked();

        // Делегируем перевод в Core Ledger
        // Core Ledger сам рассчитает комиссию 0.03%
        bytes32 memo = keccak256(abi.encodePacked("ERC20:", from, to, amount, block.timestamp));
        bool success = coreLedger.transfer(fromAccountId, toAccountId, amount, memo);

        if (success) {
            emit Transfer(from, to, amount);
        }

        return success;
    }

    /// @notice Внутреннее одобрение
    function _approve(address owner, address spender, uint256 amount) internal {
        if (owner == address(0)) revert ZeroAddress();
        if (spender == address(0)) revert ZeroAddress();

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @notice Потратить разрешение
    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance();
            unchecked {
                _allowances[owner][spender] = currentAllowance - amount;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        EIP-2612 PERMIT
    //////////////////////////////////////////////////////////////*/

    /// @notice Разрешение через подпись (gasless approvals)
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        if (block.timestamp > deadline) revert ExpiredDeadline();

        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                _useNonce(owner),
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);

        if (signer != owner) revert InvalidSigner();

        _approve(owner, spender, value);
    }

    /// @notice Текущий nonce для адреса
    function nonces(address owner) public view override(IERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    /// @notice Domain separator для EIP-712
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }

    /*//////////////////////////////////////////////////////////////
                        ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить accountId для адреса
    function getAccountId(address ethAddress) external view returns (bytes32) {
        return coreLedger.getAccountIdByAddress(ethAddress);
    }

    /// @notice Проверить, связан ли адрес со счётом
    function isLinked(address ethAddress) external view returns (bool) {
        return coreLedger.getAccountIdByAddress(ethAddress) != bytes32(0);
    }

    /// @notice Получить доступный (незамороженный) баланс
    function availableBalanceOf(address account) external view returns (uint256) {
        bytes32 accountId = coreLedger.getAccountIdByAddress(account);
        if (accountId == bytes32(0)) return 0;
        return coreLedger.availableBalance(accountId);
    }

    /// @notice Рассчитать комиссию для суммы перевода
    function calculateFee(uint256 amount) external view returns (uint256) {
        return coreLedger.calculateFee(amount);
    }

    /// @notice Получить детали перевода (сумма, комиссия, итого)
    function getTransferDetails(uint256 amount) external view returns (
        uint256 fee,
        uint256 recipientReceives,
        uint256 totalFromSender
    ) {
        fee = coreLedger.calculateFee(amount);
        recipientReceives = amount;
        totalFromSender = amount + fee;
    }
}
