// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title JobMarketplace (Биржа Труда и Товаров)
 * @notice Публичная площадка для:
 * 1. Поиска работы (вакансии)
 * 2. Размещения заказов (подряд)
 * 3. Торговли товарами
 * 4. Государственных закупок
 * 
 * Интеграция: UnifiedChancellery, Guilds, ALTAN PaymentGateway
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

contract JobMarketplace {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error ListingNotFound();
    error BidNotFound();
    error InvalidAmount();
    error AlreadyApplied();
    error DeadlinePassed();
    
    /* ==================== ENUMS ==================== */
    
    enum ListingType {
        JOB,            // Вакансия
        GIG,            // Разовая работа
        TENDER,         // Тендер (гос. закупка)
        PRODUCT,        // Товар
        SERVICE         // Услуга
    }
    
    enum ListingStatus {
        ACTIVE,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        EXPIRED
    }
    
    enum BidStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        WITHDRAWN
    }
    
    /* ==================== STRUCTS ==================== */
    
    struct Listing {
        bytes32 listingId;
        ListingType listingType;
        ListingStatus status;
        
        address poster;             // Кто разместил
        bytes32 guildId;            // Гильдия (0 = любая)
        
        string title;
        string description;
        bytes32 specHash;           // Хэш ТЗ/описания
        
        uint256 budget;             // Бюджет в ALTAN
        uint256 minBid;             // Минимальная ставка
        uint256 deadline;           // Срок подачи заявок
        uint256 executionDeadline;  // Срок исполнения
        
        uint256 createdAt;
        uint256 bidCount;
        bytes32 winningBidId;
        address winner;
    }
    
    struct Bid {
        bytes32 bidId;
        bytes32 listingId;
        address bidder;
        
        uint256 amount;             // Предложенная цена
        uint256 estimatedDays;      // Срок выполнения
        string proposal;            // Описание предложения
        bytes32 qualificationHash;  // Документы квалификации
        
        BidStatus status;
        uint256 createdAt;
    }
    
    struct Category {
        bytes32 categoryId;
        string name;
        string code;
        bytes32 parentId;
        uint256 listingCount;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public chancellery;
    address public altanToken;
    IAltanPaymentGateway public paymentGateway;
    
    // Payment tracking
    mapping(bytes32 => bytes32) public listingPayments;  // listingId => paymentId
    
    // Listings
    uint256 public nextListingNonce = 1;
    mapping(bytes32 => Listing) public listings;
    bytes32[] public activeListings;
    mapping(ListingType => bytes32[]) public listingsByType;
    mapping(address => bytes32[]) public userListings;
    
    // Bids
    uint256 public nextBidNonce = 1;
    mapping(bytes32 => Bid) public bids;
    mapping(bytes32 => bytes32[]) public listingBids;       // listingId => bidIds
    mapping(address => bytes32[]) public userBids;
    
    // Categories
    mapping(bytes32 => Category) public categories;
    bytes32[] public rootCategories;
    mapping(bytes32 => bytes32[]) public childCategories;
    mapping(bytes32 => bytes32) public listingCategory;     // listingId => categoryId
    
    // Statistics
    mapping(address => uint256) public userCompletedJobs;
    mapping(address => uint256) public userTotalEarned;
    mapping(address => uint256) public userRating;          // 0-500 (500 = 5 stars)
    
    uint256 public totalListings;
    uint256 public totalCompleted;
    uint256 public totalVolume;                             // Total ALTAN transacted
    
    /* ==================== EVENTS ==================== */
    
    event ListingCreated(
        bytes32 indexed listingId,
        ListingType listingType,
        address indexed poster,
        uint256 budget,
        uint256 deadline
    );
    
    event BidPlaced(
        bytes32 indexed bidId,
        bytes32 indexed listingId,
        address indexed bidder,
        uint256 amount
    );
    
    event BidAccepted(
        bytes32 indexed listingId,
        bytes32 indexed bidId,
        address indexed winner
    );
    
    event ListingCompleted(
        bytes32 indexed listingId,
        address indexed winner,
        uint256 amount
    );
    
    event RatingGiven(
        address indexed user,
        address indexed ratedBy,
        uint256 rating
    );
    
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
        _setupDefaultCategories();
    }
    
    function _setupDefaultCategories() internal {
        // Root categories
        _addCategory(bytes32(0), "Construction", "BUILD");
        _addCategory(bytes32(0), "IT & Software", "IT");
        _addCategory(bytes32(0), "Transport", "TRANS");
        _addCategory(bytes32(0), "Manufacturing", "MFG");
        _addCategory(bytes32(0), "Agriculture", "AGRO");
        _addCategory(bytes32(0), "Services", "SVC");
        _addCategory(bytes32(0), "Trade", "TRADE");
        _addCategory(bytes32(0), "Government", "GOV");
    }
    
    function _addCategory(
        bytes32 parentId, 
        string memory name, 
        string memory code
    ) internal returns (bytes32 categoryId) {
        categoryId = keccak256(abi.encodePacked(code, block.timestamp));
        
        categories[categoryId] = Category({
            categoryId: categoryId,
            name: name,
            code: code,
            parentId: parentId,
            listingCount: 0
        });
        
        if (parentId == bytes32(0)) {
            rootCategories.push(categoryId);
        } else {
            childCategories[parentId].push(categoryId);
        }
    }
    
    /* ==================== LISTINGS ==================== */
    
    /**
     * @notice Создать листинг (работа/товар/услуга)
     */
    function createListing(
        ListingType listingType,
        string calldata title,
        string calldata description,
        bytes32 specHash,
        uint256 budget,
        uint256 minBid,
        uint256 deadline,
        uint256 executionDeadline,
        bytes32 guildId,
        bytes32 categoryId
    ) external returns (bytes32 listingId) {
        listingId = keccak256(abi.encodePacked(
            nextListingNonce++, 
            msg.sender, 
            block.timestamp
        ));
        
        listings[listingId] = Listing({
            listingId: listingId,
            listingType: listingType,
            status: ListingStatus.ACTIVE,
            poster: msg.sender,
            guildId: guildId,
            title: title,
            description: description,
            specHash: specHash,
            budget: budget,
            minBid: minBid,
            deadline: deadline,
            executionDeadline: executionDeadline,
            createdAt: block.timestamp,
            bidCount: 0,
            winningBidId: bytes32(0),
            winner: address(0)
        });
        
        activeListings.push(listingId);
        listingsByType[listingType].push(listingId);
        userListings[msg.sender].push(listingId);
        
        if (categoryId != bytes32(0)) {
            listingCategory[listingId] = categoryId;
            categories[categoryId].listingCount++;
        }
        
        totalListings++;
        
        emit ListingCreated(listingId, listingType, msg.sender, budget, deadline);
    }
    
    /**
     * @notice Подать заявку (bid)
     */
    function placeBid(
        bytes32 listingId,
        uint256 amount,
        uint256 estimatedDays,
        string calldata proposal,
        bytes32 qualificationHash
    ) external listingExists(listingId) returns (bytes32 bidId) {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        require(block.timestamp < listing.deadline, "Deadline passed");
        require(amount >= listing.minBid, "Below min bid");
        
        // Check if already applied
        bytes32[] storage bidsForListing = listingBids[listingId];
        for (uint i = 0; i < bidsForListing.length; i++) {
            if (bids[bidsForListing[i]].bidder == msg.sender) {
                revert AlreadyApplied();
            }
        }
        
        bidId = keccak256(abi.encodePacked(
            nextBidNonce++, 
            listingId, 
            msg.sender
        ));
        
        bids[bidId] = Bid({
            bidId: bidId,
            listingId: listingId,
            bidder: msg.sender,
            amount: amount,
            estimatedDays: estimatedDays,
            proposal: proposal,
            qualificationHash: qualificationHash,
            status: BidStatus.PENDING,
            createdAt: block.timestamp
        });
        
        listingBids[listingId].push(bidId);
        userBids[msg.sender].push(bidId);
        listing.bidCount++;
        
        emit BidPlaced(bidId, listingId, msg.sender, amount);
    }
    
    /**
     * @notice Принять заявку (выбрать победителя) + escrow payment
     */
    function acceptBid(bytes32 listingId, bytes32 bidId) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        Bid storage bid = bids[bidId];
        
        require(listing.poster == msg.sender, "Not poster");
        require(bid.listingId == listingId, "Bid mismatch");
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        
        // Create escrow payment for the job
        IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
        splits[0] = IAltanPaymentGateway.PaymentSplit({
            recipient: bid.bidder,
            amount: bid.amount,
            percentage: 0,
            isPercentage: false
        });
        
        bytes32 paymentId = paymentGateway.createEscrowPayment(
            IAltanPaymentGateway.PaymentType.JOB_MILESTONE,
            msg.sender,
            splits,
            listingId
        );
        
        listingPayments[listingId] = paymentId;
        bid.status = BidStatus.ACCEPTED;
        listing.winningBidId = bidId;
        listing.winner = bid.bidder;
        listing.status = ListingStatus.IN_PROGRESS;
        
        // Reject other bids
        bytes32[] storage bidsForListing = listingBids[listingId];
        for (uint i = 0; i < bidsForListing.length; i++) {
            if (bidsForListing[i] != bidId) {
                bids[bidsForListing[i]].status = BidStatus.REJECTED;
            }
        }
        
        _removeFromActiveListings(listingId);
        
        emit BidAccepted(listingId, bidId, bid.bidder);
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
    
    /**
     * @notice Завершить работу → релиз платежа
     */
    function completeListing(bytes32 listingId) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        Bid storage winBid = bids[listing.winningBidId];
        
        require(listing.poster == msg.sender, "Not poster");
        require(listing.status == ListingStatus.IN_PROGRESS, "Not in progress");
        
        // Release payment to winner
        bytes32 paymentId = listingPayments[listingId];
        if (paymentId != bytes32(0)) {
            paymentGateway.releasePayment(paymentId);
        }
        
        listing.status = ListingStatus.COMPLETED;
        
        // Update stats
        userCompletedJobs[listing.winner]++;
        userTotalEarned[listing.winner] += winBid.amount;
        totalCompleted++;
        totalVolume += winBid.amount;
        
        emit ListingCompleted(listingId, listing.winner, winBid.amount);
    }
    
    /**
     * @notice Оценить исполнителя
     */
    function rateUser(address user, uint256 rating) external {
        require(rating <= 500, "Max 500 (5 stars)");
        
        // Simple average (in production: weighted)
        if (userRating[user] == 0) {
            userRating[user] = rating;
        } else {
            userRating[user] = (userRating[user] + rating) / 2;
        }
        
        emit RatingGiven(user, msg.sender, rating);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getListing(bytes32 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    function getBid(bytes32 bidId) external view returns (Bid memory) {
        return bids[bidId];
    }
    
    function getActiveListings() external view returns (bytes32[] memory) {
        return activeListings;
    }
    
    function getListingsByType(ListingType t) external view returns (bytes32[] memory) {
        return listingsByType[t];
    }
    
    function getListingBids(bytes32 listingId) external view returns (bytes32[] memory) {
        return listingBids[listingId];
    }
    
    function getUserStats(address user) external view returns (
        uint256 completed,
        uint256 earned,
        uint256 rating
    ) {
        return (
            userCompletedJobs[user],
            userTotalEarned[user],
            userRating[user]
        );
    }
    
    function getMarketStats() external view returns (
        uint256 total,
        uint256 completed,
        uint256 volume,
        uint256 active
    ) {
        return (
            totalListings,
            totalCompleted,
            totalVolume,
            activeListings.length
        );
    }
    
    function getRootCategories() external view returns (bytes32[] memory) {
        return rootCategories;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setChancellery(address _chancellery) external onlyOwner {
        chancellery = _chancellery;
    }
    
    function setAltan(address _altan) external onlyOwner {
        altanToken = _altan;
    }
    
    function setPaymentGateway(address _gateway) external onlyOwner {
        paymentGateway = IAltanPaymentGateway(_gateway);
    }
    
    function addCategory(
        bytes32 parentId,
        string calldata name,
        string calldata code
    ) external onlyOwner returns (bytes32) {
        return _addCategory(parentId, name, code);
    }
    
    function cancelListing(bytes32 listingId) 
        external listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        require(
            msg.sender == listing.poster || msg.sender == owner, 
            "Not authorized"
        );
        require(listing.status == ListingStatus.ACTIVE, "Not active");
        
        listing.status = ListingStatus.CANCELLED;
        _removeFromActiveListings(listingId);
    }
}
