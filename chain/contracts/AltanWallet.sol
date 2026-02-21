// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function ownerOf(uint256 seatId) external view returns (address);
}

/**
 * @title AltanWallet
 * @notice Individual citizen wallet with court-based freeze capability
 * 
 * Security:
 * - Wallet can be frozen by court during investigation
 * - Unfrozen only by court decision
 * - Case hash recorded for transparency
 */
contract AltanWallet {
    ISeatSBT public immutable seatSbt;
    uint256 public immutable seatId;
    address public immutable registry;

    bool public unlocked;
    
    // FREEZE MECHANISM (court authority)
    bool public isFrozen;
    address public freezeAuthority;      // Court or VerificationJustice
    bytes32 public freezeCaseHash;       // Reference to investigation case
    uint256 public freezeTimestamp;

    // optional delegated executor (SeatAccount/SeatTamga or EOA for tests)
    address public controller;

    error NotAuthorized();
    error Locked();
    error Frozen();
    error BadRegistry();
    error ZeroAddress();
    error NotFreezeAuthority();
    error AlreadyFrozen();
    error NotFrozen();

    event ControllerChanged(address indexed oldController, address indexed newController);
    event WalletFrozen(uint256 indexed seatId, bytes32 indexed caseHash, address authority, uint256 timestamp);
    event WalletUnfrozen(uint256 indexed seatId, bytes32 indexed verdictHash, address authority, uint256 timestamp);
    event FreezeAuthoritySet(address indexed authority);

    modifier onlySeatOwner() {
        if (msg.sender != seatSbt.ownerOf(seatId)) revert NotAuthorized();
        _;
    }

    modifier onlySeatOwnerOrController() {
        address so = seatSbt.ownerOf(seatId);
        if (msg.sender != so && msg.sender != controller) revert NotAuthorized();
        _;
    }

    modifier onlyRegistry() {
        if (msg.sender != registry) revert BadRegistry();
        _;
    }
    
    modifier onlyFreezeAuthority() {
        if (msg.sender != freezeAuthority && msg.sender != registry) revert NotFreezeAuthority();
        _;
    }
    
    modifier whenNotFrozen() {
        if (isFrozen) revert Frozen();
        _;
    }

    constructor(address _seatSbt, uint256 _seatId, address _registry) {
        seatSbt = ISeatSBT(_seatSbt);
        seatId = _seatId;
        registry = _registry;
        unlocked = false; // LOCKED by default
        isFrozen = false;
        controller = address(0);
        freezeAuthority = address(0);
    }

    receive() external payable {}
    
    /* ==================== FREEZE FUNCTIONS ==================== */
    
    /**
     * @notice Set freeze authority (court or justice system)
     * @dev Can only be set once by registry
     */
    function setFreezeAuthority(address authority) external onlyRegistry {
        if (freezeAuthority != address(0)) revert NotAuthorized(); // Set-once
        freezeAuthority = authority;
        emit FreezeAuthoritySet(authority);
    }
    
    /**
     * @notice Freeze wallet during court investigation
     * @param caseHash Reference hash to investigation case
     */
    function freeze(bytes32 caseHash) external onlyFreezeAuthority {
        if (isFrozen) revert AlreadyFrozen();
        
        isFrozen = true;
        freezeCaseHash = caseHash;
        freezeTimestamp = block.timestamp;
        
        emit WalletFrozen(seatId, caseHash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Unfreeze wallet after court decision
     * @param verdictHash Reference hash to court verdict
     */
    function unfreeze(bytes32 verdictHash) external onlyFreezeAuthority {
        if (!isFrozen) revert NotFrozen();
        
        isFrozen = false;
        freezeCaseHash = bytes32(0);
        
        emit WalletUnfrozen(seatId, verdictHash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Get freeze status
     */
    function getFreezeStatus() external view returns (
        bool frozen,
        bytes32 caseHash,
        uint256 frozenSince
    ) {
        return (isFrozen, freezeCaseHash, freezeTimestamp);
    }

    /* ==================== WALLET FUNCTIONS ==================== */

    function setUnlocked(bool ok) external onlyRegistry {
        unlocked = ok;
    }

    /// @notice seat owner can delegate execute rights to controller (can be cleared to zero)
    function setController(address newController) external onlySeatOwner whenNotFrozen {
        // allow clearing (set 0), but forbid setting to registry accidentally
        if (newController == registry) revert ZeroAddress();
        emit ControllerChanged(controller, newController);
        controller = newController;
    }

    function execute(address to, uint256 value, bytes calldata data)
        external
        onlySeatOwnerOrController
        whenNotFrozen
        returns (bytes memory)
    {
        if (!unlocked) revert Locked();
        (bool success, bytes memory ret) = to.call{value: value}(data);
        require(success, "CALL_FAILED");
        return ret;
    }
}
