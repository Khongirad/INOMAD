// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreLaw} from "./CoreLaw.sol";

/**
 * @title ICoreFreezable
 * @notice Interface for contracts to check if CoreLaw is frozen
 */
interface ICoreFreezable {
    function isFrozen() external view returns (bool);
    function getLawHash() external view returns (bytes32);
    function getFrozenAt() external view returns (uint64);
}

/**
 * @title CoreLock
 * @notice Locks the CoreLaw permanently after freeze
 * @dev Once frozen, the CoreLaw cannot be changed and ownership is renounced
 *
 * Flow:
 * 1. Deploy CoreLaw
 * 2. Deploy CoreLock with CoreLaw address
 * 3. Verify lawHash matches CoreLaw.lawHash()
 * 4. Call freeze() to permanently lock
 * 5. After freeze: no more ownership transfers, law is permanent
 */
contract CoreLock is ICoreFreezable {
    /*//////////////////////////////////////////////////////////////
                            STATE
    //////////////////////////////////////////////////////////////*/

    address public owner;
    CoreLaw public immutable coreLaw;
    bytes32 public lawHash;
    bool public frozen;
    uint64 public frozenAt;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event CoreLawLinked(address indexed coreLaw, bytes32 lawHash);
    event Frozen(bytes32 lawHash, uint64 timestamp);
    event OwnershipTransferred(address indexed from, address indexed to);
    event OwnershipRenounced(address indexed previousOwner);

    /*//////////////////////////////////////////////////////////////
                            ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotOwner();
    error ZeroAddress();
    error AlreadyFrozen();
    error NotFrozen();
    error HashMismatch();
    error CannotTransferAfterFreeze();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner, address _coreLaw) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_coreLaw == address(0)) revert ZeroAddress();

        owner = _owner;
        coreLaw = CoreLaw(_coreLaw);
        lawHash = coreLaw.lawHash();

        emit OwnershipTransferred(address(0), _owner);
        emit CoreLawLinked(_coreLaw, lawHash);
    }

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notFrozen() {
        if (frozen) revert AlreadyFrozen();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Freeze the CoreLaw permanently
     * @dev After freeze:
     *      - lawHash is permanently locked
     *      - ownership is automatically renounced
     *      - no further changes possible
     */
    function freeze() external onlyOwner notFrozen {
        // Verify CoreLaw integrity before freezing
        if (!coreLaw.verifyIntegrity()) revert HashMismatch();
        if (coreLaw.lawHash() != lawHash) revert HashMismatch();

        frozen = true;
        frozenAt = uint64(block.timestamp);

        // Renounce ownership - no one controls this after freeze
        address previousOwner = owner;
        owner = address(0);

        emit Frozen(lawHash, frozenAt);
        emit OwnershipRenounced(previousOwner);
    }

    /**
     * @notice Transfer ownership (only before freeze)
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner notFrozen {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if CoreLaw is frozen (implements ICoreFreezable)
    function isFrozen() external view override returns (bool) {
        return frozen;
    }

    /// @notice Get the frozen law hash (implements ICoreFreezable)
    function getLawHash() external view override returns (bytes32) {
        return lawHash;
    }

    /// @notice Get freeze timestamp (implements ICoreFreezable)
    function getFrozenAt() external view override returns (uint64) {
        return frozenAt;
    }

    /// @notice Get CoreLaw contract address
    function getCoreLaw() external view returns (address) {
        return address(coreLaw);
    }

    /// @notice Verify current CoreLaw integrity matches frozen hash
    function verifyIntegrity() external view returns (bool) {
        return coreLaw.lawHash() == lawHash && coreLaw.verifyIntegrity();
    }

    /// @notice Get document name from CoreLaw
    function getDocumentName() external view returns (string memory) {
        return coreLaw.DOCUMENT_NAME();
    }

    /// @notice Get document version from CoreLaw
    function getVersion() external view returns (string memory) {
        return coreLaw.VERSION();
    }

    /// @notice Get total articles count
    function getTotalArticles() external view returns (uint8) {
        return coreLaw.TOTAL_ARTICLES();
    }

    /// @notice Get article by number (1-37)
    function getArticle(uint8 number) external view returns (string memory) {
        return coreLaw.getArticle(number);
    }

    /// @notice Get preamble
    function getPreamble() external view returns (string memory) {
        return coreLaw.getPreamble();
    }

    /// @notice Get conclusion
    function getConclusion() external view returns (string memory) {
        return coreLaw.getConclusion();
    }
}
