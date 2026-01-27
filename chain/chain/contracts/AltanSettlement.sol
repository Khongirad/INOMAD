// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AltanSettlement
 * @notice Records ALTAN <-> USD settlements on-chain for audit trail.
 *
 * Two settlement contours:
 *
 * 1. PRIMARY (Government)
 *    - Bank of Siberia <-> Treasury
 *    - Official exchange rate
 *    - No spread/fees
 *    - Used for budget operations
 *
 * 2. SECONDARY (Operator/Dealer)
 *    - INOMAD INC <-> Network participants
 *    - Official rate + dealer spread
 *    - Used for citizen/company ALTAN purchases
 *
 * This contract does NOT hold funds - it only records settlements
 * that occur off-chain via bank transfers.
 */
contract AltanSettlement {
    // Settlement types
    enum SettlementType {
        PRIMARY_BUY,    // Treasury buys ALTAN (USD -> ALTAN)
        PRIMARY_SELL,   // Treasury sells ALTAN (ALTAN -> USD)
        SECONDARY_BUY,  // Participant buys ALTAN from dealer
        SECONDARY_SELL  // Participant sells ALTAN to dealer
    }

    enum SettlementStatus {
        PENDING,
        COMPLETED,
        CANCELLED
    }

    struct Settlement {
        uint256 id;
        SettlementType sType;
        address participant;        // Treasury address or user address
        uint256 altanAmount;        // ALTAN amount (18 decimals)
        uint256 usdAmountCents;     // USD amount in cents
        uint256 rateBps;            // Exchange rate in bps (10000 = 1:1)
        uint64 createdAt;
        uint64 completedAt;
        SettlementStatus status;
        bytes32 bankRefHash;        // Hash of bank transfer reference
        string note;                // Optional note
    }

    // Authorized parties
    address public bankOfSiberia;   // Primary contour authority
    address public inomadOperator;  // Secondary contour authority
    address public owner;

    // Storage
    uint256 public nextSettlementId;
    mapping(uint256 => Settlement) public settlements;
    mapping(address => uint256[]) public participantSettlements;

    // Statistics
    uint256 public totalPrimaryVolume;   // Total USD cents through primary
    uint256 public totalSecondaryVolume; // Total USD cents through secondary

    // Official rate (set by Bank of Siberia)
    uint256 public officialRateBps; // e.g., 10000 = 1 ALTAN : 1 USD

    // Events
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    event BankOfSiberiaSet(address indexed oldBank, address indexed newBank);
    event InomadOperatorSet(address indexed oldOp, address indexed newOp);
    event OfficialRateSet(uint256 oldRate, uint256 newRate);

    event SettlementCreated(
        uint256 indexed id,
        SettlementType indexed sType,
        address indexed participant,
        uint256 altanAmount,
        uint256 usdAmountCents
    );
    event SettlementCompleted(uint256 indexed id, bytes32 bankRefHash);
    event SettlementCancelled(uint256 indexed id, string reason);

    // Errors
    error NotOwner();
    error NotAuthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidSettlement();
    error AlreadyProcessed();
    error InvalidType();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBank() {
        if (msg.sender != bankOfSiberia) revert NotAuthorized();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != inomadOperator) revert NotAuthorized();
        _;
    }

    constructor(address bank_, address operator_) {
        if (bank_ == address(0)) revert ZeroAddress();
        if (operator_ == address(0)) revert ZeroAddress();

        bankOfSiberia = bank_;
        inomadOperator = operator_;
        owner = msg.sender;
        officialRateBps = 10000; // Initial rate: 1 ALTAN = 1 USD

        emit OwnerSet(address(0), msg.sender);
        emit BankOfSiberiaSet(address(0), bank_);
        emit InomadOperatorSet(address(0), operator_);
        emit OfficialRateSet(0, 10000);
    }

    // ============ PRIMARY CONTOUR (Bank of Siberia) ============

    /**
     * @notice Record primary settlement (government operations)
     * @param sType Must be PRIMARY_BUY or PRIMARY_SELL
     * @param participant Treasury or government entity address
     * @param altanAmount ALTAN amount
     * @param usdAmountCents USD amount in cents
     * @param note Optional note
     */
    function recordPrimarySettlement(
        SettlementType sType,
        address participant,
        uint256 altanAmount,
        uint256 usdAmountCents,
        string calldata note
    ) external onlyBank returns (uint256 id) {
        if (sType != SettlementType.PRIMARY_BUY && sType != SettlementType.PRIMARY_SELL) {
            revert InvalidType();
        }
        if (participant == address(0)) revert ZeroAddress();
        if (altanAmount == 0 || usdAmountCents == 0) revert ZeroAmount();

        id = nextSettlementId++;
        settlements[id] = Settlement({
            id: id,
            sType: sType,
            participant: participant,
            altanAmount: altanAmount,
            usdAmountCents: usdAmountCents,
            rateBps: officialRateBps,
            createdAt: uint64(block.timestamp),
            completedAt: 0,
            status: SettlementStatus.PENDING,
            bankRefHash: bytes32(0),
            note: note
        });

        participantSettlements[participant].push(id);

        emit SettlementCreated(id, sType, participant, altanAmount, usdAmountCents);
    }

    /**
     * @notice Complete primary settlement
     */
    function completePrimarySettlement(uint256 id, bytes32 bankRefHash) external onlyBank {
        Settlement storage s = settlements[id];
        if (s.status != SettlementStatus.PENDING) revert AlreadyProcessed();
        if (s.sType != SettlementType.PRIMARY_BUY && s.sType != SettlementType.PRIMARY_SELL) {
            revert InvalidType();
        }

        s.status = SettlementStatus.COMPLETED;
        s.completedAt = uint64(block.timestamp);
        s.bankRefHash = bankRefHash;

        totalPrimaryVolume += s.usdAmountCents;

        emit SettlementCompleted(id, bankRefHash);
    }

    // ============ SECONDARY CONTOUR (INOMAD Operator) ============

    /**
     * @notice Record secondary settlement (dealer operations)
     * @param sType Must be SECONDARY_BUY or SECONDARY_SELL
     * @param participant User or company address
     * @param altanAmount ALTAN amount
     * @param usdAmountCents USD amount in cents (includes spread)
     * @param note Optional note
     */
    function recordSecondarySettlement(
        SettlementType sType,
        address participant,
        uint256 altanAmount,
        uint256 usdAmountCents,
        string calldata note
    ) external onlyOperator returns (uint256 id) {
        if (sType != SettlementType.SECONDARY_BUY && sType != SettlementType.SECONDARY_SELL) {
            revert InvalidType();
        }
        if (participant == address(0)) revert ZeroAddress();
        if (altanAmount == 0 || usdAmountCents == 0) revert ZeroAmount();

        // Calculate effective rate
        uint256 effectiveRateBps = (usdAmountCents * 10000 * 1e18) / (altanAmount * 100);

        id = nextSettlementId++;
        settlements[id] = Settlement({
            id: id,
            sType: sType,
            participant: participant,
            altanAmount: altanAmount,
            usdAmountCents: usdAmountCents,
            rateBps: effectiveRateBps,
            createdAt: uint64(block.timestamp),
            completedAt: 0,
            status: SettlementStatus.PENDING,
            bankRefHash: bytes32(0),
            note: note
        });

        participantSettlements[participant].push(id);

        emit SettlementCreated(id, sType, participant, altanAmount, usdAmountCents);
    }

    /**
     * @notice Complete secondary settlement
     */
    function completeSecondarySettlement(uint256 id, bytes32 bankRefHash) external onlyOperator {
        Settlement storage s = settlements[id];
        if (s.status != SettlementStatus.PENDING) revert AlreadyProcessed();
        if (s.sType != SettlementType.SECONDARY_BUY && s.sType != SettlementType.SECONDARY_SELL) {
            revert InvalidType();
        }

        s.status = SettlementStatus.COMPLETED;
        s.completedAt = uint64(block.timestamp);
        s.bankRefHash = bankRefHash;

        totalSecondaryVolume += s.usdAmountCents;

        emit SettlementCompleted(id, bankRefHash);
    }

    // ============ CANCELLATION ============

    /**
     * @notice Cancel settlement (by appropriate authority)
     */
    function cancelSettlement(uint256 id, string calldata reason) external {
        Settlement storage s = settlements[id];
        if (s.status != SettlementStatus.PENDING) revert AlreadyProcessed();

        // Check authorization based on settlement type
        if (s.sType == SettlementType.PRIMARY_BUY || s.sType == SettlementType.PRIMARY_SELL) {
            if (msg.sender != bankOfSiberia) revert NotAuthorized();
        } else {
            if (msg.sender != inomadOperator) revert NotAuthorized();
        }

        s.status = SettlementStatus.CANCELLED;

        emit SettlementCancelled(id, reason);
    }

    // ============ RATE MANAGEMENT ============

    /**
     * @notice Set official ALTAN/USD rate (only Bank of Siberia)
     * @param newRateBps New rate in basis points (10000 = 1:1)
     */
    function setOfficialRate(uint256 newRateBps) external onlyBank {
        require(newRateBps > 0, "rate must be positive");
        uint256 oldRate = officialRateBps;
        officialRateBps = newRateBps;
        emit OfficialRateSet(oldRate, newRateBps);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get participant's settlement history
     */
    function getParticipantSettlements(address participant) external view returns (uint256[] memory) {
        return participantSettlements[participant];
    }

    /**
     * @notice Get settlement details
     */
    function getSettlement(uint256 id) external view returns (Settlement memory) {
        return settlements[id];
    }

    /**
     * @notice Get volume statistics
     */
    function getVolumeStats() external view returns (
        uint256 primaryVolume,
        uint256 secondaryVolume,
        uint256 totalSettlements
    ) {
        return (totalPrimaryVolume, totalSecondaryVolume, nextSettlementId);
    }

    // ============ ADMIN ============

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerSet(owner, newOwner);
        owner = newOwner;
    }

    function setBankOfSiberia(address newBank) external onlyOwner {
        if (newBank == address(0)) revert ZeroAddress();
        emit BankOfSiberiaSet(bankOfSiberia, newBank);
        bankOfSiberia = newBank;
    }

    function setInomadOperator(address newOp) external onlyOwner {
        if (newOp == address(0)) revert ZeroAddress();
        emit InomadOperatorSet(inomadOperator, newOp);
        inomadOperator = newOp;
    }
}
