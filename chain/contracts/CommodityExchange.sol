// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CommodityExchange (Товарная Биржа)
 * @notice Платформа торговли сырьём и товарами
 * 
 * Функции:
 * 1. Лоты (партии товара с DPP)
 * 2. Заявки на покупку/продажу
 * 3. Аукционы
 * 4. Котировки (цены)
 * 5. Расчёты через ALTAN PaymentGateway
 * 6. Поставка vs Спот
 * 
 * Категории товаров:
 * - Металлы (золото, медь, алюминий)
 * - Энергоносители (нефть, газ, уголь)
 * - Зерновые (пшеница, рожь, ячмень)
 * - Сырьё (лес, хлопок)
 * - Промышленные товары
 */

interface IAltanPaymentGateway {
    enum PaymentType {
        RETAIL_ORDER,
        SERVICE_BOOKING,
        TICKET_PURCHASE,
        AUCTION_BID,
        COMMODITY_TRADE,
        JOB_MILESTONE,
        DIRECT_TRANSFER
    }
    
    struct PaymentSplit {
        address recipient;
        uint256 amount;
        uint256 percentage;
        bool isPercentage;
    }
    
    function createEscrowPayment(
        PaymentType paymentType,
        address payer,
        PaymentSplit[] calldata splits,
        bytes32 referenceId
    ) external returns (bytes32 paymentId);
    
    function releasePayment(bytes32 paymentId) external;
    function refundPayment(bytes32 paymentId) external;
}

contract CommodityExchange {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error LotNotFound();
    error OrderNotFound();
    error InsufficientQuantity();
    error InvalidPrice();
    error OrderExpired();
    error NotSeller();
    error NotBuyer();
    error AlreadySettled();
    
    /* ==================== ENUMS ==================== */
    
    enum CommodityClass {
        METALS,         // Металлы
        ENERGY,         // Энергоносители
        GRAINS,         // Зерновые
        RAW_MATERIALS,  // Сырьё
        INDUSTRIAL,     // Промышленные
        FOOD,           // Продовольствие
        CHEMICALS       // Химия
    }
    
    enum OrderType {
        SELL,           // Продажа
        BUY             // Покупка
    }
    
    enum OrderStatus {
        ACTIVE,
        PARTIALLY_FILLED,
        FILLED,
        CANCELLED,
        EXPIRED
    }
    
    enum SettlementType {
        SPOT,           // Немедленная поставка
        FORWARD,        // Форвард (поставка в будущем)
        FUTURES         // Фьючерс
    }
    
    enum TradeStatus {
        PENDING,        // Ожидает расчёта
        PAID,           // Оплачено
        DELIVERED,      // Поставлено
        COMPLETED,      // Завершено
        DISPUTED        // Спор
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Товар (commodity)
    struct Commodity {
        bytes32 commodityId;
        CommodityClass commodityClass;
        string name;                // "Пшеница 3 класс"
        string code;                // "WHEAT-3"
        string unit;                // "тонна", "баррель", "куб.м"
        uint8 decimals;             // Точность (2 = 0.01)
        bytes32 standardHash;       // Хэш ГОСТа/ТУ
        bool isActive;
    }
    
    /// @notice Лот (партия товара)
    struct Lot {
        bytes32 lotId;
        bytes32 commodityId;
        bytes32 dppId;              // Цифровой паспорт товара
        
        address seller;
        uint256 quantity;           // Количество
        uint256 remainingQty;       // Остаток
        uint256 minOrderQty;        // Минимальный заказ
        
        bytes32 qualityCertHash;    // Сертификат качества
        bytes32 locationId;         // Склад
        string origin;              // Происхождение
        
        uint256 createdAt;
        uint256 expiresAt;          // Срок годности
        bool isActive;
    }
    
    /// @notice Заявка (order)
    struct Order {
        bytes32 orderId;
        bytes32 commodityId;
        OrderType orderType;
        OrderStatus status;
        SettlementType settlement;
        
        address trader;
        uint256 quantity;
        uint256 filledQty;
        uint256 price;              // Цена за единицу в ALTAN
        
        bytes32 lotId;              // Для SELL - какой лот продаём
        uint256 deliveryDate;       // Для FORWARD/FUTURES
        
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    /// @notice Сделка (trade)
    struct Trade {
        bytes32 tradeId;
        bytes32 sellOrderId;
        bytes32 buyOrderId;
        bytes32 lotId;
        bytes32 commodityId;
        
        address seller;
        address buyer;
        uint256 quantity;
        uint256 price;
        uint256 totalAmount;        // quantity * price
        
        TradeStatus status;
        uint256 executedAt;
        uint256 settledAt;
        bytes32 deliveryDocId;      // Накладная
    }
    
    /// @notice Котировка (quote)
    struct Quote {
        bytes32 commodityId;
        uint256 lastPrice;
        uint256 bidPrice;           // Лучшая покупка
        uint256 askPrice;           // Лучшая продажа
        uint256 dayVolume;
        uint256 dayHigh;
        uint256 dayLow;
        uint256 timestamp;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public altanToken;
    address public dpp;             // DigitalProductPassport
    address public chancellery;
    IAltanPaymentGateway public paymentGateway;
    
    // Payment tracking
    mapping(bytes32 => bytes32) public tradePayments;  // tradeId => paymentId
    
    // Commodities
    mapping(bytes32 => Commodity) public commodities;
    bytes32[] public allCommodities;
    mapping(CommodityClass => bytes32[]) public commoditiesByClass;
    
    // Lots
    uint256 public nextLotNonce = 1;
    mapping(bytes32 => Lot) public lots;
    mapping(bytes32 => bytes32[]) public commodityLots;     // commodityId => lotIds
    mapping(address => bytes32[]) public sellerLots;
    
    // Orders (Order Book)
    uint256 public nextOrderNonce = 1;
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bytes32[]) public commodityBuyOrders;  // commodityId => buy orders
    mapping(bytes32 => bytes32[]) public commoditySellOrders; // commodityId => sell orders
    mapping(address => bytes32[]) public userOrders;
    
    // Trades
    uint256 public nextTradeNonce = 1;
    mapping(bytes32 => Trade) public trades;
    mapping(address => bytes32[]) public userTrades;
    
    // Quotes
    mapping(bytes32 => Quote) public quotes;
    mapping(bytes32 => uint256[]) public priceHistory;      // Last 100 prices
    
    // Statistics
    uint256 public totalVolume;
    uint256 public totalTrades;
    
    // Brokers
    mapping(address => bool) public isBroker;
    
    /* ==================== EVENTS ==================== */
    
    event CommodityListed(
        bytes32 indexed commodityId,
        CommodityClass commodityClass,
        string code
    );
    
    event LotCreated(
        bytes32 indexed lotId,
        bytes32 indexed commodityId,
        address indexed seller,
        uint256 quantity,
        bytes32 dppId
    );
    
    event OrderPlaced(
        bytes32 indexed orderId,
        bytes32 indexed commodityId,
        OrderType orderType,
        address indexed trader,
        uint256 quantity,
        uint256 price
    );
    
    event OrderCancelled(bytes32 indexed orderId);
    
    event TradeExecuted(
        bytes32 indexed tradeId,
        bytes32 indexed commodityId,
        address seller,
        address buyer,
        uint256 quantity,
        uint256 price
    );
    
    event TradeSettled(
        bytes32 indexed tradeId,
        bytes32 deliveryDocId
    );
    
    event QuoteUpdated(
        bytes32 indexed commodityId,
        uint256 lastPrice,
        uint256 volume
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyBroker() {
        if (!isBroker[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        isBroker[msg.sender] = true;
        
        _setupDefaultCommodities();
    }
    
    function _setupDefaultCommodities() internal {
        // Metals
        _addCommodity(CommodityClass.METALS, "Zoloto", "GOLD", "gram", 3);
        _addCommodity(CommodityClass.METALS, "Serebro", "SILVER", "gram", 3);
        _addCommodity(CommodityClass.METALS, "Med", "COPPER", "tonna", 2);
        _addCommodity(CommodityClass.METALS, "Alyuminiy", "ALUM", "tonna", 2);
        
        // Energy
        _addCommodity(CommodityClass.ENERGY, "Neft Urals", "URALS", "barrel", 2);
        _addCommodity(CommodityClass.ENERGY, "Gaz Prirodny", "NATGAS", "1000m3", 2);
        _addCommodity(CommodityClass.ENERGY, "Ugol", "COAL", "tonna", 2);
        
        // Grains
        _addCommodity(CommodityClass.GRAINS, "Pshenitsa 3kl", "WHEAT3", "tonna", 2);
        _addCommodity(CommodityClass.GRAINS, "Rozh", "RYE", "tonna", 2);
        _addCommodity(CommodityClass.GRAINS, "Yachmen", "BARLEY", "tonna", 2);
        _addCommodity(CommodityClass.GRAINS, "Kukuruza", "CORN", "tonna", 2);
        
        // Raw Materials
        _addCommodity(CommodityClass.RAW_MATERIALS, "Les Krugly", "TIMBER", "m3", 2);
        _addCommodity(CommodityClass.RAW_MATERIALS, "Khlopok", "COTTON", "tonna", 2);
        
        // Food
        _addCommodity(CommodityClass.FOOD, "Sakhar", "SUGAR", "tonna", 2);
        _addCommodity(CommodityClass.FOOD, "Maslo Podsolnechnoe", "SUNOIL", "tonna", 2);
    }
    
    function _addCommodity(
        CommodityClass commodityClass,
        string memory name,
        string memory code,
        string memory unit,
        uint8 decimals
    ) internal returns (bytes32 commodityId) {
        commodityId = keccak256(abi.encodePacked(code));
        
        commodities[commodityId] = Commodity({
            commodityId: commodityId,
            commodityClass: commodityClass,
            name: name,
            code: code,
            unit: unit,
            decimals: decimals,
            standardHash: bytes32(0),
            isActive: true
        });
        
        allCommodities.push(commodityId);
        commoditiesByClass[commodityClass].push(commodityId);
        
        emit CommodityListed(commodityId, commodityClass, code);
    }
    
    /* ==================== LOTS ==================== */
    
    /**
     * @notice Создать лот (партия товара на продажу)
     */
    function createLot(
        bytes32 commodityId,
        bytes32 dppId,
        uint256 quantity,
        uint256 minOrderQty,
        bytes32 qualityCertHash,
        bytes32 locationId,
        string calldata origin,
        uint256 expiresAt
    ) external returns (bytes32 lotId) {
        require(commodities[commodityId].isActive, "Invalid commodity");
        
        lotId = keccak256(abi.encodePacked(
            nextLotNonce++,
            msg.sender,
            commodityId,
            block.timestamp
        ));
        
        lots[lotId] = Lot({
            lotId: lotId,
            commodityId: commodityId,
            dppId: dppId,
            seller: msg.sender,
            quantity: quantity,
            remainingQty: quantity,
            minOrderQty: minOrderQty,
            qualityCertHash: qualityCertHash,
            locationId: locationId,
            origin: origin,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true
        });
        
        commodityLots[commodityId].push(lotId);
        sellerLots[msg.sender].push(lotId);
        
        emit LotCreated(lotId, commodityId, msg.sender, quantity, dppId);
    }
    
    /* ==================== ORDERS ==================== */
    
    /**
     * @notice Разместить заявку на продажу
     */
    function placeSellOrder(
        bytes32 lotId,
        uint256 quantity,
        uint256 price,
        SettlementType settlement,
        uint256 deliveryDate,
        uint256 expiresAt
    ) external returns (bytes32 orderId) {
        Lot storage lot = lots[lotId];
        if (!lot.isActive) revert LotNotFound();
        if (lot.seller != msg.sender) revert NotSeller();
        if (quantity > lot.remainingQty) revert InsufficientQuantity();
        
        orderId = _createOrder(
            lot.commodityId,
            OrderType.SELL,
            quantity,
            price,
            lotId,
            settlement,
            deliveryDate,
            expiresAt
        );
        
        commoditySellOrders[lot.commodityId].push(orderId);
        
        // Update quote
        _updateQuote(lot.commodityId, price, 0);
    }
    
    /**
     * @notice Разместить заявку на покупку
     */
    function placeBuyOrder(
        bytes32 commodityId,
        uint256 quantity,
        uint256 price,
        SettlementType settlement,
        uint256 deliveryDate,
        uint256 expiresAt
    ) external returns (bytes32 orderId) {
        require(commodities[commodityId].isActive, "Invalid commodity");
        
        orderId = _createOrder(
            commodityId,
            OrderType.BUY,
            quantity,
            price,
            bytes32(0),
            settlement,
            deliveryDate,
            expiresAt
        );
        
        commodityBuyOrders[commodityId].push(orderId);
        
        // Update quote
        _updateQuote(commodityId, price, 0);
    }
    
    function _createOrder(
        bytes32 commodityId,
        OrderType orderType,
        uint256 quantity,
        uint256 price,
        bytes32 lotId,
        SettlementType settlement,
        uint256 deliveryDate,
        uint256 expiresAt
    ) internal returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(
            nextOrderNonce++,
            msg.sender,
            commodityId,
            block.timestamp
        ));
        
        orders[orderId] = Order({
            orderId: orderId,
            commodityId: commodityId,
            orderType: orderType,
            status: OrderStatus.ACTIVE,
            settlement: settlement,
            trader: msg.sender,
            quantity: quantity,
            filledQty: 0,
            price: price,
            lotId: lotId,
            deliveryDate: deliveryDate,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, commodityId, orderType, msg.sender, quantity, price);
    }
    
    /**
     * @notice Отменить заявку
     */
    function cancelOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.ACTIVE, "Not active");
        
        order.status = OrderStatus.CANCELLED;
        
        emit OrderCancelled(orderId);
    }
    
    /* ==================== MATCHING & TRADES ==================== */
    
    /**
     * @notice Исполнить сделку (match orders)
     */
    function executeTrade(
        bytes32 sellOrderId,
        bytes32 buyOrderId,
        uint256 quantity
    ) external onlyBroker returns (bytes32 tradeId) {
        Order storage sellOrder = orders[sellOrderId];
        Order storage buyOrder = orders[buyOrderId];
        
        require(sellOrder.status == OrderStatus.ACTIVE, "Sell not active");
        require(buyOrder.status == OrderStatus.ACTIVE, "Buy not active");
        require(sellOrder.commodityId == buyOrder.commodityId, "Commodity mismatch");
        require(buyOrder.price >= sellOrder.price, "Price mismatch");
        
        uint256 tradeQty = quantity;
        if (tradeQty > sellOrder.quantity - sellOrder.filledQty) {
            tradeQty = sellOrder.quantity - sellOrder.filledQty;
        }
        if (tradeQty > buyOrder.quantity - buyOrder.filledQty) {
            tradeQty = buyOrder.quantity - buyOrder.filledQty;
        }
        
        uint256 tradePrice = sellOrder.price;  // Maker price
        uint256 totalAmount = tradeQty * tradePrice;
        
        tradeId = keccak256(abi.encodePacked(
            nextTradeNonce++,
            sellOrderId,
            buyOrderId,
            block.timestamp
        ));
        
        trades[tradeId] = Trade({
            tradeId: tradeId,
            sellOrderId: sellOrderId,
            buyOrderId: buyOrderId,
            lotId: sellOrder.lotId,
            commodityId: sellOrder.commodityId,
            seller: sellOrder.trader,
            buyer: buyOrder.trader,
            quantity: tradeQty,
            price: tradePrice,
            totalAmount: totalAmount,
            status: TradeStatus.PENDING,
            executedAt: block.timestamp,
            settledAt: 0,
            deliveryDocId: bytes32(0)
        });
        
        // Update orders
        sellOrder.filledQty += tradeQty;
        buyOrder.filledQty += tradeQty;
        
        if (sellOrder.filledQty >= sellOrder.quantity) {
            sellOrder.status = OrderStatus.FILLED;
        } else {
            sellOrder.status = OrderStatus.PARTIALLY_FILLED;
        }
        
        if (buyOrder.filledQty >= buyOrder.quantity) {
            buyOrder.status = OrderStatus.FILLED;
        } else {
            buyOrder.status = OrderStatus.PARTIALLY_FILLED;
        }
        
        // Update lot
        if (sellOrder.lotId != bytes32(0)) {
            lots[sellOrder.lotId].remainingQty -= tradeQty;
        }
        
        userTrades[sellOrder.trader].push(tradeId);
        userTrades[buyOrder.trader].push(tradeId);
        
        // Update stats
        totalTrades++;
        totalVolume += totalAmount;
        
        // Update quote
        _updateQuote(sellOrder.commodityId, tradePrice, tradeQty);
        
        emit TradeExecuted(
            tradeId,
            sellOrder.commodityId,
            sellOrder.trader,
            buyOrder.trader,
            tradeQty,
            tradePrice
        );
    }
    
    /**
     * @notice Подтвердить оплату через PaymentGateway
     */
    function confirmPayment(bytes32 tradeId) external {
        Trade storage trade = trades[tradeId];
        require(trade.buyer == msg.sender, "Not buyer");
        require(trade.status == TradeStatus.PENDING, "Wrong status");
        
        // Create escrow payment
        IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
        splits[0] = IAltanPaymentGateway.PaymentSplit({
            recipient: trade.seller,
            amount: trade.totalAmount,
            percentage: 0,
            isPercentage: false
        });
        
        bytes32 paymentId = paymentGateway.createEscrowPayment(
            IAltanPaymentGateway.PaymentType.COMMODITY_TRADE,
            msg.sender,
            splits,
            tradeId
        );
        
        tradePayments[tradeId] = paymentId;
        trade.status = TradeStatus.PAID;
    }
    
    /**
     * @notice Подтвердить поставку
     */
    function confirmDelivery(
        bytes32 tradeId,
        bytes32 deliveryDocId
    ) external {
        Trade storage trade = trades[tradeId];
        require(trade.seller == msg.sender, "Not seller");
        require(trade.status == TradeStatus.PAID, "Not paid");
        
        trade.status = TradeStatus.DELIVERED;
        trade.deliveryDocId = deliveryDocId;
    }
    
    /**
     * @notice Завершить сделку (покупатель подтверждает получение) → релиз платежа
     */
    function completeTrade(bytes32 tradeId) external {
        Trade storage trade = trades[tradeId];
        require(trade.buyer == msg.sender, "Not buyer");
        require(trade.status == TradeStatus.DELIVERED, "Not delivered");
        
        // Release payment to seller
        bytes32 paymentId = tradePayments[tradeId];
        if (paymentId != bytes32(0)) {
            paymentGateway.releasePayment(paymentId);
        }
        
        trade.status = TradeStatus.COMPLETED;
        trade.settledAt = block.timestamp;
        
        emit TradeSettled(tradeId, trade.deliveryDocId);
    }
    
    /* ==================== QUOTES ==================== */
    
    function _updateQuote(
        bytes32 commodityId,
        uint256 price,
        uint256 volume
    ) internal {
        Quote storage q = quotes[commodityId];
        
        q.commodityId = commodityId;
        q.lastPrice = price;
        q.dayVolume += volume;
        q.timestamp = block.timestamp;
        
        if (q.dayHigh == 0 || price > q.dayHigh) {
            q.dayHigh = price;
        }
        if (q.dayLow == 0 || price < q.dayLow) {
            q.dayLow = price;
        }
        
        // Store price history
        if (priceHistory[commodityId].length >= 100) {
            // Shift (simple approach)
            for (uint i = 0; i < 99; i++) {
                priceHistory[commodityId][i] = priceHistory[commodityId][i + 1];
            }
            priceHistory[commodityId][99] = price;
        } else {
            priceHistory[commodityId].push(price);
        }
        
        emit QuoteUpdated(commodityId, price, volume);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getCommodity(bytes32 id) external view returns (Commodity memory) {
        return commodities[id];
    }
    
    function getLot(bytes32 id) external view returns (Lot memory) {
        return lots[id];
    }
    
    function getOrder(bytes32 id) external view returns (Order memory) {
        return orders[id];
    }
    
    function getTrade(bytes32 id) external view returns (Trade memory) {
        return trades[id];
    }
    
    function getQuote(bytes32 id) external view returns (Quote memory) {
        return quotes[id];
    }
    
    function getAllCommodities() external view returns (bytes32[] memory) {
        return allCommodities;
    }
    
    function getCommodityLots(bytes32 id) external view returns (bytes32[] memory) {
        return commodityLots[id];
    }
    
    function getOrderBook(bytes32 commodityId) external view returns (
        bytes32[] memory buyOrders,
        bytes32[] memory sellOrders
    ) {
        return (
            commodityBuyOrders[commodityId],
            commoditySellOrders[commodityId]
        );
    }
    
    function getPriceHistory(bytes32 id) external view returns (uint256[] memory) {
        return priceHistory[id];
    }
    
    function getMarketStats() external view returns (
        uint256 volume,
        uint256 tradesCount,
        uint256 commoditiesCount
    ) {
        return (totalVolume, totalTrades, allCommodities.length);
    }
    
    /* ==================== ADMIN ==================== */
    
    function setBroker(address broker, bool auth) external onlyOwner {
        isBroker[broker] = auth;
    }
    
    function setAltan(address _altan) external onlyOwner {
        altanToken = _altan;
    }
    
    function setDpp(address _dpp) external onlyOwner {
        dpp = _dpp;
    }
    
    function setPaymentGateway(address _gateway) external onlyOwner {
        paymentGateway = IAltanPaymentGateway(_gateway);
    }
    
    function addCommodity(
        CommodityClass commodityClass,
        string calldata name,
        string calldata code,
        string calldata unit,
        uint8 decimals,
        bytes32 standardHash
    ) external onlyOwner returns (bytes32 commodityId) {
        commodityId = _addCommodity(commodityClass, name, code, unit, decimals);
        commodities[commodityId].standardHash = standardHash;
    }
}
