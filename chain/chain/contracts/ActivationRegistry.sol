// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/*
ActivationRegistry (ALTAN Core MVP)

Purpose:
- Seat is LOCKED until human-verified activation (k-of-n validators).
- Constitution must be accepted BEFORE activation request.
- Supreme Court sanctions override activity (frozen/banned => not active).
- Designed to plug into SeatSBT + ElectionRegistry gating.

Notes:
- This contract does NOT mint SeatSBT. It only manages activation state.
- You can later move validators management under Khural / Central Bank.
*/

interface ISeatSBT {
    function ownerOf(uint256 seatId) external view returns (address);
}

interface ISupremeCourt {
    function frozenSeat(uint256 seatId) external view returns (bool);
    function bannedSeat(uint256 seatId) external view returns (bool);
}

interface IConstitutionAcceptanceRegistry {
    function hasAccepted(address user) external view returns (bool);
}

contract ActivationRegistry {
    enum Status {
        NONE,    // default
        LOCKED,  // seat exists but not activated
        ACTIVE,  // activated by validators
        BANNED   // local ban flag (optional); court ban also blocks via isActive()
    }

    address public owner;

    ISeatSBT public seat;
    ISupremeCourt public court;
    IConstitutionAcceptanceRegistry public acceptance;

    uint8 public thresholdK = 3;

    mapping(address => bool) public isValidator;

    // Seat activation state
    mapping(uint256 => Status) public statusOf;

    // k-of-n approvals
    mapping(uint256 => uint8) public approvalsCount;
    mapping(uint256 => mapping(address => bool)) public approvedBy;

    // Events for UI/indexers
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    event SeatSBTSet(address indexed seatSbt);
    event SupremeCourtSet(address indexed supremeCourt);
    event AcceptanceRegistrySet(address indexed acceptanceRegistry);

    event ValidatorSet(address indexed validator, bool ok);
    event ThresholdSet(uint8 k);

    event ActivationRequested(uint256 indexed seatId, address indexed requester);
    event ActivationApproved(uint256 indexed seatId, address indexed validator, uint8 approvals);
    event Activated(uint256 indexed seatId);

    event StatusSet(uint256 indexed seatId, Status status);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyValidator() {
        require(isValidator[msg.sender], "NOT_VALIDATOR");
        _;
    }

    constructor(address seatSbt, address supremeCourt, address constitutionAcceptance) {
        owner = msg.sender;

        seat = ISeatSBT(seatSbt);
        court = ISupremeCourt(supremeCourt);
        acceptance = IConstitutionAcceptanceRegistry(constitutionAcceptance);

        emit SeatSBTSet(seatSbt);
        emit SupremeCourtSet(supremeCourt);
        emit AcceptanceRegistrySet(constitutionAcceptance);
    }

    /* ------------------------- Admin wiring ------------------------- */

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setSeatSBT(address seatSbt) external onlyOwner {
        require(seatSbt != address(0), "ZERO_ADDR");
        seat = ISeatSBT(seatSbt);
        emit SeatSBTSet(seatSbt);
    }

    function setSupremeCourt(address supremeCourt) external onlyOwner {
        require(supremeCourt != address(0), "ZERO_ADDR");
        court = ISupremeCourt(supremeCourt);
        emit SupremeCourtSet(supremeCourt);
    }

    function setAcceptanceRegistry(address constitutionAcceptance) external onlyOwner {
        require(constitutionAcceptance != address(0), "ZERO_ADDR");
        acceptance = IConstitutionAcceptanceRegistry(constitutionAcceptance);
        emit AcceptanceRegistrySet(constitutionAcceptance);
    }

    /* ------------------------- Validators ------------------------- */

    function setThreshold(uint8 k) external onlyOwner {
        require(k > 0 && k <= 50, "BAD_K");
        thresholdK = k;
        emit ThresholdSet(k);
    }

    function setValidator(address v, bool ok) external onlyOwner {
        require(v != address(0), "ZERO_ADDR");
        isValidator[v] = ok;
        emit ValidatorSet(v, ok);
    }

    /* ------------------------- Core flow ------------------------- */

    /// @notice Seat owner asks to start activation. Requires Constitution acceptance.
    function requestActivation(uint256 seatId) external {
        require(address(acceptance) != address(0), "ACCEPTANCE_NOT_SET");
        require(acceptance.hasAccepted(msg.sender), "NO_CONSTITUTION");

        require(seat.ownerOf(seatId) == msg.sender, "NOT_SEAT_OWNER");

        Status s = statusOf[seatId];
        if (s == Status.NONE) {
            statusOf[seatId] = Status.LOCKED;
            emit StatusSet(seatId, Status.LOCKED);
        }

        require(statusOf[seatId] == Status.LOCKED, "NOT_LOCKED");
        emit ActivationRequested(seatId, msg.sender);
    }

    /// @notice Validators approve. When approvals reach thresholdK => ACTIVE.
    function approveActivation(uint256 seatId) external onlyValidator {
        require(statusOf[seatId] == Status.LOCKED, "NOT_LOCKED");
        require(!approvedBy[seatId][msg.sender], "ALREADY_APPROVED");

        approvedBy[seatId][msg.sender] = true;

        uint8 c = approvalsCount[seatId] + 1;
        approvalsCount[seatId] = c;

        emit ActivationApproved(seatId, msg.sender, c);

        if (c >= thresholdK) {
            statusOf[seatId] = Status.ACTIVE;
            emit StatusSet(seatId, Status.ACTIVE);
            emit Activated(seatId);
        }
    }

    /// @notice Optional admin override (useful for MVP ops). Court bans/freeze still apply via isActive().
    function setLocalBanned(uint256 seatId, bool banned) external onlyOwner {
        statusOf[seatId] = banned ? Status.BANNED : Status.LOCKED;
        emit StatusSet(seatId, statusOf[seatId]);
    }

    /// @notice Reset approvals if you want to restart the process (MVP tool).
    function resetApprovals(uint256 seatId) external onlyOwner {
        approvalsCount[seatId] = 0;
        // NOTE: approvedBy mapping not cleared for gas reasons; use a new seatId or add epoch logic later.
        // For MVP, keep it simple and avoid calling reset frequently.
    }

    /* ------------------------- Read helpers ------------------------- */

    /// @notice True only if:
    /// - status is ACTIVE
    /// - Supreme Court does NOT freeze/ban the seat
    function isActive(uint256 seatId) public view returns (bool) {
        if (statusOf[seatId] != Status.ACTIVE) return false;
        if (address(court) != address(0)) {
            if (court.bannedSeat(seatId)) return false;
            if (court.frozenSeat(seatId)) return false;
        }
        return true;
    }

    /// @notice Convenience: returns current status plus court flags.
    function statusWithCourt(uint256 seatId)
        external
        view
        returns (Status status, bool frozen, bool banned)
    {
        status = statusOf[seatId];
        frozen = address(court) != address(0) ? court.frozenSeat(seatId) : false;
        banned = address(court) != address(0) ? court.bannedSeat(seatId) : false;
    }
}
