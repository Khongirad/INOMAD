// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EmissionMultiSig
 * @notice Multi-signature governance contract for ALTAN emission and burning.
 *
 * Principle: "Source of law is the people."
 * No single person can create or destroy currency.
 * Every emission/burn requires quorum from the Central Bank Board.
 *
 * Flow:
 *   1. GOVERNOR proposes (MINT or BURN)
 *   2. BOARD_MEMBERS approve (requires >= quorumRequired votes)
 *   3. After quorum: 24h timelock begins
 *   4. After timelock: anyone can execute → calls AltanCoreLedger
 *   5. txHash recorded on-chain forever
 */
interface IAltanCoreLedger {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract EmissionMultiSig {

    // ─── Events ───────────────────────────────────────────────────────────────

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        uint256 amount,
        string reason
    );
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 approvalsCount
    );
    event QuorumReached(
        uint256 indexed proposalId,
        uint256 executableAfter
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        uint256 amount
    );
    event ProposalRejected(
        uint256 indexed proposalId,
        address indexed rejector,
        string reason
    );
    event BoardMemberAdded(address indexed member);
    event BoardMemberRemoved(address indexed member);

    // ─── Types ────────────────────────────────────────────────────────────────

    enum ProposalType   { MINT, BURN }
    enum ProposalStatus { PROPOSED, APPROVED_PENDING_TIMELOCK, EXECUTABLE, EXECUTED, REJECTED, EXPIRED }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        uint256 amount;
        address recipientOrSource;  // for MINT: who receives; for BURN: who loses
        string reason;
        string legalBasis;
        ProposalStatus status;
        address proposer;
        uint256 approvalsCount;
        uint256 createdAt;
        uint256 quorumReachedAt;
        uint256 executableAfter;    // quorumReachedAt + timelockDuration
        uint256 executedAt;
        address executedBy;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IAltanCoreLedger public immutable altanLedger;

    address public governor;
    mapping(address => bool) public isBoardMember;
    address[] public boardMembers;

    uint256 public quorumRequired = 3;
    uint256 public timelockDuration = 24 hours;
    uint256 public proposalExpiry   = 7 days;

    uint256 private _proposalCounter;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyGovernor() {
        require(msg.sender == governor, "EmissionMultiSig: caller is not Governor");
        _;
    }

    modifier onlyBoardOrGovernor() {
        require(
            msg.sender == governor || isBoardMember[msg.sender],
            "EmissionMultiSig: caller is not Board member or Governor"
        );
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposals[proposalId].id == proposalId, "EmissionMultiSig: proposal does not exist");
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _altanLedger,
        address _governor,
        address[] memory _boardMembers,
        uint256 _quorumRequired,
        uint256 _timelockDuration
    ) {
        require(_altanLedger != address(0), "EmissionMultiSig: zero ledger address");
        require(_governor != address(0), "EmissionMultiSig: zero governor address");
        require(_boardMembers.length >= _quorumRequired, "EmissionMultiSig: not enough board members");

        altanLedger = IAltanCoreLedger(_altanLedger);
        governor = _governor;
        quorumRequired = _quorumRequired;
        timelockDuration = _timelockDuration;

        for (uint256 i = 0; i < _boardMembers.length; i++) {
            require(_boardMembers[i] != address(0), "EmissionMultiSig: zero board member");
            isBoardMember[_boardMembers[i]] = true;
            boardMembers.push(_boardMembers[i]);
            emit BoardMemberAdded(_boardMembers[i]);
        }
    }

    // ─── Governor Actions ──────────────────────────────────────────────────────

    /**
     * @notice Governor proposes an emission or burn.
     * @dev Only Governor can propose. Board members approve.
     */
    function createProposal(
        ProposalType proposalType,
        uint256 amount,
        address recipientOrSource,
        string calldata reason,
        string calldata legalBasis
    ) external onlyGovernor returns (uint256 proposalId) {
        require(amount > 0, "EmissionMultiSig: amount must be positive");
        require(recipientOrSource != address(0), "EmissionMultiSig: zero recipient/source");
        require(bytes(reason).length > 0, "EmissionMultiSig: reason required");

        _proposalCounter++;
        proposalId = _proposalCounter;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: proposalType,
            amount: amount,
            recipientOrSource: recipientOrSource,
            reason: reason,
            legalBasis: legalBasis,
            status: ProposalStatus.PROPOSED,
            proposer: msg.sender,
            approvalsCount: 0,
            createdAt: block.timestamp,
            quorumReachedAt: 0,
            executableAfter: 0,
            executedAt: 0,
            executedBy: address(0)
        });

        emit ProposalCreated(proposalId, msg.sender, proposalType, amount, reason);
    }

    /**
     * @notice Board member or Governor approves a proposal.
     * @dev Once quorumRequired approvals are reached, timelock begins.
     */
    function approveProposal(uint256 proposalId)
        external
        onlyBoardOrGovernor
        proposalExists(proposalId)
    {
        Proposal storage p = proposals[proposalId];

        require(p.status == ProposalStatus.PROPOSED, "EmissionMultiSig: proposal not in PROPOSED state");
        require(!hasApproved[proposalId][msg.sender], "EmissionMultiSig: already approved");
        require(
            block.timestamp <= p.createdAt + proposalExpiry,
            "EmissionMultiSig: proposal expired"
        );

        hasApproved[proposalId][msg.sender] = true;
        p.approvalsCount++;

        emit ProposalApproved(proposalId, msg.sender, p.approvalsCount);

        // Check if quorum reached
        if (p.approvalsCount >= quorumRequired) {
            p.status = ProposalStatus.APPROVED_PENDING_TIMELOCK;
            p.quorumReachedAt = block.timestamp;
            p.executableAfter = block.timestamp + timelockDuration;

            emit QuorumReached(proposalId, p.executableAfter);
        }
    }

    /**
     * @notice Execute a proposal after quorum + timelock.
     * @dev Anyone can call this after the timelock expires (permissionless execution).
     *      This prevents a single person from blocking valid proposals.
     */
    function executeProposal(uint256 proposalId)
        external
        proposalExists(proposalId)
    {
        Proposal storage p = proposals[proposalId];

        require(
            p.status == ProposalStatus.APPROVED_PENDING_TIMELOCK,
            "EmissionMultiSig: proposal not pending timelock"
        );
        require(
            block.timestamp >= p.executableAfter,
            "EmissionMultiSig: timelock not expired yet"
        );
        require(
            block.timestamp <= p.createdAt + proposalExpiry,
            "EmissionMultiSig: proposal expired"
        );

        p.status = ProposalStatus.EXECUTED;
        p.executedAt = block.timestamp;
        p.executedBy = msg.sender;

        // ── Execute on AltanCoreLedger ─────────────────────────────────────────
        if (p.proposalType == ProposalType.MINT) {
            altanLedger.mint(p.recipientOrSource, p.amount);
        } else {
            altanLedger.burn(p.recipientOrSource, p.amount);
        }
        // ──────────────────────────────────────────────────────────────────────

        emit ProposalExecuted(proposalId, msg.sender, p.amount);
    }

    /**
     * @notice Governor rejects a proposal (before execution).
     */
    function rejectProposal(uint256 proposalId, string calldata reason)
        external
        onlyGovernor
        proposalExists(proposalId)
    {
        Proposal storage p = proposals[proposalId];
        require(
            p.status == ProposalStatus.PROPOSED || p.status == ProposalStatus.APPROVED_PENDING_TIMELOCK,
            "EmissionMultiSig: proposal cannot be rejected in current state"
        );

        p.status = ProposalStatus.REJECTED;
        emit ProposalRejected(proposalId, msg.sender, reason);
    }

    // ─── Governor Admin ────────────────────────────────────────────────────────

    function addBoardMember(address member) external onlyGovernor {
        require(!isBoardMember[member], "EmissionMultiSig: already board member");
        isBoardMember[member] = true;
        boardMembers.push(member);
        emit BoardMemberAdded(member);
    }

    function removeBoardMember(address member) external onlyGovernor {
        require(isBoardMember[member], "EmissionMultiSig: not board member");
        require(boardMembers.length > quorumRequired, "EmissionMultiSig: would drop below quorum");
        isBoardMember[member] = false;
        for (uint256 i = 0; i < boardMembers.length; i++) {
            if (boardMembers[i] == member) {
                boardMembers[i] = boardMembers[boardMembers.length - 1];
                boardMembers.pop();
                break;
            }
        }
        emit BoardMemberRemoved(member);
    }

    function updateQuorum(uint256 newQuorum) external onlyGovernor {
        require(newQuorum > 0 && newQuorum <= boardMembers.length, "EmissionMultiSig: invalid quorum");
        quorumRequired = newQuorum;
    }

    function transferGovernor(address newGovernor) external onlyGovernor {
        require(newGovernor != address(0), "EmissionMultiSig: zero address");
        governor = newGovernor;
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    function getProposal(uint256 proposalId)
        external
        view
        returns (Proposal memory)
    {
        return proposals[proposalId];
    }

    function getBoardMembers() external view returns (address[] memory) {
        return boardMembers;
    }

    function proposalCount() external view returns (uint256) {
        return _proposalCounter;
    }

    function getTimelockRemaining(uint256 proposalId)
        external
        view
        proposalExists(proposalId)
        returns (uint256)
    {
        Proposal storage p = proposals[proposalId];
        if (p.executableAfter == 0 || block.timestamp >= p.executableAfter) {
            return 0;
        }
        return p.executableAfter - block.timestamp;
    }
}
