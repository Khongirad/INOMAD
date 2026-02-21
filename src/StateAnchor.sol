// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StateAnchor
 * @author INOMAD KHURAL — Fourth Branch Technology
 *
 * @notice "История — это append-only лог. Прошлое нельзя переписать."
 *
 * StateAnchor is the blockchain's long-term memory of INOMAD KHURAL.
 * It stores cryptographic commitments (Merkle roots) of critical state batches:
 *
 *   - Vote cycles (legislative votes with nullifiers)
 *   - Election results (certified winners)
 *   - Signed laws (content-locked full texts)
 *   - Emission decisions (multi-sig ALTAN mints/burns)
 *   - Verification batches (SeatSBT grants)
 *
 * Once a hash is anchored here, it is PERMANENTLY PUBLIC and UNEDITABLE.
 * Even if the PostgreSQL database is destroyed, these anchors allow
 * reconstruction and verification of the entire state history.
 *
 * This contract is APPEND-ONLY. There is no updateAnchor, no delete.
 * Only addAnchor can be called, and only by the authorized operator.
 */
contract StateAnchor {

    // ============================
    // TYPES
    // ============================

    /// @notice Category of state being anchored
    enum AnchorType {
        VOTE_BATCH,       // Legislative vote cycle results
        ELECTION_RESULT,  // Election winner certification
        SIGNED_LAW,       // Law content hash at signing
        EMISSION_DECISION, // ALTAN mint/burn multi-sig execution
        VERIFICATION_BATCH, // Block of SeatSBT grants
        GENERAL           // Any other state commitment
    }

    /// @notice An immutable record of a state commitment
    struct Anchor {
        bytes32 merkleRoot;      // Merkle root of the anchored data batch
        AnchorType anchorType;   // What kind of state is this
        uint256 timestamp;       // When it was anchored (block.timestamp)
        uint256 blockNumber;     // Block when anchored
        string  description;     // Human-readable label (e.g. "Legislative session 2026-Q1")
        address submittedBy;     // Operator address that submitted
    }

    // ============================
    // STATE
    // ============================

    address public immutable operator;   // Authorized submitter (backend operator)
    address public immutable governor;   // Can update operator (DAO governance)

    uint256 public anchorCount;
    mapping(uint256 => Anchor) public anchors; // anchorId → Anchor

    // Index: anchorType → array of anchorIds (for quick lookup by type)
    mapping(uint8 => uint256[]) private _anchorsByType;

    // ============================
    // EVENTS
    // ============================

    /// @notice Emitted whenever a new state commitment is anchored
    /// @dev Indexing by anchorType allows frontend to filter relevant anchors
    event StateAnchored(
        uint256 indexed anchorId,
        uint8   indexed anchorType,
        bytes32         merkleRoot,
        string          description,
        uint256         timestamp
    );

    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    // ============================
    // CONSTRUCTOR
    // ============================

    constructor(address _operator, address _governor) {
        require(_operator != address(0), "Operator cannot be zero address");
        require(_governor != address(0), "Governor cannot be zero address");
        operator  = _operator;
        governor  = _governor;
    }

    // ============================
    // ANCHOR FUNCTIONS
    // ============================

    /**
     * @notice Anchor a new state commitment on-chain.
     *         This is APPEND-ONLY — no anchor can ever be modified or deleted.
     *
     * @param merkleRoot  SHA-256/Keccak256 Merkle root of the state batch
     * @param anchorType  Type of state being committed
     * @param description Human-readable label for this anchor
     *
     * @return anchorId   The permanent ID of this anchor
     *
     * @dev Example usage (backend):
     *   const root = computeMerkleRoot(allVotesThisSession);
     *   await stateAnchor.addAnchor(root, AnchorType.VOTE_BATCH, "Session 2026-Q1 votes");
     */
    function addAnchor(
        bytes32    merkleRoot,
        AnchorType anchorType,
        string calldata description
    ) external returns (uint256 anchorId) {
        require(msg.sender == operator, "StateAnchor: Only operator can anchor");
        require(merkleRoot != bytes32(0), "StateAnchor: Empty root");

        anchorId = anchorCount++;

        anchors[anchorId] = Anchor({
            merkleRoot:   merkleRoot,
            anchorType:   anchorType,
            timestamp:    block.timestamp,
            blockNumber:  block.number,
            description:  description,
            submittedBy:  msg.sender
        });

        _anchorsByType[uint8(anchorType)].push(anchorId);

        emit StateAnchored(
            anchorId,
            uint8(anchorType),
            merkleRoot,
            description,
            block.timestamp
        );
    }

    // ============================
    // VIEW FUNCTIONS
    // ============================

    /**
     * @notice Get all anchor IDs for a given type (e.g. all election results)
     */
    function getAnchorsByType(AnchorType anchorType)
        external view returns (uint256[] memory)
    {
        return _anchorsByType[uint8(anchorType)];
    }

    /**
     * @notice Get the most recent anchor for a given type
     * @return anchor  The latest anchor (or empty if none)
     * @return anchorId  The ID of the latest anchor
     */
    function getLatestAnchorByType(AnchorType anchorType)
        external view returns (Anchor memory anchor, uint256 anchorId)
    {
        uint256[] storage ids = _anchorsByType[uint8(anchorType)];
        require(ids.length > 0, "No anchors of this type");
        anchorId = ids[ids.length - 1];
        anchor = anchors[anchorId];
    }

    /**
     * @notice Verify: does a given Merkle root exist in recorded history?
     * @param merkleRoot  The root to check
     * @param anchorId    The anchor to verify against
     * @return true if this anchor contains this root
     */
    function verify(bytes32 merkleRoot, uint256 anchorId) external view returns (bool) {
        return anchors[anchorId].merkleRoot == merkleRoot;
    }

    /**
     * @notice Get full anchor details
     */
    function getAnchor(uint256 anchorId) external view returns (Anchor memory) {
        require(anchorId < anchorCount, "StateAnchor: Invalid anchorId");
        return anchors[anchorId];
    }
}
