// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * OrgTreasury (MVP)
 * - Holds ETH (native) for an organization.
 * - Human-in-the-loop payouts via requests + approvals.
 * - Authorization is based on OrgPositionsRegistry slots (0..9) of a chosen unit (typically rootUnitId).
 *
 * Policy (MVP):
 * - Small payout (value <= Treasurer.maxValuePerTx): Treasurer alone can execute.
 * - Large payout (value  > Treasurer.maxValuePerTx): requires BOTH Treasurer + Auditor approvals, then Treasurer executes.
 * - Auditor can cancel/freeze a request.
 *
 * Notes:
 * - We identify caller's seatId by scanning slots 0..9 and checking SeatSBT.ownerOf(occupantSeatId) == msg.sender.
 * - Permissions are taken from OrgPositionsRegistry.roles(orgId, roleId).permissions bitmask.
 */

interface ISeatSBT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IOrgRegistry {
    function orgs(uint256 orgId) external view returns (
        uint256 _orgId,
        uint256 adminSeatId,
        address wallet,
        string memory metadataURI,
        uint256 rootUnitId,
        bool exists
    );
}

interface IOrgPositionsRegistry {
    function occupantSeatOfSlot(uint256 unitId, uint16 slotId) external view returns (uint256);
    function slotRole(uint256 unitId, uint16 slotId) external view returns (uint32);

    // public mapping roles(orgId => roleId => Role) returns tuple
    function roles(uint256 orgId, uint32 roleId) external view returns (
        uint32 _roleId,
        string memory name,
        uint256 permissions,
        uint256 maxValuePerTx,
        bool exists
    );
}

contract OrgTreasury {
    // Permissions bitmask (match your earlier convention)
    uint256 public constant PERM_OPERATOR  = 1; // generic operational permission
    uint256 public constant PERM_TREASURER = 2; // can execute payouts
    uint256 public constant PERM_AUDITOR   = 4; // can audit/cancel/freeze

    error OrgNotFound();
    error UnitNotSet();
    error NotMember();
    error RoleNotFound();
    error RequestNotFound();
    error RequestNotPending();
    error AlreadyApproved();
    error NotAllowed();
    error ValueTooHigh();
    error NotTreasurer();
    error MissingApprovals();

    enum Status { NONE, PENDING, EXECUTED, CANCELED }

    struct Request {
        uint256 id;
        address to;
        uint256 value;
        bytes data;
        bytes32 memo;     // cheap metadata (can hash an offchain string)
        uint256 createdAt;
        uint256 createdBySeatId;
        Status status;
        uint256 approvalsTreasurer;
        uint256 approvalsAuditor;
    }

    ISeatSBT public immutable seatSbt;
    IOrgRegistry public immutable orgRegistry;
    IOrgPositionsRegistry public immutable pos;

    uint256 public immutable orgId;
    uint256 public unitId; // usually rootUnitId, but can be set to any org unit

    uint256 public nextRequestId = 1;

    mapping(uint256 => Request) public requests;
    mapping(uint256 => mapping(uint256 => bool)) public approvedBySeat; // requestId => seatId => bool

    event UnitSet(uint256 indexed orgId, uint256 indexed unitId);
    event Deposited(address indexed from, uint256 value);
    event Requested(uint256 indexed requestId, address indexed to, uint256 value, bytes32 memo, uint256 createdBySeatId);
    event Approved(uint256 indexed requestId, uint256 indexed seatId, uint256 permissions);
    event Canceled(uint256 indexed requestId, uint256 indexed bySeatId);
    event Executed(uint256 indexed requestId, address indexed to, uint256 value, bool success, bytes returndata);

    constructor(
        address seatSbt_,
        address orgRegistry_,
        address orgPositionsRegistry_,
        uint256 orgId_,
        uint256 unitId_
    ) {
        seatSbt = ISeatSBT(seatSbt_);
        orgRegistry = IOrgRegistry(orgRegistry_);
        pos = IOrgPositionsRegistry(orgPositionsRegistry_);

        orgId = orgId_;

        (, , , , , bool exists) = orgRegistry.orgs(orgId_);
        if (!exists) revert OrgNotFound();

        unitId = unitId_;
        if (unitId_ == 0) revert UnitNotSet();
        emit UnitSet(orgId_, unitId_);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function setUnitId(uint256 newUnitId) external {
        // Only org admin can change unit policy scope
        (, uint256 adminSeatId, , , , bool exists) = orgRegistry.orgs(orgId);
        if (!exists) revert OrgNotFound();
        if (seatSbt.ownerOf(adminSeatId) != msg.sender) revert NotAllowed();

        if (newUnitId == 0) revert UnitNotSet();
        unitId = newUnitId;
        emit UnitSet(orgId, newUnitId);
    }

    /* ========= Membership + Permission ========= */

    function _callerSeatAndPerms() internal view returns (uint256 seatId, uint256 perms, uint256 maxValue) {
        uint256 u = unitId;
        if (u == 0) revert UnitNotSet();

        // Scan 10 slots
        for (uint16 s = 0; s < 10; s++) {
            uint256 occ = pos.occupantSeatOfSlot(u, s);
            if (occ == 0) continue;

            // caller owns this seat?
            if (seatSbt.ownerOf(occ) == msg.sender) {
                uint32 roleId = pos.slotRole(u, s);
                (, , uint256 p, uint256 mv, bool roleExists) = pos.roles(orgId, roleId);
                if (!roleExists) revert RoleNotFound();
                return (occ, p, mv);
            }
        }
        revert NotMember();
    }

    function _isTreasurer(uint256 perms) internal pure returns (bool) {
        return (perms & PERM_TREASURER) != 0;
    }

    function _isAuditor(uint256 perms) internal pure returns (bool) {
        return (perms & PERM_AUDITOR) != 0;
    }

    /* ========= Requests ========= */

    function requestPayment(
        address to,
        uint256 value,
        bytes calldata data,
        bytes32 memo
    ) external returns (uint256 requestId) {
        (uint256 seatId, uint256 perms, ) = _callerSeatAndPerms();

        // must have at least some org permission
        if ((perms & (PERM_OPERATOR | PERM_TREASURER | PERM_AUDITOR)) == 0) revert NotAllowed();

        requestId = nextRequestId++;
        requests[requestId] = Request({
            id: requestId,
            to: to,
            value: value,
            data: data,
            memo: memo,
            createdAt: block.timestamp,
            createdBySeatId: seatId,
            status: Status.PENDING,
            approvalsTreasurer: 0,
            approvalsAuditor: 0
        });

        emit Requested(requestId, to, value, memo, seatId);
    }

    function approve(uint256 requestId) external {
        Request storage r = requests[requestId];
        if (r.status == Status.NONE) revert RequestNotFound();
        if (r.status != Status.PENDING) revert RequestNotPending();

        (uint256 seatId, uint256 perms, ) = _callerSeatAndPerms();

        if (approvedBySeat[requestId][seatId]) revert AlreadyApproved();
        approvedBySeat[requestId][seatId] = true;

        if (_isTreasurer(perms)) r.approvalsTreasurer += 1;
        if (_isAuditor(perms))   r.approvalsAuditor   += 1;

        emit Approved(requestId, seatId, perms);
    }

    function cancel(uint256 requestId) external {
        Request storage r = requests[requestId];
        if (r.status == Status.NONE) revert RequestNotFound();
        if (r.status != Status.PENDING) revert RequestNotPending();

        (uint256 seatId, uint256 perms, ) = _callerSeatAndPerms();
        if (!_isAuditor(perms)) revert NotAllowed();

        r.status = Status.CANCELED;
        emit Canceled(requestId, seatId);
    }

    function execute(uint256 requestId) external returns (bool success, bytes memory ret) {
        Request storage r = requests[requestId];
        if (r.status == Status.NONE) revert RequestNotFound();
        if (r.status != Status.PENDING) revert RequestNotPending();

        (uint256 seatId, uint256 perms, uint256 maxValue) = _callerSeatAndPerms();

        // only Treasurer executes
        if (!_isTreasurer(perms)) revert NotTreasurer();

        // Small vs Large threshold uses executor's role maxValuePerTx
        bool isSmall = r.value <= maxValue;

        // Require at least treasurer approval always (including executor)
        // The executor can "count" by approving before execution.
        if (r.approvalsTreasurer < 1) revert MissingApprovals();

        // For large payouts require at least 1 auditor approval too
        if (!isSmall) {
            if (r.approvalsAuditor < 1) revert MissingApprovals();
        }

        // Optional: for small payouts, you can disallow if value > contract balance
        if (r.value > address(this).balance) revert ValueTooHigh();

        r.status = Status.EXECUTED;

        (success, ret) = r.to.call{value: r.value}(r.data);

        emit Executed(requestId, r.to, r.value, success, ret);
    }

    /* ========= Views ========= */

    function getPolicyFor(uint256 requestId) external view returns (
        uint256 value,
        uint256 treasurerMaxValuePerTx,
        uint256 approvalsTreasurer,
        uint256 approvalsAuditor,
        Status status
    ) {
        Request storage r = requests[requestId];
        if (r.status == Status.NONE) revert RequestNotFound();

        // Read treasurer max from any treasurer role in the unit (first match)
        uint256 mv = 0;
        uint256 u = unitId;
        for (uint16 s = 0; s < 10; s++) {
            uint256 occ = pos.occupantSeatOfSlot(u, s);
            if (occ == 0) continue;
            uint32 roleId = pos.slotRole(u, s);
            (, , uint256 p, uint256 maxV, bool ok) = pos.roles(orgId, roleId);
            if (ok && (p & PERM_TREASURER) != 0) { mv = maxV; break; }
        }

        return (r.value, mv, r.approvalsTreasurer, r.approvalsAuditor, r.status);
    }
}
