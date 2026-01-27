// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function ownerOf(uint256 seatId) external view returns (address);
}

contract AltanWallet {
    ISeatSBT public immutable seatSbt;
    uint256 public immutable seatId;
    address public immutable registry;

    bool public unlocked;

    // optional delegated executor (SeatAccount/SeatTamga or EOA for tests)
    address public controller;

    error NotAuthorized();
    error Locked();
    error BadRegistry();
    error ZeroAddress();

    event ControllerChanged(address indexed oldController, address indexed newController);

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

    constructor(address _seatSbt, uint256 _seatId, address _registry) {
        seatSbt = ISeatSBT(_seatSbt);
        seatId = _seatId;
        registry = _registry;
        unlocked = false; // LOCKED by default
        controller = address(0);
    }

    receive() external payable {}

    function setUnlocked(bool ok) external onlyRegistry {
        unlocked = ok;
    }

    /// @notice seat owner can delegate execute rights to controller (can be cleared to zero)
    function setController(address newController) external onlySeatOwner {
        // allow clearing (set 0), but forbid setting to registry accidentally
        if (newController == registry) revert ZeroAddress();
        emit ControllerChanged(controller, newController);
        controller = newController;
    }

    function execute(address to, uint256 value, bytes calldata data)
        external
        onlySeatOwnerOrController
        returns (bytes memory)
    {
        if (!unlocked) revert Locked();
        (bool success, bytes memory ret) = to.call{value: value}(data);
        require(success, "CALL_FAILED");
        return ret;
    }
}
