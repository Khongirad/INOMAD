// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Altan.sol";

/**
 * @title AltanFeeCollector
 * @notice Collects 0.03% network fee on ALTAN value transfers.
 *
 * Fee model:
 * - Fee rate: 0.03% (3 basis points)
 * - Minimum fee: 1 ALTAN
 * - Recipient: INOMAD INC (network operator)
 *
 * This is NOT a tax:
 * - Fee goes to private company (operator), not government
 * - Payment for infrastructure service
 * - Analogous to Visa/Mastercard interchange fees
 *
 * Note: In production, this logic is enforced at EVM state transition level.
 * This contract serves as application-layer enforcement for MVP.
 */
contract AltanFeeCollector {
    // Fee parameters
    uint256 public constant FEE_RATE_BPS = 3;        // 0.03%
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MIN_FEE = 1e18;          // 1 ALTAN (18 decimals)

    // Participants
    Altan public immutable altan;
    address public operator;     // INOMAD INC - fee recipient
    address public owner;

    // Statistics
    uint256 public totalFeesCollected;
    uint256 public totalTransactionsProcessed;

    // Events
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    event OperatorSet(address indexed oldOperator, address indexed newOperator);
    event FeeCollected(
        address indexed from,
        address indexed to,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount
    );
    event FeesWithdrawn(address indexed operator, uint256 amount);

    // Errors
    error NotOwner();
    error NotOperator();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address altan_, address operator_) {
        if (altan_ == address(0)) revert ZeroAddress();
        if (operator_ == address(0)) revert ZeroAddress();

        altan = Altan(altan_);
        operator = operator_;
        owner = msg.sender;

        emit OwnerSet(address(0), msg.sender);
        emit OperatorSet(address(0), operator_);
    }

    /**
     * @notice Calculate fee for a given amount
     * @param amount Gross transfer amount
     * @return fee Fee amount (max of MIN_FEE or 0.03%)
     */
    function calculateFee(uint256 amount) public pure returns (uint256 fee) {
        fee = (amount * FEE_RATE_BPS) / BPS_DIVISOR;
        if (fee < MIN_FEE) {
            fee = MIN_FEE;
        }
    }

    /**
     * @notice Calculate net amount after fee
     * @param grossAmount Gross transfer amount
     * @return netAmount Amount receiver gets
     * @return fee Fee deducted
     */
    function calculateNetAmount(uint256 grossAmount) public pure returns (uint256 netAmount, uint256 fee) {
        fee = calculateFee(grossAmount);
        netAmount = grossAmount - fee;
    }

    /**
     * @notice Transfer ALTAN with automatic fee collection
     * @dev Sender must have approved this contract for grossAmount
     * @param to Recipient address
     * @param grossAmount Total amount (fee will be deducted)
     * @return netAmount Amount actually received by recipient
     */
    function transferWithFee(address to, uint256 grossAmount) external returns (uint256 netAmount) {
        if (to == address(0)) revert ZeroAddress();
        if (grossAmount == 0) revert ZeroAmount();

        uint256 fee;
        (netAmount, fee) = calculateNetAmount(grossAmount);

        // Check sender balance
        if (altan.balanceOf(msg.sender) < grossAmount) revert InsufficientBalance();

        // Transfer fee to operator
        bool feeSuccess = altan.transferFrom(msg.sender, operator, fee);
        if (!feeSuccess) revert TransferFailed();

        // Transfer net amount to recipient
        bool netSuccess = altan.transferFrom(msg.sender, to, netAmount);
        if (!netSuccess) revert TransferFailed();

        // Update statistics
        totalFeesCollected += fee;
        totalTransactionsProcessed += 1;

        emit FeeCollected(msg.sender, to, grossAmount, fee, netAmount);
    }

    /**
     * @notice Batch transfer with fee collection
     * @param recipients Array of recipient addresses
     * @param amounts Array of gross amounts per recipient
     * @return totalNet Total net amount transferred
     * @return totalFee Total fees collected
     */
    function batchTransferWithFee(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 totalNet, uint256 totalFee) {
        require(recipients.length == amounts.length, "length mismatch");
        require(recipients.length > 0, "empty batch");

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();

            (uint256 netAmount, uint256 fee) = calculateNetAmount(amounts[i]);

            // Transfer fee to operator
            bool feeSuccess = altan.transferFrom(msg.sender, operator, fee);
            if (!feeSuccess) revert TransferFailed();

            // Transfer net amount to recipient
            bool netSuccess = altan.transferFrom(msg.sender, recipients[i], netAmount);
            if (!netSuccess) revert TransferFailed();

            totalNet += netAmount;
            totalFee += fee;

            emit FeeCollected(msg.sender, recipients[i], amounts[i], fee, netAmount);
        }

        totalFeesCollected += totalFee;
        totalTransactionsProcessed += recipients.length;
    }

    /**
     * @notice Set new operator (INOMAD INC)
     */
    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert ZeroAddress();
        address oldOperator = operator;
        operator = newOperator;
        emit OperatorSet(oldOperator, newOperator);
    }

    /**
     * @notice Set new owner
     */
    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerSet(oldOwner, newOwner);
    }

    /**
     * @notice Get fee statistics
     */
    function getStats() external view returns (
        uint256 _totalFeesCollected,
        uint256 _totalTransactionsProcessed,
        address _operator
    ) {
        return (totalFeesCollected, totalTransactionsProcessed, operator);
    }
}
