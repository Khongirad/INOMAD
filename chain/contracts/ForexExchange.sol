// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ForexExchange (Валютная Биржа)
 * @notice Обмен валют и стейблкоинов
 * 
 * Функции:
 * 1. Валютные пары (ALTAN/USDT, ALTAN/USDC, etc.)
 * 2. Spot trading (немедленный обмен)
 * 3. Лимитные/рыночные ордера
 * 4. Liquidity pools
 * 5. Котировки в реальном времени
 * 
 * Стейблкоины:
 * - USDT (Tether)
 * - USDC (Circle)
 * - RUBT (Russian Ruble Token)
 * - CNYT (Yuan Token)
 */
contract ForexExchange {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error PairNotFound();
    error InsufficientBalance();
    error InvalidAmount();
    error SlippageTooHigh();
    error OrderNotFound();
    
    /* ==================== ENUMS ==================== */
    
    enum OrderType {
        LIMIT,
        MARKET
    }
    
    enum OrderSide {
        BUY,        // Buy base currency with quote
        SELL        // Sell base currency for quote
    }
    
    enum OrderStatus {
        ACTIVE,
        PARTIALLY_FILLED,
        FILLED,
        CANCELLED
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Валютная пара
    struct CurrencyPair {
        bytes32 pairId;
        address baseToken;          // ALTAN
        address quoteToken;         // USDT
        string symbol;              // "ALTAN/USDT"
        
        uint256 lastPrice;          // Последняя цена
        uint256 bidPrice;           // Лучшая покупка
        uint256 askPrice;           // Лучшая продажа
        uint256 spread;             // Спред
        
        uint256 volume24h;
        uint256 high24h;
        uint256 low24h;
        
        uint256 liquidityBase;      // Ликвидность базовой валюты
        uint256 liquidityQuote;     // Ликвидность котируемой
        
        bool isActive;
        uint256 createdAt;
    }
    
    /// @notice Ордер
    struct Order {
        bytes32 orderId;
        bytes32 pairId;
        OrderType orderType;
        OrderSide side;
        OrderStatus status;
        
        address trader;
        uint256 baseAmount;         // Количество базовой валюты
        uint256 quoteAmount;        // Количество котируемой
        uint256 price;              // Цена (для LIMIT)
        uint256 filledBase;
        uint256 filledQuote;
        
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    /// @notice Своп
    struct Swap {
        bytes32 swapId;
        bytes32 pairId;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 price;
        uint256 fee;
        uint256 executedAt;
    }
    
    /// @notice Liquidity Position
    struct LiquidityPosition {
        address provider;
        bytes32 pairId;
        uint256 baseAmount;
        uint256 quoteAmount;
        uint256 lpTokens;           // LP токены
        uint256 addedAt;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public altanToken;
    
    uint256 public swapFee = 30;        // 0.3% (basis points)
    uint256 public minLiquidity = 1000 * 1e6;  // Минимальная ликвидность
    
    // Currency Pairs
    uint256 public nextPairNonce = 1;
    mapping(bytes32 => CurrencyPair) public pairs;
    mapping(string => bytes32) public symbolToPair;
    bytes32[] public allPairs;
    
    // Orders
    uint256 public nextOrderNonce = 1;
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bytes32[]) public pairBuyOrders;
    mapping(bytes32 => bytes32[]) public pairSellOrders;
    mapping(address => bytes32[]) public userOrders;
    
    // Swaps
    uint256 public nextSwapNonce = 1;
    mapping(bytes32 => Swap) public swaps;
    mapping(bytes32 => bytes32[]) public pairSwaps;
    
    // Liquidity
    mapping(address => mapping(bytes32 => LiquidityPosition)) public liquidityPositions;
    mapping(bytes32 => address[]) public pairLiquidityProviders;
    mapping(bytes32 => uint256) public totalLpTokens;
    
    // User balances (for simplicity - in production use ERC20 transfers)
    mapping(address => mapping(address => uint256)) public balances;
    
    // Stats
    uint256 public totalVolume;
    uint256 public totalSwaps;
    
    /* ==================== EVENTS ==================== */
    
    event PairCreated(
        bytes32 indexed pairId,
        string symbol,
        address baseToken,
        address quoteToken
    );
    
    event OrderPlaced(
        bytes32 indexed orderId,
        bytes32 indexed pairId,
        OrderSide side,
        uint256 baseAmount,
        uint256 price
    );
    
    event SwapExecuted(
        bytes32 indexed swapId,
        bytes32 indexed pairId,
        address indexed trader,
        uint256 amountIn,
        uint256 amountOut,
        uint256 price
    );
    
    event LiquidityAdded(
        bytes32 indexed pairId,
        address indexed provider,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 lpTokens
    );
    
    event LiquidityRemoved(
        bytes32 indexed pairId,
        address indexed provider,
        uint256 baseAmount,
        uint256 quoteAmount
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier pairExists(bytes32 pairId) {
        if (pairs[pairId].pairId == bytes32(0)) revert PairNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
    }
    
    /* ==================== PAIR CREATION ==================== */
    
    /**
     * @notice Создать валютную пару
     */
    function createPair(
        address baseToken,
        address quoteToken,
        string calldata symbol
    ) external onlyOwner returns (bytes32 pairId) {
        require(symbolToPair[symbol] == bytes32(0), "Pair exists");
        
        pairId = keccak256(abi.encodePacked(
            nextPairNonce++,
            baseToken,
            quoteToken,
            block.timestamp
        ));
        
        pairs[pairId] = CurrencyPair({
            pairId: pairId,
            baseToken: baseToken,
            quoteToken: quoteToken,
            symbol: symbol,
            lastPrice: 0,
            bidPrice: 0,
            askPrice: 0,
            spread: 0,
            volume24h: 0,
            high24h: 0,
            low24h: 0,
            liquidityBase: 0,
            liquidityQuote: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        symbolToPair[symbol] = pairId;
        allPairs.push(pairId);
        
        emit PairCreated(pairId, symbol, baseToken, quoteToken);
    }
    
    /* ==================== SPOT TRADING ==================== */
    
    /**
     * @notice Мгновенный обмен (swap)
     */
    function swapExactInput(
        bytes32 pairId,
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external pairExists(pairId) returns (uint256 amountOut) {
        CurrencyPair storage pair = pairs[pairId];
        require(pair.isActive, "Pair not active");
        
        bool isBuyingBase = tokenIn == pair.quoteToken;
        
        // Calculate output using constant product formula (x * y = k)
        if (isBuyingBase) {
            // Buying base with quote
            require(pair.liquidityBase > 0, "No liquidity");
            amountOut = _getAmountOut(
                amountIn,
                pair.liquidityQuote,
                pair.liquidityBase
            );
            
            if (amountOut < minAmountOut) revert SlippageTooHigh();
            
            pair.liquidityQuote += amountIn;
            pair.liquidityBase -= amountOut;
        } else {
            // Selling base for quote
            require(pair.liquidityQuote > 0, "No liquidity");
            amountOut = _getAmountOut(
                amountIn,
                pair.liquidityBase,
                pair.liquidityQuote
            );
            
            if (amountOut < minAmountOut) revert SlippageTooHigh();
            
            pair.liquidityBase += amountIn;
            pair.liquidityQuote -= amountOut;
        }
        
        // Deduct fee
        uint256 fee = (amountOut * swapFee) / 10000;
        amountOut -= fee;
        
        // Update price
        uint256 price = (pair.liquidityQuote * 1e18) / pair.liquidityBase;
        pair.lastPrice = price;
        
        if (price > pair.high24h) pair.high24h = price;
        if (pair.low24h == 0 || price < pair.low24h) pair.low24h = price;
        
        pair.volume24h += amountIn;
        
        // Record swap
        bytes32 swapId = keccak256(abi.encodePacked(
            nextSwapNonce++,
            msg.sender,
            pairId,
            block.timestamp
        ));
        
        swaps[swapId] = Swap({
            swapId: swapId,
            pairId: pairId,
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: isBuyingBase ? pair.baseToken : pair.quoteToken,
            amountIn: amountIn,
            amountOut: amountOut,
            price: price,
            fee: fee,
            executedAt: block.timestamp
        });
        
        pairSwaps[pairId].push(swapId);
        
        totalSwaps++;
        totalVolume += amountIn;
        
        emit SwapExecuted(swapId, pairId, msg.sender, amountIn, amountOut, price);
    }
    
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * 997;  // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    /* ==================== ORDER BOOK ==================== */
    
    /**
     * @notice Разместить лимитный/рыночный ордер
     */
    function placeOrder(
        bytes32 pairId,
        OrderType orderType,
        OrderSide side,
        uint256 baseAmount,
        uint256 price,  // Ignored for MARKET
        uint256 expiresAt
    ) external pairExists(pairId) returns (bytes32 orderId) {
        CurrencyPair storage pair = pairs[pairId];
        require(pair.isActive, "Pair not active");
        
        orderId = keccak256(abi.encodePacked(
            nextOrderNonce++,
            msg.sender,
            pairId,
            block.timestamp
        ));
        
        uint256 quoteAmount = 0;
        if (orderType == OrderType.LIMIT) {
            quoteAmount = (baseAmount * price) / 1e18;
        }
        
        orders[orderId] = Order({
            orderId: orderId,
            pairId: pairId,
            orderType: orderType,
            side: side,
            status: OrderStatus.ACTIVE,
            trader: msg.sender,
            baseAmount: baseAmount,
            quoteAmount: quoteAmount,
            price: price,
            filledBase: 0,
            filledQuote: 0,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        if (side == OrderSide.BUY) {
            pairBuyOrders[pairId].push(orderId);
        } else {
            pairSellOrders[pairId].push(orderId);
        }
        
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, pairId, side, baseAmount, price);
        
        // Try to match order
        if (orderType == OrderType.MARKET) {
            _matchMarketOrder(orderId);
        }
    }
    
    function _matchMarketOrder(bytes32 orderId) internal {
        Order storage order = orders[orderId];
        
        if (order.side == OrderSide.BUY) {
            // Match with sell orders (lowest price first)
            bytes32[] storage sellOrders = pairSellOrders[order.pairId];
            
            for (uint i = 0; i < sellOrders.length && order.filledBase < order.baseAmount; i++) {
                Order storage sellOrder = orders[sellOrders[i]];
                if (sellOrder.status != OrderStatus.ACTIVE) continue;
                
                uint256 fillQty = _min(
                    order.baseAmount - order.filledBase,
                    sellOrder.baseAmount - sellOrder.filledBase
                );
                
                order.filledBase += fillQty;
                order.filledQuote += (fillQty * sellOrder.price) / 1e18;
                sellOrder.filledBase += fillQty;
                sellOrder.filledQuote += (fillQty * sellOrder.price) / 1e18;
                
                if (sellOrder.filledBase >= sellOrder.baseAmount) {
                    sellOrder.status = OrderStatus.FILLED;
                }
            }
            
            if (order.filledBase >= order.baseAmount) {
                order.status = OrderStatus.FILLED;
            }
        } else {
            // Match with buy orders (highest price first)
            bytes32[] storage buyOrders = pairBuyOrders[order.pairId];
            
            for (uint i = 0; i < buyOrders.length && order.filledBase < order.baseAmount; i++) {
                Order storage buyOrder = orders[buyOrders[i]];
                if (buyOrder.status != OrderStatus.ACTIVE) continue;
                
                uint256 fillQty = _min(
                    order.baseAmount - order.filledBase,
                    buyOrder.baseAmount - buyOrder.filledBase
                );
                
                order.filledBase += fillQty;
                order.filledQuote += (fillQty * buyOrder.price) / 1e18;
                buyOrder.filledBase += fillQty;
                buyOrder.filledQuote += (fillQty * buyOrder.price) / 1e18;
                
                if (buyOrder.filledBase >= buyOrder.baseAmount) {
                    buyOrder.status = OrderStatus.FILLED;
                }
            }
            
            if (order.filledBase >= order.baseAmount) {
                order.status = OrderStatus.FILLED;
            }
        }
    }
    
    function cancelOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.ACTIVE, "Not active");
        
        order.status = OrderStatus.CANCELLED;
    }
    
    /* ==================== LIQUIDITY ==================== */
    
    /**
     * @notice Добавить ликвидность
     */
    function addLiquidity(
        bytes32 pairId,
        uint256 baseAmount,
        uint256 quoteAmount
    ) external pairExists(pairId) returns (uint256 lpTokens) {
        CurrencyPair storage pair = pairs[pairId];
        
        // Calculate LP tokens
        if (totalLpTokens[pairId] == 0) {
            // First liquidity provider
            lpTokens = _sqrt(baseAmount * quoteAmount);
        } else {
            // Proportional to existing liquidity
            uint256 baseLp = (baseAmount * totalLpTokens[pairId]) / pair.liquidityBase;
            uint256 quoteLp = (quoteAmount * totalLpTokens[pairId]) / pair.liquidityQuote;
            lpTokens = _min(baseLp, quoteLp);
        }
        
        require(lpTokens > 0, "Insufficient LP tokens");
        
        // Update pair liquidity
        pair.liquidityBase += baseAmount;
        pair.liquidityQuote += quoteAmount;
        
        // Update LP position
        LiquidityPosition storage position = liquidityPositions[msg.sender][pairId];
        if (position.lpTokens == 0) {
            position.provider = msg.sender;
            position.pairId = pairId;
            pairLiquidityProviders[pairId].push(msg.sender);
        }
        
        position.baseAmount += baseAmount;
        position.quoteAmount += quoteAmount;
        position.lpTokens += lpTokens;
        position.addedAt = block.timestamp;
        
        totalLpTokens[pairId] += lpTokens;
        
        emit LiquidityAdded(pairId, msg.sender, baseAmount, quoteAmount, lpTokens);
    }
    
    /**
     * @notice Удалить ликвидность
     */
    function removeLiquidity(
        bytes32 pairId,
        uint256 lpTokens
    ) external pairExists(pairId) returns (uint256 baseAmount, uint256 quoteAmount) {
        CurrencyPair storage pair = pairs[pairId];
        LiquidityPosition storage position = liquidityPositions[msg.sender][pairId];
        
        require(position.lpTokens >= lpTokens, "Insufficient LP tokens");
        
        // Calculate withdrawal amounts
        baseAmount = (lpTokens * pair.liquidityBase) / totalLpTokens[pairId];
        quoteAmount = (lpTokens * pair.liquidityQuote) / totalLpTokens[pairId];
        
        // Update pair liquidity
        pair.liquidityBase -= baseAmount;
        pair.liquidityQuote -= quoteAmount;
        
        // Update LP position
        position.baseAmount -= baseAmount;
        position.quoteAmount -= quoteAmount;
        position.lpTokens -= lpTokens;
        
        totalLpTokens[pairId] -= lpTokens;
        
        emit LiquidityRemoved(pairId, msg.sender, baseAmount, quoteAmount);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getPairBySymbol(string calldata symbol) 
        external view returns (CurrencyPair memory) 
    {
        return pairs[symbolToPair[symbol]];
    }
    
    function getOrderBook(bytes32 pairId) external view returns (
        bytes32[] memory buyOrders,
        bytes32[] memory sellOrders
    ) {
        return (pairBuyOrders[pairId], pairSellOrders[pairId]);
    }
    
    function getQuote(
        bytes32 pairId,
        uint256 amountIn,
        bool buyingBase
    ) external view returns (uint256 amountOut) {
        CurrencyPair storage pair = pairs[pairId];
        
        if (buyingBase) {
            amountOut = _getAmountOut(amountIn, pair.liquidityQuote, pair.liquidityBase);
        } else {
            amountOut = _getAmountOut(amountIn, pair.liquidityBase, pair.liquidityQuote);
        }
    }
    
    function getAllPairs() external view returns (bytes32[] memory) {
        return allPairs;
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
    
    /* ==================== ADMIN ==================== */
    
    function setSwapFee(uint256 fee) external onlyOwner {
        require(fee <= 100, "Max 1%");
        swapFee = fee;
    }
    
    function setAltan(address _altan) external onlyOwner {
        altanToken = _altan;
    }
    
    function suspendPair(bytes32 pairId) external onlyOwner {
        pairs[pairId].isActive = false;
    }
}
