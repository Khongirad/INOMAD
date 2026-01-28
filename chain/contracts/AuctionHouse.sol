// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AuctionHouse (Аукционный Дом)
 * @notice Система аукционов для товаров, имущества, гос. закупок
 * 
 * Типы аукционов:
 * 1. ENGLISH — английский (на повышение)
 * 2. DUTCH — голландский (на понижение)
 * 3. SEALED_BID — закрытые ставки
 * 4. VICKREY — второй цены
 * 5. GOVERNMENT — гос. закупки (тендер)
 * 
 * Интеграция: DPP, ALTAN via PaymentGateway, Chancellery
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

contract AuctionHouse {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error AuctionNotFound();
    error AuctionNotActive();
    error AuctionEnded();
    error BidTooLow();
    error AlreadyHighestBidder();
    error NoBidsPlaced();
    error NotWinner();
    error AlreadySettled();
    error TooEarly();
    
    /* ==================== ENUMS ==================== */
    
    enum AuctionType {
        ENGLISH,        // Английский (на повышение)
        DUTCH,          // Голландский (на понижение)
        SEALED_BID,     // Закрытые ставки
        VICKREY,        // Второй цены (закрытые)
        GOVERNMENT      // Гос. закупки (обратный)
    }
    
    enum AuctionStatus {
        SCHEDULED,      // Запланирован
        ACTIVE,         // Активен
        ENDED,          // Завершён
        SETTLED,        // Расчёт произведён
        CANCELLED       // Отменён
    }
    
    enum LotCategory {
        COMMODITY,      // Сырьё
        REAL_ESTATE,    // Недвижимость
        VEHICLE,        // Транспорт
        EQUIPMENT,      // Оборудование
        ART,            // Искусство
        SEIZED,         // Конфискат
        BANKRUPTCY,     // Банкротство
        GOVERNMENT      // Гос. имущество
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct Auction {
        bytes32 auctionId;
        AuctionType auctionType;
        AuctionStatus status;
        LotCategory category;
        
        address seller;
        bytes32 lotId;              // Лот товара
        bytes32 dppId;              // Цифровой паспорт
        
        string title;
        string description;
        bytes32 specsHash;          // Хэш ТЗ/описания
        
        uint256 startPrice;         // Начальная цена
        uint256 reservePrice;       // Резервная цена (минимум)
        uint256 stepPrice;          // Шаг ставки
        uint256 currentPrice;       // Текущая цена
        
        uint256 startTime;
        uint256 endTime;
        uint256 extensionTime;      // Продление при ставке
        
        address highestBidder;
        uint256 highestBid;
        uint256 bidCount;
        
        uint256 createdAt;
        uint256 settledAt;
    }
    
    struct Bid {
        bytes32 bidId;
        bytes32 auctionId;
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool isSealed;              // Для закрытых ставок
        bytes32 sealedHash;         // Хэш закрытой ставки
        bool isRevealed;
    }
    
    /// @notice Для голландского аукциона
    struct DutchParams {
        uint256 startPrice;
        uint256 endPrice;           // Минимальная цена
        uint256 duration;
        uint256 decrementInterval;  // Как часто снижается
        uint256 decrementAmount;    // На сколько снижается
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public altanToken;
    address public dpp;
    address public treasury;
    IAltanPaymentGateway public paymentGateway;
    
    uint256 public platformFee = 250;   // 2.5% (basis points)
    
    // Payment tracking
    mapping(bytes32 => bytes32) public auctionPayments;  // auctionId => paymentId
    
    // Auctions
    uint256 public nextAuctionNonce = 1;
    mapping(bytes32 => Auction) public auctions;
    bytes32[] public activeAuctions;
    bytes32[] public endedAuctions;
    mapping(address => bytes32[]) public sellerAuctions;
    mapping(LotCategory => bytes32[]) public auctionsByCategory;
    
    // Bids
    uint256 public nextBidNonce = 1;
    mapping(bytes32 => Bid) public bids;
    mapping(bytes32 => bytes32[]) public auctionBids;       // auctionId => bidIds
    mapping(address => bytes32[]) public userBids;
    
    // Dutch auction params
    mapping(bytes32 => DutchParams) public dutchParams;
    
    // Sealed bids (for reveal)
    mapping(bytes32 => mapping(address => bytes32)) public sealedBids;  // auctionId => bidder => sealedHash
    
    // Statistics
    uint256 public totalAuctions;
    uint256 public totalSettled;
    uint256 public totalVolume;
    
    // Authorized
    mapping(address => bool) public isAuctioneer;
    
    /* ==================== EVENTS ==================== */
    
    event AuctionCreated(
        bytes32 indexed auctionId,
        AuctionType auctionType,
        address indexed seller,
        uint256 startPrice,
        uint256 startTime,
        uint256 endTime
    );
    
    event AuctionStarted(bytes32 indexed auctionId);
    
    event BidPlaced(
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );
    
    event SealedBidSubmitted(
        bytes32 indexed auctionId,
        address indexed bidder,
        bytes32 sealedHash
    );
    
    event BidRevealed(
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEndedEvent(
        bytes32 indexed auctionId,
        address indexed winner,
        uint256 winningBid
    );
    
    event AuctionSettled(
        bytes32 indexed auctionId,
        address indexed winner,
        uint256 amount,
        uint256 fee
    );
    
    event AuctionExtended(
        bytes32 indexed auctionId,
        uint256 newEndTime
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier auctionExists(bytes32 auctionId) {
        if (auctions[auctionId].auctionId == bytes32(0)) revert AuctionNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        isAuctioneer[msg.sender] = true;
    }
    
    /* ==================== CREATE AUCTIONS ==================== */
    
    /**
     * @notice Создать английский аукцион (на повышение)
     */
    function createEnglishAuction(
        bytes32 lotId,
        bytes32 dppId,
        LotCategory category,
        string calldata title,
        string calldata description,
        bytes32 specsHash,
        uint256 startPrice,
        uint256 reservePrice,
        uint256 stepPrice,
        uint256 startTime,
        uint256 duration,
        uint256 extensionTime
    ) external returns (bytes32 auctionId) {
        auctionId = _createAuction(
            AuctionType.ENGLISH,
            lotId,
            dppId,
            category,
            title,
            description,
            specsHash,
            startPrice,
            reservePrice,
            stepPrice,
            startTime,
            startTime + duration,
            extensionTime
        );
    }
    
    /**
     * @notice Создать голландский аукцион (на понижение)
     */
    function createDutchAuction(
        bytes32 lotId,
        bytes32 dppId,
        LotCategory category,
        string calldata title,
        string calldata description,
        bytes32 specsHash,
        uint256 startPrice,
        uint256 endPrice,
        uint256 startTime,
        uint256 duration,
        uint256 decrementInterval,
        uint256 decrementAmount
    ) external returns (bytes32 auctionId) {
        auctionId = _createAuction(
            AuctionType.DUTCH,
            lotId,
            dppId,
            category,
            title,
            description,
            specsHash,
            startPrice,
            endPrice,
            0,
            startTime,
            startTime + duration,
            0
        );
        
        dutchParams[auctionId] = DutchParams({
            startPrice: startPrice,
            endPrice: endPrice,
            duration: duration,
            decrementInterval: decrementInterval,
            decrementAmount: decrementAmount
        });
    }
    
    /**
     * @notice Создать аукцион с закрытыми ставками
     */
    function createSealedBidAuction(
        bytes32 lotId,
        bytes32 dppId,
        LotCategory category,
        string calldata title,
        string calldata description,
        bytes32 specsHash,
        uint256 reservePrice,
        uint256 biddingEnd,
        uint256 revealEnd
    ) external returns (bytes32 auctionId) {
        auctionId = _createAuction(
            AuctionType.SEALED_BID,
            lotId,
            dppId,
            category,
            title,
            description,
            specsHash,
            0,
            reservePrice,
            0,
            block.timestamp,
            biddingEnd,
            revealEnd - biddingEnd  // extensionTime = reveal period
        );
    }
    
    /**
     * @notice Создать гос. аукцион (тендер, обратный)
     */
    function createGovernmentAuction(
        bytes32 lotId,
        LotCategory category,
        string calldata title,
        string calldata description,
        bytes32 specsHash,
        uint256 maxPrice,           // Максимальная цена контракта
        uint256 startTime,
        uint256 duration
    ) external returns (bytes32 auctionId) {
        auctionId = _createAuction(
            AuctionType.GOVERNMENT,
            lotId,
            bytes32(0),
            category,
            title,
            description,
            specsHash,
            maxPrice,
            0,
            0,
            startTime,
            startTime + duration,
            0
        );
    }
    
    function _createAuction(
        AuctionType auctionType,
        bytes32 lotId,
        bytes32 dppId,
        LotCategory category,
        string memory title,
        string memory description,
        bytes32 specsHash,
        uint256 startPrice,
        uint256 reservePrice,
        uint256 stepPrice,
        uint256 startTime,
        uint256 endTime,
        uint256 extensionTime
    ) internal returns (bytes32 auctionId) {
        auctionId = keccak256(abi.encodePacked(
            nextAuctionNonce++,
            msg.sender,
            block.timestamp
        ));
        
        AuctionStatus status = block.timestamp >= startTime 
            ? AuctionStatus.ACTIVE 
            : AuctionStatus.SCHEDULED;
        
        auctions[auctionId] = Auction({
            auctionId: auctionId,
            auctionType: auctionType,
            status: status,
            category: category,
            seller: msg.sender,
            lotId: lotId,
            dppId: dppId,
            title: title,
            description: description,
            specsHash: specsHash,
            startPrice: startPrice,
            reservePrice: reservePrice,
            stepPrice: stepPrice,
            currentPrice: startPrice,
            startTime: startTime,
            endTime: endTime,
            extensionTime: extensionTime,
            highestBidder: address(0),
            highestBid: 0,
            bidCount: 0,
            createdAt: block.timestamp,
            settledAt: 0
        });
        
        if (status == AuctionStatus.ACTIVE) {
            activeAuctions.push(auctionId);
        }
        
        sellerAuctions[msg.sender].push(auctionId);
        auctionsByCategory[category].push(auctionId);
        totalAuctions++;
        
        emit AuctionCreated(
            auctionId,
            auctionType,
            msg.sender,
            startPrice,
            startTime,
            endTime
        );
    }
    
    /* ==================== BIDDING ==================== */
    
    /**
     * @notice Сделать ставку (English auction)
     */
    function placeBid(bytes32 auctionId, uint256 amount) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.status == AuctionStatus.ACTIVE, "Not active");
        require(block.timestamp >= auction.startTime, "Not started");
        require(block.timestamp < auction.endTime, "Ended");
        require(auction.auctionType == AuctionType.ENGLISH, "Wrong type");
        
        uint256 minBid = auction.highestBid > 0 
            ? auction.highestBid + auction.stepPrice 
            : auction.startPrice;
        
        if (amount < minBid) revert BidTooLow();
        if (msg.sender == auction.highestBidder) revert AlreadyHighestBidder();
        
        // Create bid record
        bytes32 bidId = keccak256(abi.encodePacked(
            nextBidNonce++,
            auctionId,
            msg.sender,
            amount
        ));
        
        bids[bidId] = Bid({
            bidId: bidId,
            auctionId: auctionId,
            bidder: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            isSealed: false,
            sealedHash: bytes32(0),
            isRevealed: true
        });
        
        auctionBids[auctionId].push(bidId);
        userBids[msg.sender].push(bidId);
        
        // Update auction
        auction.highestBidder = msg.sender;
        auction.highestBid = amount;
        auction.currentPrice = amount;
        auction.bidCount++;
        
        // Extend if near end
        if (auction.extensionTime > 0 && 
            auction.endTime - block.timestamp < auction.extensionTime) {
            auction.endTime = block.timestamp + auction.extensionTime;
            emit AuctionExtended(auctionId, auction.endTime);
        }
        
        emit BidPlaced(auctionId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @notice Купить по текущей цене (Dutch auction)
     */
    function buyNow(bytes32 auctionId) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.status == AuctionStatus.ACTIVE, "Not active");
        require(auction.auctionType == AuctionType.DUTCH, "Wrong type");
        require(block.timestamp >= auction.startTime, "Not started");
        require(block.timestamp < auction.endTime, "Ended");
        
        uint256 currentPrice = getDutchPrice(auctionId);
        
        auction.highestBidder = msg.sender;
        auction.highestBid = currentPrice;
        auction.currentPrice = currentPrice;
        auction.bidCount = 1;
        
        _endAuction(auctionId);
        
        emit BidPlaced(auctionId, msg.sender, currentPrice, block.timestamp);
    }
    
    /**
     * @notice Отправить закрытую ставку
     */
    function submitSealedBid(bytes32 auctionId, bytes32 sealedHash) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.status == AuctionStatus.ACTIVE, "Not active");
        require(
            auction.auctionType == AuctionType.SEALED_BID ||
            auction.auctionType == AuctionType.VICKREY,
            "Wrong type"
        );
        require(block.timestamp < auction.endTime, "Bidding ended");
        
        sealedBids[auctionId][msg.sender] = sealedHash;
        auction.bidCount++;
        
        emit SealedBidSubmitted(auctionId, msg.sender, sealedHash);
    }
    
    /**
     * @notice Раскрыть закрытую ставку
     */
    function revealBid(
        bytes32 auctionId, 
        uint256 amount, 
        bytes32 secret
    ) external auctionExists(auctionId) {
        Auction storage auction = auctions[auctionId];
        
        require(block.timestamp >= auction.endTime, "Reveal not started");
        require(
            block.timestamp < auction.endTime + auction.extensionTime,
            "Reveal ended"
        );
        
        bytes32 expectedHash = keccak256(abi.encodePacked(amount, secret));
        require(sealedBids[auctionId][msg.sender] == expectedHash, "Invalid reveal");
        
        // Record revealed bid
        bytes32 bidId = keccak256(abi.encodePacked(
            nextBidNonce++,
            auctionId,
            msg.sender,
            amount
        ));
        
        bids[bidId] = Bid({
            bidId: bidId,
            auctionId: auctionId,
            bidder: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            isSealed: true,
            sealedHash: expectedHash,
            isRevealed: true
        });
        
        auctionBids[auctionId].push(bidId);
        userBids[msg.sender].push(bidId);
        
        // Check if highest
        if (amount > auction.highestBid && amount >= auction.reservePrice) {
            auction.highestBidder = msg.sender;
            auction.highestBid = amount;
            auction.currentPrice = amount;
        }
        
        emit BidRevealed(auctionId, msg.sender, amount);
    }
    
    /**
     * @notice Подать заявку на гос. тендер (обратный аукцион)
     */
    function submitTenderBid(bytes32 auctionId, uint256 price) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.status == AuctionStatus.ACTIVE, "Not active");
        require(auction.auctionType == AuctionType.GOVERNMENT, "Wrong type");
        require(block.timestamp < auction.endTime, "Ended");
        require(price <= auction.startPrice, "Above max price");
        
        // For government: lowest price wins
        if (auction.highestBid == 0 || price < auction.highestBid) {
            auction.highestBidder = msg.sender;
            auction.highestBid = price;
            auction.currentPrice = price;
        }
        
        auction.bidCount++;
        
        bytes32 bidId = keccak256(abi.encodePacked(
            nextBidNonce++,
            auctionId,
            msg.sender,
            price
        ));
        
        bids[bidId] = Bid({
            bidId: bidId,
            auctionId: auctionId,
            bidder: msg.sender,
            amount: price,
            timestamp: block.timestamp,
            isSealed: false,
            sealedHash: bytes32(0),
            isRevealed: true
        });
        
        auctionBids[auctionId].push(bidId);
        
        emit BidPlaced(auctionId, msg.sender, price, block.timestamp);
    }
    
    /* ==================== AUCTION END & SETTLEMENT ==================== */
    
    /**
     * @notice Завершить аукцион
     */
    function endAuction(bytes32 auctionId) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Not active");
        require(block.timestamp >= auction.endTime, "Not ended yet");
        
        _endAuction(auctionId);
    }
    
    function _endAuction(bytes32 auctionId) internal {
        Auction storage auction = auctions[auctionId];
        
        auction.status = AuctionStatus.ENDED;
        
        _removeFromActiveAuctions(auctionId);
        endedAuctions.push(auctionId);
        
        emit AuctionEndedEvent(auctionId, auction.highestBidder, auction.highestBid);
    }
    
    function _removeFromActiveAuctions(bytes32 auctionId) internal {
        for (uint i = 0; i < activeAuctions.length; i++) {
            if (activeAuctions[i] == auctionId) {
                activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                activeAuctions.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Произвести расчёт через PaymentGateway
     */
    function settleAuction(bytes32 auctionId) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.status == AuctionStatus.ENDED, "Not ended");
        require(auction.highestBidder != address(0), "No winner");
        require(
            msg.sender == auction.seller || 
            msg.sender == auction.highestBidder ||
            isAuctioneer[msg.sender],
            "Not authorized"
        );
        
        uint256 fee = (auction.highestBid * platformFee) / 10000;
        uint256 sellerAmount = auction.highestBid - fee;
        
        // Create payment from winner to seller
        IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
        splits[0] = IAltanPaymentGateway.PaymentSplit({
            recipient: auction.seller,
            amount: sellerAmount,
            percentage: 0,
            isPercentage: false
        });
        
        bytes32 paymentId = paymentGateway.createEscrowPayment(
            IAltanPaymentGateway.PaymentType.AUCTION_BID,
            auction.highestBidder,
            splits,
            auctionId
        );
        
        // Auto-release payment (auction ended, winner confirmed)
        paymentGateway.releasePayment(paymentId);
        
        auctionPayments[auctionId] = paymentId;
        auction.status = AuctionStatus.SETTLED;
        auction.settledAt = block.timestamp;
        
        totalSettled++;
        totalVolume += auction.highestBid;
        
        emit AuctionSettled(
            auctionId,
            auction.highestBidder,
            sellerAmount,
            fee
        );
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getDutchPrice(bytes32 auctionId) public view returns (uint256) {
        Auction storage auction = auctions[auctionId];
        DutchParams storage params = dutchParams[auctionId];
        
        if (block.timestamp < auction.startTime) {
            return params.startPrice;
        }
        
        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 decrements = elapsed / params.decrementInterval;
        uint256 decrease = decrements * params.decrementAmount;
        
        if (params.startPrice <= decrease + params.endPrice) {
            return params.endPrice;
        }
        
        return params.startPrice - decrease;
    }
    
    function getAuction(bytes32 id) external view returns (Auction memory) {
        return auctions[id];
    }
    
    function getBid(bytes32 id) external view returns (Bid memory) {
        return bids[id];
    }
    
    function getActiveAuctions() external view returns (bytes32[] memory) {
        return activeAuctions;
    }
    
    function getAuctionBids(bytes32 id) external view returns (bytes32[] memory) {
        return auctionBids[id];
    }
    
    function getAuctionsByCategory(LotCategory cat) 
        external view returns (bytes32[] memory) 
    {
        return auctionsByCategory[cat];
    }
    
    function getStats() external view returns (
        uint256 total,
        uint256 settled,
        uint256 volume,
        uint256 active
    ) {
        return (totalAuctions, totalSettled, totalVolume, activeAuctions.length);
    }
    
    /* ==================== ADMIN ==================== */
    
    function setAuctioneer(address a, bool auth) external onlyOwner {
        isAuctioneer[a] = auth;
    }
    
    function setPlatformFee(uint256 fee) external onlyOwner {
        require(fee <= 1000, "Max 10%");
        platformFee = fee;
    }
    
    function setAltan(address _altan) external onlyOwner {
        altanToken = _altan;
    }
    
    function setPaymentGateway(address _gateway) external onlyOwner {
        paymentGateway = IAltanPaymentGateway(_gateway);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    function cancelAuction(bytes32 auctionId) 
        external auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        require(
            msg.sender == auction.seller || msg.sender == owner,
            "Not authorized"
        );
        require(auction.bidCount == 0, "Has bids");
        
        auction.status = AuctionStatus.CANCELLED;
        _removeFromActiveAuctions(auctionId);
    }
}
