// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StockExchange (Фондовая Биржа)
 * @notice Торговля акциями компаний
 * 
 * Функции:
 * 1. IPO - размещение акций компаний
 * 2. Ордер-бук (лимитные/рыночные заявки)
 * 3. Дивиденды
 * 4. Индексы (АЛТАН-50, АЛТАН-100)
 * 5. Корпоративные действия (сплиты, байбэки)
 * 
 * Интеграция: ALTAN, PaymentGateway, Guilds
 */
contract StockExchange {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error CompanyNotFound();
    error InsufficientShares();
    error InvalidPrice();
    error OrderNotFound();
    error NotAuthorized();
    
    /* ==================== ENUMS ==================== */
    
    enum CompanyStatus {
        PENDING_IPO,    // Готовится к IPO
        PUBLIC,         // Публичная компания
        DELISTED,       // Делистинг
        SUSPENDED       // Торги приостановлены
    }
    
    enum OrderType {
        LIMIT,          // Лимитная
        MARKET          // Рыночная
    }
    
    enum OrderSide {
        BUY,
        SELL
    }
    
    enum OrderStatus {
        ACTIVE,
        PARTIALLY_FILLED,
        FILLED,
        CANCELLED,
        EXPIRED
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Компания (эмитент)
    struct Company {
        bytes32 companyId;
        string ticker;              // "ALTAN", "NOMAD"
        string name;
        address treasury;           // Казначейство компании
        bytes32 guildId;            // Гильдия/DAO
        
        uint256 totalShares;        // Всего акций
        uint256 floatingShares;     // В свободном обращении
        uint256 sharePrice;         // Текущая цена
        
        uint256 marketCap;          // Капитализация
        uint256 lastDividendDate;
        uint256 dividendPerShare;   // Последний дивиденд
        
        CompanyStatus status;
        uint256 listedDate;
    }
    
    /// @notice Ордер
    struct Order {
        bytes32 orderId;
        bytes32 companyId;
        OrderType orderType;
        OrderSide side;
        OrderStatus status;
        
        address trader;
        uint256 quantity;
        uint256 filledQty;
        uint256 price;              // Для LIMIT
        
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    /// @notice Сделка
    struct Trade {
        bytes32 tradeId;
        bytes32 companyId;
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        
        address buyer;
        address seller;
        uint256 quantity;
        uint256 price;
        uint256 totalValue;
        
        uint256 executedAt;
    }
    
    /// @notice Держатель акций
    struct Shareholder {
        address holder;
        bytes32 companyId;
        uint256 shares;
        uint256 avgBuyPrice;
        uint256 totalInvested;
        uint256 totalDividends;
    }
    
    /// @notice Индекс
    struct Index {
        bytes32 indexId;
        string name;                // "ALTAN-50"
        bytes32[] constituents;     // Компании в индексе
        uint256 value;              // Значение индекса
        uint256 lastUpdate;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public altanToken;
    address public regulator;       // Регулятор рынка
    
    uint256 public tradingFee = 10; // 0.1% (basis points)
    
    // Companies
    uint256 public nextCompanyNonce = 1;
    mapping(bytes32 => Company) public companies;
    mapping(string => bytes32) public tickerToCompany;
    bytes32[] public allCompanies;
    
    // Orders
    uint256 public nextOrderNonce = 1;
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bytes32[]) public companyBuyOrders;   // companyId => buy orders
    mapping(bytes32 => bytes32[]) public companySellOrders;  // companyId => sell orders
    mapping(address => bytes32[]) public userOrders;
    
    // Trades
    uint256 public nextTradeNonce = 1;
    mapping(bytes32 => Trade) public trades;
    mapping(bytes32 => bytes32[]) public companyTrades;
    
    // Shareholders
    mapping(address => mapping(bytes32 => Shareholder)) public shareholders;
    mapping(bytes32 => address[]) public companyHolders;
    
    // Indices
    mapping(bytes32 => Index) public indices;
    bytes32[] public allIndices;
    
    // Stats
    uint256 public totalVolume;
    uint256 public totalTrades;
    mapping(bytes32 => uint256) public dailyVolume;          // companyId => volume
    
    /* ==================== EVENTS ==================== */
    
    event CompanyListed(
        bytes32 indexed companyId,
        string ticker,
        uint256 totalShares,
        uint256 ipoPrice
    );
    
    event OrderPlaced(
        bytes32 indexed orderId,
        bytes32 indexed companyId,
        OrderSide side,
        uint256 quantity,
        uint256 price
    );
    
    event TradeExecuted(
        bytes32 indexed tradeId,
        bytes32 indexed companyId,
        address buyer,
        address seller,
        uint256 quantity,
        uint256 price
    );
    
    event DividendPaid(
        bytes32 indexed companyId,
        uint256 dividendPerShare,
        uint256 totalPaid
    );
    
    event SharesTransferred(
        bytes32 indexed companyId,
        address indexed from,
        address indexed to,
        uint256 quantity
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier companyExists(bytes32 companyId) {
        if (companies[companyId].companyId == bytes32(0)) revert CompanyNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        
        // Create default indices
        _createIndex("ALTAN-50", new bytes32[](0));
        _createIndex("ALTAN-100", new bytes32[](0));
    }
    
    /* ==================== IPO & LISTING ==================== */
    
    /**
     * @notice Разместить компанию на бирже (IPO)
     */
    function listCompany(
        string calldata ticker,
        string calldata name,
        address treasury,
        bytes32 guildId,
        uint256 totalShares,
        uint256 ipoPrice
    ) external returns (bytes32 companyId) {
        require(bytes(ticker).length > 0 && bytes(ticker).length <= 10, "Invalid ticker");
        require(tickerToCompany[ticker] == bytes32(0), "Ticker exists");
        
        companyId = keccak256(abi.encodePacked(
            nextCompanyNonce++,
            ticker,
            block.timestamp
        ));
        
        companies[companyId] = Company({
            companyId: companyId,
            ticker: ticker,
            name: name,
            treasury: treasury,
            guildId: guildId,
            totalShares: totalShares,
            floatingShares: 0,  // Initially 0, increased via offerings
            sharePrice: ipoPrice,
            marketCap: totalShares * ipoPrice,
            lastDividendDate: 0,
            dividendPerShare: 0,
            status: CompanyStatus.PUBLIC,
            listedDate: block.timestamp
        });
        
        tickerToCompany[ticker] = companyId;
        allCompanies.push(companyId);
        
        // Assign all shares to treasury initially
        shareholders[treasury][companyId] = Shareholder({
            holder: treasury,
            companyId: companyId,
            shares: totalShares,
            avgBuyPrice: ipoPrice,
            totalInvested: 0,
            totalDividends: 0
        });
        
        companyHolders[companyId].push(treasury);
        
        emit CompanyListed(companyId, ticker, totalShares, ipoPrice);
    }
    
    /**
     * @notice Разместить акции (secondary offering)
     */
    function issueShares(
        bytes32 companyId,
        uint256 quantity,
        uint256 pricePerShare
    ) external companyExists(companyId) {
        Company storage company = companies[companyId];
        require(msg.sender == company.treasury, "Not treasury");
        
        company.floatingShares += quantity;
        
        // Create auto-sell order from treasury
        _createOrder(
            companyId,
            OrderType.LIMIT,
            OrderSide.SELL,
            quantity,
            pricePerShare,
            0  // No expiry
        );
    }
    
    /* ==================== TRADING ==================== */
    
    /**
     * @notice Разместить ордер
     */
    function placeOrder(
        bytes32 companyId,
        OrderType orderType,
        OrderSide side,
        uint256 quantity,
        uint256 price,  // Ignored for MARKET orders
        uint256 expiresAt
    ) external companyExists(companyId) returns (bytes32 orderId) {
        Company storage company = companies[companyId];
        require(company.status == CompanyStatus.PUBLIC, "Not trading");
        
        // Validate seller has shares
        if (side == OrderSide.SELL) {
            if (shareholders[msg.sender][companyId].shares < quantity) {
                revert InsufficientShares();
            }
        }
        
        orderId = _createOrder(companyId, orderType, side, quantity, price, expiresAt);
        
        // Try to match immediately
        if (orderType == OrderType.MARKET || orderType == OrderType.LIMIT) {
            _matchOrders(companyId, orderId);
        }
    }
    
    function _createOrder(
        bytes32 companyId,
        OrderType orderType,
        OrderSide side,
        uint256 quantity,
        uint256 price,
        uint256 expiresAt
    ) internal returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(
            nextOrderNonce++,
            msg.sender,
            companyId,
            block.timestamp
        ));
        
        orders[orderId] = Order({
            orderId: orderId,
            companyId: companyId,
            orderType: orderType,
            side: side,
            status: OrderStatus.ACTIVE,
            trader: msg.sender,
            quantity: quantity,
            filledQty: 0,
            price: price,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        if (side == OrderSide.BUY) {
            companyBuyOrders[companyId].push(orderId);
        } else {
            companySellOrders[companyId].push(orderId);
        }
        
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, companyId, side, quantity, price);
    }
    
    /**
     * @notice Матчинг ордеров (упрощённый)
     */
    function _matchOrders(bytes32 companyId, bytes32 newOrderId) internal {
        Order storage newOrder = orders[newOrderId];
        
        if (newOrder.side == OrderSide.BUY) {
            // Match with sell orders
            bytes32[] storage sellOrders = companySellOrders[companyId];
            for (uint i = 0; i < sellOrders.length && newOrder.filledQty < newOrder.quantity; i++) {
                Order storage sellOrder = orders[sellOrders[i]];
                
                if (sellOrder.status != OrderStatus.ACTIVE) continue;
                
                // Check price match
                bool priceMatch = newOrder.orderType == OrderType.MARKET ||
                    (sellOrder.price <= newOrder.price);
                
                if (priceMatch) {
                    _executeTrade(newOrderId, sellOrders[i]);
                }
            }
        } else {
            // Match with buy orders
            bytes32[] storage buyOrders = companyBuyOrders[companyId];
            for (uint i = 0; i < buyOrders.length && newOrder.filledQty < newOrder.quantity; i++) {
                Order storage buyOrder = orders[buyOrders[i]];
                
                if (buyOrder.status != OrderStatus.ACTIVE) continue;
                
                // Check price match
                bool priceMatch = newOrder.orderType == OrderType.MARKET ||
                    (buyOrder.price >= newOrder.price);
                
                if (priceMatch) {
                    _executeTrade(buyOrders[i], newOrderId);
                }
            }
        }
    }
    
    function _executeTrade(bytes32 buyOrderId, bytes32 sellOrderId) internal {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];
        
        uint256 tradeQty = _min(
            buyOrder.quantity - buyOrder.filledQty,
            sellOrder.quantity - sellOrder.filledQty
        );
        
        uint256 tradePrice = sellOrder.price;  // Taker gets maker price
        uint256 totalValue = tradeQty * tradePrice;
        
        // Transfer shares
        _transferShares(
            sellOrder.companyId,
            sellOrder.trader,
            buyOrder.trader,
            tradeQty,
            tradePrice
        );
        
        // Update orders
        buyOrder.filledQty += tradeQty;
        sellOrder.filledQty += tradeQty;
        
        if (buyOrder.filledQty >= buyOrder.quantity) {
            buyOrder.status = OrderStatus.FILLED;
        } else {
            buyOrder.status = OrderStatus.PARTIALLY_FILLED;
        }
        
        if (sellOrder.filledQty >= sellOrder.quantity) {
            sellOrder.status = OrderStatus.FILLED;
        } else {
            sellOrder.status = OrderStatus.PARTIALLY_FILLED;
        }
        
        // Record trade
        bytes32 tradeId = keccak256(abi.encodePacked(
            nextTradeNonce++,
            buyOrderId,
            sellOrderId,
            block.timestamp
        ));
        
        trades[tradeId] = Trade({
            tradeId: tradeId,
            companyId: buyOrder.companyId,
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            buyer: buyOrder.trader,
            seller: sellOrder.trader,
            quantity: tradeQty,
            price: tradePrice,
            totalValue: totalValue,
            executedAt: block.timestamp
        });
        
        companyTrades[buyOrder.companyId].push(tradeId);
        
        // Update stats
        totalTrades++;
        totalVolume += totalValue;
        dailyVolume[buyOrder.companyId] += totalValue;
        
        // Update company price
        companies[buyOrder.companyId].sharePrice = tradePrice;
        
        emit TradeExecuted(
            tradeId,
            buyOrder.companyId,
            buyOrder.trader,
            sellOrder.trader,
            tradeQty,
            tradePrice
        );
    }
    
    function _transferShares(
        bytes32 companyId,
        address from,
        address to,
        uint256 quantity,
        uint256 price
    ) internal {
        Shareholder storage fromHolder = shareholders[from][companyId];
        Shareholder storage toHolder = shareholders[to][companyId];
        
        fromHolder.shares -= quantity;
        
        if (toHolder.shares == 0) {
            // New holder
            toHolder.holder = to;
            toHolder.companyId = companyId;
            companyHolders[companyId].push(to);
        }
        
        toHolder.shares += quantity;
        toHolder.totalInvested += quantity * price;
        toHolder.avgBuyPrice = toHolder.totalInvested / toHolder.shares;
        
        emit SharesTransferred(companyId, from, to, quantity);
    }
    
    /**
     * @notice Отменить ордер
     */
    function cancelOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.ACTIVE, "Not active");
        
        order.status = OrderStatus.CANCELLED;
    }
    
    /* ==================== DIVIDENDS ==================== */
    
    /**
     * @notice Выплатить дивиденды
     */
    function payDividend(
        bytes32 companyId,
        uint256 dividendPerShare
    ) external companyExists(companyId) {
        Company storage company = companies[companyId];
        require(msg.sender == company.treasury, "Not treasury");
        
        company.lastDividendDate = block.timestamp;
        company.dividendPerShare = dividendPerShare;
        
        uint256 totalPaid = 0;
        address[] storage holders = companyHolders[companyId];
        
        for (uint i = 0; i < holders.length; i++) {
            Shareholder storage holder = shareholders[holders[i]][companyId];
            if (holder.shares > 0) {
                uint256 dividend = holder.shares * dividendPerShare;
                holder.totalDividends += dividend;
                totalPaid += dividend;
                
                // In production: transfer ALTAN to holder
            }
        }
        
        emit DividendPaid(companyId, dividendPerShare, totalPaid);
    }
    
    /* ==================== INDICES ==================== */
    
    function _createIndex(
        string memory name,
        bytes32[] memory constituents
    ) internal returns (bytes32 indexId) {
        indexId = keccak256(abi.encodePacked(name));
        
        indices[indexId] = Index({
            indexId: indexId,
            name: name,
            constituents: constituents,
            value: 1000,  // Base 1000
            lastUpdate: block.timestamp
        });
        
        allIndices.push(indexId);
    }
    
    function updateIndex(bytes32 indexId) external {
        Index storage index = indices[indexId];
        
        uint256 totalCap = 0;
        for (uint i = 0; i < index.constituents.length; i++) {
            totalCap += companies[index.constituents[i]].marketCap;
        }
        
        // Simple calculation (in production: weighted average)
        if (totalCap > 0) {
            index.value = (totalCap / index.constituents.length) / 1e15;
        }
        
        index.lastUpdate = block.timestamp;
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getCompanyByTicker(string calldata ticker) 
        external view returns (Company memory) 
    {
        return companies[tickerToCompany[ticker]];
    }
    
    function getOrderBook(bytes32 companyId) external view returns (
        bytes32[] memory buyOrders,
        bytes32[] memory sellOrders
    ) {
        return (companyBuyOrders[companyId], companySellOrders[companyId]);
    }
    
    function getShareholderInfo(address holder, bytes32 companyId) 
        external view returns (Shareholder memory) 
    {
        return shareholders[holder][companyId];
    }
    
    function getAllCompanies() external view returns (bytes32[] memory) {
        return allCompanies;
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setTradingFee(uint256 fee) external onlyOwner {
        require(fee <= 100, "Max 1%");
        tradingFee = fee;
    }
    
    function setAltan(address _altan) external onlyOwner {
        altanToken = _altan;
    }
    
    function suspendTrading(bytes32 companyId) external onlyOwner {
        companies[companyId].status = CompanyStatus.SUSPENDED;
    }
}
