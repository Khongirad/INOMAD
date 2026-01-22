// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Altan.sol";

/**
 * @title Auction
 * @notice Аукционная система Сибирской Конфедерации
 *
 * БЕЗ КОМИССИЙ АУКЦИОНА!
 * Комиссия 0.03% уже встроена в каждую транзакцию ALTAN (Аксиома 10).
 * Продавцы платят 10% налог раз в год (Аксиома 11).
 *
 * Типы аукционов:
 * - English (Английский): повышающиеся ставки, побеждает максимальная
 * - Dutch (Голландский): понижающаяся цена, первый купивший побеждает
 * - Sealed (Закрытый): тайные ставки, побеждает максимальная
 *
 * Особенности:
 * - Минимальный шаг ставки
 * - Автопродление при ставке в последние минуты
 * - Резервная цена (минимум для продажи)
 * - Buyout цена (моментальная покупка)
 * - История ставок
 */
contract Auction is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant AUCTIONEER_ROLE = keccak256("AUCTIONEER_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Тип аукциона
    enum AuctionType {
        ENGLISH,        // Повышающиеся ставки
        DUTCH,          // Понижающаяся цена
        SEALED          // Закрытые ставки
    }

    /// @notice Статус аукциона
    enum AuctionStatus {
        CREATED,        // Создан
        ACTIVE,         // Активен
        ENDED,          // Завершён (ждёт финализации)
        FINALIZED,      // Финализирован (победитель определён)
        CANCELLED,      // Отменён
        NO_BIDS         // Завершён без ставок
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error InvalidInput();
    error AuctionNotFound();
    error AuctionNotActive();
    error AuctionEnded();
    error AuctionNotEnded();
    error BidTooLow();
    error NotSeller();
    error NotBidder();
    error AlreadyHighestBidder();
    error NoActiveBid();
    error TransferFailed();
    error BelowReserve();
    error AlreadyRevealed();
    error InvalidReveal();
    error CannotCancel();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        AuctionType auctionType,
        string title
    );
    event AuctionStarted(uint256 indexed auctionId, uint64 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionExtended(uint256 indexed auctionId, uint64 newEndTime);
    event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 winningBid);
    event AuctionCancelled(uint256 indexed auctionId);
    event BuyoutExecuted(uint256 indexed auctionId, address indexed buyer, uint256 price);
    event SealedBidRevealed(uint256 indexed auctionId, address indexed bidder, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Аукцион
    struct AuctionData {
        uint256 id;
        address seller;
        AuctionType auctionType;
        AuctionStatus status;

        // Информация о лоте
        string title;
        string description;
        string[] images;
        bytes32 itemHash;       // Хеш данных о предмете (для верификации)

        // Цены
        uint256 startingPrice;
        uint256 reservePrice;   // Минимум для продажи (0 = без резерва)
        uint256 buyoutPrice;    // Моментальная покупка (0 = без buyout)
        uint256 minBidIncrement;// Минимальный шаг

        // Для Dutch аукциона
        uint256 priceDecrement; // Шаг понижения цены
        uint256 decrementInterval; // Интервал понижения (секунды)

        // Текущее состояние
        uint256 currentPrice;
        address highestBidder;
        uint256 highestBid;
        uint256 totalBids;

        // Время
        uint64 createdAt;
        uint64 startTime;
        uint64 endTime;
        uint64 extensionTime;   // Автопродление при ставке (секунды)

        bool exists;
    }

    /// @notice Ставка
    struct Bid {
        address bidder;
        uint256 amount;
        uint64 timestamp;
        bool withdrawn;
    }

    /// @notice Закрытая ставка (для sealed аукциона)
    struct SealedBid {
        bytes32 commitHash;     // keccak256(amount, salt)
        uint256 deposit;        // Залог
        uint256 revealedAmount;
        bool revealed;
        bool refunded;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Минимальное время до окончания для продления
    uint256 public constant EXTENSION_THRESHOLD = 5 minutes;

    /// @notice Стандартное продление
    uint256 public constant DEFAULT_EXTENSION = 10 minutes;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    Altan public immutable altan;

    uint256 public nextAuctionId;

    mapping(uint256 => AuctionData) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(uint256 => mapping(address => uint256)) public bidderDeposits;  // auctionId => bidder => deposit
    mapping(uint256 => mapping(address => SealedBid)) public sealedBids;

    // По продавцу
    mapping(address => uint256[]) public auctionsBySeller;

    // Статистика
    uint256 public totalAuctions;
    uint256 public totalVolume;
    uint256 public activeAuctions;

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
        _grantRole(AUCTIONEER_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                        СОЗДАНИЕ АУКЦИОНА
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать аукцион
    function createAuction(
        AuctionType auctionType,
        string calldata title,
        string calldata description,
        string[] calldata images,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 buyoutPrice,
        uint256 minBidIncrement,
        uint64 duration,
        uint64 extensionTime
    ) external returns (uint256 auctionId) {
        if (bytes(title).length == 0) revert InvalidInput();
        if (startingPrice == 0) revert InvalidInput();
        if (duration == 0) revert InvalidInput();
        if (buyoutPrice != 0 && buyoutPrice <= startingPrice) revert InvalidInput();

        auctionId = ++nextAuctionId;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + duration;

        auctions[auctionId] = AuctionData({
            id: auctionId,
            seller: msg.sender,
            auctionType: auctionType,
            status: AuctionStatus.ACTIVE,
            title: title,
            description: description,
            images: images,
            itemHash: bytes32(0),
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            buyoutPrice: buyoutPrice,
            minBidIncrement: minBidIncrement > 0 ? minBidIncrement : startingPrice / 20,  // 5% по умолчанию
            priceDecrement: 0,
            decrementInterval: 0,
            currentPrice: startingPrice,
            highestBidder: address(0),
            highestBid: 0,
            totalBids: 0,
            createdAt: uint64(block.timestamp),
            startTime: startTime,
            endTime: endTime,
            extensionTime: extensionTime > 0 ? extensionTime : uint64(DEFAULT_EXTENSION),
            exists: true
        });

        auctionsBySeller[msg.sender].push(auctionId);
        totalAuctions++;
        activeAuctions++;

        emit AuctionCreated(auctionId, msg.sender, auctionType, title);
        emit AuctionStarted(auctionId, endTime);
    }

    /// @notice Создать Dutch аукцион
    function createDutchAuction(
        string calldata title,
        string calldata description,
        string[] calldata images,
        uint256 startingPrice,
        uint256 floorPrice,         // Минимальная цена
        uint256 priceDecrement,
        uint256 decrementInterval,
        uint64 duration
    ) external returns (uint256 auctionId) {
        if (bytes(title).length == 0) revert InvalidInput();
        if (startingPrice == 0) revert InvalidInput();
        if (floorPrice >= startingPrice) revert InvalidInput();
        if (priceDecrement == 0) revert InvalidInput();
        if (decrementInterval == 0) revert InvalidInput();

        auctionId = ++nextAuctionId;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + duration;

        auctions[auctionId] = AuctionData({
            id: auctionId,
            seller: msg.sender,
            auctionType: AuctionType.DUTCH,
            status: AuctionStatus.ACTIVE,
            title: title,
            description: description,
            images: images,
            itemHash: bytes32(0),
            startingPrice: startingPrice,
            reservePrice: floorPrice,
            buyoutPrice: 0,
            minBidIncrement: 0,
            priceDecrement: priceDecrement,
            decrementInterval: decrementInterval,
            currentPrice: startingPrice,
            highestBidder: address(0),
            highestBid: 0,
            totalBids: 0,
            createdAt: uint64(block.timestamp),
            startTime: startTime,
            endTime: endTime,
            extensionTime: 0,
            exists: true
        });

        auctionsBySeller[msg.sender].push(auctionId);
        totalAuctions++;
        activeAuctions++;

        emit AuctionCreated(auctionId, msg.sender, AuctionType.DUTCH, title);
        emit AuctionStarted(auctionId, endTime);
    }

    /*//////////////////////////////////////////////////////////////
                        СТАВКИ (ENGLISH)
    //////////////////////////////////////////////////////////////*/

    /// @notice Сделать ставку (English аукцион)
    /// @dev Комиссия 0.03% автоматически взимается в ALTAN при transfer
    function placeBid(uint256 auctionId, uint256 amount) external nonReentrant {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (block.timestamp >= a.endTime) revert AuctionEnded();
        if (a.auctionType != AuctionType.ENGLISH) revert InvalidInput();
        if (msg.sender == a.seller) revert InvalidInput();

        uint256 minBid = a.highestBid == 0
            ? a.startingPrice
            : a.highestBid + a.minBidIncrement;

        if (amount < minBid) revert BidTooLow();
        if (msg.sender == a.highestBidder) revert AlreadyHighestBidder();

        // Переводим средства (комиссия 0.03% встроена в ALTAN)
        bool success = altan.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        // Возвращаем предыдущему лидеру
        if (a.highestBidder != address(0)) {
            altan.transfer(a.highestBidder, a.highestBid);
        }

        // Обновляем данные
        a.highestBidder = msg.sender;
        a.highestBid = amount;
        a.currentPrice = amount;
        a.totalBids++;

        // Записываем ставку
        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            amount: amount,
            timestamp: uint64(block.timestamp),
            withdrawn: false
        }));

        // Автопродление
        if (a.endTime - block.timestamp < EXTENSION_THRESHOLD) {
            a.endTime = uint64(block.timestamp) + a.extensionTime;
            emit AuctionExtended(auctionId, a.endTime);
        }

        emit BidPlaced(auctionId, msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        ПОКУПКА (DUTCH)
    //////////////////////////////////////////////////////////////*/

    /// @notice Купить по текущей цене (Dutch аукцион)
    function buyNow(uint256 auctionId) external nonReentrant {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (block.timestamp >= a.endTime) revert AuctionEnded();
        if (a.auctionType != AuctionType.DUTCH) revert InvalidInput();
        if (msg.sender == a.seller) revert InvalidInput();

        uint256 currentPrice = getCurrentDutchPrice(auctionId);

        // Переводим средства (комиссия 0.03% встроена в ALTAN)
        bool success = altan.transferFrom(msg.sender, address(this), currentPrice);
        if (!success) revert TransferFailed();

        a.highestBidder = msg.sender;
        a.highestBid = currentPrice;
        a.currentPrice = currentPrice;
        a.status = AuctionStatus.ENDED;
        activeAuctions--;

        emit BidPlaced(auctionId, msg.sender, currentPrice);
        emit AuctionFinalized(auctionId, msg.sender, currentPrice);
    }

    /// @notice Получить текущую цену Dutch аукциона
    function getCurrentDutchPrice(uint256 auctionId) public view returns (uint256) {
        AuctionData storage a = auctions[auctionId];
        if (a.auctionType != AuctionType.DUTCH) return a.currentPrice;

        uint256 elapsed = block.timestamp - a.startTime;
        uint256 decrements = elapsed / a.decrementInterval;
        uint256 totalDecrement = decrements * a.priceDecrement;

        if (a.startingPrice <= totalDecrement + a.reservePrice) {
            return a.reservePrice;
        }

        return a.startingPrice - totalDecrement;
    }

    /*//////////////////////////////////////////////////////////////
                        ЗАКРЫТЫЕ СТАВКИ (SEALED)
    //////////////////////////////////////////////////////////////*/

    /// @notice Сделать закрытую ставку
    function placeSealedBid(
        uint256 auctionId,
        bytes32 commitHash,
        uint256 deposit
    ) external nonReentrant {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (a.auctionType != AuctionType.SEALED) revert InvalidInput();
        if (msg.sender == a.seller) revert InvalidInput();
        if (deposit < a.startingPrice) revert BidTooLow();

        // Переводим залог (комиссия 0.03% встроена в ALTAN)
        bool success = altan.transferFrom(msg.sender, address(this), deposit);
        if (!success) revert TransferFailed();

        sealedBids[auctionId][msg.sender] = SealedBid({
            commitHash: commitHash,
            deposit: deposit,
            revealedAmount: 0,
            revealed: false,
            refunded: false
        });

        a.totalBids++;

        emit BidPlaced(auctionId, msg.sender, deposit);
    }

    /// @notice Раскрыть закрытую ставку
    function revealSealedBid(
        uint256 auctionId,
        uint256 amount,
        bytes32 salt
    ) external {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ENDED) revert AuctionNotEnded();
        if (a.auctionType != AuctionType.SEALED) revert InvalidInput();

        SealedBid storage sb = sealedBids[auctionId][msg.sender];
        if (sb.revealed) revert AlreadyRevealed();
        if (sb.deposit == 0) revert NoActiveBid();

        // Проверяем хеш
        bytes32 computedHash = keccak256(abi.encodePacked(amount, salt));
        if (computedHash != sb.commitHash) revert InvalidReveal();
        if (amount > sb.deposit) revert InvalidReveal();

        sb.revealed = true;
        sb.revealedAmount = amount;

        // Обновляем лидера если нужно
        if (amount > a.highestBid) {
            a.highestBidder = msg.sender;
            a.highestBid = amount;
        }

        emit SealedBidRevealed(auctionId, msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        BUYOUT (МОМЕНТАЛЬНАЯ ПОКУПКА)
    //////////////////////////////////////////////////////////////*/

    /// @notice Моментальная покупка по buyout цене
    function executeBuyout(uint256 auctionId) external nonReentrant {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (a.buyoutPrice == 0) revert InvalidInput();
        if (msg.sender == a.seller) revert InvalidInput();

        // Переводим buyout цену (комиссия 0.03% встроена в ALTAN)
        bool success = altan.transferFrom(msg.sender, address(this), a.buyoutPrice);
        if (!success) revert TransferFailed();

        // Возвращаем предыдущему лидеру
        if (a.highestBidder != address(0) && a.highestBid > 0) {
            altan.transfer(a.highestBidder, a.highestBid);
        }

        a.highestBidder = msg.sender;
        a.highestBid = a.buyoutPrice;
        a.currentPrice = a.buyoutPrice;
        a.status = AuctionStatus.ENDED;
        activeAuctions--;

        emit BuyoutExecuted(auctionId, msg.sender, a.buyoutPrice);
        emit AuctionFinalized(auctionId, msg.sender, a.buyoutPrice);
    }

    /*//////////////////////////////////////////////////////////////
                        ЗАВЕРШЕНИЕ АУКЦИОНА
    //////////////////////////////////////////////////////////////*/

    /// @notice Завершить аукцион (может вызвать любой после endTime)
    function endAuction(uint256 auctionId) external {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (block.timestamp < a.endTime) revert InvalidInput();

        if (a.highestBidder == address(0)) {
            a.status = AuctionStatus.NO_BIDS;
        } else {
            a.status = AuctionStatus.ENDED;
        }

        activeAuctions--;
    }

    /// @notice Финализировать аукцион и распределить средства
    /// @dev Продавец получает ВСЮ сумму без дополнительной комиссии
    function finalizeAuction(uint256 auctionId) external nonReentrant {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.status != AuctionStatus.ENDED) revert AuctionNotEnded();

        // Проверяем резервную цену
        if (a.reservePrice > 0 && a.highestBid < a.reservePrice) {
            // Не достигнута резервная цена — возврат
            altan.transfer(a.highestBidder, a.highestBid);
            a.status = AuctionStatus.NO_BIDS;
            emit AuctionCancelled(auctionId);
            return;
        }

        // Выплачиваем продавцу ВСЮ сумму (без комиссии аукциона)
        // Комиссия 0.03% уже была взята при каждом transfer в ALTAN
        altan.transfer(a.seller, a.highestBid);

        a.status = AuctionStatus.FINALIZED;
        totalVolume += a.highestBid;

        emit AuctionFinalized(auctionId, a.highestBidder, a.highestBid);
    }

    /*//////////////////////////////////////////////////////////////
                            ОТМЕНА
    //////////////////////////////////////////////////////////////*/

    /// @notice Отменить аукцион (только до первой ставки)
    function cancelAuction(uint256 auctionId) external {
        AuctionData storage a = auctions[auctionId];
        if (!a.exists) revert AuctionNotFound();
        if (a.seller != msg.sender && !hasRole(AUCTIONEER_ROLE, msg.sender)) revert NotSeller();
        if (a.status != AuctionStatus.ACTIVE) revert InvalidInput();
        if (a.highestBidder != address(0)) revert CannotCancel();

        a.status = AuctionStatus.CANCELLED;
        activeAuctions--;

        emit AuctionCancelled(auctionId);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить аукцион
    function getAuction(uint256 auctionId) external view returns (AuctionData memory) {
        if (!auctions[auctionId].exists) revert AuctionNotFound();
        return auctions[auctionId];
    }

    /// @notice Получить историю ставок
    function getBids(uint256 auctionId) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }

    /// @notice Получить аукционы продавца
    function getAuctionsBySeller(address seller) external view returns (uint256[] memory) {
        return auctionsBySeller[seller];
    }

    /// @notice Проверить, активен ли аукцион
    function isActive(uint256 auctionId) external view returns (bool) {
        AuctionData storage a = auctions[auctionId];
        return a.exists && a.status == AuctionStatus.ACTIVE && block.timestamp < a.endTime;
    }

    /// @notice Получить статистику
    function getStats() external view returns (
        uint256 _totalAuctions,
        uint256 _activeAuctions,
        uint256 _totalVolume
    ) {
        return (totalAuctions, activeAuctions, totalVolume);
    }
}
