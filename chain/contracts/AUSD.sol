// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AUSD - ALTAN-USD Certificate
 * @notice NOT a stablecoin. A certificate of claim against INOMAD INC for USD.
 *
 * Legal structure:
 * - NOT money (not legal tender)
 * - NOT a deposit (not bank-insured)
 * - NOT a security (no income rights)
 * - IS a certificate of claim (right to receive USD from issuer)
 *
 * Analogous to: gift card, prepaid instrument, e-money
 *
 * Issuer: INOMAD INC
 * Backing: 100% USD reserves (audited quarterly)
 * Redemption: T+1 to T+3 via bank transfer
 */
contract AUSD is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");

    // Issuer (INOMAD INC)
    address public issuer;

    // Reserve tracking (informational, actual reserve is off-chain)
    uint256 public totalReserveUSDCents; // USD in cents (2 decimals)

    // Redemption management
    enum RedemptionStatus { PENDING, FULFILLED, CANCELLED }

    struct RedemptionRequest {
        uint256 id;
        address requester;
        uint256 ausdAmount;
        uint256 usdCents;       // Expected USD payout
        uint64 requestedAt;
        uint64 fulfilledAt;
        RedemptionStatus status;
        bytes32 bankRefHash;    // Hash of bank transfer reference
    }

    uint256 public nextRedemptionId;
    mapping(uint256 => RedemptionRequest) public redemptions;
    mapping(address => uint256[]) public userRedemptions;

    // Limits
    uint256 public constant MIN_REDEMPTION = 100 * 1e18; // 100 AUSD minimum
    uint256 public constant REDEMPTION_FEE_BPS = 50;     // 0.5% redemption fee
    uint256 public constant BPS_DIVISOR = 10000;

    // Events
    event IssuerSet(address indexed oldIssuer, address indexed newIssuer);
    event Minted(address indexed to, uint256 ausdAmount, uint256 usdCents, bytes32 depositRef);
    event RedemptionRequested(uint256 indexed id, address indexed requester, uint256 ausdAmount, uint256 usdCents);
    event RedemptionFulfilled(uint256 indexed id, bytes32 bankRefHash);
    event RedemptionCancelled(uint256 indexed id, string reason);
    event ReserveUpdated(uint256 oldReserve, uint256 newReserve);

    // Errors
    error ZeroAddress();
    error ZeroAmount();
    error AmountMismatch();
    error BelowMinimum();
    error InsufficientBalance();
    error InvalidRedemption();
    error AlreadyProcessed();

    constructor(address issuer_) ERC20("ALTAN-USD Certificate", "AUSD") {
        if (issuer_ == address(0)) revert ZeroAddress();

        issuer = issuer_;

        _grantRole(DEFAULT_ADMIN_ROLE, issuer_);
        _grantRole(MINTER_ROLE, issuer_);
        _grantRole(REDEEMER_ROLE, issuer_);

        emit IssuerSet(address(0), issuer_);
    }

    /**
     * @notice Mint AUSD after USD deposit confirmed
     * @param to Recipient address
     * @param usdCents USD deposited in cents (e.g., $100.00 = 10000)
     * @param depositRef Hash of bank deposit reference for audit
     */
    function mint(
        address to,
        uint256 usdCents,
        bytes32 depositRef
    ) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (usdCents == 0) revert ZeroAmount();

        // 1 AUSD = 1 USD, convert cents to 18 decimals
        // usdCents (2 decimals) -> AUSD (18 decimals)
        uint256 ausdAmount = usdCents * 1e16; // 100 cents = 1 USD = 1e18 AUSD

        _mint(to, ausdAmount);
        totalReserveUSDCents += usdCents;

        emit Minted(to, ausdAmount, usdCents, depositRef);
        emit ReserveUpdated(totalReserveUSDCents - usdCents, totalReserveUSDCents);
    }

    /**
     * @notice Request redemption of AUSD for USD
     * @param amount AUSD amount to redeem (18 decimals)
     * @return id Redemption request ID
     */
    function requestRedemption(uint256 amount) external returns (uint256 id) {
        if (amount < MIN_REDEMPTION) revert BelowMinimum();
        if (balanceOf(msg.sender) < amount) revert InsufficientBalance();

        // Calculate USD payout (minus 0.5% fee)
        uint256 fee = (amount * REDEMPTION_FEE_BPS) / BPS_DIVISOR;
        uint256 netAmount = amount - fee;
        uint256 usdCents = netAmount / 1e16;

        // Lock AUSD (transfer to contract)
        _transfer(msg.sender, address(this), amount);

        id = nextRedemptionId++;
        redemptions[id] = RedemptionRequest({
            id: id,
            requester: msg.sender,
            ausdAmount: amount,
            usdCents: usdCents,
            requestedAt: uint64(block.timestamp),
            fulfilledAt: 0,
            status: RedemptionStatus.PENDING,
            bankRefHash: bytes32(0)
        });

        userRedemptions[msg.sender].push(id);

        emit RedemptionRequested(id, msg.sender, amount, usdCents);
    }

    /**
     * @notice Fulfill redemption after USD transfer completed
     * @param id Redemption request ID
     * @param bankRefHash Hash of bank transfer reference
     */
    function fulfillRedemption(uint256 id, bytes32 bankRefHash) external onlyRole(REDEEMER_ROLE) {
        RedemptionRequest storage req = redemptions[id];
        if (req.status != RedemptionStatus.PENDING) revert AlreadyProcessed();
        if (req.ausdAmount == 0) revert InvalidRedemption();

        // Burn the locked AUSD
        _burn(address(this), req.ausdAmount);

        // Update reserve
        uint256 oldReserve = totalReserveUSDCents;
        totalReserveUSDCents -= req.usdCents;

        req.status = RedemptionStatus.FULFILLED;
        req.fulfilledAt = uint64(block.timestamp);
        req.bankRefHash = bankRefHash;

        emit RedemptionFulfilled(id, bankRefHash);
        emit ReserveUpdated(oldReserve, totalReserveUSDCents);
    }

    /**
     * @notice Cancel redemption and return AUSD to requester
     * @param id Redemption request ID
     * @param reason Cancellation reason
     */
    function cancelRedemption(uint256 id, string calldata reason) external onlyRole(REDEEMER_ROLE) {
        RedemptionRequest storage req = redemptions[id];
        if (req.status != RedemptionStatus.PENDING) revert AlreadyProcessed();
        if (req.ausdAmount == 0) revert InvalidRedemption();

        // Return AUSD to requester
        _transfer(address(this), req.requester, req.ausdAmount);

        req.status = RedemptionStatus.CANCELLED;

        emit RedemptionCancelled(id, reason);
    }

    /**
     * @notice Update reserve amount (for reconciliation after audit)
     * @param newReserveUSDCents New reserve amount in cents
     */
    function updateReserve(uint256 newReserveUSDCents) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldReserve = totalReserveUSDCents;
        totalReserveUSDCents = newReserveUSDCents;
        emit ReserveUpdated(oldReserve, newReserveUSDCents);
    }

    /**
     * @notice Check reserve ratio (basis points, 10000 = 100%)
     * @return ratio Reserve ratio in bps
     */
    function reserveRatioBps() external view returns (uint256 ratio) {
        if (totalSupply() == 0) return 10000; // 100% if no supply
        uint256 supplyInCents = totalSupply() / 1e16;
        return (totalReserveUSDCents * BPS_DIVISOR) / supplyInCents;
    }

    /**
     * @notice Get user's redemption requests
     * @param user User address
     * @return ids Array of redemption IDs
     */
    function getUserRedemptions(address user) external view returns (uint256[] memory) {
        return userRedemptions[user];
    }

    /**
     * @notice Transfer issuer role
     */
    function setIssuer(address newIssuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newIssuer == address(0)) revert ZeroAddress();

        address oldIssuer = issuer;

        _revokeRole(DEFAULT_ADMIN_ROLE, oldIssuer);
        _revokeRole(MINTER_ROLE, oldIssuer);
        _revokeRole(REDEEMER_ROLE, oldIssuer);

        _grantRole(DEFAULT_ADMIN_ROLE, newIssuer);
        _grantRole(MINTER_ROLE, newIssuer);
        _grantRole(REDEEMER_ROLE, newIssuer);

        issuer = newIssuer;
        emit IssuerSet(oldIssuer, newIssuer);
    }

    /// @notice Decimals = 18 (1 AUSD = 1 USD)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
