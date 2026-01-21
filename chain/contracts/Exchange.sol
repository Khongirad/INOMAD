// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Altan.sol";

/**
 * @title Exchange
 * @notice Биржа Сибирской Конфедерации
 *
 * Функции:
 * - Обмен ALTAN на другие токены (стейблкоины, внешние валюты)
 * - Торговля парами (order book)
 * - Лимитные и рыночные ордера
 * - AMM пулы ликвидности
 *
 * Поддерживаемые пары:
 * - ALTAN/USDC (привязка к доллару)
 * - ALTAN/USDT
 * - ALTAN/DAI
 * - Будущее: ALTAN/BTC, ALTAN/ETH
 *
 * Два режима торговли:
 * 1. Order Book — классическая биржа с ордерами
 * 2. AMM Pool — автоматический маркет-мейкер
 *
 * БЕЗ КОМИССИЙ БИРЖИ:
 * Комиссия 0.03% уже встроена в каждую транзакцию ALTAN (Аксиома 10)
 * + 10% налог на прибыль раз в год (Аксиома 11)
 * Этого достаточно для развития инфраструктуры.
 */
contract Exchange is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant LIQUIDITY_PROVIDER_ROLE = keccak256("LIQUIDITY_PROVIDER_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Тип ордера
    enum OrderType {
        LIMIT,          // Лимитный
        MARKET          // Рыночный
    }

    /// @notice Сторона ордера
    enum OrderSide {
        BUY,            // Покупка ALTAN
        SELL            // Продажа ALTAN
    }

    /// @notice Статус ордера
    enum OrderStatus {
        OPEN,           // Открыт
        PARTIAL,        // Частично исполнен
        FILLED,         // Полностью исполнен
        CANCELLED       // Отменён
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ZeroAmount();
    error InvalidInput();
    error PairNotFound();
    error PairExists();
    error OrderNotFound();
    error NotOrderOwner();
    error InsufficientBalance();
    error InsufficientLiquidity();
    error TransferFailed();
    error PairNotActive();
    error SlippageExceeded();
    error InvalidPrice();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PairCreated(uint256 indexed pairId, address baseToken, address quoteToken);
    event PairStatusChanged(uint256 indexed pairId, bool active);

    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed pairId,
        address indexed trader,
        OrderSide side,
        uint256 price,
        uint256 amount
    );
    event OrderFilled(uint256 indexed orderId, uint256 filledAmount, uint256 filledPrice);
    event OrderCancelled(uint256 indexed orderId);
    event Trade(
        uint256 indexed pairId,
        address indexed maker,
        address indexed taker,
        uint256 price,
        uint256 amount,
        OrderSide takerSide
    );

    event LiquidityAdded(uint256 indexed pairId, address indexed provider, uint256 baseAmount, uint256 quoteAmount);
    event LiquidityRemoved(uint256 indexed pairId, address indexed provider, uint256 baseAmount, uint256 quoteAmount);
    event Swap(uint256 indexed pairId, address indexed trader, uint256 amountIn, uint256 amountOut, bool buyAltan);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Торговая пара
    struct TradingPair {
        uint256 id;
        address baseToken;      // ALTAN
        address quoteToken;     // USDC, USDT, etc.
        string symbol;          // "ALTAN/USDC"

        bool active;
        bool hasAMM;            // Есть ли AMM пул

        // Order book статистика
        uint256 totalOrders;
        uint256 totalVolume;

        // AMM пул
        uint256 baseReserve;    // Резерв ALTAN
        uint256 quoteReserve;   // Резерв quote токена
        uint256 lpTotalSupply;  // Общее количество LP токенов

        // Цены
        uint256 lastPrice;
        uint64 lastTradeAt;

        uint64 createdAt;
        bool exists;
    }

    /// @notice Ордер
    struct Order {
        uint256 id;
        uint256 pairId;
        address trader;
        OrderType orderType;
        OrderSide side;
        OrderStatus status;

        uint256 price;          // Цена (для лимитных)
        uint256 amount;         // Количество ALTAN
        uint256 filled;         // Исполнено
        uint256 remaining;      // Осталось

        uint64 createdAt;
        uint64 updatedAt;

        bool exists;
    }

    /// @notice Позиция провайдера ликвидности
    struct LPPosition {
        address provider;
        uint256 pairId;
        uint256 lpTokens;
        uint256 baseDeposited;
        uint256 quoteDeposited;
        uint64 depositedAt;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Минимальная ликвидность для создания пула
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    Altan public immutable altan;

    // Пары
    uint256 public nextPairId;
    mapping(uint256 => TradingPair) public pairs;
    mapping(address => mapping(address => uint256)) public pairByTokens;  // base => quote => pairId
    uint256[] public activePairs;

    // Ордера
    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => uint256[]) public buyOrders;   // pairId => orderIds (отсортированы по цене DESC)
    mapping(uint256 => uint256[]) public sellOrders;  // pairId => orderIds (отсортированы по цене ASC)
    mapping(address => uint256[]) public ordersByTrader;

    // LP позиции
    mapping(uint256 => mapping(address => LPPosition)) public lpPositions;
    mapping(uint256 => address[]) public liquidityProviders;

    // Статистика
    uint256 public totalTrades;
    uint256 public totalVolume;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _altan,
        address _khural
    ) {
        if (_altan == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        altan = Altan(_altan);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(OPERATOR_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ ПАРАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать торговую пару
    function createPair(
        address quoteToken,
        string calldata symbol
    ) external onlyRole(OPERATOR_ROLE) returns (uint256 pairId) {
        if (quoteToken == address(0)) revert ZeroAddress();
        if (quoteToken == address(altan)) revert InvalidInput();
        if (pairByTokens[address(altan)][quoteToken] != 0) revert PairExists();

        pairId = ++nextPairId;

        pairs[pairId] = TradingPair({
            id: pairId,
            baseToken: address(altan),
            quoteToken: quoteToken,
            symbol: symbol,
            active: true,
            hasAMM: false,
            totalOrders: 0,
            totalVolume: 0,
            baseReserve: 0,
            quoteReserve: 0,
            lpTotalSupply: 0,
            lastPrice: 0,
            lastTradeAt: 0,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        pairByTokens[address(altan)][quoteToken] = pairId;
        activePairs.push(pairId);

        emit PairCreated(pairId, address(altan), quoteToken);
    }

    /// @notice Активировать/деактивировать пару
    function setPairActive(uint256 pairId, bool active) external onlyRole(OPERATOR_ROLE) {
        if (!pairs[pairId].exists) revert PairNotFound();
        pairs[pairId].active = active;

        emit PairStatusChanged(pairId, active);
    }

    /*//////////////////////////////////////////////////////////////
                        ЛИМИТНЫЕ ОРДЕРА
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать лимитный ордер
    function createLimitOrder(
        uint256 pairId,
        OrderSide side,
        uint256 price,
        uint256 amount
    ) external nonReentrant returns (uint256 orderId) {
        TradingPair storage pair = pairs[pairId];
        if (!pair.exists) revert PairNotFound();
        if (!pair.active) revert PairNotActive();
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert ZeroAmount();

        // Блокируем средства
        if (side == OrderSide.BUY) {
            // Покупка ALTAN — блокируем quote токен
            uint256 quoteAmount = (amount * price) / 1e6;  // Учитываем decimals
            IERC20(pair.quoteToken).transferFrom(msg.sender, address(this), quoteAmount);
        } else {
            // Продажа ALTAN — блокируем ALTAN
            altan.transferFrom(msg.sender, address(this), amount);
        }

        orderId = ++nextOrderId;

        orders[orderId] = Order({
            id: orderId,
            pairId: pairId,
            trader: msg.sender,
            orderType: OrderType.LIMIT,
            side: side,
            status: OrderStatus.OPEN,
            price: price,
            amount: amount,
            filled: 0,
            remaining: amount,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            exists: true
        });

        // Добавляем в order book
        if (side == OrderSide.BUY) {
            buyOrders[pairId].push(orderId);
        } else {
            sellOrders[pairId].push(orderId);
        }

        ordersByTrader[msg.sender].push(orderId);
        pair.totalOrders++;

        emit OrderCreated(orderId, pairId, msg.sender, side, price, amount);

        // Пытаемся сматчить
        _matchOrders(pairId);
    }

    /// @notice Отменить ордер
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.trader != msg.sender) revert NotOrderOwner();
        if (o.status != OrderStatus.OPEN && o.status != OrderStatus.PARTIAL) revert InvalidInput();

        TradingPair storage pair = pairs[o.pairId];

        // Возвращаем оставшиеся средства
        if (o.side == OrderSide.BUY) {
            uint256 quoteAmount = (o.remaining * o.price) / 1e6;
            IERC20(pair.quoteToken).transfer(msg.sender, quoteAmount);
        } else {
            altan.transfer(msg.sender, o.remaining);
        }

        o.status = OrderStatus.CANCELLED;
        o.updatedAt = uint64(block.timestamp);

        emit OrderCancelled(orderId);
    }

    /*//////////////////////////////////////////////////////////////
                        МАТЧИНГ ОРДЕРОВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Внутренний матчинг ордеров
    function _matchOrders(uint256 pairId) internal {
        uint256[] storage buys = buyOrders[pairId];
        uint256[] storage sells = sellOrders[pairId];

        if (buys.length == 0 || sells.length == 0) return;

        // Простой матчинг: проверяем лучшие bid/ask
        // В production нужна более сложная логика с сортировкой

        for (uint256 i = 0; i < buys.length && i < sells.length; i++) {
            Order storage buyOrder = orders[buys[i]];
            Order storage sellOrder = orders[sells[i]];

            if (buyOrder.status != OrderStatus.OPEN && buyOrder.status != OrderStatus.PARTIAL) continue;
            if (sellOrder.status != OrderStatus.OPEN && sellOrder.status != OrderStatus.PARTIAL) continue;

            // Проверяем, пересекаются ли цены
            if (buyOrder.price >= sellOrder.price) {
                uint256 matchPrice = sellOrder.price;  // Цена maker'а
                uint256 matchAmount = buyOrder.remaining < sellOrder.remaining
                    ? buyOrder.remaining
                    : sellOrder.remaining;

                _executeTrade(pairId, buyOrder, sellOrder, matchPrice, matchAmount);
            }
        }
    }

    /// @notice Исполнить сделку
    /// @dev Без комиссии биржи — комиссия 0.03% уже встроена в ALTAN (Аксиома 10)
    function _executeTrade(
        uint256 pairId,
        Order storage buyOrder,
        Order storage sellOrder,
        uint256 price,
        uint256 amount
    ) internal {
        TradingPair storage pair = pairs[pairId];

        uint256 quoteAmount = (amount * price) / 1e6;

        // Переводим ALTAN покупателю
        altan.transfer(buyOrder.trader, amount);

        // Переводим quote токен продавцу (полная сумма, без комиссии биржи)
        IERC20(pair.quoteToken).transfer(sellOrder.trader, quoteAmount);

        // Обновляем ордера
        buyOrder.filled += amount;
        buyOrder.remaining -= amount;
        sellOrder.filled += amount;
        sellOrder.remaining -= amount;

        if (buyOrder.remaining == 0) {
            buyOrder.status = OrderStatus.FILLED;
        } else {
            buyOrder.status = OrderStatus.PARTIAL;
        }

        if (sellOrder.remaining == 0) {
            sellOrder.status = OrderStatus.FILLED;
        } else {
            sellOrder.status = OrderStatus.PARTIAL;
        }

        buyOrder.updatedAt = uint64(block.timestamp);
        sellOrder.updatedAt = uint64(block.timestamp);

        // Обновляем статистику
        pair.lastPrice = price;
        pair.lastTradeAt = uint64(block.timestamp);
        pair.totalVolume += quoteAmount;
        totalTrades++;
        totalVolume += quoteAmount;

        emit OrderFilled(buyOrder.id, amount, price);
        emit OrderFilled(sellOrder.id, amount, price);
        emit Trade(pairId, sellOrder.trader, buyOrder.trader, price, amount, OrderSide.BUY);
    }

    /*//////////////////////////////////////////////////////////////
                        AMM (АВТОМАТИЧЕСКИЙ МАРКЕТ-МЕЙКЕР)
    //////////////////////////////////////////////////////////////*/

    /// @notice Добавить ликвидность в AMM пул
    function addLiquidity(
        uint256 pairId,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 minLpTokens
    ) external nonReentrant returns (uint256 lpTokens) {
        TradingPair storage pair = pairs[pairId];
        if (!pair.exists) revert PairNotFound();
        if (!pair.active) revert PairNotActive();
        if (baseAmount == 0 || quoteAmount == 0) revert ZeroAmount();

        // Переводим токены
        altan.transferFrom(msg.sender, address(this), baseAmount);
        IERC20(pair.quoteToken).transferFrom(msg.sender, address(this), quoteAmount);

        if (pair.lpTotalSupply == 0) {
            // Первый депозит
            lpTokens = _sqrt(baseAmount * quoteAmount) - MINIMUM_LIQUIDITY;
            pair.lpTotalSupply = lpTokens + MINIMUM_LIQUIDITY;
            pair.hasAMM = true;
        } else {
            // Пропорциональный депозит
            uint256 lpFromBase = (baseAmount * pair.lpTotalSupply) / pair.baseReserve;
            uint256 lpFromQuote = (quoteAmount * pair.lpTotalSupply) / pair.quoteReserve;
            lpTokens = lpFromBase < lpFromQuote ? lpFromBase : lpFromQuote;
            pair.lpTotalSupply += lpTokens;
        }

        if (lpTokens < minLpTokens) revert SlippageExceeded();

        pair.baseReserve += baseAmount;
        pair.quoteReserve += quoteAmount;

        // Записываем позицию LP
        LPPosition storage pos = lpPositions[pairId][msg.sender];
        if (pos.lpTokens == 0) {
            liquidityProviders[pairId].push(msg.sender);
        }
        pos.provider = msg.sender;
        pos.pairId = pairId;
        pos.lpTokens += lpTokens;
        pos.baseDeposited += baseAmount;
        pos.quoteDeposited += quoteAmount;
        pos.depositedAt = uint64(block.timestamp);

        emit LiquidityAdded(pairId, msg.sender, baseAmount, quoteAmount);
    }

    /// @notice Убрать ликвидность из AMM пула
    function removeLiquidity(
        uint256 pairId,
        uint256 lpTokens,
        uint256 minBaseAmount,
        uint256 minQuoteAmount
    ) external nonReentrant returns (uint256 baseAmount, uint256 quoteAmount) {
        TradingPair storage pair = pairs[pairId];
        if (!pair.exists) revert PairNotFound();

        LPPosition storage pos = lpPositions[pairId][msg.sender];
        if (pos.lpTokens < lpTokens) revert InsufficientBalance();

        // Рассчитываем долю
        baseAmount = (lpTokens * pair.baseReserve) / pair.lpTotalSupply;
        quoteAmount = (lpTokens * pair.quoteReserve) / pair.lpTotalSupply;

        if (baseAmount < minBaseAmount || quoteAmount < minQuoteAmount) revert SlippageExceeded();

        // Обновляем
        pair.baseReserve -= baseAmount;
        pair.quoteReserve -= quoteAmount;
        pair.lpTotalSupply -= lpTokens;
        pos.lpTokens -= lpTokens;

        // Переводим токены
        altan.transfer(msg.sender, baseAmount);
        IERC20(pair.quoteToken).transfer(msg.sender, quoteAmount);

        emit LiquidityRemoved(pairId, msg.sender, baseAmount, quoteAmount);
    }

    /// @notice Swap через AMM
    /// @dev Без комиссии биржи — комиссия 0.03% уже встроена в ALTAN (Аксиома 10)
    function swap(
        uint256 pairId,
        uint256 amountIn,
        uint256 minAmountOut,
        bool buyAltan          // true = покупаем ALTAN за quote, false = продаём ALTAN за quote
    ) external nonReentrant returns (uint256 amountOut) {
        TradingPair storage pair = pairs[pairId];
        if (!pair.exists) revert PairNotFound();
        if (!pair.active) revert PairNotActive();
        if (!pair.hasAMM) revert InsufficientLiquidity();
        if (amountIn == 0) revert ZeroAmount();

        uint256 reserveIn;
        uint256 reserveOut;

        if (buyAltan) {
            // Вносим quote, получаем ALTAN
            reserveIn = pair.quoteReserve;
            reserveOut = pair.baseReserve;
            IERC20(pair.quoteToken).transferFrom(msg.sender, address(this), amountIn);
        } else {
            // Вносим ALTAN, получаем quote
            reserveIn = pair.baseReserve;
            reserveOut = pair.quoteReserve;
            altan.transferFrom(msg.sender, address(this), amountIn);
        }

        // x * y = k (constant product formula) — без дополнительной комиссии
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);

        if (amountOut < minAmountOut) revert SlippageExceeded();
        if (amountOut >= reserveOut) revert InsufficientLiquidity();

        // Обновляем резервы
        if (buyAltan) {
            pair.quoteReserve += amountIn;
            pair.baseReserve -= amountOut;
            altan.transfer(msg.sender, amountOut);
        } else {
            pair.baseReserve += amountIn;
            pair.quoteReserve -= amountOut;
            IERC20(pair.quoteToken).transfer(msg.sender, amountOut);
        }

        // Обновляем цену
        pair.lastPrice = (pair.quoteReserve * 1e6) / pair.baseReserve;
        pair.lastTradeAt = uint64(block.timestamp);
        pair.totalVolume += amountIn;
        totalTrades++;
        totalVolume += amountIn;

        emit Swap(pairId, msg.sender, amountIn, amountOut, buyAltan);
    }

    /*//////////////////////////////////////////////////////////////
                        ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Квадратный корень (Babylonian method)
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /// @notice Получить цену AMM
    function getAMMPrice(uint256 pairId) external view returns (uint256) {
        TradingPair storage pair = pairs[pairId];
        if (!pair.hasAMM || pair.baseReserve == 0) return 0;
        return (pair.quoteReserve * 1e6) / pair.baseReserve;
    }

    /// @notice Рассчитать выход swap
    /// @dev Без комиссии биржи — комиссия 0.03% уже встроена в ALTAN (Аксиома 10)
    function getAmountOut(
        uint256 pairId,
        uint256 amountIn,
        bool buyAltan
    ) external view returns (uint256 amountOut) {
        TradingPair storage pair = pairs[pairId];
        if (!pair.hasAMM) return 0;

        uint256 reserveIn = buyAltan ? pair.quoteReserve : pair.baseReserve;
        uint256 reserveOut = buyAltan ? pair.baseReserve : pair.quoteReserve;

        // x * y = k — без дополнительной комиссии
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить пару
    function getPair(uint256 pairId) external view returns (TradingPair memory) {
        if (!pairs[pairId].exists) revert PairNotFound();
        return pairs[pairId];
    }

    /// @notice Получить ордер
    function getOrder(uint256 orderId) external view returns (Order memory) {
        if (!orders[orderId].exists) revert OrderNotFound();
        return orders[orderId];
    }

    /// @notice Получить LP позицию
    function getLPPosition(uint256 pairId, address provider) external view returns (LPPosition memory) {
        return lpPositions[pairId][provider];
    }

    /// @notice Получить ордера трейдера
    function getOrdersByTrader(address trader) external view returns (uint256[] memory) {
        return ordersByTrader[trader];
    }

    /// @notice Получить активные пары
    function getActivePairs() external view returns (uint256[] memory) {
        return activePairs;
    }

    /// @notice Получить статистику
    function getStats() external view returns (
        uint256 _totalPairs,
        uint256 _totalTrades,
        uint256 _totalVolume
    ) {
        return (nextPairId, totalTrades, totalVolume);
    }

}
