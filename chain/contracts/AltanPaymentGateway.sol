// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AltanPaymentGateway
 * @notice Unified payment gateway for all marketplaces
 * 
 * Features:
 * 1. Escrow for marketplace transactions
 * 2. Automated release on confirmation
 * 3. Refund mechanisms
 * 4. Multi-party payment splits
 * 5. Platform fee collection
 * 
 * Supports: RetailMarketplace, ServiceMarketplace, AuctionHouse,
 *           CommodityExchange, JobMarketplace
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AltanPaymentGateway {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error PaymentNotFound();
    error PaymentAlreadyReleased();
    error PaymentAlreadyRefunded();
    error InvalidStatus();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidSplit();
    
    /* ==================== ENUMS ==================== */
    
    enum PaymentStatus {
        PENDING,        // Ожидает
        ESCROWED,       // На эскроу
        RELEASED,       // Высвобожден
        REFUNDED,       // Возврат
        DISPUTED        // Спор
    }
    
    enum PaymentType {
        RETAIL_ORDER,       // Заказ в розницу
        SERVICE_BOOKING,    // Бронирование услуги
        TICKET_PURCHASE,    // Покупка билета
        AUCTION_BID,        // Ставка аукциона
        COMMODITY_TRADE,    // Сделка с товаром
        JOB_MILESTONE,      // Этап работы
        DIRECT_TRANSFER     // Прямой перевод
    }
    
    /* ==================== STRUCTS ==================== */
    
    /// @notice Платёж
    struct Payment {
        bytes32 paymentId;
        PaymentType paymentType;
        PaymentStatus status;
        
        address payer;
        address[] recipients;
        uint256[] amounts;          // Сумма для каждого получателя
        
        uint256 totalAmount;
        uint256 platformFee;
        uint256 releasedAt;
        uint256 createdAt;
        
        bytes32 referenceId;        // ID сделки в источнике
        address sourceContract;     // Контракт-источник
    }
    
    /// @notice Раздел платежа (split)
    struct PaymentSplit {
        address recipient;
        uint256 amount;
        uint256 percentage;         // basis points (10000 = 100%)
        bool isPercentage;          // true = использовать %, false = фикс сумму
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    IERC20 public altanToken;
    address public treasury;            // Казна для комиссий
    
    uint256 public defaultPlatformFee = 300;    // 3% (basis points)
    
    // Payments
    uint256 public nextPaymentNonce = 1;
    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;      // Плательщик
    mapping(address => bytes32[]) public recipientPayments; // Получатель
    mapping(bytes32 => bytes32[]) public referencePayments; // referenceId => paymentIds
    
    // Authorized marketplaces
    mapping(address => bool) public isAuthorizedMarketplace;
    mapping(address => uint256) public marketplaceFees;     // Custom fees per marketplace
    
    // Balances in escrow
    mapping(address => uint256) public escrowBalances;
    
    // Statistics
    uint256 public totalEscrowed;
    uint256 public totalReleased;
    uint256 public totalRefunded;
    uint256 public totalFeesCollected;
    
    /* ==================== EVENTS ==================== */
    
    event PaymentCreated(
        bytes32 indexed paymentId,
        PaymentType paymentType,
        address indexed payer,
        uint256 totalAmount,
        bytes32 referenceId
    );
    
    event PaymentEscrowed(
        bytes32 indexed paymentId,
        uint256 amount
    );
    
    event PaymentReleased(
        bytes32 indexed paymentId,
        address[] recipients,
        uint256[] amounts,
        uint256 fee
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount
    );
    
    event DisputeOpened(
        bytes32 indexed paymentId,
        address indexed initiator
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyAuthorized() {
        if (!isAuthorizedMarketplace[msg.sender] && msg.sender != owner) {
            revert NotAuthorized();
        }
        _;
    }
    
    modifier paymentExists(bytes32 paymentId) {
        if (payments[paymentId].paymentId == bytes32(0)) revert PaymentNotFound();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(address _altanToken, address _treasury) {
        owner = msg.sender;
        altanToken = IERC20(_altanToken);
        treasury = _treasury;
    }
    
    /* ==================== PAYMENT CREATION ==================== */
    
    /**
     * @notice Создать платёж с эскроу
     */
    function createEscrowPayment(
        PaymentType paymentType,
        address payer,
        PaymentSplit[] calldata splits,
        bytes32 referenceId
    ) external onlyAuthorized returns (bytes32 paymentId) {
        require(splits.length > 0, "No recipients");
        
        paymentId = keccak256(abi.encodePacked(
            nextPaymentNonce++,
            payer,
            referenceId,
            block.timestamp
        ));
        
        // Calculate amounts
        (address[] memory recipients, uint256[] memory amounts, uint256 total) = 
            _processSplits(splits, 0);
        
        // Calculate platform fee
        uint256 feeRate = marketplaceFees[msg.sender] > 0 
            ? marketplaceFees[msg.sender] 
            : defaultPlatformFee;
        uint256 fee = (total * feeRate) / 10000;
        uint256 totalWithFee = total + fee;
        
        // Transfer to escrow
        require(
            altanToken.transferFrom(payer, address(this), totalWithFee),
            "Transfer failed"
        );
        
        payments[paymentId] = Payment({
            paymentId: paymentId,
            paymentType: paymentType,
            status: PaymentStatus.ESCROWED,
            payer: payer,
            recipients: recipients,
            amounts: amounts,
            totalAmount: total,
            platformFee: fee,
            releasedAt: 0,
            createdAt: block.timestamp,
            referenceId: referenceId,
            sourceContract: msg.sender
        });
        
        userPayments[payer].push(paymentId);
        for (uint i = 0; i < recipients.length; i++) {
            recipientPayments[recipients[i]].push(paymentId);
            escrowBalances[recipients[i]] += amounts[i];
        }
        referencePayments[referenceId].push(paymentId);
        
        totalEscrowed += totalWithFee;
        
        emit PaymentCreated(paymentId, paymentType, payer, total, referenceId);
        emit PaymentEscrowed(paymentId, totalWithFee);
    }
    
    /**
     * @notice Процессинг splits
     */
    function _processSplits(
        PaymentSplit[] calldata splits,
        uint256 baseAmount
    ) internal pure returns (
        address[] memory recipients,
        uint256[] memory amounts,
        uint256 total
    ) {
        recipients = new address[](splits.length);
        amounts = new uint256[](splits.length);
        
        for (uint i = 0; i < splits.length; i++) {
            recipients[i] = splits[i].recipient;
            
            if (splits[i].isPercentage) {
                require(baseAmount > 0, "Need base amount for percentage");
                amounts[i] = (baseAmount * splits[i].percentage) / 10000;
            } else {
                amounts[i] = splits[i].amount;
            }
            
            total += amounts[i];
        }
    }
    
    /* ==================== PAYMENT RELEASE ==================== */
    
    /**
     * @notice Высвободить платёж (после подтверждения)
     */
    function releasePayment(bytes32 paymentId) 
        external 
        onlyAuthorized
        paymentExists(paymentId) 
    {
        Payment storage payment = payments[paymentId];
        
        if (payment.status != PaymentStatus.ESCROWED) revert InvalidStatus();
        if (payment.sourceContract != msg.sender) revert NotAuthorized();
        
        payment.status = PaymentStatus.RELEASED;
        payment.releasedAt = block.timestamp;
        
        // Transfer to recipients
        for (uint i = 0; i < payment.recipients.length; i++) {
            address recipient = payment.recipients[i];
            uint256 amount = payment.amounts[i];
            
            escrowBalances[recipient] -= amount;
            require(altanToken.transfer(recipient, amount), "Transfer failed");
        }
        
        // Transfer fee to treasury
        if (payment.platformFee > 0) {
            require(
                altanToken.transfer(treasury, payment.platformFee),
                "Fee transfer failed"
            );
            totalFeesCollected += payment.platformFee;
        }
        
        totalReleased += payment.totalAmount;
        
        emit PaymentReleased(
            paymentId,
            payment.recipients,
            payment.amounts,
            payment.platformFee
        );
    }
    
    /**
     * @notice Автоматический релиз после таймаута (для доверенных сделок)
     */
    function autoReleaseAfterTimeout(bytes32 paymentId, uint256 timeoutDays)
        external
        paymentExists(paymentId)
    {
        Payment storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.ESCROWED, "Not escrowed");
        require(
            block.timestamp >= payment.createdAt + (timeoutDays * 1 days),
            "Timeout not reached"
        );
        
        // Same as regular release
        payment.status = PaymentStatus.RELEASED;
        payment.releasedAt = block.timestamp;
        
        for (uint i = 0; i < payment.recipients.length; i++) {
            address recipient = payment.recipients[i];
            uint256 amount = payment.amounts[i];
            
            escrowBalances[recipient] -= amount;
            require(altanToken.transfer(recipient, amount), "Transfer failed");
        }
        
        if (payment.platformFee > 0) {
            require(
                altanToken.transfer(treasury, payment.platformFee),
                "Fee transfer failed"
            );
            totalFeesCollected += payment.platformFee;
        }
        
        totalReleased += payment.totalAmount;
        
        emit PaymentReleased(
            paymentId,
            payment.recipients,
            payment.amounts,
            payment.platformFee
        );
    }
    
    /* ==================== REFUNDS ==================== */
    
    /**
     * @notice Вернуть платёж
     */
    function refundPayment(bytes32 paymentId)
        external
        onlyAuthorized
        paymentExists(paymentId)
    {
        Payment storage payment = payments[paymentId];
        
        if (payment.status != PaymentStatus.ESCROWED) revert InvalidStatus();
        if (payment.sourceContract != msg.sender) revert NotAuthorized();
        
        payment.status = PaymentStatus.REFUNDED;
        
        // Return to payer (including fee)
        uint256 refundAmount = payment.totalAmount + payment.platformFee;
        
        // Decrease escrow balances
        for (uint i = 0; i < payment.recipients.length; i++) {
            escrowBalances[payment.recipients[i]] -= payment.amounts[i];
        }
        
        require(
            altanToken.transfer(payment.payer, refundAmount),
            "Refund failed"
        );
        
        totalRefunded += refundAmount;
        
        emit PaymentRefunded(paymentId, payment.payer, refundAmount);
    }
    
    /**
     * @notice Частичный возврат
     */
    function partialRefund(bytes32 paymentId, uint256 refundAmount)
        external
        onlyAuthorized
        paymentExists(paymentId)
    {
        Payment storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.ESCROWED, "Not escrowed");
        require(refundAmount <= payment.totalAmount, "Amount too large");
        
        require(
            altanToken.transfer(payment.payer, refundAmount),
            "Refund failed"
        );
        
        // Adjust amounts proportionally
        uint256 remaining = payment.totalAmount - refundAmount;
        for (uint i = 0; i < payment.amounts.length; i++) {
            uint256 oldAmount = payment.amounts[i];
            payment.amounts[i] = (oldAmount * remaining) / payment.totalAmount;
            
            uint256 decrease = oldAmount - payment.amounts[i];
            escrowBalances[payment.recipients[i]] -= decrease;
        }
        
        payment.totalAmount = remaining;
        totalRefunded += refundAmount;
    }
    
    /* ==================== DISPUTES ==================== */
    
    /**
     * @notice Открыть спор
     */
    function openDispute(bytes32 paymentId)
        external
        paymentExists(paymentId)
    {
        Payment storage payment = payments[paymentId];
        
        require(
            msg.sender == payment.payer ||
            _isRecipient(paymentId, msg.sender),
            "Not authorized"
        );
        require(payment.status == PaymentStatus.ESCROWED, "Not escrowed");
        
        payment.status = PaymentStatus.DISPUTED;
        
        emit DisputeOpened(paymentId, msg.sender);
    }
    
    function _isRecipient(bytes32 paymentId, address user) 
        internal view returns (bool) 
    {
        Payment storage payment = payments[paymentId];
        for (uint i = 0; i < payment.recipients.length; i++) {
            if (payment.recipients[i] == user) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Разрешить спор (admin)
     * @param paymentId Payment ID
     * @param refundToPayer If true, partial refund to payer; if false, full release to recipients
     * @param refundPercentage Percentage to refund (basis points, 10000 = 100%)
     */
    function resolveDispute(
        bytes32 paymentId,
        bool refundToPayer,
        uint256 refundPercentage
    ) external onlyOwner paymentExists(paymentId) {
        Payment storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.DISPUTED, "Not disputed");
        
        if (refundToPayer) {
            // Partial refund to payer, rest to recipients
            uint256 refundAmount = (payment.totalAmount * refundPercentage) / 10000;
            uint256 releaseAmount = payment.totalAmount - refundAmount;
            
            // Refund portion to payer
            if (refundAmount > 0) {
                require(
                    altanToken.transfer(payment.payer, refundAmount),
                    "Refund failed"
                );
                totalRefunded += refundAmount;
            }
            
            // Release rest to recipients (proportionally)
            for (uint i = 0; i < payment.recipients.length; i++) {
                // Calculate proportional amount
                uint256 recipientAmount = (payment.amounts[i] * releaseAmount) / payment.totalAmount;
                
                // Decrease escrow balance by the original amount
                escrowBalances[payment.recipients[i]] -= payment.amounts[i];
                
                if (recipientAmount > 0) {
                    require(
                        altanToken.transfer(payment.recipients[i], recipientAmount),
                        "Transfer failed"
                    );
                }
            }
            
            // Fee proportional to released amount
            if (payment.platformFee > 0 && releaseAmount > 0) {
                uint256 proportionalFee = (payment.platformFee * releaseAmount) / payment.totalAmount;
                if (proportionalFee > 0) {
                    require(
                        altanToken.transfer(treasury, proportionalFee),
                        "Fee transfer failed"
                    );
                    totalFeesCollected += proportionalFee;
                }
            }
            
            payment.status = PaymentStatus.RELEASED;
            payment.releasedAt = block.timestamp;
            totalReleased += releaseAmount;
            
            emit PaymentReleased(
                paymentId,
                payment.recipients,
                payment.amounts,
                payment.platformFee
            );
        } else {
            // Full release to recipients
            payment.status = PaymentStatus.RELEASED;
            payment.releasedAt = block.timestamp;
            
            for (uint i = 0; i < payment.recipients.length; i++) {
                address recipient = payment.recipients[i];
                uint256 amount = payment.amounts[i];
                
                escrowBalances[recipient] -= amount;
                require(altanToken.transfer(recipient, amount), "Transfer failed");
            }
            
            if (payment.platformFee > 0) {
                require(
                    altanToken.transfer(treasury, payment.platformFee),
                    "Fee transfer failed"
                );
                totalFeesCollected += payment.platformFee;
            }
            
            totalReleased += payment.totalAmount;
            
            emit PaymentReleased(
                paymentId,
                payment.recipients,
                payment.amounts,
                payment.platformFee
            );
        }
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getPayment(bytes32 id) external view returns (Payment memory) {
        return payments[id];
    }
    
    function getUserPayments(address user) external view returns (bytes32[] memory) {
        return userPayments[user];
    }
    
    function getRecipientPayments(address recipient) external view returns (bytes32[] memory) {
        return recipientPayments[recipient];
    }
    
    function getReferencePayments(bytes32 refId) external view returns (bytes32[] memory) {
        return referencePayments[refId];
    }
    
    function getEscrowBalance(address user) external view returns (uint256) {
        return escrowBalances[user];
    }
    
    function getStats() external view returns (
        uint256 escrowed,
        uint256 released,
        uint256 refunded,
        uint256 feesCollected
    ) {
        return (totalEscrowed, totalReleased, totalRefunded, totalFeesCollected);
    }
    
    /* ==================== ADMIN ==================== */
    
    function setAuthorizedMarketplace(address marketplace, bool authorized) 
        external onlyOwner 
    {
        isAuthorizedMarketplace[marketplace] = authorized;
    }
    
    function setMarketplaceFee(address marketplace, uint256 fee) 
        external onlyOwner 
    {
        require(fee <= 1000, "Max 10%");
        marketplaceFees[marketplace] = fee;
    }
    
    function setDefaultPlatformFee(uint256 fee) external onlyOwner {
        require(fee <= 1000, "Max 10%");
        defaultPlatformFee = fee;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    function emergencyWithdraw(address token, uint256 amount) 
        external onlyOwner 
    {
        if (token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            IERC20(token).transfer(owner, amount);
        }
    }
}
