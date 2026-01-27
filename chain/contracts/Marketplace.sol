// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./EscrowBank.sol";
import "./CitizenDocument.sol";

/**
 * @title Marketplace
 * @notice Маркетплейс Сибирской Конфедерации
 *
 * Торговая площадка для:
 * - Товаров (физические, цифровые)
 * - Услуг (профессиональные, бытовые)
 * - Работ (фриланс, подряд)
 *
 * БЕЗ КОМИССИЙ МАРКЕТПЛЕЙСА!
 * Комиссия 0.03% уже встроена в каждую транзакцию ALTAN (Аксиома 10).
 * Продавцы платят 10% налог раз в год (Аксиома 11).
 *
 * Особенности:
 * - Верификация продавцов через CitizenDocument
 * - Рейтинговая система
 * - Категории и подкатегории
 * - Эскроу через EscrowBank
 * - Отзывы покупателей
 */
contract Marketplace is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Тип листинга
    enum ListingType {
        PHYSICAL_GOOD,      // Физический товар
        DIGITAL_GOOD,       // Цифровой товар
        SERVICE,            // Услуга
        WORK                // Работа/подряд
    }

    /// @notice Статус листинга
    enum ListingStatus {
        DRAFT,              // Черновик
        ACTIVE,             // Активен
        PAUSED,             // Приостановлен
        SOLD_OUT,           // Распродано
        ARCHIVED            // В архиве
    }

    /// @notice Статус заказа
    enum OrderStatus {
        CREATED,            // Создан
        PAID,               // Оплачен (эскроу)
        SHIPPED,            // Отправлен
        DELIVERED,          // Доставлен
        COMPLETED,          // Завершён
        CANCELLED,          // Отменён
        DISPUTED,           // Спор
        REFUNDED            // Возврат
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error InvalidInput();
    error ListingNotFound();
    error ListingNotActive();
    error OrderNotFound();
    error NotSeller();
    error NotBuyer();
    error InsufficientStock();
    error InsufficientFunds();
    error InvalidStatus();
    error AlreadyReviewed();
    error NotVerifiedSeller();
    error CategoryNotFound();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event CategoryCreated(uint256 indexed categoryId, string name);
    event ListingCreated(uint256 indexed listingId, address indexed seller, string title);
    event ListingUpdated(uint256 indexed listingId);
    event ListingStatusChanged(uint256 indexed listingId, ListingStatus status);

    event OrderCreated(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus status);
    event OrderShipped(uint256 indexed orderId, string trackingInfo);
    event OrderDelivered(uint256 indexed orderId);
    event OrderCompleted(uint256 indexed orderId);

    event ReviewSubmitted(uint256 indexed orderId, address indexed reviewer, uint8 rating);
    event SellerVerified(address indexed seller);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Категория товаров/услуг
    struct Category {
        uint256 id;
        string name;
        string nameLocal;       // На местном языке
        uint256 parentId;       // 0 = корневая категория
        bool active;
        bool exists;
    }

    /// @notice Листинг (объявление)
    struct Listing {
        uint256 id;
        address seller;
        uint256 categoryId;
        ListingType listingType;
        ListingStatus status;

        string title;
        string description;
        string[] images;        // IPFS хеши изображений
        bytes32 republicId;     // Республика продавца

        uint256 price;          // Цена в ALTAN
        uint256 stock;          // Количество (0 = неограничено для услуг)
        uint256 sold;           // Продано

        // Рейтинг
        uint256 totalRating;
        uint256 reviewCount;

        uint64 createdAt;
        uint64 updatedAt;

        bool exists;
    }

    /// @notice Заказ
    struct Order {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;

        uint256 quantity;
        uint256 totalPrice;
        uint256 escrowId;       // ID эскроу в банке

        OrderStatus status;
        string shippingAddress;
        string trackingInfo;

        uint64 createdAt;
        uint64 paidAt;
        uint64 shippedAt;
        uint64 deliveredAt;
        uint64 completedAt;

        bool reviewed;
        bool exists;
    }

    /// @notice Отзыв
    struct Review {
        uint256 orderId;
        address reviewer;
        uint8 rating;           // 1-5
        string comment;
        uint64 createdAt;
    }

    /// @notice Профиль продавца
    struct SellerProfile {
        address wallet;
        string storeName;
        string description;
        bytes32 republicId;
        uint256 totalSales;
        uint256 totalRevenue;
        uint256 totalRating;
        uint256 reviewCount;
        bool verified;          // Верифицирован через CitizenDocument
        uint64 registeredAt;
        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    IERC20 public immutable token;
    EscrowBank public immutable bank;
    CitizenDocument public immutable citizenDoc;

    // Категории
    uint256 public nextCategoryId;
    mapping(uint256 => Category) public categories;
    uint256[] public rootCategories;
    mapping(uint256 => uint256[]) public subcategories;

    // Листинги
    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256[]) public listingsBySeller;
    mapping(uint256 => uint256[]) public listingsByCategory;

    // Заказы
    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public ordersByBuyer;
    mapping(address => uint256[]) public ordersBySeller;
    mapping(uint256 => Review) public reviews;

    // Продавцы
    mapping(address => SellerProfile) public sellers;
    address[] public verifiedSellers;

    // Статистика
    uint256 public totalListings;
    uint256 public totalOrders;
    uint256 public totalVolume;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _token,
        address _bank,
        address _citizenDoc,
        address _khural
    ) {
        if (_token == address(0)) revert ZeroAddress();
        if (_bank == address(0)) revert ZeroAddress();
        if (_citizenDoc == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        token = IERC20(_token);
        bank = EscrowBank(_bank);
        citizenDoc = CitizenDocument(_citizenDoc);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(MODERATOR_ROLE, _khural);

        // Инициализируем базовые категории
        _initializeCategories();
    }

    /*//////////////////////////////////////////////////////////////
                        ИНИЦИАЛИЗАЦИЯ КАТЕГОРИЙ
    //////////////////////////////////////////////////////////////*/

    function _initializeCategories() internal {
        // Корневые категории
        _createCategoryInternal(unicode"Товары", unicode"Бараа", 0);
        _createCategoryInternal(unicode"Услуги", unicode"Үйлчилгээ", 0);
        _createCategoryInternal(unicode"Работа", unicode"Ажил", 0);
        _createCategoryInternal(unicode"Недвижимость", unicode"Үл хөдлөх хөрөнгө", 0);
    }

    function _createCategoryInternal(
        string memory name,
        string memory nameLocal,
        uint256 parentId
    ) internal returns (uint256 categoryId) {
        categoryId = ++nextCategoryId;

        categories[categoryId] = Category({
            id: categoryId,
            name: name,
            nameLocal: nameLocal,
            parentId: parentId,
            active: true,
            exists: true
        });

        if (parentId == 0) {
            rootCategories.push(categoryId);
        } else {
            subcategories[parentId].push(categoryId);
        }

        emit CategoryCreated(categoryId, name);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ КАТЕГОРИЯМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать категорию (модератор)
    function createCategory(
        string calldata name,
        string calldata nameLocal,
        uint256 parentId
    ) external onlyRole(MODERATOR_ROLE) returns (uint256) {
        if (bytes(name).length == 0) revert InvalidInput();
        if (parentId != 0 && !categories[parentId].exists) revert CategoryNotFound();

        return _createCategoryInternal(name, nameLocal, parentId);
    }

    /*//////////////////////////////////////////////////////////////
                        РЕГИСТРАЦИЯ ПРОДАВЦА
    //////////////////////////////////////////////////////////////*/

    /// @notice Зарегистрироваться как продавец
    function registerSeller(
        string calldata storeName,
        string calldata description
    ) external {
        if (bytes(storeName).length == 0) revert InvalidInput();

        // Проверяем наличие документа гражданина
        bool hasDoc = citizenDoc.hasActiveDocument(msg.sender);

        bytes32 republicId;
        if (hasDoc) {
            CitizenDocument.Document memory doc = citizenDoc.getDocumentByHolder(msg.sender);
            republicId = doc.republicId;
        }

        sellers[msg.sender] = SellerProfile({
            wallet: msg.sender,
            storeName: storeName,
            description: description,
            republicId: republicId,
            totalSales: 0,
            totalRevenue: 0,
            totalRating: 0,
            reviewCount: 0,
            verified: hasDoc,
            registeredAt: uint64(block.timestamp),
            exists: true
        });

        if (hasDoc) {
            verifiedSellers.push(msg.sender);
            emit SellerVerified(msg.sender);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        СОЗДАНИЕ ЛИСТИНГА
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать листинг
    function createListing(
        uint256 categoryId,
        ListingType listingType,
        string calldata title,
        string calldata description,
        string[] calldata images,
        uint256 price,
        uint256 stock
    ) external returns (uint256 listingId) {
        if (!sellers[msg.sender].exists) revert NotSeller();
        if (!categories[categoryId].exists) revert CategoryNotFound();
        if (bytes(title).length == 0) revert InvalidInput();
        if (price == 0) revert InvalidInput();

        listingId = ++nextListingId;

        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            categoryId: categoryId,
            listingType: listingType,
            status: ListingStatus.ACTIVE,
            title: title,
            description: description,
            images: images,
            republicId: sellers[msg.sender].republicId,
            price: price,
            stock: stock,
            sold: 0,
            totalRating: 0,
            reviewCount: 0,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            exists: true
        });

        listingsBySeller[msg.sender].push(listingId);
        listingsByCategory[categoryId].push(listingId);
        totalListings++;

        emit ListingCreated(listingId, msg.sender, title);
    }

    /// @notice Обновить листинг
    function updateListing(
        uint256 listingId,
        string calldata title,
        string calldata description,
        uint256 price,
        uint256 stock
    ) external {
        Listing storage l = listings[listingId];
        if (!l.exists) revert ListingNotFound();
        if (l.seller != msg.sender) revert NotSeller();

        if (bytes(title).length > 0) l.title = title;
        if (bytes(description).length > 0) l.description = description;
        if (price > 0) l.price = price;
        l.stock = stock;
        l.updatedAt = uint64(block.timestamp);

        emit ListingUpdated(listingId);
    }

    /// @notice Изменить статус листинга
    function setListingStatus(uint256 listingId, ListingStatus status) external {
        Listing storage l = listings[listingId];
        if (!l.exists) revert ListingNotFound();
        if (l.seller != msg.sender && !hasRole(MODERATOR_ROLE, msg.sender)) revert NotSeller();

        l.status = status;
        l.updatedAt = uint64(block.timestamp);

        emit ListingStatusChanged(listingId, status);
    }

    /*//////////////////////////////////////////////////////////////
                        СОЗДАНИЕ ЗАКАЗА
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать заказ (купить)
    function createOrder(
        uint256 listingId,
        uint256 quantity,
        string calldata shippingAddress
    ) external nonReentrant returns (uint256 orderId) {
        Listing storage l = listings[listingId];
        if (!l.exists) revert ListingNotFound();
        if (l.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (quantity == 0) revert InvalidInput();

        // Проверка наличия (для товаров)
        if (l.stock > 0 && l.stock < quantity) revert InsufficientStock();

        uint256 totalPrice = l.price * quantity;

        // Проверяем баланс покупателя
        if (token.balanceOf(msg.sender) < totalPrice) revert InsufficientFunds();

        orderId = ++nextOrderId;

        orders[orderId] = Order({
            id: orderId,
            listingId: listingId,
            buyer: msg.sender,
            seller: l.seller,
            quantity: quantity,
            totalPrice: totalPrice,
            escrowId: 0,
            status: OrderStatus.CREATED,
            shippingAddress: shippingAddress,
            trackingInfo: "",
            createdAt: uint64(block.timestamp),
            paidAt: 0,
            shippedAt: 0,
            deliveredAt: 0,
            completedAt: 0,
            reviewed: false,
            exists: true
        });

        ordersByBuyer[msg.sender].push(orderId);
        ordersBySeller[l.seller].push(orderId);
        totalOrders++;

        emit OrderCreated(orderId, listingId, msg.sender);
    }

    /// @notice Оплатить заказ (эскроу)
    /// @dev Комиссия 0.03% автоматически взимается в ALTAN при transferFrom
    function payOrder(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.buyer != msg.sender) revert NotBuyer();
        if (o.status != OrderStatus.CREATED) revert InvalidStatus();

        Listing storage l = listings[o.listingId];

        // Переводим ВСЮ сумму на эскроу банка (без дополнительной комиссии)
        // Комиссия 0.03% уже встроена в ALTAN transfer
        bool success = token.transferFrom(msg.sender, address(bank), o.totalPrice);
        if (!success) revert InsufficientFunds();

        // Открываем счёт в банке если нет
        bank.openAccount();

        // Создаём простой эскроу (один этап = 100%)
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;  // 100%

        string[] memory descriptions = new string[](1);
        descriptions[0] = l.title;

        // Продавец получает ВСЮ сумму (без комиссии маркетплейса)
        uint256 escrowId = bank.createEscrow(
            msg.sender,
            o.seller,
            o.totalPrice,
            l.title,
            percentages,
            descriptions
        );

        o.escrowId = escrowId;
        o.status = OrderStatus.PAID;
        o.paidAt = uint64(block.timestamp);

        // Уменьшаем stock
        if (l.stock > 0) {
            l.stock -= o.quantity;
            if (l.stock == 0) {
                l.status = ListingStatus.SOLD_OUT;
            }
        }
        l.sold += o.quantity;

        emit OrderStatusChanged(orderId, OrderStatus.PAID);
    }

    /*//////////////////////////////////////////////////////////////
                        ДОСТАВКА И ЗАВЕРШЕНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Отметить как отправленный (продавец)
    function shipOrder(uint256 orderId, string calldata trackingInfo) external {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.seller != msg.sender) revert NotSeller();
        if (o.status != OrderStatus.PAID) revert InvalidStatus();

        o.status = OrderStatus.SHIPPED;
        o.trackingInfo = trackingInfo;
        o.shippedAt = uint64(block.timestamp);

        emit OrderShipped(orderId, trackingInfo);
        emit OrderStatusChanged(orderId, OrderStatus.SHIPPED);
    }

    /// @notice Подтвердить получение (покупатель)
    function confirmDelivery(uint256 orderId) external {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.buyer != msg.sender) revert NotBuyer();
        if (o.status != OrderStatus.SHIPPED) revert InvalidStatus();

        o.status = OrderStatus.DELIVERED;
        o.deliveredAt = uint64(block.timestamp);

        emit OrderDelivered(orderId);
        emit OrderStatusChanged(orderId, OrderStatus.DELIVERED);
    }

    /// @notice Завершить заказ и выплатить продавцу
    function completeOrder(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.buyer != msg.sender) revert NotBuyer();
        if (o.status != OrderStatus.DELIVERED) revert InvalidStatus();

        // Выплачиваем из эскроу
        bank.releaseAll(o.escrowId);

        o.status = OrderStatus.COMPLETED;
        o.completedAt = uint64(block.timestamp);

        // Обновляем статистику продавца
        SellerProfile storage seller = sellers[o.seller];
        seller.totalSales++;
        seller.totalRevenue += o.totalPrice;

        totalVolume += o.totalPrice;

        emit OrderCompleted(orderId);
        emit OrderStatusChanged(orderId, OrderStatus.COMPLETED);
    }

    /*//////////////////////////////////////////////////////////////
                        ОТМЕНА И СПОРЫ
    //////////////////////////////////////////////////////////////*/

    /// @notice Отменить заказ (до отправки)
    function cancelOrder(uint256 orderId) external {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.buyer != msg.sender && o.seller != msg.sender) revert InvalidInput();

        // Можно отменить только до отправки
        if (o.status != OrderStatus.CREATED && o.status != OrderStatus.PAID) {
            revert InvalidStatus();
        }

        // Возврат из эскроу если оплачен
        if (o.status == OrderStatus.PAID && o.escrowId != 0) {
            bank.refundEscrow(o.escrowId);
        }

        o.status = OrderStatus.CANCELLED;

        // Возвращаем stock
        Listing storage l = listings[o.listingId];
        if (l.stock > 0 || l.status == ListingStatus.SOLD_OUT) {
            l.stock += o.quantity;
            if (l.status == ListingStatus.SOLD_OUT) {
                l.status = ListingStatus.ACTIVE;
            }
        }

        emit OrderStatusChanged(orderId, OrderStatus.CANCELLED);
    }

    /// @notice Открыть спор
    function openDispute(uint256 orderId, string calldata reason) external {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.buyer != msg.sender && o.seller != msg.sender) revert InvalidInput();
        if (o.status == OrderStatus.COMPLETED || o.status == OrderStatus.CANCELLED) {
            revert InvalidStatus();
        }

        o.status = OrderStatus.DISPUTED;

        if (o.escrowId != 0) {
            bank.openDispute(o.escrowId, reason);
        }

        emit OrderStatusChanged(orderId, OrderStatus.DISPUTED);
    }

    /*//////////////////////////////////////////////////////////////
                            ОТЗЫВЫ
    //////////////////////////////////////////////////////////////*/

    /// @notice Оставить отзыв
    function submitReview(
        uint256 orderId,
        uint8 rating,
        string calldata comment
    ) external {
        Order storage o = orders[orderId];
        if (!o.exists) revert OrderNotFound();
        if (o.buyer != msg.sender) revert NotBuyer();
        if (o.status != OrderStatus.COMPLETED) revert InvalidStatus();
        if (o.reviewed) revert AlreadyReviewed();
        if (rating < 1 || rating > 5) revert InvalidInput();

        reviews[orderId] = Review({
            orderId: orderId,
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            createdAt: uint64(block.timestamp)
        });

        o.reviewed = true;

        // Обновляем рейтинг листинга
        Listing storage l = listings[o.listingId];
        l.totalRating += rating;
        l.reviewCount++;

        // Обновляем рейтинг продавца
        SellerProfile storage seller = sellers[o.seller];
        seller.totalRating += rating;
        seller.reviewCount++;

        emit ReviewSubmitted(orderId, msg.sender, rating);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить листинг
    function getListing(uint256 listingId) external view returns (Listing memory) {
        if (!listings[listingId].exists) revert ListingNotFound();
        return listings[listingId];
    }

    /// @notice Получить заказ
    function getOrder(uint256 orderId) external view returns (Order memory) {
        if (!orders[orderId].exists) revert OrderNotFound();
        return orders[orderId];
    }

    /// @notice Получить профиль продавца
    function getSeller(address wallet) external view returns (SellerProfile memory) {
        return sellers[wallet];
    }

    /// @notice Получить рейтинг (средний)
    function getAverageRating(address seller) external view returns (uint256) {
        SellerProfile storage s = sellers[seller];
        if (s.reviewCount == 0) return 0;
        return (s.totalRating * 100) / s.reviewCount;  // x100 для точности
    }

    /// @notice Получить листинги категории
    function getListingsByCategory(uint256 categoryId) external view returns (uint256[] memory) {
        return listingsByCategory[categoryId];
    }

    /// @notice Получить листинги продавца
    function getListingsBySeller(address seller) external view returns (uint256[] memory) {
        return listingsBySeller[seller];
    }

    /// @notice Получить заказы покупателя
    function getOrdersByBuyer(address buyer) external view returns (uint256[] memory) {
        return ordersByBuyer[buyer];
    }

    /// @notice Получить корневые категории
    function getRootCategories() external view returns (uint256[] memory) {
        return rootCategories;
    }

    /// @notice Получить подкатегории
    function getSubcategories(uint256 parentId) external view returns (uint256[] memory) {
        return subcategories[parentId];
    }

    /// @notice Получить статистику
    function getStats() external view returns (
        uint256 _totalListings,
        uint256 _totalOrders,
        uint256 _totalVolume,
        uint256 _verifiedSellers
    ) {
        return (totalListings, totalOrders, totalVolume, verifiedSellers.length);
    }
}
