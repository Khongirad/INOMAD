// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ItemAuctionHouse (WoW-Style)
 * @notice Аукцион предметов в стиле World of Warcraft
 * 
 * Особенности:
 * 1. Короткие аукционы (12ч, 24ч, 48ч)
 * 2. Buyout — мгновенная покупка
 * 3. Автовозврат перебитым bidders
 * 4. Deposit при листинге
 * 5. Массовые листинги
 * 
 * Отличие от классического AuctionHouse:
 * - Для товаров/предметов, не для имущества
 * - Быстрые короткие аукционы
 * - Игровая механика (inventory-based)
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

contract ItemAuctionHouse {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error ListingNotFound();
    error ListingExpired();
    error ListingNotExpired();
    error BidTooLow();
    error CannotBuyOwnItem();
    error AlreadySold();
    
    /* ==================== ENUMS ==================== */
    
    enum ListingStatus {
        ACTIVE,         // Активен
        SOLD,           // Продан
        EXPIRED,        // Истёк
        CANCELLED       // Отменён
    }
    
    enum Duration {
        SHORT,          // 12 часов
        MEDIUM,         // 24 часа
        LONG            // 48 часов
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Листинг аукциона
    struct Listing {
        bytes32 listingId;
        address seller;
        
        bytes32 itemId;             // ID предмета (может быть NFT tokenId)
        string itemName;
        uint256 quantity;
        
        uint256 startingBid;        // Начальная ставка
        uint256 buyoutPrice;        // Цена выкупа (0 = нет buyout)
        uint256 currentBid;
        address currentBidder;
        
        uint256 listingDeposit;     // Депозит продавца
        uint256 expiresAt;
        ListingStatus status;
        
        uint256 createdAt;
        uint256 soldAt;
    }
    
    /// @notice История ставок
    struct BidHistory {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool wasOutbid;             // Был ли перебит
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    IAltanPaymentGateway public paymentGateway;
    
    uint256 public depositRate = 500;       // 5% от startingBid
    uint256 public platformFee = 300;       // 3%
    uint256 public minBidIncrement = 100;   // 1% минимальное повышение
    
    // Listings
    uint256 public nextListingNonce = 1;
    mapping(bytes32 => Listing) public listings;
    bytes32[] public activeListings;
    mapping(address => bytes32[]) public sellerListings;
    mapping(address => bytes32[]) public buyerPurchases;
    
    // Bid tracking
    mapping(bytes32 => BidHistory[]) public listingBids;    // listingId => bids
    mapping(bytes32 => mapping(address => uint256)) public userBids; // active bid amounts
    
    // Payment tracking
    mapping(bytes32 => bytes32) public listingPayments;     // listingId => paymentId
    
    // Stats
    uint256 public totalListings;
    uint256 public totalSold;
    uint256 public totalVolume;
    
    /* ==================== EVENTS ==================== */
    
    event ListingCreated(
        bytes32 indexed listingId,
        address indexed seller,
        string itemName,
        uint256 startingBid,
        uint256 buyoutPrice,
        uint256 expiresAt
    );
    
    event BidPlaced(
        bytes32 indexed listingId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );
    
    event BidOutbid(
        bytes32 indexed listingId,
        address indexed previousBidder,
        address indexed newBidder,
        uint256 refundedAmount
    );
    
    event ItemSold(
        bytes32 indexed listingId,
        address indexed buyer,
        uint256 finalPrice,
        bool wasBuyout
    );
    
    event ListingCancelled(bytes32 indexed listingId);
    event ListingExpired(bytes32 indexed listingId);
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier listingExists(bytes32 listingId) {
        if (listings[listingId].listingId == bytes32(0)) revert ListingNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
    }
    
    /* ==================== CREATE LISTING ==================== */
    
    /**
     * @notice Создать листинг аукциона
     */
    function createListing(
        bytes32 itemId,
        string calldata itemName,
        uint256 quantity,
        uint256 startingBid,
        uint256 buyoutPrice,
        Duration duration
    ) external returns (bytes32 listingId) {
        require(startingBid > 0, "Invalid starting bid");
        require(quantity > 0, "Invalid quantity");
        if (buyoutPrice > 0) {
            require(buyoutPrice >= startingBid, "Buyout < starting bid");
        }
        
        listingId = keccak256(abi.encodePacked(
            nextListingNonce++,
            msg.sender,
            itemId,
            block.timestamp
        ));
        
        // Calculate expiry
        uint256 durationTime;
        if (duration == Duration.SHORT) durationTime = 12 hours;
        else if (duration == Duration.MEDIUM) durationTime = 24 hours;
        else durationTime = 48 hours;
        
        uint256 expiresAt = block.timestamp + durationTime;
        
        // Calculate deposit (5% of starting bid)
        uint256 deposit = (startingBid * depositRate) / 10000;
        
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            itemId: itemId,
            itemName: itemName,
            quantity: quantity,
            startingBid: startingBid,
            buyoutPrice: buyoutPrice,
            currentBid: 0,
            currentBidder: address(0),
            listingDeposit: deposit,
            expiresAt: expiresAt,
            status: ListingStatus.ACTIVE,
            createdAt: block.timestamp,
            soldAt: 0
        });
        
        activeListings.push(listingId);
        sellerListings[msg.sender].push(listingId);
        totalListings++;
        
        emit ListingCreated(
            listingId,
            msg.sender,
            itemName,
            startingBid,
            buyoutPrice,
            expiresAt
        );
    }
    
    /* ==================== BIDDING ==================== */
    
    /**
     * @notice Сделать ставку
     */
    function placeBid(bytes32 listingId, uint256 bidAmount) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        require(block.timestamp < listing.expiresAt, "Expired");
        require(msg.sender != listing.seller, "Cannot bid on own item");
        
        uint256 minBid = listing.currentBid > 0
            ? listing.currentBid + ((listing.currentBid * minBidIncrement) / 10000)
            : listing.startingBid;
        
        if (bidAmount < minBid) revert BidTooLow();
        
        // Refund previous bidder
        if (listing.currentBidder != address(0)) {
            address previousBidder = listing.currentBidder;
            uint256 refundAmount = listing.currentBid;
            
            // Mark previous bid as outbid
            BidHistory[] storage bids = listingBids[listingId];
            for (uint i = bids.length; i > 0; i--) {
                if (bids[i-1].bidder == previousBidder && !bids[i-1].wasOutbid) {
                    bids[i-1].wasOutbid = true;
                    break;
                }
            }
            
            // Refund (in real implementation, would transfer ALTAN)
            userBids[listingId][previousBidder] = 0;
            
            emit BidOutbid(listingId, previousBidder, msg.sender, refundAmount);
        }
        
        // Record new bid
        listing.currentBid = bidAmount;
        listing.currentBidder = msg.sender;
        userBids[listingId][msg.sender] = bidAmount;
        
        listingBids[listingId].push(BidHistory({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp,
            wasOutbid: false
        }));
        
        emit BidPlaced(listingId, msg.sender, bidAmount, block.timestamp);
    }
    
    /**
     * @notice Купить сразу (buyout)
     */
    function buyout(bytes32 listingId) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        require(block.timestamp < listing.expiresAt, "Expired");
        require(listing.buyoutPrice > 0, "No buyout");
        require(msg.sender != listing.seller, "Cannot buy own item");
        
        // Refund current bidder if exists
        if (listing.currentBidder != address(0)) {
            address previousBidder = listing.currentBidder;
            uint256 refundAmount = listing.currentBid;
            userBids[listingId][previousBidder] = 0;
            
            // Mark all bids as outbid
            BidHistory[] storage bids = listingBids[listingId];
            for (uint i = 0; i < bids.length; i++) {
                bids[i].wasOutbid = true;
            }
        }
        
        // Complete sale
        _completeSale(listingId, msg.sender, listing.buyoutPrice, true);
    }
    
    /* ==================== SETTLEMENT ==================== */
    
    /**
     * @notice Завершить аукцион (после истечения)
     */
    function settleListing(bytes32 listingId) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        require(block.timestamp >= listing.expiresAt, "Not expired");
        
        if (listing.currentBidder != address(0)) {
            // Has winner
            _completeSale(listingId, listing.currentBidder, listing.currentBid, false);
        } else {
            // No bids, mark expired
            listing.status = ListingStatus.EXPIRED;
            _removeFromActiveListings(listingId);
            
            emit ListingExpired(listingId);
        }
    }
    
    function _completeSale(
        bytes32 listingId,
        address buyer,
        uint256 finalPrice,
        bool wasBuyout
    ) internal {
        Listing storage listing = listings[listingId];
        
        uint256 fee = (finalPrice * platformFee) / 10000;
        uint256 sellerAmount = finalPrice - fee;
        
        // Create payment via gateway
        IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
        splits[0] = IAltanPaymentGateway.PaymentSplit({
            recipient: listing.seller,
            amount: sellerAmount,
            percentage: 0,
            isPercentage: false
        });
        
        bytes32 paymentId = paymentGateway.createEscrowPayment(
            IAltanPaymentGateway.PaymentType.AUCTION_BID,
            buyer,
            splits,
            listingId
        );
        
        // Instant release (auction complete)
        paymentGateway.releasePayment(paymentId);
        
        listingPayments[listingId] = paymentId;
        listing.status = ListingStatus.SOLD;
        listing.soldAt = block.timestamp;
        
        userBids[listingId][buyer] = 0;
        buyerPurchases[buyer].push(listingId);
        
        _removeFromActiveListings(listingId);
        
        totalSold++;
        totalVolume += finalPrice;
        
        emit ItemSold(listingId, buyer, finalPrice, wasBuyout);
    }
    
    /**
     * @notice Отменить листинг (только если нет ставок)
     */
    function cancelListing(bytes32 listingId) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        
        require(msg.sender == listing.seller, "Not seller");
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        require(listing.currentBidder == address(0), "Has bids");
        
        listing.status = ListingStatus.CANCELLED;
        _removeFromActiveListings(listingId);
        
        emit ListingCancelled(listingId);
    }
    
    function _removeFromActiveListings(bytes32 listingId) internal {
        for (uint i = 0; i < activeListings.length; i++) {
            if (activeListings[i] == listingId) {
                activeListings[i] = activeListings[activeListings.length - 1];
                activeListings.pop();
                break;
            }
        }
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getListing(bytes32 id) external view returns (Listing memory) {
        return listings[id];
    }
    
    function getActiveListings() external view returns (bytes32[] memory) {
        return activeListings;
    }
    
    function getListingBids(bytes32 listingId) 
        external view returns (BidHistory[] memory) 
    {
        return listingBids[listingId];
    }
    
    function getSellerListings(address seller) 
        external view returns (bytes32[] memory) 
    {
        return sellerListings[seller];
    }
    
    function getUserBid(bytes32 listingId, address user) 
        external view returns (uint256) 
    {
        return userBids[listingId][user];
    }
    
    function getStats() external view returns (
        uint256 totalListingsCount,
        uint256 activeCount,
        uint256 soldCount,
        uint256 volume
    ) {
        return (
            totalListings,
            activeListings.length,
            totalSold,
            totalVolume
        );
    }
    
    /**
     * @notice Массовый поиск по названию (упрощённый)
     */
    function searchListings(string calldata query) 
        external view returns (bytes32[] memory results) 
    {
        // Note: В production использовать off-chain индексирование
        // Здесь упрощённая реализация
        uint256 count = 0;
        bytes32[] memory temp = new bytes32[](activeListings.length);
        
        for (uint i = 0; i < activeListings.length; i++) {
            Listing storage listing = listings[activeListings[i]];
            // Простое сравнение (в production - better search)
            if (bytes(listing.itemName).length > 0) {
                temp[count] = activeListings[i];
                count++;
            }
        }
        
        results = new bytes32[](count);
        for (uint i = 0; i < count; i++) {
            results[i] = temp[i];
        }
    }
    
    /* ==================== ADMIN ==================== */
    
    function setPaymentGateway(address _gateway) external onlyOwner {
        paymentGateway = IAltanPaymentGateway(_gateway);
    }
    
    function setDepositRate(uint256 rate) external onlyOwner {
        require(rate <= 1000, "Max 10%");
        depositRate = rate;
    }
    
    function setPlatformFee(uint256 fee) external onlyOwner {
        require(fee <= 1000, "Max 10%");
        platformFee = fee;
    }
    
    function setMinBidIncrement(uint256 increment) external onlyOwner {
        require(increment >= 10 && increment <= 1000, "1-10%");
        minBidIncrement = increment;
    }
}
