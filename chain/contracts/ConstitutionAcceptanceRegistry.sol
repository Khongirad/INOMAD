// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/*
ConstitutionAcceptanceRegistry (MVP):
- Stores "acceptance" of a specific constitution version/hash.
- Supports EIP-712 typed signature acceptance (recommended for auditability).
- Supports direct acceptance via msg.sender (useful if Altan wallet signs tx itself).
- Includes nonces to prevent replay.
- Can be keyed either by user address OR by seatId (optional).
*/

contract ConstitutionAcceptanceRegistry {
    /* ----------------------------- Admin wiring ----------------------------- */

    address public owner;

    // Source of truth (set from ConstitutionRegistry in your architecture, but MVP keeps here).
    bytes32 public constitutionHash;     // keccak256(bytes(full_text_or_pdf_bytes))
    bytes32 public versionHash;          // keccak256(bytes("v1.0")) or similar

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event ConstitutionSet(bytes32 indexed constitutionHash, bytes32 indexed versionHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(bytes32 _constitutionHash, bytes32 _versionHash) {
        owner = msg.sender;
        constitutionHash = _constitutionHash;
        versionHash = _versionHash;
        emit ConstitutionSet(_constitutionHash, _versionHash);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Update constitution hash/version (in production route through ConstitutionRegistry + timelock).
    function setConstitution(bytes32 _constitutionHash, bytes32 _versionHash) external onlyOwner {
        constitutionHash = _constitutionHash;
        versionHash = _versionHash;
        emit ConstitutionSet(_constitutionHash, _versionHash);
    }

    /* ----------------------------- Acceptance state ----------------------------- */

    struct Acceptance {
        uint64 acceptedAt;
        bytes32 constitutionHash;
        bytes32 versionHash;
    }

    mapping(address => Acceptance) public acceptanceOf;      // by user address
    mapping(uint256 => Acceptance) public acceptanceOfSeat;  // optional by seatId

    event ConstitutionAccepted(
        address indexed user,
        uint256 indexed seatId,           // 0 if not used
        bytes32 indexed constitutionHash,
        bytes32 versionHash,
        uint64 acceptedAt
    );

    function hasAccepted(address user) public view returns (bool) {
        Acceptance memory a = acceptanceOf[user];
        return a.acceptedAt != 0 && a.constitutionHash == constitutionHash && a.versionHash == versionHash;
    }

    function hasAcceptedSeat(uint256 seatId) public view returns (bool) {
        Acceptance memory a = acceptanceOfSeat[seatId];
        return a.acceptedAt != 0 && a.constitutionHash == constitutionHash && a.versionHash == versionHash;
    }

    /* ----------------------------- EIP-712 Signature ----------------------------- */

    // Domain: name/version are fixed for contract; constitution version is in the message itself.
    string public constant NAME = "ALTAN Constitution Acceptance";
    string public constant EIP712_VERSION = "1";

    // EIP-712 typehashes
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    // User signs this typed data:
    // Accept(address user,uint256 seatId,bytes32 constitutionHash,bytes32 versionHash,uint256 nonce,uint256 deadline)
    bytes32 internal constant ACCEPT_TYPEHASH =
        keccak256("Accept(address user,uint256 seatId,bytes32 constitutionHash,bytes32 versionHash,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public nonces;

    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(EIP712_VERSION)),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Returns the digest that must be signed for acceptance.
    function acceptanceDigest(
        address user,
        uint256 seatId,
        bytes32 _constitutionHash,
        bytes32 _versionHash,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ACCEPT_TYPEHASH,
                user,
                seatId,
                _constitutionHash,
                _versionHash,
                nonce,
                deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    /// @notice Accept constitution by presenting EIP-712 signature from `user`.
    /// @dev Anyone can submit the signature; signature must match `user`.
    function acceptWithSig(
        address user,
        uint256 seatId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(user != address(0), "ZERO_USER");
        require(block.timestamp <= deadline, "SIG_EXPIRED");

        // Must accept current constitution
        bytes32 ch = constitutionHash;
        bytes32 vh = versionHash;

        uint256 nonce = nonces[user];
        bytes32 digest = acceptanceDigest(user, seatId, ch, vh, nonce, deadline);

        address recovered = ecrecover(digest, v, r, s);
        require(recovered == user, "BAD_SIG");

        nonces[user] = nonce + 1;
        _writeAcceptance(user, seatId, ch, vh);
    }

    /* ----------------------------- Direct acceptance ----------------------------- */

    /// @notice Accept constitution by sending a transaction (useful when Altan wallet is native).
    function acceptDirect(uint256 seatId) external {
        _writeAcceptance(msg.sender, seatId, constitutionHash, versionHash);
    }

    /* ----------------------------- Internal write ----------------------------- */

    function _writeAcceptance(
        address user,
        uint256 seatId,
        bytes32 ch,
        bytes32 vh
    ) internal {
        uint64 ts = uint64(block.timestamp);

        acceptanceOf[user] = Acceptance({
            acceptedAt: ts,
            constitutionHash: ch,
            versionHash: vh
        });

        if (seatId != 0) {
            acceptanceOfSeat[seatId] = Acceptance({
                acceptedAt: ts,
                constitutionHash: ch,
                versionHash: vh
            });
        }

        emit ConstitutionAccepted(user, seatId, ch, vh, ts);
    }
    
}
