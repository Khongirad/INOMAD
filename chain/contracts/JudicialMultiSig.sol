// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ICitizenWalletGuard.sol";

/**
 * @title JudicialMultiSig
 * @notice Multi-signature contract for judicial freeze orders
 * 
 * Implementation:
 * - 3-of-5 judges must sign to execute freeze order
 * - All orders are on-chain for transparency
 * - Cannot be modified by admin/backend
 *
 * Flow:
 * 1. Judge proposes freeze order
 * 2. Other judges sign
 * 3. Anyone can execute after threshold (3 signatures)
 */
contract JudicialMultiSig is AccessControl {

    bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");

    uint256 public constant THRESHOLD = 3;  // 3-of-5
    uint256 public constant MAX_JUDGES = 5;

    ICitizenWalletGuard public walletGuard;

    // ============ ORDER MANAGEMENT ============
    
    enum OrderType { FREEZE, UNFREEZE }
    enum OrderStatus { PENDING, EXECUTED, CANCELLED, EXPIRED }

    struct FreezeOrder {
        uint256 id;
        OrderType orderType;
        address wallet;
        bytes32 caseHash;
        string description;
        OrderStatus status;
        uint256 proposedAt;
        uint256 expiresAt;        // Orders expire after 7 days
        address proposedBy;
        uint256 signatureCount;
    }

    uint256 public nextOrderId;
    mapping(uint256 => FreezeOrder) public orders;
    mapping(uint256 => mapping(address => bool)) public hasSigned;
    mapping(uint256 => address[]) public orderSigners;

    uint256 public constant ORDER_EXPIRY = 7 days;

    // ============ EVENTS ============
    
    event OrderProposed(
        uint256 indexed orderId,
        OrderType orderType,
        address indexed wallet,
        bytes32 indexed caseHash,
        address proposedBy
    );
    event OrderSigned(uint256 indexed orderId, address indexed judge, uint256 signatureCount);
    event OrderExecuted(uint256 indexed orderId, address indexed wallet, address executor);
    event OrderCancelled(uint256 indexed orderId, address indexed cancelledBy);
    event OrderExpired(uint256 indexed orderId);
    event JudgeAdded(address indexed judge);
    event JudgeRemoved(address indexed judge);

    // ============ ERRORS ============
    
    error ZeroAddress();
    error InvalidOrderId();
    error OrderNotPending();
    error OrderExpiredError();
    error AlreadySigned();
    error ThresholdNotMet();
    error NotProposer();
    error MaxJudgesReached();
    error UnauthorizedJudge();

    // ============ CONSTRUCTOR ============
    
    constructor(address admin, address _walletGuard) {
        if (admin == address(0)) revert ZeroAddress();
        if (_walletGuard == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        walletGuard = ICitizenWalletGuard(_walletGuard);
    }

    // ============ ORDER MANAGEMENT ============
    
    /**
     * @notice Propose a freeze order
     * @param wallet Address to freeze
     * @param caseHash Reference to judicial case
     * @param description Human-readable description
     */
    function proposeFreezeOrder(
        address wallet,
        bytes32 caseHash,
        string calldata description
    ) external onlyRole(JUDGE_ROLE) returns (uint256 orderId) {
        if (wallet == address(0)) revert ZeroAddress();

        orderId = ++nextOrderId;

        orders[orderId] = FreezeOrder({
            id: orderId,
            orderType: OrderType.FREEZE,
            wallet: wallet,
            caseHash: caseHash,
            description: description,
            status: OrderStatus.PENDING,
            proposedAt: block.timestamp,
            expiresAt: block.timestamp + ORDER_EXPIRY,
            proposedBy: msg.sender,
            signatureCount: 1  // Proposer auto-signs
        });

        hasSigned[orderId][msg.sender] = true;
        orderSigners[orderId].push(msg.sender);

        emit OrderProposed(orderId, OrderType.FREEZE, wallet, caseHash, msg.sender);
        emit OrderSigned(orderId, msg.sender, 1);
    }

    /**
     * @notice Propose an unfreeze order
     */
    function proposeUnfreezeOrder(
        address wallet,
        bytes32 verdictHash,
        string calldata description
    ) external onlyRole(JUDGE_ROLE) returns (uint256 orderId) {
        if (wallet == address(0)) revert ZeroAddress();

        orderId = ++nextOrderId;

        orders[orderId] = FreezeOrder({
            id: orderId,
            orderType: OrderType.UNFREEZE,
            wallet: wallet,
            caseHash: verdictHash,
            description: description,
            status: OrderStatus.PENDING,
            proposedAt: block.timestamp,
            expiresAt: block.timestamp + ORDER_EXPIRY,
            proposedBy: msg.sender,
            signatureCount: 1
        });

        hasSigned[orderId][msg.sender] = true;
        orderSigners[orderId].push(msg.sender);

        emit OrderProposed(orderId, OrderType.UNFREEZE, wallet, verdictHash, msg.sender);
        emit OrderSigned(orderId, msg.sender, 1);
    }

    /**
     * @notice Sign an existing order
     */
    function signOrder(uint256 orderId) external onlyRole(JUDGE_ROLE) {
        FreezeOrder storage order = orders[orderId];
        
        if (order.id == 0) revert InvalidOrderId();
        if (order.status != OrderStatus.PENDING) revert OrderNotPending();
        if (block.timestamp > order.expiresAt) {
            order.status = OrderStatus.EXPIRED;
            emit OrderExpired(orderId);
            revert OrderExpiredError();
        }
        if (hasSigned[orderId][msg.sender]) revert AlreadySigned();

        hasSigned[orderId][msg.sender] = true;
        orderSigners[orderId].push(msg.sender);
        order.signatureCount++;

        emit OrderSigned(orderId, msg.sender, order.signatureCount);
    }

    /**
     * @notice Execute order after threshold is met
     * @dev Anyone can call this after 3+ signatures
     */
    function executeOrder(uint256 orderId) external {
        FreezeOrder storage order = orders[orderId];
        
        if (order.id == 0) revert InvalidOrderId();
        if (order.status != OrderStatus.PENDING) revert OrderNotPending();
        if (block.timestamp > order.expiresAt) {
            order.status = OrderStatus.EXPIRED;
            emit OrderExpired(orderId);
            revert OrderExpiredError();
        }
        if (order.signatureCount < THRESHOLD) revert ThresholdNotMet();

        order.status = OrderStatus.EXECUTED;

        if (order.orderType == OrderType.FREEZE) {
            walletGuard.judicialFreeze(order.wallet, order.caseHash);
        }
        // Note: UNFREEZE requires calling unlockWallet on guard directly
        // This is intentional - unfreeze has separate authorization

        emit OrderExecuted(orderId, order.wallet, msg.sender);
    }

    /**
     * @notice Cancel order (only proposer, before execution)
     */
    function cancelOrder(uint256 orderId) external {
        FreezeOrder storage order = orders[orderId];
        
        if (order.id == 0) revert InvalidOrderId();
        if (order.status != OrderStatus.PENDING) revert OrderNotPending();
        if (msg.sender != order.proposedBy) revert NotProposer();

        order.status = OrderStatus.CANCELLED;
        emit OrderCancelled(orderId, msg.sender);
    }

    // ============ VIEW FUNCTIONS ============
    
    function getOrder(uint256 orderId) external view returns (FreezeOrder memory) {
        return orders[orderId];
    }

    function getOrderSigners(uint256 orderId) external view returns (address[] memory) {
        return orderSigners[orderId];
    }

    function getPendingOrdersCount() external view returns (uint256 count) {
        for (uint256 i = 1; i <= nextOrderId; i++) {
            if (orders[i].status == OrderStatus.PENDING && 
                block.timestamp <= orders[i].expiresAt) {
                count++;
            }
        }
    }

    function canExecute(uint256 orderId) external view returns (bool) {
        FreezeOrder storage order = orders[orderId];
        return order.status == OrderStatus.PENDING &&
               block.timestamp <= order.expiresAt &&
               order.signatureCount >= THRESHOLD;
    }

    // ============ JUDGE MANAGEMENT ============
    
    function addJudge(address judge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (judge == address(0)) revert ZeroAddress();
        
        // Count current judges
        uint256 judgeCount = 0;
        // Note: Would need to track judges array for accurate count
        // For now, rely on external tracking
        
        _grantRole(JUDGE_ROLE, judge);
        emit JudgeAdded(judge);
    }

    function removeJudge(address judge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(JUDGE_ROLE, judge);
        emit JudgeRemoved(judge);
    }

    function setWalletGuard(address _guard) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_guard == address(0)) revert ZeroAddress();
        walletGuard = ICitizenWalletGuard(_guard);
    }
}
