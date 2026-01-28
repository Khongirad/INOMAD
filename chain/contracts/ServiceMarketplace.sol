// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ServiceMarketplace (Рынок Услуг)
 * @notice Платформа для услуг, ресторанов, билетов
 * 
 * Функции:
 * 1. Рестораны — бронирование столиков
 * 2. Музеи — покупка билетов
 * 3. Мероприятия — концерты, спектакли
 * 4. Услуги — парикмахеры, мастера
 * 5. Отзывы и рейтинги
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
}

contract ServiceMarketplace {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error VenueNotFound();
    error EventNotFound();
    error TicketNotFound();
    error BookingNotFound();
    error SoldOut();
    error InvalidTime();
    error AlreadyUsed();
    
    /* ==================== ENUMS ==================== */
    
    enum VenueType {
        RESTAURANT,     // Ресторан
        CAFE,           // Кафе
        MUSEUM,         // Музей
        THEATER,        // Театр
        CINEMA,         // Кинотеатр
        CONCERT_HALL,   // Концертный зал
        STADIUM,        // Стадион
        SPA,            // СПА
        SALON,          // Салон красоты
        GYM,            // Фитнес
        OTHER
    }
    
    enum EventType {
        EXHIBITION,     // Выставка
        CONCERT,        // Концерт
        THEATER_PLAY,   // Спектакль
        MOVIE,          // Фильм
        SPORT,          // Спорт
        FESTIVAL,       // Фестиваль
        WORKSHOP,       // Мастер-класс
        TOUR,           // Экскурсия
        OTHER
    }
    
    enum BookingStatus {
        PENDING,
        CONFIRMED,
        COMPLETED,
        CANCELLED,
        NO_SHOW
    }
    
    enum TicketStatus {
        VALID,
        USED,
        EXPIRED,
        REFUNDED
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Заведение
    struct Venue {
        bytes32 venueId;
        VenueType venueType;
        address owner;
        
        string name;
        string description;
        string location;            // Адрес
        bytes32 locationHash;       // Координаты
        
        uint256 capacity;           // Вместимость
        uint256 avgPrice;           // Средний чек
        uint256 rating;             // 0-500 (5 звёзд)
        uint256 reviewCount;
        
        bool isActive;
        uint256 createdAt;
    }
    
    /// @notice Мероприятие
    struct Event {
        bytes32 eventId;
        bytes32 venueId;
        EventType eventType;
        
        string name;
        string description;
        bytes32 posterHash;         // IPFS хэш постера
        
        uint256 startTime;
        uint256 endTime;
        uint256 totalTickets;
        uint256 soldTickets;
        
        uint256 basePrice;          // Базовая цена
        bool isActive;
        uint256 createdAt;
    }
    
    /// @notice Категория билета
    struct TicketTier {
        bytes32 tierId;
        bytes32 eventId;
        string name;                // "VIP", "Партер", "Балкон"
        uint256 price;
        uint256 totalQty;
        uint256 soldQty;
    }
    
    /// @notice Билет
    struct Ticket {
        bytes32 ticketId;
        bytes32 eventId;
        bytes32 tierId;
        
        address owner;
        uint256 price;
        uint256 purchasedAt;
        
        string seat;                // "A-15", "VIP-3"
        TicketStatus status;
        uint256 usedAt;
    }
    
    /// @notice Бронирование (ресторан, салон)
    struct Booking {
        bytes32 bookingId;
        bytes32 venueId;
        
        address customer;
        uint256 dateTime;           // Дата и время
        uint256 duration;           // Длительность (минуты)
        uint256 guestCount;         // Количество гостей
        
        string notes;               // Пожелания
        uint256 depositAmount;      // Депозит
        
        BookingStatus status;
        uint256 createdAt;
        uint256 confirmedAt;
    }
    
    /// @notice Отзыв
    struct Review {
        bytes32 reviewId;
        bytes32 venueId;
        bytes32 eventId;            // 0 если отзыв на venue
        
        address author;
        uint256 rating;             // 0-500
        string text;
        uint256 createdAt;
    }
    
    /// @notice Услуга (для салонов, мастеров)
    struct Service {
        bytes32 serviceId;
        bytes32 venueId;
        
        string name;                // "Стрижка мужская"
        string description;
        uint256 price;
        uint256 duration;           // Минуты
        bool isActive;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    address public altanToken;
    IAltanPaymentGateway public paymentGateway;
    
    uint256 public platformFee = 300;   // 3%
    
    // Payment tracking
    mapping(bytes32 => bytes32) public ticketPayments;   // ticketId => paymentId
    mapping(bytes32 => bytes32) public bookingPayments;  // bookingId => paymentId
    
    // Venues
    uint256 public nextVenueNonce = 1;
    mapping(bytes32 => Venue) public venues;
    bytes32[] public allVenues;
    mapping(VenueType => bytes32[]) public venuesByType;
    mapping(address => bytes32[]) public ownerVenues;
    
    // Events
    uint256 public nextEventNonce = 1;
    mapping(bytes32 => Event) public events;
    bytes32[] public upcomingEvents;
    mapping(bytes32 => bytes32[]) public venueEvents;       // venueId => eventIds
    
    // Ticket Tiers
    mapping(bytes32 => TicketTier) public ticketTiers;
    mapping(bytes32 => bytes32[]) public eventTiers;        // eventId => tierIds
    
    // Tickets
    uint256 public nextTicketNonce = 1;
    mapping(bytes32 => Ticket) public tickets;
    mapping(address => bytes32[]) public userTickets;
    mapping(bytes32 => bytes32[]) public eventTickets;      // eventId => ticketIds
    
    // Bookings
    uint256 public nextBookingNonce = 1;
    mapping(bytes32 => Booking) public bookings;
    mapping(address => bytes32[]) public userBookings;
    mapping(bytes32 => bytes32[]) public venueBookings;     // venueId => bookingIds
    
    // Reviews
    uint256 public nextReviewNonce = 1;
    mapping(bytes32 => Review) public reviews;
    mapping(bytes32 => bytes32[]) public venueReviews;
    mapping(bytes32 => bytes32[]) public eventReviews;
    
    // Services
    mapping(bytes32 => Service) public services;
    mapping(bytes32 => bytes32[]) public venueServices;     // venueId => serviceIds
    
    // Stats
    uint256 public totalTicketsSold;
    uint256 public totalBookings;
    uint256 public totalVolume;
    
    /* ==================== EVENTS ==================== */
    
    event VenueCreated(
        bytes32 indexed venueId,
        VenueType venueType,
        string name,
        address indexed owner
    );
    
    event EventCreated(
        bytes32 indexed eventId,
        bytes32 indexed venueId,
        EventType eventType,
        string name,
        uint256 startTime
    );
    
    event TicketPurchased(
        bytes32 indexed ticketId,
        bytes32 indexed eventId,
        address indexed buyer,
        uint256 price,
        bytes32 paymentId
    );
    
    event TicketUsed(
        bytes32 indexed ticketId,
        uint256 timestamp
    );
    
    event BookingCreated(
        bytes32 indexed bookingId,
        bytes32 indexed venueId,
        address indexed customer,
        uint256 dateTime
    );
    
    event BookingConfirmed(bytes32 indexed bookingId);
    
    event ReviewPosted(
        bytes32 indexed reviewId,
        bytes32 indexed venueId,
        address indexed author,
        uint256 rating
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier venueExists(bytes32 venueId) {
        if (venues[venueId].venueId == bytes32(0)) revert VenueNotFound();
        _;
    }
    
    modifier eventExists(bytes32 eventId) {
        if (events[eventId].eventId == bytes32(0)) revert EventNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
    }
    
    /* ==================== VENUES ==================== */
    
    /**
     * @notice Зарегистрировать заведение
     */
    function createVenue(
        VenueType venueType,
        string calldata name,
        string calldata description,
        string calldata location,
        bytes32 locationHash,
        uint256 capacity,
        uint256 avgPrice
    ) external returns (bytes32 venueId) {
        venueId = keccak256(abi.encodePacked(
            nextVenueNonce++,
            msg.sender,
            name,
            block.timestamp
        ));
        
        venues[venueId] = Venue({
            venueId: venueId,
            venueType: venueType,
            owner: msg.sender,
            name: name,
            description: description,
            location: location,
            locationHash: locationHash,
            capacity: capacity,
            avgPrice: avgPrice,
            rating: 0,
            reviewCount: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        allVenues.push(venueId);
        venuesByType[venueType].push(venueId);
        ownerVenues[msg.sender].push(venueId);
        
        emit VenueCreated(venueId, venueType, name, msg.sender);
    }
    
    /**
     * @notice Добавить услугу к заведению
     */
    function addService(
        bytes32 venueId,
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 duration
    ) external venueExists(venueId) returns (bytes32 serviceId) {
        require(venues[venueId].owner == msg.sender, "Not venue owner");
        
        serviceId = keccak256(abi.encodePacked(venueId, name, block.timestamp));
        
        services[serviceId] = Service({
            serviceId: serviceId,
            venueId: venueId,
            name: name,
            description: description,
            price: price,
            duration: duration,
            isActive: true
        });
        
        venueServices[venueId].push(serviceId);
    }
    
    /* ==================== EVENTS / МЕРОПРИЯТИЯ ==================== */
    
    /**
     * @notice Создать мероприятие
     */
    function createEvent(
        bytes32 venueId,
        EventType eventType,
        string calldata name,
        string calldata description,
        bytes32 posterHash,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTickets,
        uint256 basePrice
    ) external venueExists(venueId) returns (bytes32 eventId) {
        require(venues[venueId].owner == msg.sender, "Not venue owner");
        require(startTime > block.timestamp, "Invalid start time");
        
        eventId = keccak256(abi.encodePacked(
            nextEventNonce++,
            venueId,
            name,
            startTime
        ));
        
        events[eventId] = Event({
            eventId: eventId,
            venueId: venueId,
            eventType: eventType,
            name: name,
            description: description,
            posterHash: posterHash,
            startTime: startTime,
            endTime: endTime,
            totalTickets: totalTickets,
            soldTickets: 0,
            basePrice: basePrice,
            isActive: true,
            createdAt: block.timestamp
        });
        
        upcomingEvents.push(eventId);
        venueEvents[venueId].push(eventId);
        
        emit EventCreated(eventId, venueId, eventType, name, startTime);
    }
    
    /**
     * @notice Добавить категорию билетов
     */
    function addTicketTier(
        bytes32 eventId,
        string calldata name,
        uint256 price,
        uint256 quantity
    ) external eventExists(eventId) returns (bytes32 tierId) {
        Event storage evt = events[eventId];
        require(venues[evt.venueId].owner == msg.sender, "Not owner");
        
        tierId = keccak256(abi.encodePacked(eventId, name, price));
        
        ticketTiers[tierId] = TicketTier({
            tierId: tierId,
            eventId: eventId,
            name: name,
            price: price,
            totalQty: quantity,
            soldQty: 0
        });
        
        eventTiers[eventId].push(tierId);
    }
    
    /* ==================== TICKETS ==================== */
    
    /**
     * @notice Купить билет через PaymentGateway (instant release)
     */
    function purchaseTicket(
        bytes32 eventId,
        bytes32 tierId,
        string calldata seat
    ) external eventExists(eventId) returns (bytes32 ticketId, bytes32 paymentId) {
        Event storage evt = events[eventId];
        TicketTier storage tier = ticketTiers[tierId];
        
        require(evt.isActive, "Event not active");
        require(block.timestamp < evt.startTime, "Event started");
        require(tier.soldQty < tier.totalQty, "Sold out");
        
        ticketId = keccak256(abi.encodePacked(
            nextTicketNonce++,
            eventId,
            msg.sender,
            block.timestamp
        ));
        
        // Create payment for venue owner (instant release for tickets)
        Venue storage venue = venues[evt.venueId];
        
        IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
        splits[0] = IAltanPaymentGateway.PaymentSplit({
            recipient: venue.owner,
            amount: tier.price,
            percentage: 0,
            isPercentage: false
        });
        
        paymentId = paymentGateway.createEscrowPayment(
            IAltanPaymentGateway.PaymentType.TICKET_PURCHASE,
            msg.sender,
            splits,
            ticketId
        );
        
        // Auto-release for tickets (no escrow needed)
        paymentGateway.releasePayment(paymentId);
        
        tickets[ticketId] = Ticket({
            ticketId: ticketId,
            eventId: eventId,
            tierId: tierId,
            owner: msg.sender,
            price: tier.price,
            purchasedAt: block.timestamp,
            seat: seat,
            status: TicketStatus.VALID,
            usedAt: 0
        });
        
        ticketPayments[ticketId] = paymentId;
        tier.soldQty++;
        evt.soldTickets++;
        
        userTickets[msg.sender].push(ticketId);
        eventTickets[eventId].push(ticketId);
        
        totalTicketsSold++;
        totalVolume += tier.price;
        
        emit TicketPurchased(ticketId, eventId, msg.sender, tier.price, paymentId);
    }
    
    /**
     * @notice Использовать билет (на входе)
     */
    function useTicket(bytes32 ticketId) external {
        Ticket storage ticket = tickets[ticketId];
        if (ticket.ticketId == bytes32(0)) revert TicketNotFound();
        
        Event storage evt = events[ticket.eventId];
        require(venues[evt.venueId].owner == msg.sender, "Not venue owner");
        require(ticket.status == TicketStatus.VALID, "Invalid ticket");
        require(block.timestamp >= evt.startTime, "Too early");
        
        ticket.status = TicketStatus.USED;
        ticket.usedAt = block.timestamp;
        
        emit TicketUsed(ticketId, block.timestamp);
    }
    
    /**
     * @notice Вернуть билет (только до начала события)
     */
    function refundTicket(bytes32 ticketId) external {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.owner == msg.sender, "Not owner");
        require(ticket.status == TicketStatus.VALID, "Cannot refund");
        
        Event storage evt = events[ticket.eventId];
        require(block.timestamp < evt.startTime - 1 days, "Too late to refund");
        
        ticket.status = TicketStatus.REFUNDED;
        
        // Note: Payment already released on purchase, venue owner must manually refund
        // Or implement separate refund escrow logic
        
        // Decrement counters
        ticketTiers[ticket.tierId].soldQty--;
        evt.soldTickets--;
    }
    
    /* ==================== BOOKINGS ==================== */
    
    /**
     * @notice Забронировать столик / услугу с депозитом через PaymentGateway
     */
    function createBooking(
        bytes32 venueId,
        uint256 dateTime,
        uint256 duration,
        uint256 guestCount,
        string calldata notes,
        uint256 depositAmount
    ) external venueExists(venueId) returns (bytes32 bookingId, bytes32 paymentId) {
        require(dateTime > block.timestamp, "Invalid time");
        
        bookingId = keccak256(abi.encodePacked(
            nextBookingNonce++,
            venueId,
            msg.sender,
            dateTime
        ));
        
        // Create deposit payment if required
        if (depositAmount > 0) {
            Venue storage venue = venues[venueId];
            
            IAltanPaymentGateway.PaymentSplit[] memory splits = new IAltanPaymentGateway.PaymentSplit[](1);
            splits[0] = IAltanPaymentGateway.PaymentSplit({
                recipient: venue.owner,
                amount: depositAmount,
                percentage: 0,
                isPercentage: false
            });
            
            paymentId = paymentGateway.createEscrowPayment(
                IAltanPaymentGateway.PaymentType.SERVICE_BOOKING,
                msg.sender,
                splits,
                bookingId
            );
            
            bookingPayments[bookingId] = paymentId;
        }
        
        bookings[bookingId] = Booking({
            bookingId: bookingId,
            venueId: venueId,
            customer: msg.sender,
            dateTime: dateTime,
            duration: duration,
            guestCount: guestCount,
            notes: notes,
            depositAmount: depositAmount,
            status: BookingStatus.PENDING,
            createdAt: block.timestamp,
            confirmedAt: 0
        });
        
        userBookings[msg.sender].push(bookingId);
        venueBookings[venueId].push(bookingId);
        
        totalBookings++;
        
        emit BookingCreated(bookingId, venueId, msg.sender, dateTime);
    }
    
    /**
     * @notice Подтвердить бронирование (владелец заведения)
     */
    function confirmBooking(bytes32 bookingId) external {
        Booking storage booking = bookings[bookingId];
        if (booking.bookingId == bytes32(0)) revert BookingNotFound();
        
        require(
            venues[booking.venueId].owner == msg.sender,
            "Not venue owner"
        );
        require(booking.status == BookingStatus.PENDING, "Not pending");
        
        booking.status = BookingStatus.CONFIRMED;
        booking.confirmedAt = block.timestamp;
        
        emit BookingConfirmed(bookingId);
    }
    
    /**
     * @notice Завершить бронирование → релиз депозита
     */
    function completeBooking(bytes32 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(
            venues[booking.venueId].owner == msg.sender,
            "Not venue owner"
        );
        require(booking.status == BookingStatus.CONFIRMED, "Not confirmed");
        
        // Release deposit payment
        bytes32 paymentId = bookingPayments[bookingId];
        if (paymentId != bytes32(0)) {
            paymentGateway.releasePayment(paymentId);
        }
        
        booking.status = BookingStatus.COMPLETED;
    }
    
    /**
     * @notice Отменить бронирование → возврат депозита
     */
    function cancelBooking(bytes32 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(
            booking.customer == msg.sender ||
            venues[booking.venueId].owner == msg.sender,
            "Not authorized"
        );
        require(
            booking.status == BookingStatus.PENDING ||
            booking.status == BookingStatus.CONFIRMED,
            "Cannot cancel"
        );
        
        // Refund deposit if cancelled early enough
        if (booking.dateTime > block.timestamp + 1 days) {
            bytes32 paymentId = bookingPayments[bookingId];
            if (paymentId != bytes32(0)) {
                paymentGateway.refundPayment(paymentId);
            }
        }
        // Otherwise venue keeps deposit as cancellation fee
        
        booking.status = BookingStatus.CANCELLED;
    }
    
    /* ==================== REVIEWS ==================== */
    
    /**
     * @notice Оставить отзыв о заведении
     */
    function postVenueReview(
        bytes32 venueId,
        uint256 rating,
        string calldata text
    ) external venueExists(venueId) returns (bytes32 reviewId) {
        require(rating <= 500, "Max 500");
        
        reviewId = keccak256(abi.encodePacked(
            nextReviewNonce++,
            venueId,
            msg.sender,
            block.timestamp
        ));
        
        reviews[reviewId] = Review({
            reviewId: reviewId,
            venueId: venueId,
            eventId: bytes32(0),
            author: msg.sender,
            rating: rating,
            text: text,
            createdAt: block.timestamp
        });
        
        venueReviews[venueId].push(reviewId);
        
        // Update venue rating (simple average)
        Venue storage venue = venues[venueId];
        venue.rating = ((venue.rating * venue.reviewCount) + rating) / (venue.reviewCount + 1);
        venue.reviewCount++;
        
        emit ReviewPosted(reviewId, venueId, msg.sender, rating);
    }
    
    /**
     * @notice Оставить отзыв о мероприятии
     */
    function postEventReview(
        bytes32 eventId,
        uint256 rating,
        string calldata text
    ) external eventExists(eventId) returns (bytes32 reviewId) {
        require(rating <= 500, "Max 500");
        
        Event storage evt = events[eventId];
        require(block.timestamp > evt.endTime, "Event not ended");
        
        reviewId = keccak256(abi.encodePacked(
            nextReviewNonce++,
            eventId,
            msg.sender,
            block.timestamp
        ));
        
        reviews[reviewId] = Review({
            reviewId: reviewId,
            venueId: evt.venueId,
            eventId: eventId,
            author: msg.sender,
            rating: rating,
            text: text,
            createdAt: block.timestamp
        });
        
        eventReviews[eventId].push(reviewId);
        
        emit ReviewPosted(reviewId, evt.venueId, msg.sender, rating);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getVenue(bytes32 id) external view returns (Venue memory) {
        return venues[id];
    }
    
    function getEvent(bytes32 id) external view returns (Event memory) {
        return events[id];
    }
    
    function getTicket(bytes32 id) external view returns (Ticket memory) {
        return tickets[id];
    }
    
    function getBooking(bytes32 id) external view returns (Booking memory) {
        return bookings[id];
    }
    
    function getVenuesByType(VenueType t) external view returns (bytes32[] memory) {
        return venuesByType[t];
    }
    
    function getUpcomingEvents() external view returns (bytes32[] memory) {
        return upcomingEvents;
    }
    
    function getEventTiers(bytes32 eventId) external view returns (bytes32[] memory) {
        return eventTiers[eventId];
    }
    
    function getUserTickets(address user) external view returns (bytes32[] memory) {
        return userTickets[user];
    }
    
    function getUserBookings(address user) external view returns (bytes32[] memory) {
        return userBookings[user];
    }
    
    function getVenueReviews(bytes32 venueId) external view returns (bytes32[] memory) {
        return venueReviews[venueId];
    }
    
    function getVenueServices(bytes32 venueId) external view returns (bytes32[] memory) {
        return venueServices[venueId];
    }
    
    function getStats() external view returns (
        uint256 ticketsSold,
        uint256 bookingsCount,
        uint256 volume,
        uint256 venuesCount,
        uint256 eventsCount
    ) {
        return (
            totalTicketsSold,
            totalBookings,
            totalVolume,
            allVenues.length,
            upcomingEvents.length
        );
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
    
    function deactivateVenue(bytes32 venueId) external {
        require(
            venues[venueId].owner == msg.sender || msg.sender == owner,
            "Not authorized"
        );
        venues[venueId].isActive = false;
    }
}
