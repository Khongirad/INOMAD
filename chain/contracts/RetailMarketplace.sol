// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RetailMarketplace (Розничный Маркетплейс)
 * @notice Торговая площадка типа Amazon/Wildberries/Taobao
 * 
 * Функции:
 * 1. Магазины (продавцы)
 * 2. Товары с категориями
 * 3. Корзина покупок
 * 4. Заказы с доставкой
 * 5. Отзывы и рейтинги
 * 6. Споры и возвраты
 * 
 * Оплата: ALTAN через PaymentGateway
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
    function openDispute(bytes32 paymentId) external;
}

interface IDigitalProductPassport {
    enum ProductStatus {
        DRAFT,
        ACTIVE,
        IN_TRANSIT,
        SOLD,
        RECALLED,
        BLOCKED
    }
    
    struct ProductPassport {
        bytes32 passportId;
        uint256 createdAt;
        address creator;
        ProductStatus status;
        bool hasIdentity;
        bool hasCompliance;
        bool hasLogistics;
        bool hasTransaction;
    }
    
    struct TransactionBlock {
        address currentOwner;
        bytes32[] invoiceHashes;
        uint256 transferCount;
        uint256 totalValueExchanged;
    }
    
    function getPassport(bytes32 passportId) external view returns (
        ProductPassport memory passport,
        TransactionBlock memory txBlock
    );
    
    function transferOwnership(
        bytes32 passportId,
        address newOwner,
        bytes32 invoiceHash,
        bytes32 actHash,
        uint256 price
    ) external;
    
    function blockPassport(bytes32 passportId, string calldata reason) external;
    function unblockPassport(bytes32 passportId) external;
}

contract RetailMarketplace {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error StoreNotFound();
    error ProductNotFound();
    error OrderNotFound();
    error OutOfStock();
    error InvalidStatus();
    error NotAuthorized();
    error InvalidDPP();
    error DPPBlocked();
    
    /* ==================== ENUMS ==================== */
    
    enum ProductCategory {
        ELECTRONICS,    // Электроника
        CLOTHING,       // Одежда
        HOME,           // Дом и сад
        BEAUTY,         // Красота
        SPORTS,         // Спорт
        TOYS,           // Игрушки
        BOOKS,          // Книги
        FOOD,           // Продукты
        AUTO,           // Авто
        JEWELRY,        // Украшения
        HANDMADE,       // Ручная работа
        OTHER
    }
    
    enum OrderStatus {
        CREATED,        // Создан
        PAID,           // Оплачен
        PROCESSING,     // Обрабатывается
        SHIPPED,        // Отправлен
        IN_TRANSIT,     // В пути
        DELIVERED,      // Доставлен
        COMPLETED,      // Завершён
        CANCELLED,      // Отменён
        REFUNDED,       // Возврат
        DISPUTED        // Спор
    }
    
    enum DeliveryType {
        PICKUP,         // Самовывоз
        COURIER,        // Курьер
        POST,           // Почта
        EXPRESS         // Экспресс
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Магазин (продавец)
    struct Store {
        bytes32 storeId;
        address owner;
        
        string name;
        string description;
        string logo;                // IPFS hash
        
        uint256 rating;             // 0-500
        uint256 reviewCount;
        uint256 salesCount;
        uint256 totalRevenue;
        
        bool isVerified;
        bool isActive;
        uint256 createdAt;
    }
    
    /// @notice Товар
    struct Product {
        bytes32 productId;
        bytes32 storeId;
        ProductCategory category;
        
        string name;
        string description;
        string[] images;            // IPFS hashes
        bytes32 specsHash;          // Характеристики
        
        uint256 price;              // В ALTAN
        uint256 originalPrice;      // Для скидок
        uint256 stock;              // Остаток
        
        uint256 rating;
        uint256 reviewCount;
        uint256 soldCount;
        
        bool isActive;
        uint256 createdAt;
    }
    
    /// @notice Вариант товара (размер, цвет)
    struct ProductVariant {
        bytes32 variantId;
        bytes32 productId;
        string name;                // "Красный L"
        uint256 priceModifier;      // +/- к цене
        uint256 stock;
    }
    
    /// @notice Элемент корзины
    struct CartItem {
        bytes32 productId;
        bytes32 variantId;
        uint256 quantity;
        uint256 price;
    }
    
    /// @notice Заказ
    struct Order {
        bytes32 orderId;
        uint256 orderNumber;
        address buyer;
        bytes32 storeId;
        
        OrderStatus status;
        DeliveryType delivery;
        
        uint256 subtotal;           // Сумма товаров
        uint256 deliveryFee;
        uint256 discount;
        uint256 total;
        
        bytes32 addressHash;        // Хэш адреса доставки
        string trackingNumber;
        
        uint256 createdAt;
        uint256 paidAt;
        uint256 shippedAt;
        uint256 deliveredAt;
    }
    
    /// @notice Позиция заказа
    struct OrderItem {
        bytes32 orderItemId;
        bytes32 orderId;
        bytes32 productId;
        bytes32 variantId;
        
        string productName;
        uint256 quantity;
        uint256 unitPrice;
        uint256 total;
    }
    
    /// @notice Отзыв
    struct Review {
        bytes32 reviewId;
        bytes32 productId;
        bytes32 orderId;
        
        address author;
        uint256 rating;             // 0-500
        string text;
        string[] photos;
        
        uint256 helpful;            // Полезных голосов
        uint256 createdAt;
    }
    
    /// @notice Спор
    struct Dispute {
        bytes32 disputeId;
        bytes32 orderId;
        
        address initiator;
        string reason;
        bytes32 evidenceHash;
        
        bool resolved;
        bool buyerWon;
        uint256 createdAt;
        uint256 resolvedAt;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public altanToken;
    IAltanPaymentGateway public paymentGateway;
    
    uint256 public platformFee = 300;       // 3%
    uint256 public nextOrderNumber = 1000001;
    
    // Payment tracking
    mapping(bytes32 => bytes32) public orderPayments;  // orderId => paymentId
    
    // Stores
    uint256 public nextStoreNonce = 1;
    mapping(bytes32 => Store) public stores;
    bytes32[] public allStores;
    mapping(address => bytes32) public ownerStore;
    
    // Products
    uint256 public nextProductNonce = 1;
    mapping(bytes32 => Product) public products;
    mapping(bytes32 => bytes32[]) public storeProducts;
    mapping(ProductCategory => bytes32[]) public categoryProducts;
    mapping(bytes32 => bytes32[]) public productVariants;
    mapping(bytes32 => ProductVariant) public variants;
    
    // Cart (per user)
    mapping(address => CartItem[]) public userCart;
    
    // Orders
    uint256 public nextOrderNonce = 1;
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => OrderItem[]) public orderItems;
    mapping(address => bytes32[]) public buyerOrders;
    mapping(bytes32 => bytes32[]) public storeOrders;
    mapping(uint256 => bytes32) public orderNumberToId;
    
    // Reviews
    uint256 public nextReviewNonce = 1;
    mapping(bytes32 => Review) public reviews;
    mapping(bytes32 => bytes32[]) public productReviews;
    
    // Disputes
    mapping(bytes32 => Dispute) public disputes;
    mapping(bytes32 => bytes32) public orderDispute;
    
    // Stats
    uint256 public totalOrders;
    uint256 public totalVolume;
    
    /* ==================== EVENTS ==================== */
    
    event StoreCreated(bytes32 indexed storeId, address indexed owner, string name);
    event ProductListed(bytes32 indexed productId, bytes32 indexed storeId, string name, uint256 price);
    event ProductUpdated(bytes32 indexed productId, uint256 price, uint256 stock);
    event CartUpdated(address indexed user, bytes32 productId, uint256 quantity);
    event OrderCreated(bytes32 indexed orderId, uint256 orderNumber, address indexed buyer, uint256 total);
    event OrderPaid(bytes32 indexed orderId, bytes32 indexed paymentId);
    event OrderShipped(bytes32 indexed orderId, string trackingNumber);
    event OrderDelivered(bytes32 indexed orderId);
    event OrderCompleted(bytes32 indexed orderId);
    event ReviewPosted(bytes32 indexed reviewId, bytes32 indexed productId, uint256 rating);
    event DisputeOpened(bytes32 indexed disputeId, bytes32 indexed orderId);
    event DisputeResolved(bytes32 indexed disputeId, bool buyerWon);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier storeExists(bytes32 storeId) {
        if (stores[storeId].storeId == bytes32(0)) revert StoreNotFound();
        _;
    }
    
    modifier productExists(bytes32 productId) {
        if (products[productId].productId == bytes32(0)) revert ProductNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
    }
    
    /* ==================== STORES ==================== */
    
    /**
     * @notice Создать магазин
     */
    function createStore(
        string calldata name,
        string calldata description,
        string calldata logo
    ) external returns (bytes32 storeId) {
        require(ownerStore[msg.sender] == bytes32(0), "Already has store");
        
        storeId = keccak256(abi.encodePacked(
            nextStoreNonce++,
            msg.sender,
            name
        ));
        
        stores[storeId] = Store({
            storeId: storeId,
            owner: msg.sender,
            name: name,
            description: description,
            logo: logo,
            rating: 0,
            reviewCount: 0,
            salesCount: 0,
            totalRevenue: 0,
            isVerified: false,
            isActive: true,
            createdAt: block.timestamp
        });
        
        allStores.push(storeId);
        ownerStore[msg.sender] = storeId;
        
        emit StoreCreated(storeId, msg.sender, name);
    }
    
    /* ==================== PRODUCTS ==================== */
    
    /**
     * @notice Добавить товар
     */
    function listProduct(
        ProductCategory category,
        string calldata name,
        string calldata description,
        string[] calldata images,
        bytes32 specsHash,
        uint256 price,
        uint256 originalPrice,
        uint256 stock
    ) external returns (bytes32 productId) {
        bytes32 storeId = ownerStore[msg.sender];
        require(storeId != bytes32(0), "No store");
        
        productId = keccak256(abi.encodePacked(
            nextProductNonce++,
            storeId,
            name
        ));
        
        products[productId] = Product({
            productId: productId,
            storeId: storeId,
            category: category,
            name: name,
            description: description,
            images: images,
            specsHash: specsHash,
            price: price,
            originalPrice: originalPrice > 0 ? originalPrice : price,
            stock: stock,
            rating: 0,
            reviewCount: 0,
            soldCount: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        storeProducts[storeId].push(productId);
        categoryProducts[category].push(productId);
        
        emit ProductListed(productId, storeId, name, price);
    }
    
    /**
     * @notice Добавить вариант товара
     */
    function addVariant(
        bytes32 productId,
        string calldata name,
        int256 priceModifier,
        uint256 stock
    ) external productExists(productId) returns (bytes32 variantId) {
        Product storage prod = products[productId];
        require(stores[prod.storeId].owner == msg.sender, "Not owner");
        
        variantId = keccak256(abi.encodePacked(productId, name));
        
        uint256 priceMod = priceModifier >= 0 
            ? uint256(priceModifier) 
            : 0;
        
        variants[variantId] = ProductVariant({
            variantId: variantId,
            productId: productId,
            name: name,
            priceModifier: priceMod,
            stock: stock
        });
        
        productVariants[productId].push(variantId);
    }
    
    /**
     * @notice Обновить цену/остаток
     */
    function updateProduct(
        bytes32 productId,
        uint256 price,
        uint256 stock
    ) external productExists(productId) {
        Product storage prod = products[productId];
        require(stores[prod.storeId].owner == msg.sender, "Not owner");
        
        prod.price = price;
        prod.stock = stock;
        
        emit ProductUpdated(productId, price, stock);
    }
    
    /* ==================== CART ==================== */
    
    /**
     * @notice Добавить в корзину
     */
    function addToCart(
        bytes32 productId,
        bytes32 variantId,
        uint256 quantity
    ) external productExists(productId) {
        Product storage prod = products[productId];
        require(prod.isActive, "Not active");
        require(prod.stock >= quantity, "Not enough stock");
        
        uint256 price = prod.price;
        if (variantId != bytes32(0)) {
            price += variants[variantId].priceModifier;
        }
        
        // Check if already in cart
        CartItem[] storage cart = userCart[msg.sender];
        bool found = false;
        
        for (uint i = 0; i < cart.length; i++) {
            if (cart[i].productId == productId && cart[i].variantId == variantId) {
                cart[i].quantity += quantity;
                cart[i].price = price;
                found = true;
                break;
            }
        }
        
        if (!found) {
            cart.push(CartItem({
                productId: productId,
                variantId: variantId,
                quantity: quantity,
                price: price
            }));
        }
        
        emit CartUpdated(msg.sender, productId, quantity);
    }
    
    /**
     * @notice Удалить из корзины
     */
    function removeFromCart(uint256 index) external {
        CartItem[] storage cart = userCart[msg.sender];
        require(index < cart.length, "Invalid index");
        
        cart[index] = cart[cart.length - 1];
        cart.pop();
    }
    
    /**
     * @notice Очистить корзину
     */
    function clearCart() external {
        delete userCart[msg.sender];
    }
    
    /**
     * @notice Получить корзину
     */
    function getCart(address user) external view returns (CartItem[] memory) {
        return userCart[user];
    }
    
    /* ==================== ORDERS ==================== */
    
    /**
     * @notice Создать заказ из корзины
     */
    function createOrder(
        DeliveryType delivery,
        bytes32 addressHash,
        uint256 discount
    ) external returns (bytes32 orderId) {
        CartItem[] storage cart = userCart[msg.sender];
        require(cart.length > 0, "Cart empty");
        
        // Calculate totals (assuming single store for simplicity)
        uint256 subtotal = 0;
        bytes32 storeId = products[cart[0].productId].storeId;
        
        for (uint i = 0; i < cart.length; i++) {
            subtotal += cart[i].price * cart[i].quantity;
        }
        
        uint256 deliveryFee = _calculateDeliveryFee(delivery);
        uint256 total = subtotal + deliveryFee - discount;
        
        uint256 orderNum = nextOrderNumber++;
        orderId = keccak256(abi.encodePacked(
            nextOrderNonce++,
            msg.sender,
            orderNum
        ));
        
        orders[orderId] = Order({
            orderId: orderId,
            orderNumber: orderNum,
            buyer: msg.sender,
            storeId: storeId,
            status: OrderStatus.CREATED,
            delivery: delivery,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            discount: discount,
            total: total,
            addressHash: addressHash,
            trackingNumber: "",
            createdAt: block.timestamp,
            paidAt: 0,
            shippedAt: 0,
            deliveredAt: 0
        });
        
        // Create order items
        for (uint i = 0; i < cart.length; i++) {
            Product storage prod = products[cart[i].productId];
            
            orderItems[orderId].push(OrderItem({
                orderItemId: keccak256(abi.encodePacked(orderId, i)),
                orderId: orderId,
                productId: cart[i].productId,
                variantId: cart[i].variantId,
                productName: prod.name,
                quantity: cart[i].quantity,
                unitPrice: cart[i].price,
                total: cart[i].price * cart[i].quantity
            }));
            
            // Decrease stock
            prod.stock -= cart[i].quantity;
        }
        
        orderNumberToId[orderNum] = orderId;
        buyerOrders[msg.sender].push(orderId);
        storeOrders[storeId].push(orderId);
        
        // Clear cart
        delete userCart[msg.sender];
        
        totalOrders++;
        
        emit OrderCreated(orderId, orderNum, msg.sender, total);
    }
    
    function _calculateDeliveryFee(DeliveryType delivery) internal pure returns (uint256) {
        if (delivery == DeliveryType.PICKUP) return 0;
        if (delivery == DeliveryType.POST) return 500;      // 5 ALTAN
        if (delivery == DeliveryType.COURIER) return 1000;  // 10 ALTAN
        if (delivery == DeliveryType.EXPRESS) return 2000;  // 20 ALTAN
        return 0;
    }
    
    /**
     * @notice Оплатить заказ через PaymentGateway
     */
    function payOrder(bytes32 orderId) external returns (bytes32 paymentId) {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not buyer");
        require(order.status == OrderStatus.CREATED, "Wrong status");
        
        // Create payment splits
        Store storage store = stores[order.storeId];
        
        IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
        splits[0] = IAltanPaymentGateway.PaymentSplit({
            recipient: store.owner,
            amount: order.total,
            percentage: 0,
            isPercentage: false
        });
        
        // Create escrow payment
        paymentId = paymentGateway.createEscrowPayment(
            IAltanPaymentGateway.PaymentType.RETAIL_ORDER,
            msg.sender,
            splits,
            orderId
        );
        
        orderPayments[orderId] = paymentId;
        order.status = OrderStatus.PAID;
        order.paidAt = block.timestamp;
        
        totalVolume += order.total;
        
        emit OrderPaid(orderId, paymentId);
    }
    
    /**
     * @notice Отправить заказ (продавец)
     */
    function shipOrder(bytes32 orderId, string calldata trackingNumber) external {
        Order storage order = orders[orderId];
        require(stores[order.storeId].owner == msg.sender, "Not seller");
        require(order.status == OrderStatus.PAID, "Not paid");
        
        order.status = OrderStatus.SHIPPED;
        order.trackingNumber = trackingNumber;
        order.shippedAt = block.timestamp;
        
        emit OrderShipped(orderId, trackingNumber);
    }
    
    /**
     * @notice Обновить статус в пути
     */
    function markInTransit(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(stores[order.storeId].owner == msg.sender, "Not seller");
        require(order.status == OrderStatus.SHIPPED, "Not shipped");
        
        order.status = OrderStatus.IN_TRANSIT;
    }
    
    /**
     * @notice Подтвердить доставку → релиз платежа
     */
    function confirmDelivery(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not buyer");
        require(
            order.status == OrderStatus.SHIPPED ||
            order.status == OrderStatus.IN_TRANSIT,
            "Wrong status"
        );
        
        order.status = OrderStatus.DELIVERED;
        order.deliveredAt = block.timestamp;
        
        // Release payment to seller
        bytes32 paymentId = orderPayments[orderId];
        if (paymentId != bytes32(0)) {
            paymentGateway.releasePayment(paymentId);
        }
        
        // Update store stats
        Store storage store = stores[order.storeId];
        store.salesCount++;
        store.totalRevenue += order.total;
        
        // Update product sold counts
        OrderItem[] storage items = orderItems[orderId];
        for (uint i = 0; i < items.length; i++) {
            products[items[i].productId].soldCount += items[i].quantity;
        }
        
        emit OrderDelivered(orderId);
    }
    
    /**
     * @notice Завершить заказ (после периода возврата)
     */
    function completeOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DELIVERED, "Not delivered");
        require(
            block.timestamp > order.deliveredAt + 7 days,
            "Return period active"
        );
        
        order.status = OrderStatus.COMPLETED;
        
        emit OrderCompleted(orderId);
    }
    
    /**
     * @notice Отменить заказ → возврат платежа
     */
    function cancelOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not buyer");
        require(
            order.status == OrderStatus.CREATED ||
            order.status == OrderStatus.PAID,
            "Cannot cancel"
        );
        
        // Refund payment if paid
        if (order.status == OrderStatus.PAID) {
            bytes32 paymentId = orderPayments[orderId];
            if (paymentId != bytes32(0)) {
                paymentGateway.refundPayment(paymentId);
            }
        }
        
        // Restore stock
        OrderItem[] storage items = orderItems[orderId];
        for (uint i = 0; i < items.length; i++) {
            products[items[i].productId].stock += items[i].quantity;
        }
        
        order.status = OrderStatus.CANCELLED;
    }
    
    /* ==================== REVIEWS ==================== */
    
    /**
     * @notice Оставить отзыв
     */
    function postReview(
        bytes32 productId,
        bytes32 orderId,
        uint256 rating,
        string calldata text,
        string[] calldata photos
    ) external productExists(productId) returns (bytes32 reviewId) {
        require(rating <= 500, "Max 500");
        require(orders[orderId].buyer == msg.sender, "Not buyer");
        require(orders[orderId].status == OrderStatus.DELIVERED ||
                orders[orderId].status == OrderStatus.COMPLETED, "Not delivered");
        
        reviewId = keccak256(abi.encodePacked(
            nextReviewNonce++,
            productId,
            msg.sender
        ));
        
        reviews[reviewId] = Review({
            reviewId: reviewId,
            productId: productId,
            orderId: orderId,
            author: msg.sender,
            rating: rating,
            text: text,
            photos: photos,
            helpful: 0,
            createdAt: block.timestamp
        });
        
        productReviews[productId].push(reviewId);
        
        // Update product rating
        Product storage prod = products[productId];
        prod.rating = ((prod.rating * prod.reviewCount) + rating) / (prod.reviewCount + 1);
        prod.reviewCount++;
        
        // Update store rating
        Store storage store = stores[prod.storeId];
        store.rating = ((store.rating * store.reviewCount) + rating) / (store.reviewCount + 1);
        store.reviewCount++;
        
        emit ReviewPosted(reviewId, productId, rating);
    }
    
    /**
     * @notice Отметить отзыв полезным
     */
    function markHelpful(bytes32 reviewId) external {
        reviews[reviewId].helpful++;
    }
    
    /* ==================== DISPUTES ==================== */
    
    /**
     * @notice Открыть спор → открывает спор в PaymentGateway
     */
    function openDispute(
        bytes32 orderId,
        string calldata reason,
        bytes32 evidenceHash
    ) external returns (bytes32 disputeId) {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not buyer");
        require(
            order.status == OrderStatus.DELIVERED,
            "Cannot dispute"
        );
        require(orderDispute[orderId] == bytes32(0), "Already disputed");
        
        disputeId = keccak256(abi.encodePacked(orderId, block.timestamp));
        
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            orderId: orderId,
            initiator: msg.sender,
            reason: reason,
            evidenceHash: evidenceHash,
            resolved: false,
            buyerWon: false,
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        orderDispute[orderId] = disputeId;
        order.status = OrderStatus.DISPUTED;
        
        // Open dispute in PaymentGateway
        bytes32 paymentId = orderPayments[orderId];
        if (paymentId != bytes32(0)) {
            paymentGateway.openDispute(paymentId);
        }
        
        emit DisputeOpened(disputeId, orderId);
    }
    
    /**
     * @notice Разрешить спор (admin)
     */
    function resolveDispute(bytes32 disputeId, bool buyerWins) external onlyOwner {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Already resolved");
        
        dispute.resolved = true;
        dispute.buyerWon = buyerWins;
        dispute.resolvedAt = block.timestamp;
        
        Order storage order = orders[dispute.orderId];
        order.status = buyerWins ? OrderStatus.REFUNDED : OrderStatus.COMPLETED;
        
        emit DisputeResolved(disputeId, buyerWins);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getStore(bytes32 id) external view returns (Store memory) {
        return stores[id];
    }
    
    function getProduct(bytes32 id) external view returns (Product memory) {
        return products[id];
    }
    
    function getOrder(bytes32 id) external view returns (Order memory) {
        return orders[id];
    }
    
    function getOrderItems(bytes32 orderId) external view returns (OrderItem[] memory) {
        return orderItems[orderId];
    }
    
    function getAllStores() external view returns (bytes32[] memory) {
        return allStores;
    }
    
    function getStoreProducts(bytes32 storeId) external view returns (bytes32[] memory) {
        return storeProducts[storeId];
    }
    
    function getCategoryProducts(ProductCategory cat) external view returns (bytes32[] memory) {
        return categoryProducts[cat];
    }
    
    function getBuyerOrders(address buyer) external view returns (bytes32[] memory) {
        return buyerOrders[buyer];
    }
    
    function getProductReviews(bytes32 productId) external view returns (bytes32[] memory) {
        return productReviews[productId];
    }
    
    function getStats() external view returns (
        uint256 ordersCount,
        uint256 volume,
        uint256 storesCount,
        uint256 productsCount
    ) {
        return (totalOrders, totalVolume, allStores.length, nextProductNonce - 1);
    }
    
    /* ==================== ADMIN ==================== */
    
    function setAltan(address _altan) external onlyOwner {
        altanToken = _altan;
    }
    
    function setPaymentGateway(address _gateway) external onlyOwner {
        paymentGateway = IAltanPaymentGateway(_gateway);
    }
    
    function setPlatformFee(uint256 fee) external onlyOwner {
        require(fee <= 1000, "Max 10%");
        platformFee = fee;
    }
    
    function verifyStore(bytes32 storeId) external onlyOwner {
        stores[storeId].isVerified = true;
    }
}
